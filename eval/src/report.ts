// eval/src/report.ts

import fs from "node:fs";
import path from "node:path";
import type { RunAggregate } from "./gates";
import type { AggregateDiff } from "./compare";

type WorstCaseRow = {
  questionId: string;
  runId: string;
  runLabel: string;
  latencyMs: number;
  retrievalCorrect: boolean;
  qualityPass: boolean;
  requestId?: string;
};

function arrow(delta: number): string {
  if (delta > 0) return "↑";
  if (delta < 0) return "↓";
  return "→";
}

function fmtPct(n: number): string {
  return `${n.toFixed(1)}%`;
}

function topN<T>(arr: T[], n: number, score: (x: T) => number): T[] {
  return [...arr].sort((a, b) => score(b) - score(a)).slice(0, n);
}

export function writeMarkdownSummary(args: {
  experimentId: string;
  datasetName: string;
  description: string;
  aggregates: RunAggregate[];
  baselineDiffs?: AggregateDiff[];
  worstCases?: WorstCaseRow[];
  outputPath?: string;
}) {
  const outPath = args.outputPath ?? path.join(process.cwd(), "reports", "latest_summary.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  const base = args.aggregates[0];
  const lines: string[] = [];

  lines.push(`# Eval Summary — ${args.experimentId}`);
  lines.push(``);
  lines.push(`Dataset: \`${args.datasetName}\``);
  lines.push(``);
  lines.push(args.description);
  lines.push(``);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(``);

  lines.push(`## Aggregate Results`);
  lines.push(``);
  lines.push(`| Run | n | avgLatencyMs | retrievalAcc | qualityPassRate |`);
  lines.push(`|---|---:|---:|---:|---:|`);

  for (const a of args.aggregates) {
    const dLat = base ? a.avgLatencyMs - base.avgLatencyMs : 0;
    const dQual = base ? a.qualityPassRate - base.qualityPassRate : 0;
    const dRet =
      base && a.useRag && a.retrievalAccuracy !== undefined && base.retrievalAccuracy !== undefined
        ? a.retrievalAccuracy - base.retrievalAccuracy
        : 0;

    lines.push(
      `| ${a.label} | ${a.n} | ${a.avgLatencyMs.toFixed(0)} ${arrow(dLat)} | ` +
        `${a.useRag ? (a.retrievalAccuracy ?? 0).toFixed(2) + " " + arrow(dRet) : "—"} | ` +
        `${a.qualityPassRate.toFixed(2)} ${arrow(dQual)} |`
    );
  }

  if (args.baselineDiffs && args.baselineDiffs.length > 0) {
    lines.push(``);
    lines.push(`## Baseline Diffs`);
    lines.push(``);
    lines.push(
      `| Run | Latency Δ | RetrievalAcc Δ | QualityPassRate Δ |`
    );
    lines.push(`|---|---:|---:|---:|`);

    for (const d of args.baselineDiffs) {
      const retrievalDelta =
        typeof d.retrievalAccuracyDelta === "number"
          ? d.retrievalAccuracyDelta.toFixed(2)
          : "—";

      lines.push(
        `| ${d.label} | ${fmtPct(d.latencyDeltaPct)} | ${retrievalDelta} | ${d.qualityPassRateDelta.toFixed(2)} |`
      );
    }
  }

  if (args.worstCases && args.worstCases.length > 0) {
    const slowest = topN(args.worstCases, 5, (x) => x.latencyMs);
    const qualityFails = args.worstCases.filter((x) => !x.qualityPass).slice(0, 5);
    const retrievalFails = args.worstCases.filter((x) => !x.retrievalCorrect).slice(0, 5);

    lines.push(``);
    lines.push(`## Worst 5 Latency Cases`);
    lines.push(``);
    lines.push(`| Run | Question | LatencyMs | RequestId |`);
    lines.push(`|---|---|---:|---|`);
    for (const row of slowest) {
      lines.push(
        `| ${row.runLabel} | ${row.questionId} | ${row.latencyMs} | ${row.requestId ?? "—"} |`
      );
    }

    lines.push(``);
    lines.push(`## Quality Failures`);
    lines.push(``);
    if (qualityFails.length === 0) {
      lines.push(`None.`);
    } else {
      lines.push(`| Run | Question | LatencyMs | RequestId |`);
      lines.push(`|---|---|---:|---|`);
      for (const row of qualityFails) {
        lines.push(
          `| ${row.runLabel} | ${row.questionId} | ${row.latencyMs} | ${row.requestId ?? "—"} |`
        );
      }
    }

    lines.push(``);
    lines.push(`## Retrieval Failures`);
    lines.push(``);
    if (retrievalFails.length === 0) {
      lines.push(`None.`);
    } else {
      lines.push(`| Run | Question | LatencyMs | RequestId |`);
      lines.push(`|---|---|---:|---|`);
      for (const row of retrievalFails) {
        lines.push(
          `| ${row.runLabel} | ${row.questionId} | ${row.latencyMs} | ${row.requestId ?? "—"} |`
        );
      }
    }
  }

  lines.push(``);
  lines.push(`## Notes`);
  lines.push(`- retrievalAcc is computed from the eval harness retrieval metric.`);
  lines.push(`- qualityPassRate is based on deterministic checks in quality.ts.`);
  lines.push(`- requestId can be used to trace failures back to Lambda logs.`);
  lines.push(``);

  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
}