// eval/src/report.ts
import fs from "node:fs";
import path from "node:path";
import type { RunAggregate } from "./gates";

function arrow(delta: number): string {
  if (delta > 0) return "↑";
  if (delta < 0) return "↓";
  return "→";
}

export function writeMarkdownSummary(args: {
  experimentId: string;
  description: string;
  aggregates: RunAggregate[];
  outputPath?: string;
}) {
  const outPath = args.outputPath ?? path.join(process.cwd(), "reports", "latest_summary.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });

  // baseline for deltas = first run
  const base = args.aggregates[0];

  const lines: string[] = [];
  lines.push(`# Eval Summary — ${args.experimentId}`);
  lines.push(``);
  lines.push(`${args.description}`);
  lines.push(``);
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(``);
  lines.push(`| Run | n | avgLatencyMs | retrievalAcc | qualityPassRate |`);
  lines.push(`|---|---:|---:|---:|---:|`);

  for (const a of args.aggregates) {
    const dLat = base ? a.avgLatencyMs - base.avgLatencyMs : 0;
    const dQual = base ? a.qualityPassRate - base.qualityPassRate : 0;
    const dRet = base && a.useRag ? ((a.retrievalAccuracy ?? 0) - (base.retrievalAccuracy ?? 0)) : 0;

    lines.push(
      `| ${a.label} | ${a.n} | ${a.avgLatencyMs.toFixed(0)} ${arrow(dLat)} | ` +
      `${a.useRag ? (a.retrievalAccuracy ?? 0).toFixed(2) + " " + arrow(dRet) : "—"} | ` +
      `${a.qualityPassRate.toFixed(2)} ${arrow(dQual)} |`
    );
  }

  lines.push(``);
  lines.push(`## Notes`);
  lines.push(`- retrievalAcc is only computed for RAG runs`);
  lines.push(`- qualityPassRate is based on keyword/length/citation/refusal checks (no LLM judge yet)`);
  lines.push(``);

  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
}