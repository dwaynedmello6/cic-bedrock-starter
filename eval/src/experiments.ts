// eval/src/experiments.ts

export type PromptVersion = "v1" | "v2";

export type ExperimentRun = {
  id: string;
  label: string;
  useRag: boolean;
  modelId?: string;
  promptVersion?: PromptVersion;
};

export type Experiment = {
  id: string;
  description: string;
  runs: ExperimentRun[];
};

const DEFAULT_MODEL_A =
  process.env.MODEL_A_ID ?? "anthropic.claude-3-haiku-20240307-v1:0";

const DEFAULT_MODEL_B =
  process.env.MODEL_B_ID ?? "anthropic.claude-3-haiku-20240307-v1:0";

export const EXPERIMENTS: Record<string, Experiment> = {
  // Existing: RAG ON/OFF
  rag_toggle: {
    id: "rag_toggle",
    description: "Compare RAG ON vs OFF",
    runs: [
      { id: "rag_on", label: "RAG ON", useRag: true },
      { id: "rag_off", label: "RAG OFF", useRag: false },
    ],
  },

  // Existing: Model A/B
  ab_model: {
    id: "ab_model",
    description: "Compare Model A vs Model B (RAG ON)",
    runs: [
      {
        id: "model_a",
        label: "Model A",
        useRag: true,
        modelId: DEFAULT_MODEL_A,
        promptVersion: "v1",
      },
      {
        id: "model_b",
        label: "Model B",
        useRag: true,
        modelId: DEFAULT_MODEL_B,
        promptVersion: "v1",
      },
    ],
  },

  // ⭐ NEW: Prompt Version A/B
  ab_prompt: {
    id: "ab_prompt",
    description: "Compare Prompt v1 vs Prompt v2 (same model, RAG ON)",
    runs: [
      {
        id: "prompt_v1",
        label: "Prompt v1",
        useRag: true,
        modelId: DEFAULT_MODEL_A,
        promptVersion: "v1",
      },
      {
        id: "prompt_v2",
        label: "Prompt v2",
        useRag: true,
        modelId: DEFAULT_MODEL_A,
        promptVersion: "v2",
      },
    ],
  },

  // Existing: full matrix
  matrix_small: {
    id: "matrix_small",
    description: "RAG x Model(A/B) x Prompt(v1/v2)",
    runs: [
      { id: "rag_on_a_v1", label: "RAG ON | A | v1", useRag: true, modelId: DEFAULT_MODEL_A, promptVersion: "v1" },
      { id: "rag_on_a_v2", label: "RAG ON | A | v2", useRag: true, modelId: DEFAULT_MODEL_A, promptVersion: "v2" },
      { id: "rag_on_b_v1", label: "RAG ON | B | v1", useRag: true, modelId: DEFAULT_MODEL_B, promptVersion: "v1" },
      { id: "rag_on_b_v2", label: "RAG ON | B | v2", useRag: true, modelId: DEFAULT_MODEL_B, promptVersion: "v2" },
      { id: "rag_off_a_v1", label: "RAG OFF | A | v1", useRag: false, modelId: DEFAULT_MODEL_A, promptVersion: "v1" },
      { id: "rag_off_b_v1", label: "RAG OFF | B | v1", useRag: false, modelId: DEFAULT_MODEL_B, promptVersion: "v1" },
    ],
  },
};

export function getExperimentOrThrow(id: string): Experiment {
  const exp = EXPERIMENTS[id];

  if (!exp) {
    const known = Object.keys(EXPERIMENTS).sort().join(", ");
    throw new Error(`Unknown experiment "${id}". Known: ${known}`);
  }

  return exp;
}