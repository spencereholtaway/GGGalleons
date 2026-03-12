import fetch from "node-fetch";
import AdmZip from "adm-zip";
import { parse } from "csv-parse/sync";

let cachedGtfsData: any = null;
let lastFetchTime = 0;
const CACHE_DURATION = 1000 * 60 * 60 * 12; // 12 hours

function cleanZipBuffer(buf: Buffer): Buffer {
  // Find the last occurrence of the End of Central Directory record signature
  const eocdSignature = Buffer.from([0x50, 0x4b, 0x05, 0x06]);
  const eocdIndex = buf.lastIndexOf(eocdSignature);
  if (eocdIndex === -1) return buf;

  // The EOCD record is at least 22 bytes long.
  // The last 2 bytes of the fixed-size part (offset 20) is the comment length.
  if (eocdIndex + 22 <= buf.length) {
    const commentLength = buf.readUInt16LE(eocdIndex + 20);
    const expectedEnd = eocdIndex + 22 + commentLength;
    if (expectedEnd <= buf.length) {
      return buf.slice(0, expectedEnd);
    }
  }
  
  // Fallback: just return up to the end of the fixed-size EOCD if comment length looks wrong
  return buf.slice(0, eocdIndex + 22);
}

export async function getNextScheduledTrips(apiKey: string, requestedAgency?: string) {
  if (!cachedGtfsData || Date.now() - lastFetchTime > CACHE_DURATION) {
    console.log("Fetching fresh GTFS data from 511.org...");
    
    const agencies = ['GF', 'SB'];
    let allRoutes: any[] = [];
    let allTrips: any[] = [];
    let allStopTimes: any[] = [];
    let allStops: any[] = [];
    let allCalendar: any[] = [];
    let allCalendarDates: any[] = [];

    let fetchErrors: string[] = [];

    for (const agency of agencies) {
      try {
        const response = await fetch(`https://api.511.org/transit/datafeeds?api_key=${apiKey}&operator_id=${agency}`);
        if (!response.ok) {
          const errorMsg = `Failed to fetch GTFS data for ${agency}: ${response.status} ${response.statusText}`;
          console.error(errorMsg);
          fetchErrors.push(errorMsg);
          continue;
        }
        const buffer = await response.arrayBuffer();
        const firstBytes = Buffer.from(buffer).slice(0, 100).toString('utf8');
        if (firstBytes.includes('invalid') || firstBytes.includes('Error')) {
          const errorMsg = `API returned error for ${agency}: ${firstBytes}`;
          console.error(errorMsg);
          fetchErrors.push(errorMsg);
          continue;
        }
        const zip = new AdmZip(cleanZipBuffer(Buffer.from(buffer)));
        console.log(`Successfully opened ZIP for ${agency}. Entries: ${zip.getEntries().length}`);
        
        const readCsv = (filename: string) => {
          const entry = zip.getEntry(filename);
          if (!entry) return [];
          const content = entry.getData().toString("utf8");
          // Remove BOM if present
          const cleanContent = content.charCodeAt(0) === 0xFEFF ? content.slice(1) : content;
          return parse(cleanContent, { columns: true, skip_empty_lines: true });
        };

        // Prefix IDs with agency to avoid collisions
        const prefix = (id: string) => `${agency}_${id}`;
        
        const routes = readCsv("routes.txt").map((r: any) => ({ ...r, route_id: prefix(r.route_id), agency_id: agency }));
        const trips = readCsv("trips.txt").map((t: any) => ({ ...t, trip_id: prefix(t.trip_id), route_id: prefix(t.route_id), service_id: prefix(t.service_id), agency_id: agency }));
        const stopTimes = readCsv("stop_times.txt").map((st: any) => ({ ...st, trip_id: prefix(st.trip_id), stop_id: prefix(st.stop_id) }));
        const stops = readCsv("stops.txt").map((s: any) => ({ ...s, stop_id: prefix(s.stop_id) }));
        const calendar = readCsv("calendar.txt").map((c: any) => ({ ...c, service_id: prefix(c.service_id) }));
        const calendarDates = readCsv("calendar_dates.txt").map((cd: any) => ({ ...cd, service_id: prefix(cd.service_id) }));

        allRoutes = allRoutes.concat(routes);
        allTrips = allTrips.concat(trips);
        allStopTimes = allStopTimes.concat(stopTimes);
        allStops = allStops.concat(stops);
        allCalendar = allCalendar.concat(calendar);
        allCalendarDates = allCalendarDates.concat(calendarDates);
      } catch (e) {
        const errorMsg = `Error processing GTFS for ${agency}: ${e.message}`;
        console.error(errorMsg);
        fetchErrors.push(errorMsg);
      }
    }

    if (fetchErrors.length === agencies.length) {
      throw new Error(`Failed to fetch GTFS data for all agencies: ${fetchErrors.join(', ')}`);
    }

    cachedGtfsData = { 
      routes: allRoutes, 
      trips: allTrips, 
      stopTimes: allStopTimes, 
      stops: allStops, 
      calendar: allCalendar, 
      calendarDates: allCalendarDates 
    };
    lastFetchTime = Date.now();
  }

  const { routes, trips, stopTimes, stops, calendar, calendarDates } = cachedGtfsData;

  // Get current date and time in Pacific Time
  const now = new Date();
  const options = { timeZone: 'America/Los_Angeles' };
  
  const formatterDate = new Intl.DateTimeFormat('en-US', { ...options, year: 'numeric', month: '2-digit', day: '2-digit' });
  const partsDate = formatterDate.formatToParts(now);
  const yyyy = partsDate.find(p => p.type === 'year')?.value;
  const mm = partsDate.find(p => p.type === 'month')?.value;
  const dd = partsDate.find(p => p.type === 'day')?.value;
  const currentDateStr = `${yyyy}${mm}${dd}`; // YYYYMMDD

  const formatterDay = new Intl.DateTimeFormat('en-US', { ...options, weekday: 'long' });
  const currentDayName = formatterDay.format(now).toLowerCase(); // monday, tuesday, etc.

  const formatterTime = new Intl.DateTimeFormat('en-US', { ...options, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
  let currentTimeStr = formatterTime.format(now);
  // Handle 24:00:00 format if past midnight but part of previous day's schedule (GTFS can use >24:00:00)
  // For simplicity, we just use standard HH:MM:SS. If hour is 24, it's next day.
  if (currentTimeStr.startsWith('24:')) {
    currentTimeStr = `00:${currentTimeStr.substring(3)}`;
  }

  // 1. Find active service IDs for today
  const activeServiceIds = new Set<string>();
  
  // Check calendar.txt
  for (const cal of calendar) {
    if (cal.start_date <= currentDateStr && cal.end_date >= currentDateStr) {
      if (cal[currentDayName] === '1') {
        activeServiceIds.add(cal.service_id);
      }
    }
  }
  
  // Check calendar_dates.txt for exceptions
  for (const cd of calendarDates) {
    if (cd.date === currentDateStr) {
      if (cd.exception_type === '1') {
        activeServiceIds.add(cd.service_id); // Added
      } else if (cd.exception_type === '2') {
        activeServiceIds.delete(cd.service_id); // Removed
      }
    }
  }

  // 2. Find all trips for active service IDs
  let activeTrips = trips.filter((t: any) => activeServiceIds.has(t.service_id));
  if (requestedAgency) {
    activeTrips = activeTrips.filter((t: any) => t.agency_id === requestedAgency);
  }
  const activeTripIds = new Set(activeTrips.map((t: any) => t.trip_id));

  // 3. Find stop times for active trips
  const activeStopTimes = stopTimes.filter((st: any) => activeTripIds.has(st.trip_id));

  // 4. Group stop times by trip
  const stopTimesByTrip = new Map<string, any[]>();
  for (const st of activeStopTimes) {
    if (!stopTimesByTrip.has(st.trip_id)) {
      stopTimesByTrip.set(st.trip_id, []);
    }
    stopTimesByTrip.get(st.trip_id)!.push(st);
  }

  // Sort stop times within each trip by stop_sequence
  for (const [tripId, sts] of stopTimesByTrip.entries()) {
    sts.sort((a, b) => parseInt(a.stop_sequence) - parseInt(b.stop_sequence));
  }

  // 5. Find all remaining trips for today (active or future)
  const remainingTrips: any[] = [];

  for (const trip of activeTrips) {
    const sts = stopTimesByTrip.get(trip.trip_id);
    if (!sts || sts.length < 2) continue;

    const firstStop = sts[0];
    const lastStop = sts[sts.length - 1];

    // Consider trips that haven't arrived yet
    if (lastStop.arrival_time >= currentTimeStr) {
      const route = routes.find((r: any) => r.route_id === trip.route_id);
      const originStop = stops.find((s: any) => s.stop_id === firstStop.stop_id);
      const destStop = stops.find((s: any) => s.stop_id === lastStop.stop_id);

      remainingTrips.push({
        routeId: trip.route_id,
        routeName: route ? (route.route_long_name || route.route_short_name) : 'Unknown Route',
        directionId: trip.direction_id,
        tripId: trip.trip_id,
        headsign: trip.trip_headsign,
        origin: originStop ? originStop.stop_name : firstStop.stop_id,
        destination: destStop ? destStop.stop_name : lastStop.stop_id,
        departureTime: firstStop.departure_time,
        arrivalTime: lastStop.arrival_time,
        shapeId: trip.shape_id
      });
    }
  }

  // Sort by departure time
  return remainingTrips.sort((a, b) => a.departureTime.localeCompare(b.departureTime));
}

export async function getGtfsStops(apiKey: string) {
  if (!cachedGtfsData || Date.now() - lastFetchTime > CACHE_DURATION) {
    await getNextScheduledTrips(apiKey);
  }
  return cachedGtfsData.stops;
}
