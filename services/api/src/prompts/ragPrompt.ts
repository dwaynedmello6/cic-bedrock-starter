// services/api/src/prompts/ragPrompt.ts

import { ContextChunk } from "../retrieval/retriever";

export function buildRagPrompt(userQuestion: string, chunks: ContextChunk[]): string {
  const contextBlock =
    chunks.length === 0
      ? "(no relevant context found)"
      : chunks.map((c) => `- [${c.id}] ${c.text}`).join("\n");

  return [
    "System:",
    "You are a helpful assistant. Answer ONLY using the provided Context.",
    "If the Context does not contain the answer, say you don't have enough information from the context.",
    "",
    "Context:",
    contextBlock,
    "",
    "User Question:",
    userQuestion,
    "",
    "Answer:"
  ].join("\n");
}