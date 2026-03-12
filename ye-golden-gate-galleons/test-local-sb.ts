import fetch from "node-fetch";

async function test() {
  const res = await fetch(`http://localhost:3000/api/ferries/sailing?agency=SB`);
  console.log("SB VehicleMonitoring status:", res.status);
  const text = await res.text();
  console.log("SB VehicleMonitoring response:", text.substring(0, 500));

  const res2 = await fetch(`http://localhost:3000/api/ferries/scheduled?agency=SB`);
  console.log("SB StopMonitoring status:", res2.status);
  const text2 = await res2.text();
  console.log("SB StopMonitoring response:", text2.substring(0, 500));
}
test();
