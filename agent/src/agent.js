import {
  getSuccessfulTaskCount,
  getTaskSuccessRate,
  tasks,
} from "./tasks.js";

const agent = {
  id: "agent-alpha",
  name: "Agent Alpha",
};

console.log("AgentCredit Demo Agent");
console.log("----------------------");

console.log(`Agent: ${agent.name}`);
console.log(`ID: ${agent.id}`);
console.log(`Tasks: ${tasks.length}`);
console.log(`Successful: ${getSuccessfulTaskCount()}`);
console.log(
  `Success rate: ${getTaskSuccessRate().toFixed(0)}%`
);