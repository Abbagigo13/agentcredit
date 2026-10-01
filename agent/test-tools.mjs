import { runTool } from "./src/tools.js";

console.log(await runTool("get_reputation", { agent_id: 1 }));
console.log(await runTool("compute_trust_score", { reputation_score: 52 }));
console.log(await runTool("check_threshold", { score: 52, threshold: 70 }));
