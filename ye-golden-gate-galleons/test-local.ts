import fetch from "node-fetch";

async function test() {
  const res = await fetch(`http://localhost:3000/api/ferries/sailing?agency=GF`);
  console.log("GF VehicleMonitoring status:", res.status);
  const text = await res.text();
  console.log("GF VehicleMonitoring response:", text.substring(0, 500));

  const res2 = await fetch(`http://localhost:3000/api/ferries/scheduled?agency=GF`);
  console.log("GF StopMonitoring status:", res2.status);
  const text2 = await res2.text();
  console.log("GF StopMonitoring response:", text2.substring(0, 500));
}
test();
