# Eval Summary — ab_model

Compare Model A vs Model B (RAG ON)

Generated: 2026-03-06T03:57:24.583Z

| Run | n | avgLatencyMs | retrievalAcc | qualityPassRate |
|---|---:|---:|---:|---:|
| Model A | 3 | 860 → | 1.00 → | 1.00 → |
| Model B | 3 | 867 ↑ | 1.00 → | 1.00 → |

## Notes
- retrievalAcc is only computed for RAG runs
- qualityPassRate is based on keyword/length/citation/refusal checks (no LLM judge yet)
