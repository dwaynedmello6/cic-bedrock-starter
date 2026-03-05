// eval/src/evalDataset.ts

export type EvalCase = {
    id: string;
    question: string;
    expectedContext?: string[]; // what you expect retriever to use
    notes?: string;
  };
  
  export const evalDataset: EvalCase[] = [
    {
      id: "q1",
      question: "What should we log for security reviews?",
      expectedContext: ["policy2", "policy3"], // adjust to your truth
    },
    {
      id: "q2",
      question: "Should raw prompts with sensitive data be logged?",
      expectedContext: ["policy2", "policy3"],
    },
    {
      id: "q3",
      question: "What kinds of data should we avoid logging if prompts might contain PII?",
      expectedContext: ["policy2"],
    },
  ];