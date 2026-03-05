// services/api/src/retrieval/localRetriever.ts

import { ContextChunk, Retriever } from "./retriever";
import { knowledge } from "./knowledge";

function tokenize(s: string): string[] {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);
}

function scoreOverlap(query: string, doc: string): number {
  const q = new Set(tokenize(query));
  const d = new Set(tokenize(doc));

  let score = 0;
  for (const token of q) {
    if (d.has(token)) score++;
  }

  return score;
}

export class LocalRetriever implements Retriever {
  async getContext(query: string, k: number = 3): Promise<ContextChunk[]> {
    const scored = knowledge
      .map((item) => ({
        ...item,
        score: scoreOverlap(query, item.text),
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, k);

    return scored.map(({ id, text, score }) => ({
      id,
      text,
      score,
    }));
  }
}