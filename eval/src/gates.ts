// eval/src/gates.ts
export type GateThresholds = {
    retrievalAccuracyMin: number;   // only applies when useRag = true
    avgLatencyMsMax: number;
    qualityPassRateMin: number;
  };
  
  export const DEFAULT_THRESHOLDS: GateThresholds = {
    retrievalAccuracyMin: 0.8,
    avgLatencyMsMax: 2500,         // tune to your reality
    qualityPassRateMin: 0.8,
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
  
  export function evaluateGates(agg: RunAggregate, t: GateThresholds): { pass: boolean; reasons: string[] } {
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