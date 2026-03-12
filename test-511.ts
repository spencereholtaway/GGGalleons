import fetch from "node-fetch";
import "dotenv/config";

async function test() {
  const apiKey = process.env.TRANSIT_511_API_KEY;
  console.log("API Key:", apiKey ? "Exists" : "Missing");
  
  const res = await fetch(`https://api.511.org/transit/VehicleMonitoring?api_key=${apiKey}&agency=GF&format=json`);
  console.log("GF VehicleMonitoring status:", res.status);
  const text = await res.text();
  console.log("GF VehicleMonitoring response:", text.substring(0, 200));

  const res2 = await fetch(`https://api.511.org/transit/StopMonitoring?api_key=${apiKey}&agency=GF&format=json`);
  console.log("GF StopMonitoring status:", res2.status);
  const text2 = await res2.text();
  console.log("GF StopMonitoring response:", text2.substring(0, 200));
}
test();
