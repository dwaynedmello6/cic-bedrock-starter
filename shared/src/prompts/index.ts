// shared/src/prompts/index.ts
import { buildRagPromptV1 } from "./ragPrompt.v1";
import { buildRagPromptV2 } from "./ragPrompt.v2";

export type PromptVersion = "v1" | "v2";

export function buildRagPrompt(args: {
  promptVersion: PromptVersion;
  question: string;
  contextBlocks: string[];
}): string {
  if (args.promptVersion === "v2") return buildRagPromptV2(args);
  return buildRagPromptV1(args);
}