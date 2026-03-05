// services/api/src/observability/logger.ts

type Level = "INFO" | "ERROR";

function base(level: Level, event: string, meta: Record<string, unknown>) {
  // JSON structured logs are easiest to search in CloudWatch
  console.log(
    JSON.stringify({
      level,
      event,
      ts: new Date().toISOString(),
      ...meta,
    })
  );
}

export function logRequest(meta: Record<string, unknown>) {
  base("INFO", "AI_REQUEST", meta);
}

export function logResponse(meta: Record<string, unknown>) {
  base("INFO", "AI_RESPONSE", meta);
}

export function logError(meta: Record<string, unknown>) {
  base("ERROR", "AI_ERROR", meta);
}

// cheap token estimate (good enough for logs/cost proxy)
export function estimateTokens(text: string): number {
  // ~4 chars per token heuristic (English-ish). Don’t overthink it.
  return Math.ceil(text.length / 4);
}