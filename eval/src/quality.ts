// eval/src/quality.ts

import { runGroundingChecks } from "./grounding";

export type QualityCheckResult = {
  pass: boolean;
  reasons: string[];
  passedChecks: string[];
  failedChecks: string[];
  qualityScore: number;
};

type Rule = {
  questionId: string;
  requiredAll?: string[];
  requiredAnyGroups?: string[][];
  minLen?: number;
  maxLen?: number;
  requireCitations?: boolean;
  requireRefusal?: boolean;
};

const RULES: Rule[] = [
  {
    questionId: "q1",
    requiredAnyGroups: [
      ["log", "logging"],
      ["metadata", "request id", "latency", "model id"],
    ],
    minLen: 40,
    maxLen: 800,
  },
  {
    questionId: "q2",
    requiredAnyGroups: [
      ["never", "don't", "do not", "avoid", "shouldn't", "must not"],
      ["raw prompt", "raw prompts", "prompt", "prompts", "retrieved docs", "retrieved documents", "documents", "docs"],
    ],
    minLen: 40,
    maxLen: 800,
  },
  {
    questionId: "q3",
    requiredAnyGroups: [
      ["redact", "mask", "remove", "strip"],
      ["pii", "personal information", "sensitive information", "sensitive data"],
    ],
    minLen: 20,
    maxLen: 900,
  },
];

function getRule(questionId: string): Rule | undefined {
  return RULES.find((r) => r.questionId === questionId);
}

function includesAny(textLower: string, keywords: string[]): boolean {
  return keywords.some((kw) => textLower.includes(kw.toLowerCase()));
}

function isRefusal(textLower: string): boolean {
  const refusalSignals = [
    "i can't help",
    "i cannot help",
    "not able to",
    "don't have enough information",
    "do not have enough information",
    "i don’t have enough information",
    "i don't have enough information",
    "not enough information",
  ];
  return refusalSignals.some((s) => textLower.includes(s));
}

export function runQualityChecks(args: {
  questionId: string;
  output: string;
  promptVersion?: string;
  useRag: boolean;
  usedContextIds: string[];
}): QualityCheckResult {
  const reasons: string[] = [];
  const passedChecks: string[] = [];
  const failedChecks: string[] = [];

  const text = (args.output ?? "").trim();
  const textLower = text.toLowerCase();
  const rule = getRule(args.questionId);

  if (!rule) {
    const grounding = runGroundingChecks({
      output: text,
      useRag: args.useRag,
      usedContextIds: args.usedContextIds,
    });

    return {
      pass: grounding.failedChecks.length === 0,
      reasons: [...grounding.failedChecks],
      passedChecks: grounding.passedChecks,
      failedChecks: grounding.failedChecks,
      qualityScore: grounding.failedChecks.length === 0 ? 1 : 0,
    };
  }

  if (typeof rule.minLen === "number") {
    if (text.length < rule.minLen) {
      const reason = `too_short(len=${text.length} < ${rule.minLen})`;
      reasons.push(reason);
      failedChecks.push(reason);
    } else {
      passedChecks.push("min_length_ok");
    }
  }

  if (typeof rule.maxLen === "number") {
    if (text.length > rule.maxLen) {
      const reason = `too_long(len=${text.length} > ${rule.maxLen})`;
      reasons.push(reason);
      failedChecks.push(reason);
    } else {
      passedChecks.push("max_length_ok");
    }
  }

  if (rule.requiredAll?.length) {
    for (const kw of rule.requiredAll) {
      if (!textLower.includes(kw.toLowerCase())) {
        const reason = `missing_keyword_all:${kw}`;
        reasons.push(reason);
        failedChecks.push(reason);
      } else {
        passedChecks.push(`has_keyword_all:${kw}`);
      }
    }
  }

  if (rule.requiredAnyGroups?.length) {
    rule.requiredAnyGroups.forEach((group, idx) => {
      if (!includesAny(textLower, group)) {
        const reason = `missing_keyword_group_${idx + 1}:${group.join("|")}`;
        reasons.push(reason);
        failedChecks.push(reason);
      } else {
        passedChecks.push(`keyword_group_${idx + 1}_ok`);
      }
    });
  }

  if (rule.requireCitations) {
    const hasCitation = /\[[a-zA-Z0-9_-]+\]/.test(text);
    if (!hasCitation) {
      reasons.push("missing_citations");
      failedChecks.push("missing_citations");
    } else {
      passedChecks.push("citations_present");
    }
  }

  if (rule.requireRefusal) {
    if (!isRefusal(textLower)) {
      reasons.push("did_not_refuse");
      failedChecks.push("did_not_refuse");
    } else {
      passedChecks.push("refusal_detected");
    }
  }

  const grounding = runGroundingChecks({
    output: text,
    useRag: args.useRag,
    usedContextIds: args.usedContextIds,
  });

  passedChecks.push(...grounding.passedChecks);
  failedChecks.push(...grounding.failedChecks);
  reasons.push(...grounding.failedChecks);

  const pass = failedChecks.length === 0;
  const qualityScore = pass ? 1 : 0;

  return {
    pass,
    reasons,
    passedChecks,
    failedChecks,
    qualityScore,
  };
}