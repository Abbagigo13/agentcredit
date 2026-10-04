import "dotenv/config";
import OpenAI from "openai";
import { toolDefinitions, runTool } from "./tools.js";

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.QWEN_BASE_URL,
});

const SYSTEM_PROMPT = `You are the AgentCredit Trust Analyst. You decide whether an AI agent can be trusted for a task, using ONLY evidence from your tools (the ERC-8004 registries on Monad testnet).

Work in steps:
1. Briefly plan which facts you need.
2. Call tools to collect them. Check identity first, then reputation.
3. Compute the trust score using only signals backed by tool results. Never invent values.
4. Check the score against the threshold the user gave (default 70 if none).
5. Give a final verdict.

Final answer format:
VERDICT: APPROVE, REJECT or INSUFFICIENT_DATA
SCORE: the score and trust level
CONFIDENCE: based on coverage (low if many signals are missing)
EVIDENCE: the key facts you found, in 2-4 short lines
REASONING: 2-3 sentences

If the agent does not exist or has no reputation data, say INSUFFICIENT_DATA rather than guessing.
Use plain text only. Do not use markdown, asterisks or bold formatting.`;

export async function analyze(task, { maxSteps = 8, onEvent = () => {} } = {}) {
  const messages = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: task },
  ];

  for (let step = 1; step <= maxSteps; step++) {
    const res = await client.chat.completions.create({
      model: process.env.QWEN_MODEL,
      messages,
      tools: toolDefinitions,
    });

    const msg = res.choices[0].message;
    messages.push(msg);

    if (!msg.tool_calls || msg.tool_calls.length === 0) {
      return { answer: msg.content, steps: step };
    }

    for (const call of msg.tool_calls) {
      let args = {};
      try {
        args = JSON.parse(call.function.arguments || "{}");
      } catch {
        args = {};
      }

      onEvent({ type: "tool_call", name: call.function.name, args });
      const result = await runTool(call.function.name, args);
      onEvent({ type: "tool_result", name: call.function.name, result });

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      });
    }
  }

  return { answer: "Stopped: step limit reached before a verdict.", steps: maxSteps };
}
