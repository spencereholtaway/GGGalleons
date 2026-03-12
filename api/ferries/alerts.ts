import { VercelRequest, VercelResponse } from '@vercel/node';
import fetch from 'node-fetch';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const apiKey = process.env.TRANSIT_511_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "TRANSIT_511_API_KEY environment variable is required" });
    }

    const requestedAgency = req.query.agency as string;
    const agencies = requestedAgency ? [requestedAgency] : ['GF', 'SB'];

    const fetchPromises = agencies.map(async (agency) => {
      const response = await fetch(`https://api.511.org/transit/servicealerts?api_key=${apiKey}&agency=${agency}&format=json`);
      if (!response.ok) {
        console.error(`511 API responded with status: ${response.status} for agency ${agency}`);
        return null;
      }
      const text = await response.text();
      try {
        return JSON.parse(text.trim());
      } catch (e) {
        console.error(`Failed to parse JSON for agency ${agency}`);
        return null;
      }
    });

    const results = await Promise.all(fetchPromises);

    let combinedAlerts: any[] = [];
    let lastResponseTimestamp = "";

    results.forEach(data => {
      if (!data) return;
      const sed = data?.Siri?.ServiceDelivery?.SituationExchangeDelivery;
      if (sed?.ResponseTimestamp) {
        lastResponseTimestamp = sed.ResponseTimestamp;
      }

      const situations = sed?.Situations?.PtSituationElement;
      if (situations) {
        combinedAlerts = combinedAlerts.concat(
          Array.isArray(situations) ? situations : [situations]
        );
      }
    });

    res.json({
      Siri: {
        ServiceDelivery: {
          ResponseTimestamp: lastResponseTimestamp || new Date().toISOString(),
          Status: true,
          SituationExchangeDelivery: {
            version: "1.4",
            ResponseTimestamp: lastResponseTimestamp || new Date().toISOString(),
            Status: true,
            Situations: {
              PtSituationElement: combinedAlerts
            }
          }
        }
      }
    });
  } catch (error) {
    console.error("Error fetching service alerts:", error);
    res.status(500).json({ error: "Failed to fetch service alerts" });
  }
}
