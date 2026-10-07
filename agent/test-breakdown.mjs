import { getFeedbackBreakdown } from "./src/chain.js";

for (const id of [1, 10, 20, 9, 16]) {
  console.log(`Agent #${id}`);
  console.log(JSON.stringify(await getFeedbackBreakdown(id)));
}
