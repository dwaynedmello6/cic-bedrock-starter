# Eval Summary — ab_model

Compare Model A vs Model B (RAG ON, prompt v1 default)

Generated: 2026-03-06T00:38:48.571Z

| Run | n | avgLatencyMs | retrievalAcc | qualityPassRate |
|---|---:|---:|---:|---:|
| Model A | 3 | 1069 → | 1.00 → | 0.67 → |
| Model B | 3 | 818 ↓ | 1.00 → | 1.00 ↑ |

## Notes
- retrievalAcc is only computed for RAG runs
- qualityPassRate is based on keyword/length/citation/refusal checks (no LLM judge yet)
