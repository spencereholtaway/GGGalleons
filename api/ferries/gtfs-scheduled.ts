import { VercelRequest, VercelResponse } from '@vercel/node';
import { getNextScheduledTrips } from '../../gtfs';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const apiKey = process.env.TRANSIT_511_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "TRANSIT_511_API_KEY environment variable is required" });
    }

    const requestedAgency = req.query.agency as string;
    const nextTrips = await getNextScheduledTrips(apiKey, requestedAgency);
    res.json(nextTrips);
  } catch (error: any) {
    console.error("Error fetching GTFS scheduled trips:", error);
    res.status(500).json({ error: error.message || "Failed to fetch GTFS scheduled trips" });
  }
}
