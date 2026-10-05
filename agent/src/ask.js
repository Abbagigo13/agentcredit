import { analyze } from "./analyst.js";

const task = process.argv.slice(2).join(" ");
if (!task) {
  console.error('Usage: node src/ask.js "your question"');
  process.exit(1);
}

console.log("Task:", task, "\n");

const { answer, steps } = await analyze(task, {
    record: process.env.RECORD === "1",
  onEvent: (e) => {
    if (e.type === "tool_call") console.log("-> tool:", e.name, JSON.stringify(e.args));
    if (e.type === "tool_result") console.log("   result:", JSON.stringify(e.result));
  },
});

console.log("\n" + answer);
console.log(`\n(${steps} model rounds)`);
