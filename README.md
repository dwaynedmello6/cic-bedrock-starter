# Bedrock RAG Evaluation & Experimentation Platform

A production-style **evaluation and experimentation platform for Retrieval Augmented Generation (RAG) AI systems** built on **AWS Bedrock**.

This project demonstrates how teams can systematically evaluate improvements to AI assistants by testing:

- different **models**
- different **prompt versions**
- **RAG enabled vs disabled**
- retrieval quality
- response quality
- latency performance
- regressions over time

The system includes a full **cloud inference pipeline**, **evaluation harness**, and **CI-style regression gates**, similar to internal tooling used by platform teams working with LLM systems.

Infrastructure is deployed using **AWS CDK**, allowing the entire Bedrock inference service to be provisioned with a single command.

---

# System Architecture

```
                     +----------------------+
                     |   Evaluation Harness |
                     |  (Experiment Runner) |
                     +----------+-----------+
                                |
                                | HTTP
                                ▼
                    +-----------------------+
                    |     API Gateway       |
                    +-----------+-----------+
                                |
                                ▼
                     +--------------------+
                     |      AWS Lambda     |
                     |   AI Inference API  |
                     +----------+----------+
                                |
         +----------------------+----------------------+
         |                                             |
         ▼                                             ▼

+--------------------+                      +-----------------------+
|  Security Pipeline |                      |   Retrieval (RAG)     |
|--------------------|                      |-----------------------|
| Input validation   |                      | Knowledge base search |
| PII detection      |                      | Top-K context fetch   |
| Redaction          |                      | Context formatting    |
+--------------------+                      +-----------+-----------+
                                                        |
                                                        ▼
                                            +--------------------+
                                            |   Prompt Builder   |
                                            |--------------------|
                                            | Prompt Version v1  |
                                            | Prompt Version v2  |
                                            +-----------+--------+
                                                        |
                                                        ▼
                                            +--------------------+
                                            | Amazon Bedrock LLM |
                                            +-----------+--------+
                                                        |
                                                        ▼
                                         Response + Metadata
                                  (requestId, latency, contextIds)
```

The **evaluation harness** runs controlled experiments against this API and generates performance reports.

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

# Evaluation Metrics

Each run records multiple types of metrics.

## Retrieval Metrics

- retrieval accuracy
- **Recall@K**
- **MRR (Mean Reciprocal Rank)**

## Response Quality Checks

Deterministic quality checks verify:

- required keywords present
- response length constraints
- grounding consistency
- refusal detection
- hallucination signals

## Performance Metrics

- latency
- token usage (optional)
- request trace IDs

---

# Regression Detection

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

# Experiment Reports

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

# Infrastructure (AWS CDK)

The cloud infrastructure is deployed using **AWS CDK**.

This automatically provisions:

- API Gateway endpoint
- Lambda inference service
- Bedrock invocation permissions
- API keys for secure access

### Deploy infrastructure

```bash
cd infra
npm install
npx cdk deploy
```

Deployment outputs include:

```
API endpoint
API key
Invoke URL
```

The evaluation harness uses these outputs to run experiments against the deployed API.

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
infra/
  cdk/
    lib/
      infra-stack.ts
    bin/
      deploy.ts

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
      ragPrompt.v1.ts
      ragPrompt.v2.ts

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
- AWS CDK
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