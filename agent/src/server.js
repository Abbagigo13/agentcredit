import "dotenv/config";
import http from "node:http";
import { analyze } from "./analyst.js";
import { verifyRecord } from "./tools.js";

const PORT = process.env.PORT || 8787;
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "http://localhost:5173")
  .split(",")
  .map((s) => s.trim());
  const MAX_RECORDS_PER_HOUR = Number(process.env.MAX_RECORDS_PER_HOUR || 10);
let recordWrites = [];

function recordBudgetLeft() {
  const now = Date.now();
  recordWrites = recordWrites.filter((t) => now - t < 3_600_000);
  return recordWrites.length < MAX_RECORDS_PER_HOUR;
}

const MAX_ANALYSES_PER_DAY = Number(process.env.MAX_ANALYSES_PER_DAY || 150);
let analysisRuns = [];

function analysisBudgetLeft() {
  const now = Date.now();
  analysisRuns = analysisRuns.filter((t) => now - t < 86_400_000);
  return analysisRuns.length < MAX_ANALYSES_PER_DAY;
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) return String(forwarded).split(",")[0].trim();
  return req.socket.remoteAddress || "unknown";
}

const CACHE_TTL_MS = 10 * 60 * 1000;
const resultCache = new Map();

function cacheGet(key) {
  const hit = resultCache.get(key);
  if (!hit) return null;

  if (Date.now() - hit.at > CACHE_TTL_MS) {
    resultCache.delete(key);
    return null;
  }

  return hit.data;
}

function cacheSet(key, data) {
  resultCache.set(key, { at: Date.now(), data });

  if (resultCache.size > 200) {
    resultCache.delete(resultCache.keys().next().value);
  }
}

function streamHeaders(origin) {
  const headers = {
    "Content-Type": "application/x-ndjson",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  };

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
  }

  return headers;
}

const hits = new Map();
function rateLimited(ip) {
  const now = Date.now();
  const recent = (hits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  hits.set(ip, recent);
  return recent.length > 10;
}

const verifyHits = new Map();
function verifyLimited(ip) {
  const now = Date.now();
  const recent = (verifyHits.get(ip) || []).filter((t) => now - t < 60_000);
  recent.push(now);
  verifyHits.set(ip, recent);
  return recent.length > 30;
}

function send(res, status, body, origin) {
  const headers = { "Content-Type": "application/json" };
  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Headers"] = "Content-Type";
    headers["Access-Control-Allow-Methods"] = "POST, GET, OPTIONS";
  }
  res.writeHead(status, headers);
  res.end(JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = "";
    req.on("data", (chunk) => {
      data += chunk;
      if (data.length > 2000) {
        reject(new Error("Body too large"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(data));
    req.on("error", reject);
  });
}

function parseVerdict(answer, trace) {
  const text = String(answer || "").replace(/\*+/g, "");
  const verdict = /VERDICT:\s*(APPROVE|REJECT|INSUFFICIENT[_ ]DATA)/i.exec(text);
  const score = /SCORE:\s*(\d{1,3})/i.exec(text);

  const scored = trace.find(
    (t) => t.tool === "compute_trust_score" && t.result && typeof t.result.score === "number"
  );

  return {
    verdict: verdict ? verdict[1].toUpperCase().replace(" ", "_") : "UNKNOWN",
    score: score ? Number(score[1]) : scored ? scored.result.score : null,
  };
}

const server = http.createServer(async (req, res) => {
  const origin = req.headers.origin;

  if (req.method === "OPTIONS") return send(res, 204, {}, origin);
  if (req.method === "GET" && req.url === "/api/health") {
    return send(res, 200, { ok: true }, origin);
  }

  if (req.method === "POST" && req.url === "/api/analyze") {
        const ip = clientIp(req);
    if (rateLimited(ip)) {
      return send(res, 429, { error: "Too many requests, try again in a minute." }, origin);
    }

    try {
      const body = JSON.parse((await readBody(req)) || "{}");
      const agentId = Number(body.agentId);
      const threshold = body.threshold === undefined ? 70 : Number(body.threshold);

      if (!Number.isInteger(agentId) || agentId < 0) {
        return send(res, 400, { error: "agentId must be a non-negative integer." }, origin);
      }
      if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
        return send(res, 400, { error: "threshold must be between 0 and 100." }, origin);
      }
            const record = body.record === true;
      if (record && !recordBudgetLeft()) {
        return send(
          res,
          429,
          { error: "Onchain recording limit reached for this hour. Run the check without recording, or try again later." },
          origin
        );
      }


            if (!analysisBudgetLeft()) {
        return send(
          res,
          429,
          { error: "The demo has reached its daily analysis limit. Please try again tomorrow." },
          origin
        );
      }
      analysisRuns.push(Date.now());
      const task = `Can agent ${agentId} be trusted for a task that requires a minimum trust score of ${threshold}?`;
      const trace = [];
      const started = Date.now();

      const { answer, steps } = await analyze(task, {
        record,
        onEvent: (e) => {
          if (e.type === "tool_call") trace.push({ tool: e.name, args: e.args });
          if (e.type === "tool_result") trace[trace.length - 1].result = e.result;
        },
      });

      const written = trace.find((t) => t.tool === "record_onchain" && t.result?.recorded);
      if (written) recordWrites.push(Date.now());

      return send(
        res,
        200,
        {
          agentId,
          threshold,
          ...parseVerdict(answer, trace),
          answer: String(answer || "").replace(/\*\*/g, ""),
          trace,
          onchain: written ? written.result : null,
          rounds: steps,
          durationMs: Date.now() - started,
        },
        origin
      );
    } catch (err) {
      console.error("analyze failed:", err.message);
      return send(res, 500, { error: "Analysis failed. Please try again." }, origin);
    }
  }
   

    if (req.method === "GET" && req.url.startsWith("/api/verify")) {
    if (verifyLimited(clientIp(req))) {
      return send(res, 429, { error: "Too many requests, try again in a minute." }, origin);
    }

    const agentId = Number(new URL(req.url, "http://localhost").searchParams.get("agentId"));

    if (!Number.isInteger(agentId) || agentId < 0) {
      return send(res, 400, { error: "agentId must be a non-negative integer." }, origin);
    }

    try {
      return send(res, 200, await verifyRecord(agentId), origin);
    } catch (err) {
      console.error("verify failed:", err.message);
      return send(res, 500, { error: "Verification failed. Please try again." }, origin);
    }
  }
  if (req.method === "POST" && req.url === "/api/analyze-stream") {
    if (rateLimited(clientIp(req))) {
      return send(res, 429, { error: "Too many requests, try again in a minute." }, origin);
    }

    let body;
    try {
      body = JSON.parse((await readBody(req)) || "{}");
    } catch {
      return send(res, 400, { error: "Invalid request body." }, origin);
    }

    const agentId = Number(body.agentId);
    const threshold = body.threshold === undefined ? 70 : Number(body.threshold);
    const record = body.record === true;

    if (!Number.isInteger(agentId) || agentId < 0) {
      return send(res, 400, { error: "agentId must be a non-negative integer." }, origin);
    }
    if (!Number.isFinite(threshold) || threshold < 0 || threshold > 100) {
      return send(res, 400, { error: "threshold must be between 0 and 100." }, origin);
    }

    const key = `${agentId}:${threshold}:${record}`;
    const cached = cacheGet(key);

    if (!cached) {
      if (record && !recordBudgetLeft()) {
        return send(
          res,
          429,
          { error: "Onchain recording limit reached for this hour. Run the check without recording, or try again later." },
          origin
        );
      }
      if (!analysisBudgetLeft()) {
        return send(
          res,
          429,
          { error: "The demo has reached its daily analysis limit. Please try again tomorrow." },
          origin
        );
      }
      analysisRuns.push(Date.now());
    }

    res.writeHead(200, streamHeaders(origin));
    const emit = (event) => res.write(JSON.stringify(event) + "\n");

    if (cached) {
      for (const step of cached.trace) {
        emit({ type: "tool_call", name: step.tool, args: step.args });
        emit({ type: "tool_result", name: step.tool, result: step.result });
      }
      emit({ type: "final", data: { ...cached, cached: true } });
      return res.end();
    }

    const task = `Can agent ${agentId} be trusted for a task that requires a minimum trust score of ${threshold}?`;
    const trace = [];
    const started = Date.now();

    try {
      const { answer, steps } = await analyze(task, {
        record,
        onEvent: (e) => {
          if (e.type === "tool_call") {
            trace.push({ tool: e.name, args: e.args });
            emit(e);
          }
          if (e.type === "tool_result") {
            trace[trace.length - 1].result = e.result;
            emit(e);
          }
        },
      });

      const written = trace.find((t) => t.tool === "record_onchain" && t.result?.recorded);
      if (written) recordWrites.push(Date.now());

      const data = {
        agentId,
        threshold,
        ...parseVerdict(answer, trace),
        answer: String(answer || "").replace(/\*\*/g, ""),
        trace,
        onchain: written ? written.result : null,
        rounds: steps,
        durationMs: Date.now() - started,
      };

      if (data.verdict !== "UNKNOWN") cacheSet(key, data);
      emit({ type: "final", data });
    } catch (err) {
      console.error("analyze-stream failed:", err.message);
      emit({ type: "error", message: "Analysis failed. Please try again." });
    }

    return res.end();
  }

  send(res, 404, { error: "Not found" }, origin);
});

server.listen(PORT, () => {
  console.log(`AgentCredit analyst server running on http://localhost:${PORT}`);
});