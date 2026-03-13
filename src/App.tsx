import { useEffect, useState } from 'react';
import { formatDistanceToNow, parseISO, format, differenceInMinutes, formatDistanceToNowStrict } from 'date-fns';
import { AlertTriangle, Clock, Ship, Calendar, Settings, Skull, RefreshCw, ArrowRight } from 'lucide-react';

interface VehicleActivity {
  MonitoredVehicleJourney: {
    LineRef: string;
    PublishedLineName: string;
    OriginName: string;
    DestinationName: string;
    VehicleRef?: string;
    Bearing?: number;
    Velocity?: number;
    MonitoredCall?: {
      ExpectedArrivalTime?: string;
      ExpectedDepartureTime?: string;
      AimedArrivalTime?: string;
      AimedDepartureTime?: string;
      StopPointName?: string;
    };
    OriginAimedDepartureTime?: string;
  };
  _dummyCountdown?: string;
  _dummyDelayText?: string;
  _dummyIsDelayed?: boolean;
  _dummyProgress?: number;
  _isScheduled?: boolean;
}

interface Alert {
  Summary: string;
  Description: string;
  ReasonName?: string;
  Consequences?: {
    Consequence: Array<{
      Condition: string;
      Severity: string;
    }>;
  };
}

interface GtfsTrip {
  routeId: string;
  routeName: string;
  directionId: string;
  tripId: string;
  headsign: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
  shapeId: string;
}

const GalleonIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 64 64" className={className} xmlns="http://www.w3.org/2000/svg">
    {/* Hull */}
    <path d="M 10 24 L 10 42 C 10 48, 25 54, 45 46 L 56 30 L 10 30 Z" fill="#451a03" />
    <path d="M 10 24 L 10 42 C 10 48, 25 54, 45 46 L 56 30 L 10 30 Z" fill="none" stroke="#1c1917" strokeWidth="2" strokeLinejoin="round" />
    
    {/* Stern Castle (Back) */}
    <rect x="6" y="16" width="12" height="14" fill="#78350f" stroke="#1c1917" strokeWidth="2" strokeLinejoin="round" />
    
    {/* Bowsprit (Front) */}
    <line x1="54" y1="32" x2="64" y2="22" stroke="#292524" strokeWidth="3" strokeLinecap="round" />
    
    {/* Masts */}
    <line x1="26" y1="6" x2="26" y2="30" stroke="#292524" strokeWidth="3" strokeLinecap="round" />
    <line x1="42" y1="10" x2="42" y2="30" stroke="#292524" strokeWidth="3" strokeLinecap="round" />
    
    {/* Sails */}
    <path d="M 26 8 Q 38 14 26 26 Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1" />
    <path d="M 42 12 Q 50 18 42 26 Z" fill="#fef3c7" stroke="#d97706" strokeWidth="1" />
    
    {/* Flags */}
    <path d="M 26 6 L 34 8 L 26 10 Z" fill="#000000" />
    <path d="M 42 10 L 48 11 L 42 12 Z" fill="#000000" />
    
    {/* Windows */}
    <circle cx="12" cy="22" r="1.5" fill="#fcd34d" />
    <circle cx="20" cy="38" r="2" fill="#fcd34d" />
    <circle cx="30" cy="38" r="2" fill="#fcd34d" />
    <circle cx="40" cy="38" r="2" fill="#fcd34d" />
  </svg>
);

const CompassWidget = ({ bearing, size = "md" }: { bearing?: number, size?: "sm" | "md" }) => {
  if (bearing === undefined) return null;
  const dim = size === "sm" ? "w-8 h-8" : "w-10 h-10";
  const textDim = size === "sm" ? "text-[5px]" : "text-[6px]";
  
  return (
    <div className={`relative ${dim} rounded-full border-2 border-amber-800/60 bg-amber-100/80 flex items-center justify-center shadow-md`}>
      <div className={`absolute top-0.5 ${textDim} font-bold text-amber-900/70`}>N</div>
      <div className={`absolute bottom-0.5 ${textDim} font-bold text-amber-900/70`}>S</div>
      
      <div 
        className="absolute w-full h-full transition-transform duration-1000 ease-out"
        style={{ transform: `rotate(${bearing}deg)` }}
      >
        <div className="absolute top-1/2 left-1/2 w-1 h-3 -ml-[2px] -mt-3 bg-red-600 origin-bottom" style={{ clipPath: 'polygon(50% 0%, 100% 100%, 0% 100%)' }}></div>
        <div className="absolute top-1/2 left-1/2 w-1 h-3 -ml-[2px] bg-slate-700 origin-top" style={{ clipPath: 'polygon(0% 0%, 100% 0%, 50% 100%)' }}></div>
      </div>
      
      <div className="absolute w-1 h-1 rounded-full bg-amber-900 z-10"></div>
    </div>
  );
};

const SeaCreatures = ({ isGoingToSF }: { isGoingToSF: boolean }) => {
  const [creatures, setCreatures] = useState<{id: number, emoji: string, top: number, duration: number, direction: number, isGiantSquid?: boolean, isJumping?: boolean}[]>([]);

  useEffect(() => {
    const emojis = ['🐋', '🦈', '🐟', '🐬', '🕊️', '🦑', '🐙'];
    let timeoutId: NodeJS.Timeout;

    const spawnCreature = (forceGiantSquid = false) => {
      const isGiantSquid = forceGiantSquid || Math.random() < (1 / 200);
      const emoji = isGiantSquid ? '🦑' : emojis[Math.floor(Math.random() * emojis.length)];
      const isDolphin = emoji === '🐬';
      const isBird = emoji === '🕊️';
      const isJumping = isDolphin && Math.random() < 0.5; // 50% chance for a dolphin to jump
      
      let top;
      if (isBird) {
        top = Math.random() * -50 - 20; // -20% to -70% (flies above the water)
      } else {
        top = Math.random() * 80 + 10; // 10% to 90% (swims below the water)
      }

      const newCreature = {
        id: Date.now() + Math.random(),
        emoji,
        top,
        duration: isGiantSquid ? 30 : Math.random() * 15 + 15, // 15s to 30s
        direction: isGoingToSF ? -1 : 1,
        isGiantSquid,
        isJumping
      };
      
      setCreatures(prev => [...prev, newCreature]);

      setTimeout(() => {
        setCreatures(prev => prev.filter(c => c.id !== newCreature.id));
      }, newCreature.duration * 1000);

      if (!forceGiantSquid) {
        // Spawn next one between 10s and 30s
        const nextSpawn = Math.random() * 20000 + 10000; 
        timeoutId = setTimeout(spawnCreature, nextSpawn);
      }
    };

    // Initial spawn between 2s and 10s
    timeoutId = setTimeout(() => spawnCreature(), Math.random() * 8000 + 2000);
    
    const handleUnleashSquid = () => spawnCreature(true);
    window.addEventListener('unleash-squid', handleUnleashSquid);

    return () => {
      clearTimeout(timeoutId);
      window.removeEventListener('unleash-squid', handleUnleashSquid);
    };
  }, [isGoingToSF]);

  return (
    <div className="absolute top-8 left-0 right-0 h-[150px] pointer-events-none z-0">
      {creatures.map(c => (
        <div
          key={c.id}
          className={`absolute opacity-60 drop-shadow-md ${c.isGiantSquid ? 'text-7xl md:text-9xl z-50' : 'text-2xl md:text-3xl'}`}
          style={{
            top: `${c.top}%`,
            animation: `swim-${c.direction === 1 ? 'right' : 'left'} ${c.duration}s linear forwards`
          }}
        >
          <div className={c.isJumping ? "animate-dolphin-jump" : "animate-bob"}>
            {c.emoji}
          </div>
        </div>
      ))}
    </div>
  );
};

const FOG_PARTICLES = Array.from({ length: 25 }).map((_, i) => {
  const isGreen = i === 13; // 1 out of 25 is 4%
  const bgColors = ['bg-blue-300/60', 'bg-white/60', 'bg-gray-300/60', 'bg-blue-200/50', 'bg-gray-400/50', 'bg-slate-300/60'];
  const borderColors = ['border-blue-300/60', 'border-white/60', 'border-gray-300/60', 'border-blue-200/50', 'border-gray-400/50', 'border-slate-300/60'];
  
  const isBubbly = i % 3 === 0;
  
  let colorClass = '';
  if (isGreen) {
    colorClass = isBubbly ? 'border-2 border-emerald-400/60 bg-emerald-400/20' : 'bg-emerald-400/60';
  } else {
    colorClass = isBubbly ? `border-2 ${borderColors[i % borderColors.length]} bg-transparent` : bgColors[i % bgColors.length];
  }
  
  const isSharp = i % 2 === 0; 
  const blurClass = isSharp ? (isBubbly ? 'blur-0' : 'blur-[1px]') : 'blur-md';
  
  const size = 16 + (i * 11) % 40; // 16px to 56px
  
  const left = -50 + (i * 23) % 100; // -50px to 50px
  const top = -30 + (i * 17) % 60; // -30px to 30px
  
  const delay = (i * 0.7) % 5; // 0s to 5s
  const duration = 4 + (i % 4); // 4s to 7s
  
  return { colorClass, blurClass, size, left, top, delay, duration };
});

const getDirection = (bearing: number) => {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((bearing %= 360) < 0 ? bearing + 360 : bearing) / 45) % 8];
};

export default function App() {
  const [activeTab, setActiveTab] = useState<'GF' | 'SB'>('GF');
  const [sailingFerries, setSailingFerries] = useState<VehicleActivity[]>([]);
  const [gtfsTrips, setGtfsTrips] = useState<GtfsTrip[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [useDummyData, setUseDummyData] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      const y = element.getBoundingClientRect().top + window.scrollY - 20;
      window.scrollTo({ top: y, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (useDummyData) {
      const now = new Date();
      const formatDummyTime = (addMinutes: number) => format(new Date(now.getTime() + addMinutes * 60000), 'h:mm a');
      const formatGtfsTime = (addMinutes: number) => format(new Date(now.getTime() + addMinutes * 60000), 'HH:mm:ss');

      setSailingFerries([
        {
          MonitoredVehicleJourney: {
            LineRef: "LARK",
            PublishedLineName: "Larkspur Ferry",
            OriginName: "Larkspur",
            DestinationName: "San Francisco",
            VehicleRef: "MV Del Norte",
          },
          _dummyCountdown: "in 15 minutes",
          _dummyDelayText: "5 min delay",
          _dummyIsDelayed: true,
          _dummyProgress: 60
        },
        {
          MonitoredVehicleJourney: {
            LineRef: "SAUS",
            PublishedLineName: "Sausalito Ferry",
            OriginName: "San Francisco",
            DestinationName: "Sausalito",
            VehicleRef: "MV Golden Gate",
          },
          _dummyCountdown: "in 5 minutes",
          _dummyDelayText: "On time",
          _dummyIsDelayed: false,
          _dummyProgress: 80
        }
      ]);

      setGtfsTrips([
        {
          routeId: "LARK",
          routeName: "Larkspur Ferry",
          directionId: "0",
          tripId: "DUMMY_TRIP_1",
          headsign: "San Francisco Ferry Terminal-Gate C",
          origin: "Larkspur Ferry Terminal",
          destination: "San Francisco Ferry Terminal-Gate C",
          departureTime: formatGtfsTime(60),
          arrivalTime: formatGtfsTime(90),
          shapeId: "SHAPE_1"
        },
        {
          routeId: "LARK",
          routeName: "Larkspur Ferry",
          directionId: "1",
          tripId: "DUMMY_TRIP_2",
          headsign: "Larkspur Ferry Terminal",
          origin: "San Francisco Ferry Terminal-Gate C",
          destination: "Larkspur Ferry Terminal",
          departureTime: formatGtfsTime(75),
          arrivalTime: formatGtfsTime(105),
          shapeId: "SHAPE_2"
        },
        {
          routeId: "SAUS",
          routeName: "Sausalito Ferry",
          directionId: "0",
          tripId: "DUMMY_TRIP_3",
          headsign: "San Francisco Ferry Terminal-Gate B",
          origin: "Sausalito (No Service to Tiburon)",
          destination: "San Francisco Ferry Terminal-Gate B",
          departureTime: formatGtfsTime(90),
          arrivalTime: formatGtfsTime(120),
          shapeId: "SHAPE_3"
        },
        {
          routeId: "SAUS",
          routeName: "Sausalito Ferry",
          directionId: "1",
          tripId: "DUMMY_TRIP_4",
          headsign: "Sausalito (No Service to Tiburon)",
          origin: "San Francisco Ferry Terminal-Gate B",
          destination: "Sausalito (No Service to Tiburon)",
          departureTime: formatGtfsTime(105),
          arrivalTime: formatGtfsTime(135),
          shapeId: "SHAPE_4"
        }
      ]);

      setAlerts([
        {
          Summary: "Dummy Alert: Expect Delays",
          Description: "This is a dummy alert for testing purposes. Expect delays on the Larkspur route due to heavy fog.",
          ReasonName: "Weather"
        }
      ]);
      
      setLoading(false);
      setError(null);
      return;
    }

    let isMounted = true;

    const fetchGtfsData = async () => {
      try {
        const res = await fetch(`/api/ferries/gtfs-scheduled?agency=${activeTab}`);
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `GTFS API failed (${res.status})`);
        }
        if (isMounted) {
          const data = await res.json();
          setGtfsTrips(data);
        }
      } catch (err: any) {
        console.error('Error fetching GTFS data:', err);
        if (isMounted) {
          setError(prev => prev ? `${prev} | GTFS Error: ${err.message}` : `GTFS Error: ${err.message}`);
        }
      }
    };

    const fetchData = async () => {
      try {
        setLoading(true);
        let sailingRes: any;
        let alertsRes: any;

        if (activeTab === 'GF') {
          // GF does not provide real-time VehicleMonitoring data via the 511 API.
          // Skip polling to save network requests and avoid empty data warnings.
          sailingRes = { ok: true, json: async () => ({}) };
          alertsRes = await fetch(`/api/ferries/alerts?agency=${activeTab}`);
        } else {
          const responses = await Promise.all([
            fetch(`/api/ferries/sailing?agency=${activeTab}`),
            fetch(`/api/ferries/alerts?agency=${activeTab}`)
          ]);
          sailingRes = responses[0];
          alertsRes = responses[1];
        }

        if (!isMounted) return;

        if (!sailingRes.ok) throw new Error(`Sailing API failed (${sailingRes.status})`);
        if (!alertsRes.ok) throw new Error(`Alerts API failed (${alertsRes.status})`);

        const sailingData = await sailingRes.json();
        const alertsData = await alertsRes.json();

        // Extract vehicles safely
        let vehicles: VehicleActivity[] = [];
        const vmd = sailingData?.Siri?.ServiceDelivery?.VehicleMonitoringDelivery;
        if (Array.isArray(vmd)) {
          vmd.forEach((delivery: any) => {
            if (delivery.VehicleActivity) {
              vehicles = vehicles.concat(Array.isArray(delivery.VehicleActivity) ? delivery.VehicleActivity : [delivery.VehicleActivity]);
            }
          });
        } else if (vmd?.VehicleActivity) {
          vehicles = Array.isArray(vmd.VehicleActivity) ? vmd.VehicleActivity : [vmd.VehicleActivity];
        }
        
        // Sort sailing ferries by departure time (OriginAimedDepartureTime or similar)
        const sortedVehicles = [...vehicles].sort((a, b) => {
          const timeA = a.MonitoredVehicleJourney.OriginAimedDepartureTime || '';
          const timeB = b.MonitoredVehicleJourney.OriginAimedDepartureTime || '';
          return timeA.localeCompare(timeB);
        });
        
        setSailingFerries(sortedVehicles);

        const situations = alertsData?.Siri?.ServiceDelivery?.SituationExchangeDelivery?.Situations?.PtSituationElement || [];
        setAlerts(situations);
        setLastUpdated(new Date());
        
        setError(prev => {
          if (prev && prev.includes('GTFS Error')) return prev;
          return null;
        });
      } catch (err: any) {
        if (!isMounted) return;
        console.error(err);
        setError(prev => prev ? `${prev} | Failed to load live ferry data.` : 'Failed to load live ferry data. Please check your API key and try again.');
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchGtfsData();
    fetchData();
    const interval = setInterval(fetchData, 60000); // Refresh every minute
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [useDummyData, activeTab, refreshKey]);

  const renderLeavingSoon = () => {
    const now = new Date();
    const currentHHMMSS = format(now, 'HH:mm:ss');
    
    const leavingSoon = gtfsTrips
      .filter(trip => {
        return trip.departureTime > currentHHMMSS;
      })
      .map(trip => {
        const depParts = trip.departureTime.split(':').map(Number);
        const depDate = new Date(now);
        depDate.setHours(depParts[0], depParts[1], depParts[2], 0);
        const diffMinutes = Math.round((depDate.getTime() - now.getTime()) / (60 * 1000));
        return { ...trip, diffMinutes };
      })
      .filter(trip => trip.diffMinutes > 0 && trip.diffMinutes <= 28)
      .sort((a, b) => a.diffMinutes - b.diffMinutes)
      .slice(0, 3);

    return (
      <div className="p-6 parchment rounded-sm">
        {leavingSoon.length > 0 ? (
          <div className="max-w-5xl mx-auto text-left">
            {/* Desktop Table */}
            <div className="hidden md:grid min-w-[700px] grid-cols-[80px_300px_18px_300px] gap-x-6 gap-y-4 items-center overflow-x-auto">
              {/* Headers */}
              <div className="text-[#000] font-fell text-[14px] font-normal leading-normal">Leaving in</div>
              <div className="text-[#000] font-fell text-[14px] font-normal leading-normal">From</div>
              <div></div>
              <div className="text-[#000] font-fell text-[14px] font-normal leading-normal">To</div>
              
              {leavingSoon.map((trip, i) => (
                <div key={i} className="contents">
                  <div className="text-[#000] font-fell text-[18px] font-normal leading-normal truncate">{trip.diffMinutes}m</div>
                  <div className="text-[#000] font-fell text-[18px] font-normal leading-normal truncate" title={trip.origin}>{trip.origin}</div>
                  <div className="flex justify-center"><ArrowRight className="w-[18px] h-[18px] text-[#000]" /></div>
                  <div className="text-[#000] font-fell text-[18px] font-normal leading-normal truncate" title={trip.destination}>{trip.destination}</div>
                </div>
              ))}
            </div>

            {/* Mobile Layout */}
            <div className="md:hidden space-y-4">
              {leavingSoon.map((trip, i) => (
                <div key={i} className="border-b border-black/10 pb-4 last:border-0">
                  <div className="grid grid-cols-[60px_1fr] gap-x-4 gap-y-1 items-baseline">
                    {/* Row 1: Time and Origin */}
                    <div className="text-[#000] font-fell text-[18px] font-normal leading-tight text-right pr-4">
                      {trip.diffMinutes}m
                    </div>
                    <div className="text-[#000] font-fell text-[14px] font-normal leading-tight truncate" title={trip.origin}>
                      {trip.origin}
                    </div>
                    {/* Row 2: "to" and Destination */}
                    <div className="text-[#000] font-fell text-[18px] font-normal italic leading-tight text-right pr-4">
                      to
                    </div>
                    <div className="text-[#000] font-fell text-[14px] font-normal leading-tight truncate" title={trip.destination}>
                      {trip.destination}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-amber-900 font-medium italic">No ships leavin' soon, gander the schedule section below</p>
          </div>
        )}
      </div>
    );
  };

  const renderSailingSea = () => {
    const mergedFerries = (() => {
      if (activeTab === 'SB') return sailingFerries;
      
      // For GF, we use scheduled times to estimate live positions
      const now = new Date();
      const currentHHMMSS = format(now, 'HH:mm:ss');
      
      const activeScheduled = gtfsTrips.filter(trip => {
        // Basic check for "active" trip
        return currentHHMMSS >= trip.departureTime && currentHHMMSS <= trip.arrivalTime;
      }).map(trip => {
        const depParts = trip.departureTime.split(':').map(Number);
        const arrParts = trip.arrivalTime.split(':').map(Number);
        
        const depDate = new Date(now);
        depDate.setHours(depParts[0], depParts[1], depParts[2], 0);
        
        const arrDate = new Date(now);
        arrDate.setHours(arrParts[0], arrParts[1], arrParts[2], 0);
        
        const totalDuration = arrDate.getTime() - depDate.getTime();
        const elapsed = now.getTime() - depDate.getTime();
        const progress = totalDuration > 0 ? (elapsed / totalDuration) * 100 : 0;

        return {
          MonitoredVehicleJourney: {
            LineRef: trip.routeId,
            PublishedLineName: trip.routeName,
            OriginName: trip.origin,
            DestinationName: trip.destination,
            VehicleRef: `GGF ${trip.tripId.split('-')[0]}`,
            MonitoredCall: {
              ExpectedArrivalTime: arrDate.toISOString(),
              AimedArrivalTime: arrDate.toISOString(),
            },
            OriginAimedDepartureTime: depDate.toISOString(),
          },
          _dummyProgress: progress,
          _isScheduled: true
        } as VehicleActivity;
      });

      return [...sailingFerries, ...activeScheduled];
    })();

    if (mergedFerries.length === 0) {
      return (
        <div className="p-8 text-center text-amber-900 parchment rounded-sm">
          <Skull className="w-16 h-16 mx-auto mb-4 text-amber-800" />
          <p className="text-xl font-bold mb-4">Arrr, the seas be empty. No galleons sailin'.</p>
        </div>
      );
    }

    const routesMap = new Map<string, VehicleActivity[]>();
    mergedFerries.forEach(ferry => {
      let routeName = ferry.MonitoredVehicleJourney.PublishedLineName;
      if (!routeName) {
        const origin = ferry.MonitoredVehicleJourney.OriginName;
        const dest = ferry.MonitoredVehicleJourney.DestinationName;
        if (origin && dest) {
          routeName = `${origin} to ${dest}`;
        } else if (ferry.MonitoredVehicleJourney.VehicleRef) {
          routeName = `Vessel: ${ferry.MonitoredVehicleJourney.VehicleRef}`;
        } else {
          routeName = 'Unknown Route';
        }
      }
      if (!routesMap.has(routeName)) routesMap.set(routeName, []);
      routesMap.get(routeName)!.push(ferry);
    });

    const sfNames = ['San Francisco', 'SF', 'San Francisco Ferry Building'];
    
    // Sort routes alphabetically
    const sortedRoutes = Array.from(routesMap.entries()).sort((a, b) => a[0].localeCompare(b[0]));

    return (
      <div className="space-y-6">
        {sortedRoutes.map(([routeName, ferries]) => {
          // Determine non-SF terminal
          let nonSFTerminal = 'Unknown';
          const firstFerry = ferries[0];
          const origin = firstFerry.MonitoredVehicleJourney.OriginName || '';
          const dest = firstFerry.MonitoredVehicleJourney.DestinationName || '';
          
          if (sfNames.some(sf => origin.includes(sf))) {
            nonSFTerminal = dest;
          } else {
            nonSFTerminal = origin;
          }
          
          const firstFerryIsGoingToSF = sfNames.some(sf => dest.includes(sf));

          return (
            <div key={routeName} className="parchment p-4 md:p-6 rounded-sm overflow-hidden relative">
              <div className="mb-4 border-b-2 border-amber-700 pb-2 relative z-10">
                <h3 className="text-[28px] md:text-3xl font-pirate text-amber-900 leading-none">{routeName}</h3>
              </div>
              
              <div className="relative z-10 space-y-8">
                {ferries.map((ferry, idx) => {
                  const isGoingToSF = sfNames.some(sf => (ferry.MonitoredVehicleJourney.DestinationName || '').includes(sf));
                  let countdownText = ferry._dummyCountdown;
                  let hasArrivalTime = true;
                  
                  if (countdownText === 'Unknown arrival') {
                    hasArrivalTime = false;
                  } else if (!countdownText) {
                    const call = ferry.MonitoredVehicleJourney.MonitoredCall;
                    const expectedArrival = call?.ExpectedArrivalTime || call?.AimedArrivalTime;
                    if (expectedArrival) {
                      try {
                        countdownText = formatDistanceToNowStrict(parseISO(expectedArrival), { addSuffix: true });
                        if (countdownText === 'in 0 seconds' || countdownText.includes('ago')) {
                          countdownText = 'less than a minute ago';
                        }
                      } catch (e) {
                        countdownText = 'Unknown arrival';
                        hasArrivalTime = false;
                      }
                    } else {
                      countdownText = 'Unknown arrival';
                      hasArrivalTime = false;
                    }
                  }
                  
                  let statusText = '';
                  if (!hasArrivalTime) {
                    const call = ferry.MonitoredVehicleJourney.MonitoredCall;
                    const expectedArrival = call?.ExpectedArrivalTime || call?.AimedArrivalTime;
                    if (expectedArrival) {
                      try {
                        const timeIn = formatDistanceToNowStrict(parseISO(expectedArrival), { addSuffix: true });
                        statusText = `Lost in the fog! Scheduled to arrive ${timeIn}.`;
                      } catch (e) {
                        statusText = 'Lost in the fog';
                      }
                    } else {
                      statusText = 'Lost in the fog';
                    }
                  } else if (countdownText === 'less than a minute ago') {
                    statusText = `Dropped anchor ${countdownText}`;
                  } else {
                    statusText = `Droppin' anchor ${countdownText}`;
                  }

                  let progress = 50;
                  if (ferry._dummyProgress !== undefined) {
                    progress = ferry._dummyProgress;
                  } else if (hasArrivalTime) {
                    const call = ferry.MonitoredVehicleJourney.MonitoredCall;
                    const expectedArrival = call?.ExpectedArrivalTime || call?.AimedArrivalTime;
                    const departure = ferry.MonitoredVehicleJourney.OriginAimedDepartureTime;
                    if (expectedArrival && departure) {
                      const arrTime = parseISO(expectedArrival).getTime();
                      const depTime = parseISO(departure).getTime();
                      const now = Date.now();
                      if (arrTime > depTime) {
                        progress = ((now - depTime) / (arrTime - depTime)) * 100;
                      }
                    } else {
                      // If we don't have departure time, estimate based on typical 30 min voyage
                      const arrTime = parseISO(expectedArrival!).getTime();
                      const now = Date.now();
                      const timeRemaining = arrTime - now;
                      const estimatedTotalTime = 30 * 60 * 1000; // 30 mins
                      if (timeRemaining > 0 && timeRemaining < estimatedTotalTime) {
                        progress = ((estimatedTotalTime - timeRemaining) / estimatedTotalTime) * 100;
                      } else if (timeRemaining <= 0) {
                        progress = 100;
                      } else {
                        progress = 0;
                      }
                    }
                  }
                  
                  progress = Math.max(5, Math.min(95, progress));
                  
                  const leftPos = isGoingToSF ? progress : (100 - progress);
                  const directionScale = isGoingToSF ? 1 : -1;

                  return (
                    <div key={idx} className="relative pt-2 pb-6 px-2 md:px-8">
                      {/* Ferry Info Header */}
                      <div className="text-center mb-2">
                        <div className="font-bold text-amber-900 text-lg flex flex-col md:flex-row items-center justify-center gap-0 md:gap-2">
                          <span>
                            {hasArrivalTime && countdownText === 'less than a minute ago' 
                              ? `Anchored at ${isGoingToSF ? 'San Francisco' : nonSFTerminal}` 
                              : `Sailin' to ${isGoingToSF ? 'San Francisco' : nonSFTerminal}`}
                          </span>
                        </div>
                        <div className="text-amber-800 font-medium">{statusText}</div>
                      </div>

                      {/* Sea / Wiggly Line */}
                      <div className="relative h-16 w-full flex items-center">
                         <svg width="100%" height="100%" preserveAspectRatio="none">
                           <defs>
                             <pattern id={`waves-${routeName.replace(/\s+/g, '-')}-${idx}`} x="0" y="0" width="60" height="64" patternUnits="userSpaceOnUse">
                               <path d="M 0 32 Q 15 16 30 32 T 60 32" fill="none" stroke="#0369a1" strokeWidth="4" strokeLinecap="round" />
                             </pattern>
                           </defs>
                           <rect x="0" y="0" width="100%" height="100%" fill={`url(#waves-${routeName.replace(/\s+/g, '-')}-${idx})`} />
                         </svg>
                         
                         <SeaCreatures isGoingToSF={isGoingToSF} />
                         
                         {/* Fog overlay if no arrival time */}
                         {!hasArrivalTime && (
                           <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
                             <div className="relative w-32 h-16 flex items-center justify-center">
                               {FOG_PARTICLES.map((particle, i) => (
                                 <div 
                                   key={i}
                                   className={`absolute rounded-full animate-fog-particle ${particle.colorClass} ${particle.blurClass}`}
                                   style={{ 
                                     width: `${particle.size}px`, 
                                     height: `${particle.size}px`,
                                     left: `calc(50% - ${particle.size / 2}px + ${particle.left}px)`,
                                     top: `calc(50% - ${particle.size / 2}px + ${particle.top}px)`,
                                     animationDelay: `${particle.delay}s`,
                                     animationDuration: `${particle.duration}s`
                                   }}
                                 ></div>
                               ))}

                               {/* Bobbing ship name below the fog */}
                               <div className="absolute top-[60%] left-0 right-0 flex flex-col items-center justify-center animate-bob z-30">
                                 {/* Compass integrated into the info block */}
                                 {(routeName.startsWith('Vessel:') || routeName === 'Unknown Route' || ferry.MonitoredVehicleJourney.Bearing !== undefined) && (
                                   <div className="mb-2">
                                     <CompassWidget bearing={ferry.MonitoredVehicleJourney.Bearing} size="sm" />
                                   </div>
                                 )}
                                 
                                 <div className="text-amber-800/70 font-medium italic whitespace-nowrap">
                                   <div className="flex items-center gap-1">
                                     {!ferry._isScheduled && <span>{ferry.MonitoredVehicleJourney.VehicleRef}</span>}
                                   </div>
                                 </div>
                                 {(routeName.startsWith('Vessel:') || routeName === 'Unknown Route' || ferry.MonitoredVehicleJourney.Velocity !== undefined) && (
                                   <div className="text-amber-900/60 text-xs font-medium whitespace-nowrap mt-1">
                                     {ferry.MonitoredVehicleJourney.Velocity === undefined || ferry.MonitoredVehicleJourney.Velocity < 1 
                                       ? (ferry.MonitoredVehicleJourney.MonitoredCall?.StopPointName ? `Anchored at ${ferry.MonitoredVehicleJourney.MonitoredCall.StopPointName}` : 'Anchored') 
                                       : `${getDirection(ferry.MonitoredVehicleJourney.Bearing || 0)} • ${Math.round((ferry.MonitoredVehicleJourney.Velocity || 0) * 0.539957)}kts`}
                                   </div>
                                 )}
                               </div>
                             </div>
                           </div>
                         )}
                         
                         {/* Ferry */}
                         {hasArrivalTime && (
                           <div className="absolute inset-0 pointer-events-none">
                             <div 
                               className="absolute top-1/2 -translate-y-1/2 -ml-6 md:-ml-8 pointer-events-auto transition-all duration-1000"
                               style={{ left: `${leftPos}%` }}
                             >
                               <div className="relative group cursor-pointer flex flex-col items-center" tabIndex={0}>
                                 <div className="relative animate-bob drop-shadow-xl origin-bottom flex flex-col items-center">
                                   <div style={{ transform: `scaleX(${directionScale})` }}>
                                     <GalleonIcon className="w-12 h-12 md:w-20 md:h-20 text-blue-900" />
                                   </div>
                                   <div className="text-amber-800 font-medium italic whitespace-nowrap absolute top-full -mt-3 md:-mt-5 flex flex-col items-center">
                                     <div className="flex items-center gap-1">
                                       {!ferry._isScheduled && <span>{ferry.MonitoredVehicleJourney.VehicleRef || 'Ghost Ship'}</span>}
                                     </div>
                                     {(routeName.startsWith('Vessel:') || routeName === 'Unknown Route' || ferry.MonitoredVehicleJourney.Velocity !== undefined) && (
                                       <span className="text-amber-900/60 text-xs font-medium mt-0.5">
                                         {ferry.MonitoredVehicleJourney.Velocity === undefined || ferry.MonitoredVehicleJourney.Velocity < 1 
                                           ? (ferry.MonitoredVehicleJourney.MonitoredCall?.StopPointName ? `Anchored at ${ferry.MonitoredVehicleJourney.MonitoredCall.StopPointName}` : 'Anchored') 
                                           : `${getDirection(ferry.MonitoredVehicleJourney.Bearing || 0)} • ${Math.round((ferry.MonitoredVehicleJourney.Velocity || 0) * 0.539957)}kts`}
                                       </span>
                                     )}
                                   </div>
                                 </div>
                               </div>
                             </div>
                           </div>
                         )}
                      </div>

                      {/* Terminals (Below the sea) */}
                      <div className="flex justify-between items-center mt-2">
                        {/* Left Terminal (Non-SF) */}
                        <div className="text-left transform -rotate-2 w-1/2 pr-2">
                          <div className="font-pirate text-amber-900 text-lg md:text-xl uppercase tracking-wider leading-tight">{nonSFTerminal}</div>
                        </div>
                        
                        {/* Right Terminal (SF) */}
                        <div className="text-right transform rotate-2 w-1/2 pl-2">
                          <div className="font-pirate text-amber-900 text-lg md:text-xl uppercase tracking-wider leading-tight">San Francisco</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const renderGtfsTable = () => {
    const now = new Date();
    const currentHHMMSS = format(now, 'HH:mm:ss');

    // Filter to only show the next upcoming trip per route and direction
    const nextTripsOnly = (() => {
      const map = new Map<string, GtfsTrip>();
      gtfsTrips.forEach(trip => {
        // Only consider trips that haven't departed yet
        if (trip.departureTime >= currentHHMMSS) {
          const key = `${trip.routeName}_${trip.directionId}`;
          const existing = map.get(key);
          if (!existing || trip.departureTime < existing.departureTime) {
            map.set(key, trip);
          }
        }
      });
      return Array.from(map.values());
    })();

    if (nextTripsOnly.length === 0) {
      return (
        <div className="p-8 text-center text-amber-900 parchment rounded-sm">
          <Calendar className="w-16 h-16 mx-auto mb-4 text-amber-800" />
          <p className="text-xl font-bold">The Cap'n's log be empty for today.</p>
        </div>
      );
    }

    // Group by routeName
    const groupedTrips = nextTripsOnly.reduce((acc, trip) => {
      if (!acc[trip.routeName]) {
        acc[trip.routeName] = [];
      }
      acc[trip.routeName].push(trip);
      return acc;
    }, {} as Record<string, GtfsTrip[]>);

    // Sort route names alphabetically
    const sortedRouteNames = Object.keys(groupedTrips).sort((a, b) => a.localeCompare(b));

    // Convert HH:MM:SS to a more readable format
    const formatTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':');
      let h = parseInt(hours);
      const ampm = h >= 12 && h < 24 ? 'pm' : 'am';
      if (h > 12 && h < 24) h -= 12;
      if (h === 0 || h === 24) h = 12;
      return `${h}:${minutes}${ampm}`;
    };

    return (
      <div className="parchment rounded-sm divide-y-2 divide-amber-200">
        {sortedRouteNames.map((routeName, idx) => {
          const trips = groupedTrips[routeName];
          // Sort trips within route by departure time
          const sortedTrips = [...trips].sort((a, b) => a.departureTime.localeCompare(b.departureTime));

          return (
            <div key={idx} className="p-4 md:p-6 hover:bg-amber-100 transition-colors">
              <div className="font-bold text-amber-900 text-xl md:text-2xl mb-3 md:mb-4">{routeName}</div>
              
              <div className="flex flex-col gap-8">
                {sortedTrips.map((trip, tripIdx) => (
                  <div key={tripIdx} className="flex flex-col">
                    {/* Desktop/Tablet Layout */}
                    <div className="hidden md:block">
                      <div className="flex items-center justify-between">
                        <div className="flex-1 text-amber-900 text-xl pr-8">{trip.origin}</div>
                        <div className="flex-shrink-0">
                          <ArrowRight className="w-6 h-6 text-amber-900" />
                        </div>
                        <div className="flex-1 text-amber-900 text-xl text-right pl-8">{trip.destination}</div>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="text-amber-900 text-2xl">{formatTime(trip.departureTime)}</div>
                        <div className="text-amber-900 text-2xl text-right">{formatTime(trip.arrivalTime)}</div>
                      </div>
                    </div>

                    {/* Mobile Layout */}
                    <div className="md:hidden">
                      <div className="flex justify-between gap-4 mb-4">
                        <div className="flex-1 text-amber-900 text-lg leading-tight">{trip.origin}</div>
                        <div className="flex-1 text-amber-900 text-lg leading-tight text-right">{trip.destination}</div>
                      </div>
                      
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex-1 bg-black/5 p-3 rounded-sm text-center">
                          <div className="text-amber-900 text-lg">{formatTime(trip.departureTime)}</div>
                        </div>
                        <div className="px-1">
                          <ArrowRight className="w-5 h-5 text-amber-900" />
                        </div>
                        <div className="flex-1 bg-black/5 p-3 rounded-sm text-center">
                          <div className="text-amber-900 text-lg">{formatTime(trip.arrivalTime)}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-amber-100 font-body p-4 md:p-8 relative">
      <div className="absolute inset-0 pointer-events-none opacity-10" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'400\' height=\'400\'%3E%3Cpath d=\'M0 0 L400 400 M400 0 L0 400\' stroke=\'%23ffffff\' stroke-width=\'1\'/%3E%3Ccircle cx=\'200\' cy=\'200\' r=\'150\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'1\' stroke-dasharray=\'5,5\'/%3E%3Ccircle cx=\'200\' cy=\'200\' r=\'140\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'2\'/%3E%3Cpath d=\'M200 20 L220 180 L380 200 L220 220 L200 380 L180 220 L20 200 L180 180 Z\' fill=\'none\' stroke=\'%23ffffff\' stroke-width=\'1\'/%3E%3Cpath d=\'M200 200 L400 100 M200 200 L400 300 M200 200 L0 100 M200 200 L0 300 M200 200 L100 0 M200 200 L300 0 M200 200 L100 400 M200 200 L300 400\' stroke=\'%23ffffff\' stroke-width=\'0.5\'/%3E%3C/svg%3E")', backgroundSize: '400px 400px' }}></div>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IM+Fell+DW+Pica:ital@0;1&family=Pirata+One&display=swap');
        .font-pirate { font-family: 'Pirata One', system-ui, sans-serif; letter-spacing: 1px; }
        .font-body { font-family: 'IM Fell DW Pica', serif; }
        @keyframes bob {
          0%, 100% { transform: translateY(0) rotate(0deg); }
          25% { transform: translateY(-3px) rotate(2deg); }
          50% { transform: translateY(0) rotate(0deg); }
          75% { transform: translateY(3px) rotate(-2deg); }
        }
        .animate-bob {
          animation: bob 3s ease-in-out infinite;
        }
        @keyframes dolphin-jump {
          0%, 60%, 100% { transform: translateY(0) rotate(0deg); }
          10% { transform: translateY(-20px) rotate(30deg); }
          20% { transform: translateY(-60px) rotate(0deg); }
          30% { transform: translateY(-20px) rotate(-30deg); }
          40% { transform: translateY(0) rotate(0deg); }
        }
        .animate-dolphin-jump {
          animation: dolphin-jump 5s infinite;
        }
        @keyframes fog-particle {
          0%, 100% { transform: scale(1) translate(0, 0); opacity: 0.3; }
          33% { transform: scale(1.2) translate(-5px, -5px); opacity: 0.7; }
          66% { transform: scale(1.1) translate(5px, 5px); opacity: 0.5; }
        }
        .animate-fog-particle {
          animation: fog-particle 6s infinite ease-in-out;
        }
        @keyframes swim-right {
          from { left: -10%; transform: scaleX(-1); }
          to { left: 110%; transform: scaleX(-1); }
        }
        @keyframes swim-left {
          from { left: 110%; transform: scaleX(1); }
          to { left: -10%; transform: scaleX(1); }
        }
        .parchment {
          background-color: #fdf6e3;
          background-image: url("https://www.transparenttextures.com/patterns/old-wall.png");
          border: 2px solid #b45309;
          box-shadow: 4px 4px 0px rgba(0,0,0,0.5);
        }
      `}</style>
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <header className="flex flex-col items-center justify-center pb-6 border-b-2 border-amber-700/50 gap-4 text-center">
          <div>
            <h1 className="text-5xl font-pirate text-amber-400 drop-shadow-md">Ye Golden Gate Galleon Tracker</h1>
          </div>
        </header>

        <div className="flex space-x-2 md:space-x-4 mb-8">
          <button
            onClick={() => setActiveTab('GF')}
            className={`px-3 md:px-6 py-2 md:py-3 font-pirate text-xl md:text-2xl tracking-wider rounded-t-lg transition-colors border-t-2 border-l-2 border-r-2 whitespace-nowrap ${
              activeTab === 'GF'
                ? 'bg-amber-100 text-amber-900 border-amber-700'
                : 'bg-amber-900/50 text-amber-200 border-transparent hover:bg-amber-800/50'
            }`}
          >
            GG Ferries
          </button>
          <button
            onClick={() => setActiveTab('SB')}
            className={`px-3 md:px-6 py-2 md:py-3 font-pirate text-xl md:text-2xl tracking-wider rounded-t-lg transition-colors border-t-2 border-l-2 border-r-2 whitespace-nowrap ${
              activeTab === 'SB'
                ? 'bg-amber-100 text-amber-900 border-amber-700'
                : 'bg-amber-900/50 text-amber-200 border-transparent hover:bg-amber-800/50'
            }`}
          >
            SF Bay Ferries
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-800 text-red-900 p-4 rounded-sm flex items-start gap-3 shadow-md">
            <AlertTriangle className="w-6 h-6 mt-0.5 flex-shrink-0 text-red-700" />
            <div>
              <h3 className="font-pirate text-2xl">Shiver me timbers! A squall!</h3>
              <p className="text-sm mt-1 font-medium">{error}</p>
            </div>
          </div>
        )}

        <section id="leaving-soon">
          <h2 className="text-4xl font-pirate mb-4 flex items-center gap-3 text-amber-400 drop-shadow-md">
            <Clock className="w-8 h-8 text-amber-200" />
            Settin' Sail Soon
          </h2>
          {renderLeavingSoon()}
        </section>

        <section id="live-voyages">
          <h2 className="text-4xl font-pirate mb-4 flex items-center gap-3 text-amber-400 drop-shadow-md">
            <Ship className="w-8 h-8 text-amber-200" />
            Sailin' the High Seas
          </h2>
          {activeTab === 'GF' && (
            <div className="text-center md:text-left text-amber-400 mb-6">
              <p className="text-base md:text-xl font-bold italic">
                D'arr! We be relyin' on the Cap'n's schedules to plot these galleons as Golden Gate Ferry doesn't provide reliable real time tracking!
              </p>
            </div>
          )}
          {renderSailingSea()}
        </section>

        <section id="scheduled-voyages">
          <div className="mb-4">
            <h2 className="text-4xl font-pirate flex items-center gap-3 text-amber-400 drop-shadow-md">
              <Calendar className="w-8 h-8 text-amber-200" />
              Weighin' Anchor Soon
            </h2>
            <div className="text-amber-400 text-xl md:text-2xl font-bold ml-11">
              Next scheduled voyages per route
            </div>
          </div>
          {renderGtfsTable()}
        </section>

        <section className="mt-12 p-6 parchment rounded-sm">
          <h3 className="text-3xl font-pirate text-amber-900 mb-4 flex items-center gap-3 border-b-2 border-amber-700 pb-2">
            <Settings className="w-8 h-8 text-amber-800" />
            Quartermaster's Tools
          </h3>
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-pirate text-amber-900 text-2xl">Fool's Gold (Dummy Data)</div>
                <div className="text-sm text-amber-800 font-medium">Fill the seas with ghost ships for testin'.</div>
              </div>
              <button
                onClick={() => setUseDummyData(!useDummyData)}
                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 border-2 border-amber-900 ${useDummyData ? 'bg-green-600' : 'bg-red-800'}`}
              >
                <span className={`inline-block h-6 w-6 transform rounded-full bg-amber-100 transition-transform border-2 border-amber-900 ${useDummyData ? 'translate-x-6' : 'translate-x-1'}`} />
              </button>
            </div>
            
            <div className="flex items-center justify-between border-t-2 border-amber-200 pt-4">
              <div>
                <div className="font-pirate text-amber-900 text-2xl">Release the Kraken!</div>
                <div className="text-sm text-amber-800 font-medium">Summon a giant squid immediately.</div>
              </div>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('unleash-squid'))}
                className="bg-red-800 hover:bg-red-700 text-amber-100 font-pirate text-xl px-4 py-2 rounded-sm border-2 border-red-900 shadow-md transition-colors"
              >
                Unleash the Giant Squid
              </button>
            </div>
          </div>
        </section>
        
        {lastUpdated && (
          <div className="text-center pb-8 pt-4">
            <p className="text-amber-500/70 text-sm font-mono">
              Last sighted: {format(lastUpdated, 'HH:mm:ss')}
            </p>
            <div id="bmc-button"></div>
          </div>
        )}
      </div>
      
      {/* Floating Action Buttons */}
      <div className="fixed bottom-6 right-6 z-50 pb-[env(safe-area-inset-bottom)] pr-[env(safe-area-inset-right)] flex flex-col gap-4">
        <button
          onClick={() => scrollToSection('leaving-soon')}
          className="w-14 h-14 rounded-full bg-amber-600 hover:bg-amber-500 flex items-center justify-center shadow-lg border-2 border-amber-900 transition-all hover:scale-105 active:scale-95"
          aria-label="Scroll to Settin' Sail Soon"
        >
          <Clock className="w-6 h-6 text-amber-100" />
        </button>
        <button
          onClick={() => scrollToSection('live-voyages')}
          className="w-14 h-14 rounded-full bg-amber-600 hover:bg-amber-500 flex items-center justify-center shadow-lg border-2 border-amber-900 transition-all hover:scale-105 active:scale-95"
          aria-label="Scroll to Live Voyages"
        >
          <Ship className="w-6 h-6 text-amber-100" />
        </button>
        <button
          onClick={() => scrollToSection('scheduled-voyages')}
          className="w-14 h-14 rounded-full bg-amber-600 hover:bg-amber-500 flex items-center justify-center shadow-lg border-2 border-amber-900 transition-all hover:scale-105 active:scale-95"
          aria-label="Scroll to Scheduled Voyages"
        >
          <Calendar className="w-6 h-6 text-amber-100" />
        </button>
        <button
          onClick={() => !loading && setRefreshKey(prev => prev + 1)}
          disabled={loading}
          className={`w-14 h-14 rounded-full bg-yellow-400 hover:bg-yellow-300 flex items-center justify-center shadow-lg border-2 border-amber-700 transition-all ${loading ? 'opacity-80 cursor-not-allowed' : 'hover:scale-105 active:scale-95'}`}
          aria-label="Refresh Spyglass"
        >
          <RefreshCw className={`w-6 h-6 text-black ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>
    </div>
  );
}
