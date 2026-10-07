import { getAgentIdentity, getReputation } from "./src/chain.js";

let misses = 0;
let id = 1;
const found = [];

while (misses < 3 && id <= 100) {
  const identity = await getAgentIdentity(id);

  if (!identity.exists) {
    misses++;
  } else {
    misses = 0;
    const rep = await getReputation(id).catch(() => null);
    found.push({
      id,
      name: identity.name ?? "(not readable)",
      owner: identity.owner.slice(0, 10),
      feedback: rep?.feedbackCount ?? "?",
      summary: rep?.summaryValue ?? "?",
    });
  }

  id++;
}

console.table(found);
console.log(`Scanned up to #${id - 1}. Agents found: ${found.length}`);
