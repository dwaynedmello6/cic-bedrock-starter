import fs from "node:fs";
import path from "node:path";

export type EvalDatasetRow = {
  id: string;
  question: string;
  expected_context_ids?: string[];
  required_keywords?: string[];
  min_words?: number;
};

export function loadDataset(name: string): EvalDatasetRow[] {
  const file = path.join(process.cwd(), "datasets", `${name}.json`);

  if (!fs.existsSync(file)) {
    throw new Error(`Dataset "${name}" not found. Expected file: ${file}`);
  }

  const raw = fs.readFileSync(file, "utf-8");
  const parsed = JSON.parse(raw);

  if (!Array.isArray(parsed)) {
    throw new Error(`Dataset "${name}" must be an array.`);
  }

  return parsed;
}