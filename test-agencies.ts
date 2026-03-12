import fetch from "node-fetch";

async function test() {
  const res = await fetch(`http://localhost:3000/api/test?url=https://api.511.org/transit/operators`);
  const text = await res.text();
  console.log("Agencies:", text);
}
test();
