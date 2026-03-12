import "dotenv/config";
import express from "express";
import { createServer as createViteServer } from "vite";
import fetch from "node-fetch";
import { getNextScheduledTrips, getGtfsStops } from "./gtfs";

async function startServer() {
  const app = express();
  const PORT = 3000;

  // API routes
  app.get("/api/ferries/sailing", async (req, res) => {
    try {
      const apiKey = process.env['TRANSIT_511_API_KEY'];
      if (!apiKey) {
        return res.status(500).json({ error: "TRANSIT_511_API_KEY environment variable is required" });
      }
      
      const requestedAgency = req.query.agency as string;
      const agencies = requestedAgency ? [requestedAgency] : ['GF', 'SB'];
      
      const fetchPromises = agencies.map(async (agency) => {
        const response = await fetch(`https://api.511.org/transit/VehicleMonitoring?api_key=${apiKey}&agency=${agency}&format=json`);
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
      
      // Combine results
      let combinedVehicles: any[] = [];
      let lastResponseTimestamp = "";
      
      results.forEach(data => {
        if (!data) return;
        const vmd = data?.Siri?.ServiceDelivery?.VehicleMonitoringDelivery;
        if (vmd?.ResponseTimestamp) {
          lastResponseTimestamp = vmd.ResponseTimestamp;
        }
        
        if (Array.isArray(vmd)) {
          vmd.forEach((delivery: any) => {
            if (delivery.VehicleActivity) {
              combinedVehicles = combinedVehicles.concat(
                Array.isArray(delivery.VehicleActivity) ? delivery.VehicleActivity : [delivery.VehicleActivity]
              );
            }
          });
        } else if (vmd?.VehicleActivity) {
          combinedVehicles = combinedVehicles.concat(
            Array.isArray(vmd.VehicleActivity) ? vmd.VehicleActivity : [vmd.VehicleActivity]
          );
        }
      });

      res.json({
        Siri: {
          ServiceDelivery: {
            ResponseTimestamp: lastResponseTimestamp || new Date().toISOString(),
            Status: true,
            VehicleMonitoringDelivery: {
              version: "1.4",
              ResponseTimestamp: lastResponseTimestamp || new Date().toISOString(),
              VehicleActivity: combinedVehicles
            }
          }
        }
      });
    } catch (error) {
      console.error("Error fetching sailing ferries:", error);
      res.status(500).json({ error: "Failed to fetch sailing ferries" });
    }
  });

  app.get("/api/ferries/alerts", async (req, res) => {
    try {
      const apiKey = process.env['TRANSIT_511_API_KEY'];
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
  });

  app.get("/api/ferries/gtfs-scheduled", async (req, res) => {
    try {
      const apiKey = process.env['TRANSIT_511_API_KEY'];
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
  });

  app.get("/api/ferries/gtfs-stops", async (req, res) => {
    try {
      const apiKey = process.env['TRANSIT_511_API_KEY'];
      if (!apiKey) {
        return res.status(500).json({ error: "TRANSIT_511_API_KEY environment variable is required" });
      }
      
      const stops = await getGtfsStops(apiKey);
      res.json(stops);
    } catch (error) {
      console.error("Error fetching GTFS stops:", error);
      res.status(500).json({ error: "Failed to fetch GTFS stops" });
    }
  });

  app.get("/api/test", async (req, res) => {
    try {
      const apiKey = process.env['TRANSIT_511_API_KEY'];
      const url = req.query.url as string;
      const separator = url.includes('?') ? '&' : '?';
      const response = await fetch(`${url}${separator}api_key=${apiKey}&format=json`);
      const buffer = await response.arrayBuffer();
      res.set('Content-Type', response.headers.get('Content-Type') || 'application/octet-stream');
      res.send(Buffer.from(buffer));
    } catch (e: any) {
      res.status(500).send(e.message);
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
