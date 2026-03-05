// eval/src/metrics.ts

export type InvokeResult = {
    output: string;
    used_context_ids?: string[];
  
    // Optional fields (if your API returns them)
    latencyMs?: number;
    promptTokens?: number;
    responseTokens?: number;
    totalTokens?: number;
  };
  
  export type EvalRow = {
    questionId: string;
    ragEnabled: boolean;
  
    latencyMs: number; // measured client-side (always present)
    usedContextIds: string[];
    expectedContextIds: string[];
  
    retrievalCorrect: boolean;
    retrievalRecall: number; // 0..1
    retrievalPrecision: number; // 0..1
  
    tokenTotal?: number;
  };
  
  function toSet(arr: string[] | undefined): Set<string> {
    return new Set((arr ?? []).filter(Boolean));
  }
  
  export function scoreRetrieval(expectedIds: string[], actualIds: string[]) {
    const E = toSet(expectedIds);
    const A = toSet(actualIds);
  
    // Edge cases
    if (E.size === 0 && A.size === 0) return { correct: true, recall: 1, precision: 1 };
    if (E.size === 0 && A.size > 0) return { correct: false, recall: 1, precision: 0 };
    if (E.size > 0 && A.size === 0) return { correct: false, recall: 0, precision: 1 };
  
    let hits = 0;
    for (const x of E) if (A.has(x)) hits++;
  
    const recall = hits / E.size;
    const precision = hits / A.size;
  
    // "Correct" = retrieved all expected IDs (strict)
    const correct = recall === 1;
  
    return { correct, recall, precision };
  }
  
  export function summarize(rows: EvalRow[]) {
    const split = (ragEnabled: boolean) => rows.filter(r => r.ragEnabled === ragEnabled);
  
    const agg = (subset: EvalRow[]) => {
      const n = subset.length || 1;
      const avgLatency = subset.reduce((s, r) => s + r.latencyMs, 0) / n;
  
      const hasTokens = subset.some(r => typeof r.tokenTotal === "number");
      const avgTokens = hasTokens
        ? subset.reduce((s, r) => s + (r.tokenTotal ?? 0), 0) / n
        : undefined;
  
      const retrievalAccuracy = subset.reduce((s, r) => s + (r.retrievalCorrect ? 1 : 0), 0) / n;
      const avgRecall = subset.reduce((s, r) => s + r.retrievalRecall, 0) / n;
      const avgPrecision = subset.reduce((s, r) => s + r.retrievalPrecision, 0) / n;
  
      return {
        count: subset.length,
        avgLatencyMs: Math.round(avgLatency),
        avgTokens: typeof avgTokens === "number" ? Math.round(avgTokens) : undefined,
        retrievalAccuracy: Number(retrievalAccuracy.toFixed(3)),
        retrievalRecall: Number(avgRecall.toFixed(3)),
        retrievalPrecision: Number(avgPrecision.toFixed(3)),
      };
    };
  
    return {
      totalRows: rows.length,
      ragOn: agg(split(true)),
      ragOff: agg(split(false)),
    };
  }