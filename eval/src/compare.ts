// eval/src/compare.ts

import type { RunAggregate } from "./gates";
import type { BaselineFile } from "./baselines";

export type AggregateDiff = {
  runId: string;
  label: string;

  currentAvgLatencyMs: number;
  baselineAvgLatencyMs: number;
  latencyDeltaPct: number;

  currentRetrievalAccuracy?: number;
  baselineRetrievalAccuracy?: number;
  retrievalAccuracyDelta?: number;

  currentQualityPassRate: number;
  baselineQualityPassRate: number;
  qualityPassRateDelta: number;
};

export function compareToBaseline(
  baseline: BaselineFile,
  current: RunAggregate[]
): AggregateDiff[] {
  const baselineMap = new Map(baseline.aggregates.map((a) => [a.runId, a]));

  const diffs: AggregateDiff[] = [];

  for (const curr of current) {
    const base = baselineMap.get(curr.runId);
    if (!base) continue;

    const latencyDeltaPct =
      base.avgLatencyMs === 0
        ? 0
        : ((curr.avgLatencyMs - base.avgLatencyMs) / base.avgLatencyMs) * 100;

    const diff: AggregateDiff = {
      runId: curr.runId,
      label: curr.label,
      currentAvgLatencyMs: curr.avgLatencyMs,
      baselineAvgLatencyMs: base.avgLatencyMs,
      latencyDeltaPct,

      currentQualityPassRate: curr.qualityPassRate,
      baselineQualityPassRate: base.qualityPassRate,
      qualityPassRateDelta: curr.qualityPassRate - base.qualityPassRate,
    };

    if (
      curr.retrievalAccuracy !== undefined &&
      base.retrievalAccuracy !== undefined
    ) {
      diff.currentRetrievalAccuracy = curr.retrievalAccuracy;
      diff.baselineRetrievalAccuracy = base.retrievalAccuracy;
      diff.retrievalAccuracyDelta =
        curr.retrievalAccuracy - base.retrievalAccuracy;
    }

    diffs.push(diff);
  }

  return diffs;
}