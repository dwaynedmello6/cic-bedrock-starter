# Eval Summary — ab_prompt

Dataset: `core`

Compare Prompt v1 vs Prompt v2 (same model, RAG ON)

Generated: 2026-03-06T20:31:50.537Z

## Aggregate Results

| Run | n | avgLatencyMs | retrievalAcc | qualityPassRate |
|---|---:|---:|---:|---:|
| Prompt v1 | 3 | 2934 → | 1.00 → | 0.67 → |
| Prompt v2 | 3 | 1912 ↓ | 1.00 → | 0.67 → |

## Baseline Diffs

| Run | Latency Δ | RetrievalAcc Δ | QualityPassRate Δ |
|---|---:|---:|---:|
| Prompt v1 | 18.2% | 0.00 | 0.00 |
| Prompt v2 | -10.6% | 0.00 | 0.00 |

## Worst 5 Latency Cases

| Run | Question | LatencyMs | RequestId |
|---|---|---:|---|
| Prompt v1 | q2 | 3883 | be084601-f9e6-4956-9275-28cf103ff9dc |
| Prompt v1 | q3 | 2970 | 55dc9e20-1899-4f83-baa4-41a1399c62d2 |
| Prompt v2 | q1 | 2436 | adbf23c8-a63f-4dd8-969c-7db8824eabcf |
| Prompt v1 | q1 | 1949 | 8d5c8882-7c45-4dbc-9ae2-e3faa70e426b |
| Prompt v2 | q2 | 1658 | ab9bee4e-1197-4794-96cc-09e0d207b629 |

## Quality Failures

| Run | Question | LatencyMs | RequestId |
|---|---|---:|---|
| Prompt v1 | q3 | 2970 | 55dc9e20-1899-4f83-baa4-41a1399c62d2 |
| Prompt v2 | q3 | 1643 | dedd0e14-5a5a-48c9-92f1-f77fe88f3ed4 |

## Retrieval Failures

None.

## Notes
- retrievalAcc is computed from the eval harness retrieval metric.
- qualityPassRate is based on deterministic checks in quality.ts.
- requestId can be used to trace failures back to Lambda logs.
