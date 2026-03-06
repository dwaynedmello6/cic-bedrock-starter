// eval/src/gates.ts

import type { AggregateDiff } from "./compare";

export type GateThresholds = {
  retrievalAccuracyMin: number;
  avgLatencyMsMax: number;
  qualityPassRateMin: number;

  // baseline comparison tolerances
  latencyIncreasePctMax: number;
  retrievalAccuracyDropMax: number;
  qualityPassRateDropMax: number;
};

export const DEFAULT_THRESHOLDS: GateThresholds = {
  retrievalAccuracyMin: 0.8,
  avgLatencyMsMax: 8000,
  qualityPassRateMin: 0.32,

  latencyIncreasePctMax: 25,
  retrievalAccuracyDropMax: 0.1,
  qualityPassRateDropMax: 0.34,
};

export type RunAggregate = {
  runId: string;
  label: string;
  useRag: boolean;
  avgLatencyMs: number;
  retrievalAccuracy?: number;
  qualityPassRate: number;
  n: number;
};

export function evaluateGates(
  agg: RunAggregate,
  t: GateThresholds
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (agg.avgLatencyMs > t.avgLatencyMsMax) {
    reasons.push(`avgLatencyMs ${agg.avgLatencyMs.toFixed(0)} > ${t.avgLatencyMsMax}`);
  }

  if (agg.useRag) {
    const ra = agg.retrievalAccuracy ?? 0;
    if (ra < t.retrievalAccuracyMin) {
      reasons.push(`retrievalAccuracy ${ra.toFixed(2)} < ${t.retrievalAccuracyMin}`);
    }
  }

  if (agg.qualityPassRate < t.qualityPassRateMin) {
    reasons.push(`qualityPassRate ${agg.qualityPassRate.toFixed(2)} < ${t.qualityPassRateMin}`);
  }

  return { pass: reasons.length === 0, reasons };
}

export function evaluateBaselineDiffs(
  diff: AggregateDiff,
  t: GateThresholds
): { pass: boolean; reasons: string[] } {
  const reasons: string[] = [];

  if (diff.latencyDeltaPct > t.latencyIncreasePctMax) {
    reasons.push(
      `latency increased ${diff.latencyDeltaPct.toFixed(1)}% > ${t.latencyIncreasePctMax}%`
    );
  }

  if (
    diff.retrievalAccuracyDelta !== undefined &&
    diff.retrievalAccuracyDelta < -t.retrievalAccuracyDropMax
  ) {
    reasons.push(
      `retrievalAccuracy dropped ${Math.abs(diff.retrievalAccuracyDelta).toFixed(2)} > ${t.retrievalAccuracyDropMax}`
    );
  }

  if (diff.qualityPassRateDelta < -t.qualityPassRateDropMax) {
    reasons.push(
      `qualityPassRate dropped ${Math.abs(diff.qualityPassRateDelta).toFixed(2)} > ${t.qualityPassRateDropMax}`
    );
  }

  return { pass: reasons.length === 0, reasons };
}