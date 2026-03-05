// eval/src/runEval.ts

import fs from "node:fs";
import path from "node:path";
import { evalDataset } from "./evalDataset";
import { scoreRetrieval, summarize, type EvalRow, type InvokeResult } from "./metrics";
import "dotenv/config";

const ENDPOINT = process.env.EVAL_ENDPOINT;
const API_KEY = process.env.EVAL_API_KEY;

// Optional: if you want to send other flags to your API later
type InvokePayload = {
  prompt: string;
  use_rag?: boolean;
};

function requireEnv(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing ${name} env var.`);
  return value;
}

function stamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}${pad(
    d.getMinutes()
  )}${pad(d.getSeconds())}`;
}

async function invokeOnce(payload: InvokePayload): Promise<{ result: InvokeResult; latencyMs: number }> {
  const t0 = Date.now();

  const res = await fetch(ENDPOINT!, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": API_KEY!,
    },
    body: JSON.stringify(payload),
  });

  const latencyMs = Date.now() - t0;

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Invoke failed (${res.status}): ${text}`);
  }

  const json = (await res.json()) as any;

  // Normalize common fields. If your API uses different names, change here.
  const result: InvokeResult = {
    output: json.output ?? "",
    used_context_ids: Array.isArray(json.used_context_ids) ? json.used_context_ids : [],

    // Optional fields, only if your API returns them
    latencyMs: typeof json.latencyMs === "number" ? json.latencyMs : undefined,
    promptTokens: typeof json.promptTokens === "number" ? json.promptTokens : undefined,
    responseTokens: typeof json.responseTokens === "number" ? json.responseTokens : undefined,
    totalTokens: typeof json.totalTokens === "number" ? json.totalTokens : undefined,
  };

  return { result, latencyMs };
}

async function run() {
  requireEnv("EVAL_ENDPOINT", ENDPOINT);
  requireEnv("EVAL_API_KEY", API_KEY);

  const rows: EvalRow[] = [];
  const perQuestion: any[] = [];

  for (const c of evalDataset) {
    for (const ragEnabled of [false, true]) {
      const { result, latencyMs } = await invokeOnce({
        prompt: c.question,
        use_rag: ragEnabled,
      });

      const expected = c.expectedContext ?? [];
      const actual = result.used_context_ids ?? [];

      const scored = scoreRetrieval(expected, actual);

      const baseRow: Omit<EvalRow, "tokenTotal"> = {
        questionId: c.id,
        ragEnabled,
        latencyMs,
        usedContextIds: actual,
        expectedContextIds: expected,
        retrievalCorrect: scored.correct,
        retrievalRecall: scored.recall,
        retrievalPrecision: scored.precision,
      };
      
      const row: EvalRow =
        typeof result.totalTokens === "number"
          ? { ...baseRow, tokenTotal: result.totalTokens }
          : baseRow;
      
      rows.push(row);

      perQuestion.push({
        questionId: c.id,
        ragEnabled,
        question: c.question,
        outputPreview: (result.output ?? "").slice(0, 240),
        measuredLatencyMs: latencyMs,
        apiLatencyMs: result.latencyMs,
        expected_context_ids: expected,
        used_context_ids: actual,
        retrieval: scored,
        tokens: {
          prompt: result.promptTokens,
          response: result.responseTokens,
          total: result.totalTokens,
        },
      });

      // Structured line (easy to grep)
      console.log(
        "EVAL_RESULT",
        JSON.stringify({
          questionId: c.id,
          ragEnabled,
          latencyMs,
          used_context_ids: actual,
          retrieval_correct: scored.correct,
          tokens_total: result.totalTokens,
        })
      );
    }
  }

  const summary = summarize(rows);

  const outDir = path.join(process.cwd(), "reports");
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `report_${stamp()}.json`);

  const report = {
    meta: {
      endpoint: ENDPOINT,
      ranAt: new Date().toISOString(),
      cases: evalDataset.length,
    },
    summary,
    rows,
    perQuestion,
  };

  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  console.log("\n=== Evaluation Summary ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nSaved report → ${outPath}`);
}

run().catch((err) => {
  console.error("Eval failed:", err);
  process.exit(1);
});