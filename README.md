# Bedrock RAG Evaluation & Experimentation Platform

A production-style evaluation and experimentation framework for **RAG (Retrieval Augmented Generation) AI systems** built on **AWS Bedrock**.

This project demonstrates how teams can systematically evaluate improvements to AI assistants by testing:

- different **models**
- different **prompt versions**
- **RAG enabled vs disabled**
- retrieval quality
- response quality
- latency performance
- regressions over time

The system includes a full **cloud inference pipeline**, **evaluation harness**, and **CI-style regression gates**, similar to internal tooling used by platform teams working with LLM systems.

---

# Architecture

```
Client / Eval Harness
│
│ HTTP Request
▼
API Gateway
│
▼
AWS Lambda
│
├── Security Pipeline
│   ├── Input validation
│   ├── PII detection
│   └── Redaction
│
├── Retrieval Layer (RAG)
│   └── Local policy knowledge base
│
├── Prompt Builder
│   ├── Prompt v1
│   └── Prompt v2
│
└── Bedrock Model Invocation
│
▼
Amazon Bedrock Model
│
▼
Response + Metadata
(requestId, retrieval info, metrics)
```

The **evaluation harness** runs controlled experiments against the API and generates performance reports.

---

# Key Features

## RAG AI Service

Production-style Bedrock inference service with:

- API Gateway
- Lambda inference layer
- Bedrock model invocation
- retrieval pipeline
- prompt versioning

---

## Security Pipeline

Before invoking the model:

- prompt validation
- PII detection
- automatic redaction

Ensures sensitive data is never sent to the model.

---

## Retrieval Augmented Generation (RAG)

Local knowledge base retrieval:

```
question
↓
top-K retrieval
↓
prompt assembly
↓
Bedrock model
```

Used to ground answers in internal documents.

---

## AI Experimentation Framework

The evaluation harness can test combinations of:

| Variable | Example |
|----------|---------|
| Model | Claude Haiku vs Sonnet |
| Prompt | v1 vs v2 |
| RAG | enabled vs disabled |

Example experiments:

```
rag_toggle
ab_model
ab_prompt
matrix_small
```

---

## Evaluation Metrics

Each run records:

### Retrieval Metrics

- retrieval accuracy
- **Recall@K**
- **MRR (Mean Reciprocal Rank)**

### Response Quality Checks

Deterministic quality checks verify:

- required keywords present
- response length constraints
- grounding consistency
- refusal detection
- hallucination signals

### Performance Metrics

- latency
- token usage (optional)
- request trace IDs

---

## Regression Detection

The system supports **baseline comparisons**.

A known-good run can be saved:

```bash
npm run eval -- --dataset core --experiment ab_prompt --save-baseline
```

Future runs compare against the baseline:

```bash
npm run eval -- --dataset core --experiment ab_prompt --baseline core_ab_prompt
```

The system fails if:

- latency increases too much
- retrieval quality drops
- response quality degrades

This enables **CI-style regression protection for AI systems**.

---

## Experiment Reports

Each run generates structured reports:

```
eval/reports/report_*.json
eval/reports/latest_summary.md
```

Example summary:

| Run | n | avgLatencyMs | retrievalAcc | qualityPassRate |
|-----|---|-------------|--------------|-----------------|
| Model A | 3 | 1200 | 1.00 | 1.00 |
| Model B | 3 | 950 | 1.00 | 1.00 |

Reports also include:

- worst latency cases
- retrieval failures
- quality failures
- requestIds for tracing logs

---

# Running Experiments

### Run evaluation

```bash
cd eval
npm run eval -- --dataset core --experiment ab_prompt
```

### Save baseline

```bash
npm run eval -- --dataset core --experiment ab_prompt --save-baseline
```

### Compare against baseline

```bash
npm run eval -- --dataset core --experiment ab_prompt --baseline core_ab_prompt
```

---

# Example Experiments

## Prompt Comparison

```
Prompt v1 vs Prompt v2
```

Measures:

- response quality
- latency
- grounding consistency

---

## Model Comparison

```
Model A vs Model B
```

Measures:

- response quality
- latency
- retrieval grounding

---

## RAG Comparison

```
RAG ON vs OFF
```

Measures:

- hallucination reduction
- answer grounding
- latency impact

---

# Project Structure

```
services/
  api/
    src/
      handler.ts
      security/
      retrieval/
      bedrock/

shared/
  src/
    prompts/

eval/
  src/
    runEval.ts
    quality.ts
    grounding.ts
    retrievalMetrics.ts
    experiments.ts
    baselines.ts
    compare.ts
    gates.ts
    report.ts

  datasets/
    core.json

  reports/
  baselines/
```

---

# Why This Project

Most AI demos stop at:

```
LLM API call
+ maybe RAG
```

Real production systems require:

- experimentation frameworks
- regression protection
- evaluation metrics
- prompt testing
- model comparison
- observability

This project demonstrates **how teams can safely iterate on AI systems using structured evaluation pipelines**.

---

# Technologies

- AWS Bedrock
- AWS Lambda
- API Gateway
- TypeScript
- Node.js
- Retrieval Augmented Generation (RAG)

---

# Future Improvements

Possible extensions:

- vector database retrieval
- LLM-based evaluation judges
- web dashboard for experiments
- multi-dataset benchmarking
- automated CI experiment runs

---

# Example Use Cases

This platform can evaluate AI assistants such as:

- policy assistants
- document search systems
- internal knowledge chatbots
- customer support AI

---

# License

MIT