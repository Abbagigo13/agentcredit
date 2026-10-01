import { getAgentIdentity, getReputation } from "./src/chain.js";

for (const id of [1, 2, 3]) {
  console.log(await getAgentIdentity(id));
  console.log(await getReputation(id));
  console.log("---");
}
