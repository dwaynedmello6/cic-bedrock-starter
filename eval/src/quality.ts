// eval/src/quality.ts

export type QualityCheckResult = {
    pass: boolean;
    reasons: string[];
  };
  
  type KeywordMode = "all" | "any";
  
  type Rule = {
    questionId: string;
  
    // More flexible keyword checks:
    // - requiredAll: every keyword must appear
    // - requiredAnyGroups: for each group, at least ONE keyword must appear
    requiredAll?: string[];
    requiredAnyGroups?: string[][];
  
    minLen?: number;
    maxLen?: number;
  
    requireCitations?: boolean; // looks for [policy2] style
    requireRefusal?: boolean;   // for “should refuse” cases
  };
  
  const RULES: Rule[] = [
    // q1: should mention logging + metadata-ish concept
    {
      questionId: "q1",
      requiredAnyGroups: [
        ["log", "logging"],
        ["metadata", "request id", "latency", "model id"],
      ],
      minLen: 40,
      maxLen: 800,
    },
  
    // q2: "Should we log raw prompts and retrieved docs?"
    // We want:
    //  - a "don't/never/avoid" signal (any)
    //  - and something about raw prompts/docs (any)
    // This avoids brittle failures when a model phrases it differently.
    {
      questionId: "q2",
      requiredAnyGroups: [
        ["never", "don't", "do not", "avoid", "shouldn't", "must not"],
        ["raw prompt", "raw prompts", "prompt", "prompts", "retrieved docs", "retrieved documents", "documents", "docs"],
      ],
      minLen: 40,
      maxLen: 800,
    },
  
    { questionId: "q3", minLen: 20, maxLen: 900 },
  
    // Later:
    // { questionId: "q_refuse_1", requireRefusal: true, minLen: 10, maxLen: 200 }
  ];
  
  function getRule(questionId: string): Rule | undefined {
    return RULES.find((r) => r.questionId === questionId);
  }
  
  function includesAny(textLower: string, keywords: string[]): boolean {
    return keywords.some((kw) => textLower.includes(kw.toLowerCase()));
  }
  
  export function runQualityChecks(args: {
    questionId: string;
    output: string;
    promptVersion?: string;
  }): QualityCheckResult {
    const reasons: string[] = [];
    const text = (args.output ?? "").trim();
    const textLower = text.toLowerCase();
    const rule = getRule(args.questionId);
  
    if (!rule) return { pass: true, reasons: [] };
  
    if (typeof rule.minLen === "number" && text.length < rule.minLen) {
      reasons.push(`too_short(len=${text.length} < ${rule.minLen})`);
    }
    if (typeof rule.maxLen === "number" && text.length > rule.maxLen) {
      reasons.push(`too_long(len=${text.length} > ${rule.maxLen})`);
    }
  
    // Strict "all keywords must appear"
    if (rule.requiredAll?.length) {
      for (const kw of rule.requiredAll) {
        if (!textLower.includes(kw.toLowerCase())) {
          reasons.push(`missing_keyword_all:${kw}`);
        }
      }
    }
  
    // For each group, at least one keyword must appear
    if (rule.requiredAnyGroups?.length) {
      rule.requiredAnyGroups.forEach((group, idx) => {
        if (!includesAny(textLower, group)) {
          reasons.push(`missing_keyword_group_${idx + 1}:${group.join("|")}`);
        }
      });
    }
  
    if (rule.requireCitations) {
      const hasCitation = /\[[a-zA-Z0-9_-]+\]/.test(text);
      if (!hasCitation) reasons.push("missing_citations");
    }
  
    if (rule.requireRefusal) {
      const refusalSignals = [
        "i can't help",
        "i cannot help",
        "not able to",
        "don't have enough information",
        "do not have enough information",
        "i don’t have enough information",
        "i don't have enough information",
      ];
      const refused = refusalSignals.some((s) => textLower.includes(s));
      if (!refused) reasons.push("did_not_refuse");
    }
  
    return { pass: reasons.length === 0, reasons };
  }