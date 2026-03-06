// services/api/src/handler.ts

import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from "aws-lambda";
import { invokeModel } from "./bedrock/bedrockClient";
import { estimateTokens, logError, logRequest, logResponse } from "./observability/logger";
import { applySecurity } from "./security/pipeline";

// Phase 3 (RAG)
import { LocalRetriever } from "./retrieval/localRetriever";
import { buildRagPrompt, type PromptVersion } from "../../../shared/src/prompts";

const MODEL_ID_DEFAULT = process.env.MODEL_ID ?? "anthropic.claude-3-haiku-20240307-v1:0";
const USE_GUARDRAILS = (process.env.USE_GUARDRAILS ?? "false").toLowerCase() === "true";
const USE_RAG_DEFAULT = (process.env.USE_RAG ?? "false").toLowerCase() === "true";
const MAX_PROMPT_CHARS = Number(process.env.MAX_PROMPT_CHARS ?? "4000");
const PROMPT_VERSION_DEFAULT: PromptVersion =
  (process.env.PROMPT_VERSION ?? "v1") === "v2" ? "v2" : "v1";

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

function parseBool(v: unknown): boolean | undefined {
  if (v === undefined || v === null) return undefined;
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v === 1;
  if (typeof v === "string") {
    const s = v.trim().toLowerCase();
    if (s === "true" || s === "1" || s === "yes" || s === "y") return true;
    if (s === "false" || s === "0" || s === "no" || s === "n") return false;
  }
  return undefined;
}

function parsePromptVersion(v: unknown): PromptVersion | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim().toLowerCase();
  if (s === "v1") return "v1";
  if (s === "v2") return "v2";
  return undefined;
}

function parseModelId(v: unknown): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s.length > 0 ? s : undefined;
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
    let useRagFromBody: boolean | undefined = undefined;
    let modelIdFromBody: string | undefined = undefined;
    let promptVersionFromBody: PromptVersion | undefined = undefined;

    try {
      const parsed = rawBody ? JSON.parse(rawBody) : {};
      prompt = typeof parsed.prompt === "string" ? parsed.prompt : "";
      useRagFromBody = parseBool((parsed as any).use_rag);
      modelIdFromBody = parseModelId((parsed as any).model_id);
      promptVersionFromBody = parsePromptVersion((parsed as any).prompt_version);
    } catch {
      return json(400, { error: 'Body must be valid JSON: { "prompt": "..." }' });
    }

    // request overrides env defaults (safe)
    const ragEnabled = useRagFromBody ?? USE_RAG_DEFAULT;
    const modelId = modelIdFromBody ?? MODEL_ID_DEFAULT;
    const promptVersion = promptVersionFromBody ?? PROMPT_VERSION_DEFAULT;

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

    // Debug: confirm what mode we picked (safe metadata only)
    console.log("RAG_DECISION", {
      requestId,
      use_rag_raw: useRagFromBody,
      use_rag_env_default: USE_RAG_DEFAULT,
      ragEnabled,
      modelId: modelIdFromBody ? "(from_request)" : "(env_default)",
      promptVersion: promptVersionFromBody ? "(from_request)" : "(env_default)",
      promptLength: sec.promptLength,
      redactedPromptLength: sec.redactedPromptLength,
    });

    if (ragEnabled) {
      const chunks = await retriever.getContext(sec.safePrompt, 3);
      usedContextIds = chunks.map((c) => c.id);

      finalPrompt = buildRagPrompt({
        promptVersion,
        question: sec.safePrompt,
        contextBlocks: chunks.map((c) => `- [${c.id}] ${c.text}`),
      });

      // Debug: confirm retrieval returned ids (safe metadata only)
      console.log("RETRIEVE_RESULT", {
        requestId,
        retrievedCount: chunks.length,
        retrievedIds: usedContextIds,
      });
    }

    // ---- safe request log ----
    logRequest({
      requestId,
      modelId,
      useGuardrails: USE_GUARDRAILS,
      promptLength: sec.promptLength,
      redactedPromptLength: sec.redactedPromptLength,
      piiDetected: sec.piiDetected,
      piiTypes: sec.piiTypes,
      redactionCount: sec.redactionCount,
      promptTokensEst: estimateTokens(finalPrompt),
      // RAG metadata (safe)
      useRag: ragEnabled,
      usedContextIds,
      // experiment knobs (safe)
      promptVersion,
    });

    // ---- invoke model ----
    const { text, guardrailsMode } = await invokeModel({
      prompt: finalPrompt,
      modelId,
      useGuardrails: USE_GUARDRAILS,
    });

    const latencyMs = Date.now() - start;

    // ---- safe response log ----
    logResponse({
      requestId,
      modelId,
      latencyMs,
      outputLength: text.length,
      outputTokensEst: estimateTokens(text),
      guardrailsMode,
      piiTypes: sec.piiTypes,
      // RAG metadata (safe)
      useRag: ragEnabled,
      usedContextIds,
      // experiment knobs (safe)
      promptVersion,
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