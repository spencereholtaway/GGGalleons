import { VercelRequest, VercelResponse } from '@vercel/node';
import { getGtfsStops } from '../../gtfs.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const apiKey = process.env.TRANSIT_511_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "TRANSIT_511_API_KEY environment variable is required" });
    }

    const stops = await getGtfsStops(apiKey);
    res.json(stops);
  } catch (error) {
    console.error("Error fetching GTFS stops:", error);
    res.status(500).json({ error: "Failed to fetch GTFS stops" });
  }
}
