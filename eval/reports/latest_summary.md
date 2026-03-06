# Eval Summary — ab_prompt

Compare Prompt v1 vs Prompt v2 (same model, RAG ON)

Generated: 2026-03-06T01:30:12.847Z

| Run | n | avgLatencyMs | retrievalAcc | qualityPassRate |
|---|---:|---:|---:|---:|
| Prompt v1 | 3 | 1254 → | 1.00 → | 1.00 → |
| Prompt v2 | 3 | 749 ↓ | 1.00 → | 1.00 → |

## Notes
- retrievalAcc is only computed for RAG runs
- qualityPassRate is based on keyword/length/citation/refusal checks (no LLM judge yet)
