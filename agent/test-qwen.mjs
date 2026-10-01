import 'dotenv/config';
import OpenAI from 'openai';

if (!process.env.DASHSCOPE_API_KEY) {
  console.error('DASHSCOPE_API_KEY is missing from agent/.env');
  process.exit(1);
}

const client = new OpenAI({
  apiKey: process.env.DASHSCOPE_API_KEY,
  baseURL: process.env.QWEN_BASE_URL,
});

const res = await client.chat.completions.create({
  model: process.env.QWEN_MODEL,
  messages: [
    { role: 'user', content: 'Reply with exactly: Qwen is connected to AgentCredit.' },
  ],
});

console.log(res.choices[0].message.content);
