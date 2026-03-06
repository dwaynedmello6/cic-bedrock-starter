// eval/src/grounding.ts

export type GroundingCheckResult = {
    passedChecks: string[];
    failedChecks: string[];
  };
  
  function normalize(text: string): string {
    return text.toLowerCase().trim();
  }
  
  export function runGroundingChecks(args: {
    output: string;
    useRag: boolean;
    usedContextIds: string[];
  }): GroundingCheckResult {
    const passedChecks: string[] = [];
    const failedChecks: string[] = [];
  
    const text = normalize(args.output);
    const hasContext = args.usedContextIds.length > 0;
  
    const groundingSignals = [
      "according to the policy",
      "according to the document",
      "the policy states",
      "the document states",
      "based on the provided context",
      "according to the provided context",
      "the source says",
      "the sources say",
    ];
  
    const mentionsGroundedSource = groundingSignals.some((s) => text.includes(s));
    const mentionsPolicyOrSource = text.includes("policy") || text.includes("source") || text.includes("context");
  
    if (args.useRag) {
      if (hasContext) {
        passedChecks.push("rag_has_context");
      } else {
        failedChecks.push("rag_missing_context");
      }
    }
  
    if (mentionsGroundedSource) {
      if (hasContext) {
        passedChecks.push("grounded_claim_has_context");
      } else {
        failedChecks.push("grounded_claim_without_context");
      }
    }
  
    if (mentionsPolicyOrSource) {
      if (hasContext) {
        passedChecks.push("policy_reference_has_context");
      } else {
        failedChecks.push("policy_reference_without_context");
      }
    }
  
    return { passedChecks, failedChecks };
  }