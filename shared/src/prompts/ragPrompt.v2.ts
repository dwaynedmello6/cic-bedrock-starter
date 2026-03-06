export function buildRagPromptV2(args: {
    promptVersion: "v1" | "v2";
    question: string;
    contextBlocks: string[];
  }): string {
    const contextBlock =
      args.contextBlocks.length === 0
        ? "(no relevant context found)"
        : args.contextBlocks.join("\n");
  
    return [
      "System:",
      "You are a security-focused policy assistant.",
      "Rules:",
      "1. Use ONLY the provided context.",
      "2. Do not hallucinate.",
      "3. If the answer is missing say you don't have enough information from the policies.",
      "4. Keep the answer concise.",
      "",
      "Context:",
      contextBlock,
      "",
      "User Question:",
      args.question,
      "",
      "Answer:"
    ].join("\n");
  }