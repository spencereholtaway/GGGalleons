import { VercelRequest, VercelResponse } from '@vercel/node';
import { getNextScheduledTrips } from '../../gtfs.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const apiKey = process.env.TRANSIT_511_API_KEY;
    console.log("TRANSIT_511_API_KEY available:", !!apiKey);
    console.log("Environment variables:", Object.keys(process.env).filter(k => k.includes('TRANSIT') || k.includes('511')));

    if (!apiKey) {
      return res.status(500).json({ error: "TRANSIT_511_API_KEY environment variable is required" });
    }

    const requestedAgency = req.query.agency as string;
    const nextTrips = await getNextScheduledTrips(apiKey, requestedAgency);
    res.json(nextTrips);
  } catch (error: any) {
    console.error("Error fetching GTFS scheduled trips:", error);
    res.status(500).json({ error: error.message || "Failed to fetch GTFS scheduled trips", details: error.toString() });
  }
}
