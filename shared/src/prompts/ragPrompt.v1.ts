export function buildRagPromptV1(args: {
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
      "You are a helpful assistant. Answer ONLY using the provided Context.",
      "If the Context does not contain the answer, say you don't have enough information from the context.",
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