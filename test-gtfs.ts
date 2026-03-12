import fetch from "node-fetch";

async function test() {
  const res = await fetch(`http://localhost:3000/api/ferries/gtfs-scheduled?agency=SB`);
  console.log("SB gtfs-scheduled status:", res.status);
  const text = await res.text();
  console.log("SB gtfs-scheduled response:", text.substring(0, 500));
}
test();
