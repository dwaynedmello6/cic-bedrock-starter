// services/api/src/security/pipeline.ts

import { redactPii, type PiiType } from "./pii";

export type SecurityConfig = {
  maxPromptChars: number;
};

export type SecurityResult = {
  safePrompt: string;          // what you send to Bedrock (already redacted)
  promptLength: number;
  redactedPromptLength: number;
  piiDetected: boolean;
  piiTypes: PiiType[];
  redactionCount: number;
};

export function validatePrompt(prompt: string, cfg: SecurityConfig): void {
  if (!prompt || prompt.trim().length === 0) {
    throw new Error("PROMPT_EMPTY");
  }
  if (prompt.length > cfg.maxPromptChars) {
    throw new Error("PROMPT_TOO_LONG");
  }
}

export function applySecurity(prompt: string, cfg: SecurityConfig): SecurityResult {
  validatePrompt(prompt, cfg);

  const { redactedText, piiTypes, redactionCount } = redactPii(prompt);

  return {
    safePrompt: redactedText,
    promptLength: prompt.length,
    redactedPromptLength: redactedText.length,
    piiDetected: redactionCount > 0,
    piiTypes,
    redactionCount,
  };
}