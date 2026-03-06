// eval/src/runEval.ts
//
// Phase 5: Experiments + knobs + quality checks + regression gate + markdown summary
//
// Usage:
//   cd eval
//   npm run eval -- --experiment ab_model
//
// Env:
//   EVAL_ENDPOINT, EVAL_API_KEY (required)
//   MODEL_A_ID, MODEL_B_ID (optional, used by experiments.ts defaults)

import fs from "node:fs";
import path from "node:path";
import "dotenv/config";

import { evalDataset } from "./evalDataset";
import { scoreRetrieval, summarize, type EvalRow, type InvokeResult } from "./metrics";

import { getExperimentOrThrow } from "./experiments";
import { runQualityChecks } from "./quality";
import { DEFAULT_THRESHOLDS, evaluateGates, type RunAggregate } from "./gates";
import { writeMarkdownSummary } from "./report";

const ENDPOINT = process.env.EVAL_ENDPOINT;
const API_KEY = process.env.EVAL_API_KEY;

type PromptVersion = "v1" | "v2";

type InvokePayload = {
  prompt: string;
  use_rag?: boolean;
  model_id?: string;
  prompt_version?: PromptVersion;
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

function parseArg(flag: string): string | undefined {
  const idx = process.argv.indexOf(flag);
  if (idx === -1) return undefined;
  return process.argv[idx + 1];
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

  const result: InvokeResult = {
    output: json.output ?? "",
    used_context_ids: Array.isArray(json.used_context_ids) ? json.used_context_ids : [],
    latencyMs: typeof json.latencyMs === "number" ? json.latencyMs : undefined,
    promptTokens: typeof json.promptTokens === "number" ? json.promptTokens : undefined,
    responseTokens: typeof json.responseTokens === "number" ? json.responseTokens : undefined,
    totalTokens: typeof json.totalTokens === "number" ? json.totalTokens : undefined,
  };

  return { result, latencyMs };
}

type ExtendedEvalRow = EvalRow & {
  experimentId: string;
  runId: string;
  runLabel: string;
  modelId?: string;
  promptVersion?: PromptVersion;
  qualityPass: boolean;
  qualityReasons: string[];
};

function aggregateRuns(rows: ExtendedEvalRow[], runId: string): RunAggregate {
  const runRows = rows.filter((r) => r.runId === runId);
  const n = runRows.length;

  const avgLatencyMs = runRows.reduce((s, r) => s + r.latencyMs, 0) / Math.max(1, n);

  const ragRows = runRows.filter((r) => r.ragEnabled);
  const retrievalAccuracy =
    ragRows.length > 0 ? ragRows.filter((r) => r.retrievalCorrect).length / ragRows.length : undefined;

  const qualityPassRate = runRows.filter((r) => r.qualityPass).length / Math.max(1, n);

  const aggregate: RunAggregate = {
    runId,
    label: runRows[0]?.runLabel ?? runId,
    useRag: runRows[0]?.ragEnabled ?? false,
    avgLatencyMs,
    qualityPassRate,
    n,
  };

  if (retrievalAccuracy !== undefined) {
    aggregate.retrievalAccuracy = retrievalAccuracy;
  }

  return aggregate;
}

async function run() {
  requireEnv("EVAL_ENDPOINT", ENDPOINT);
  requireEnv("EVAL_API_KEY", API_KEY);

  const experimentId = parseArg("--experiment") ?? "matrix_small";
  const exp = getExperimentOrThrow(experimentId);

  const rows: ExtendedEvalRow[] = [];
  const perQuestion: any[] = [];

  for (const runCfg of exp.runs) {
    for (const c of evalDataset) {
      const payload: InvokePayload = {
        prompt: c.question,
        use_rag: runCfg.useRag,
      };

      if (runCfg.modelId !== undefined) {
        payload.model_id = runCfg.modelId;
      }

      if (runCfg.promptVersion !== undefined) {
        payload.prompt_version = runCfg.promptVersion;
      }

      const { result, latencyMs } = await invokeOnce(payload);

      const expected = c.expectedContext ?? [];
      const actual = result.used_context_ids ?? [];
      const scored = scoreRetrieval(expected, actual);

      const qcArgs: { questionId: string; output: string; promptVersion?: string } = {
        questionId: c.id,
        output: result.output ?? "",
      };
      
      if (runCfg.promptVersion !== undefined) {
        qcArgs.promptVersion = runCfg.promptVersion;
      }
      
      const qc = runQualityChecks(qcArgs);

      const baseRow: Omit<EvalRow, "tokenTotal"> = {
        questionId: c.id,
        ragEnabled: runCfg.useRag,
        latencyMs,
        usedContextIds: actual,
        expectedContextIds: expected,
        retrievalCorrect: scored.correct,
        retrievalRecall: scored.recall,
        retrievalPrecision: scored.precision,
      };

      const coreRow: EvalRow =
        typeof result.totalTokens === "number"
          ? { ...baseRow, tokenTotal: result.totalTokens }
          : baseRow;

      const extended: ExtendedEvalRow = {
        ...coreRow,
        experimentId,
        runId: runCfg.id,
        runLabel: runCfg.label,
        qualityPass: qc.pass,
        qualityReasons: qc.reasons,
      };

      if (runCfg.modelId !== undefined) {
        extended.modelId = runCfg.modelId;
      }

      if (runCfg.promptVersion !== undefined) {
        extended.promptVersion = runCfg.promptVersion;
      }

      rows.push(extended);

      perQuestion.push({
        experimentId,
        runId: runCfg.id,
        runLabel: runCfg.label,
        questionId: c.id,
        ragEnabled: runCfg.useRag,
        model_id: runCfg.modelId ?? null,
        prompt_version: runCfg.promptVersion ?? null,
        question: c.question,
        outputPreview: (result.output ?? "").slice(0, 240),
        measuredLatencyMs: latencyMs,
        apiLatencyMs: result.latencyMs,
        expected_context_ids: expected,
        used_context_ids: actual,
        retrieval: scored,
        quality: qc,
        tokens: {
          prompt: result.promptTokens,
          response: result.responseTokens,
          total: result.totalTokens,
        },
      });

      console.log(
        "EVAL_RESULT",
        JSON.stringify({
          experimentId,
          runId: runCfg.id,
          runLabel: runCfg.label,
          questionId: c.id,
          ragEnabled: runCfg.useRag,
          model_id: runCfg.modelId ?? null,
          prompt_version: runCfg.promptVersion ?? null,
          latencyMs,
          used_context_ids: actual,
          retrieval_correct: scored.correct,
          quality_pass: qc.pass,
          tokens_total: result.totalTokens,
        })
      );
    }
  }

  const summary = summarize(rows);
  const aggregates: RunAggregate[] = exp.runs.map((r) => aggregateRuns(rows, r.id));

  const outDir = path.join(process.cwd(), "reports");
  fs.mkdirSync(outDir, { recursive: true });

  const outPath = path.join(outDir, `report_${experimentId}_${stamp()}.json`);
  const report = {
    meta: {
      endpoint: ENDPOINT,
      ranAt: new Date().toISOString(),
      experimentId,
      experimentDescription: exp.description,
      runs: exp.runs,
      cases: evalDataset.length,
    },
    summary,
    aggregates,
    rows,
    perQuestion,
  };

  fs.writeFileSync(outPath, JSON.stringify(report, null, 2), "utf-8");

  writeMarkdownSummary({
    experimentId: exp.id,
    description: exp.description,
    aggregates,
    outputPath: path.join(outDir, "latest_summary.md"),
  });

  const thresholds = DEFAULT_THRESHOLDS;
  const failures: { runId: string; label: string; reasons: string[] }[] = [];

  for (const a of aggregates) {
    const g = evaluateGates(a, thresholds);
    if (!g.pass) failures.push({ runId: a.runId, label: a.label, reasons: g.reasons });
  }

  console.log("\n=== Evaluation Summary ===");
  console.log(JSON.stringify(summary, null, 2));
  console.log(`\nSaved report → ${outPath}`);
  console.log(`Saved summary → ${path.join(outDir, "latest_summary.md")}`);

  if (failures.length > 0) {
    console.error("\n=== REGRESSION GATE: FAIL ===");
    console.error(JSON.stringify({ experimentId, thresholds, failures }, null, 2));
    process.exit(1);
  }

  console.log("\n=== REGRESSION GATE: PASS ===");
}

run().catch((err) => {
  console.error("Eval failed:", err);
  process.exit(1);
});