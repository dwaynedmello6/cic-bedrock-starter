// services/api/src/handler.ts

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { invokeModel } from "./bedrock/bedrockClient";
import { estimateTokens, logError, logRequest, logResponse } from "./observability/logger";
import { applySecurity } from "./security/pipeline";

// Phase 3 (RAG)
import { LocalRetriever } from "./retrieval/localRetriever";
import { buildRagPrompt } from "./prompts/ragPrompt";

const MODEL_ID = process.env.MODEL_ID ?? "anthropic.claude-3-haiku-20240307-v1:0";
const USE_GUARDRAILS = (process.env.USE_GUARDRAILS ?? "false").toLowerCase() === "true";
const USE_RAG = (process.env.USE_RAG ?? "false").toLowerCase() === "true";
const MAX_PROMPT_CHARS = Number(process.env.MAX_PROMPT_CHARS ?? "4000");

// Retriever instance (local knowledge base)
const retriever = new LocalRetriever();

function json(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  };
}

function mapValidationError(errMsg: string): APIGatewayProxyResultV2 | null {
  if (errMsg === "PROMPT_EMPTY") return json(400, { error: "Prompt is required." });
  if (errMsg === "PROMPT_TOO_LONG") return json(400, { error: `Prompt too long. Max ${MAX_PROMPT_CHARS} characters.` });
  return null;
}

export async function handler(event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> {
  const requestId =
    event.requestContext?.requestId ??
    event.headers?.["x-amzn-requestid"] ??
    "unknown";

  const start = Date.now();

  try {
    // ---- parse input ----
    const rawBody = event.body ?? "";
    let prompt = "";

    try {
      const parsed = rawBody ? JSON.parse(rawBody) : {};
      prompt = typeof parsed.prompt === "string" ? parsed.prompt : "";
    } catch {
      return json(400, { error: 'Body must be valid JSON: { "prompt": "..." }' });
    }

    // ---- apply security pipeline ----
    let sec;
    try {
      sec = applySecurity(prompt, { maxPromptChars: MAX_PROMPT_CHARS });
    } catch (e: any) {
      const mapped = mapValidationError(e?.message ?? "");
      if (mapped) return mapped;
      throw e;
    }

    // ---- RAG (optional) ----
    let usedContextIds: string[] = [];
    let finalPrompt = sec.safePrompt;

    if (USE_RAG) {
      const chunks = await retriever.getContext(sec.safePrompt, 3);
      usedContextIds = chunks.map((c) => c.id);
      finalPrompt = buildRagPrompt(sec.safePrompt, chunks);
    }

    // ---- safe request log ----
    logRequest({
      requestId,
      modelId: MODEL_ID,
      useGuardrails: USE_GUARDRAILS,
      promptLength: sec.promptLength,
      redactedPromptLength: sec.redactedPromptLength,
      piiDetected: sec.piiDetected,
      piiTypes: sec.piiTypes,
      redactionCount: sec.redactionCount,
      promptTokensEst: estimateTokens(finalPrompt),
      // RAG metadata (safe)
      useRag: USE_RAG,
      usedContextIds,
    });

    // ---- invoke model ----
    const { text, guardrailsMode } = await invokeModel({
      prompt: finalPrompt,
      modelId: MODEL_ID,
      useGuardrails: USE_GUARDRAILS,
    });

    const latencyMs = Date.now() - start;

    // ---- safe response log ----
    logResponse({
      requestId,
      modelId: MODEL_ID,
      latencyMs,
      outputLength: text.length,
      outputTokensEst: estimateTokens(text),
      guardrailsMode,
      piiTypes: sec.piiTypes,
      // RAG metadata (safe)
      useRag: USE_RAG,
      usedContextIds,
    });

    return json(200, { output: text, used_context_ids: usedContextIds });
  } catch (err: any) {
    const latencyMs = Date.now() - start;

    logError({
      requestId,
      latencyMs,
      name: err?.name ?? "Error",
      message: err?.message ?? String(err),
    });

    return json(500, { error: "Internal server error" });
  }
}