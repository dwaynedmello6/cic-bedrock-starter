// eval/src/baselines.ts

import fs from "node:fs";
import path from "node:path";
import type { RunAggregate } from "./gates";

export type BaselineFile = {
  dataset: string;
  experimentId: string;
  savedAt: string;
  aggregates: RunAggregate[];
};

export function makeBaselineName(dataset: string, experimentId: string): string {
  return `${dataset}_${experimentId}`;
}

export function getBaselinePath(name: string): string {
  return path.join(process.cwd(), "baselines", `${name}.json`);
}

export function saveBaseline(args: {
  dataset: string;
  experimentId: string;
  aggregates: RunAggregate[];
}): string {
  const outDir = path.join(process.cwd(), "baselines");
  fs.mkdirSync(outDir, { recursive: true });

  const name = makeBaselineName(args.dataset, args.experimentId);
  const outPath = getBaselinePath(name);

  const payload: BaselineFile = {
    dataset: args.dataset,
    experimentId: args.experimentId,
    savedAt: new Date().toISOString(),
    aggregates: args.aggregates,
  };

  fs.writeFileSync(outPath, JSON.stringify(payload, null, 2), "utf-8");
  return outPath;
}

export function loadBaseline(name: string): BaselineFile {
  const file = getBaselinePath(name);

  if (!fs.existsSync(file)) {
    throw new Error(`Baseline "${name}" not found. Expected file: ${file}`);
  }

  const raw = fs.readFileSync(file, "utf-8");
  const parsed = JSON.parse(raw) as BaselineFile;

  if (!parsed || !Array.isArray(parsed.aggregates)) {
    throw new Error(`Baseline "${name}" is invalid.`);
  }

  return parsed;
}