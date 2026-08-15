# Veridex — Autonomous Multi-Agent Consensus & Contradiction Engine

[![License: MIT](https://img.shields.io/badge/License-MIT-emerald.svg)](LICENSE)
[![Database: CockroachDB Cloud](https://img.shields.io/badge/Database-CockroachDB%20Distributed%20Vector-10b981.svg)](https://cockroachlabs.cloud)
[![AWS: Bedrock Titan V2](https://img.shields.io/badge/AWS-Bedrock%20Titan%20V2-FF9900.svg)](https://aws.amazon.com/bedrock)
[![Node: 18+](https://img.shields.io/badge/Node.js-18%2B-blue.svg)](https://nodejs.org)
[![Package Manager: pnpm](https://img.shields.io/badge/pnpm-11%2B-orange.svg)](https://pnpm.io)

> **Resolving Scientific Disagreement through Distributed Agentic Memory.**  
> Built for dual submission to the **IIT Madras Research Agents Hack** (Literature Review & Synthesis) and the **CockroachDB × AWS Hackathon** (Build with Agentic Memory).

---

## 1. Executive Summary & The Core Problem

When 50 scientific studies investigate a contested question (*e.g., "Does Metformin extend lifespan in non-diabetic models?"*), 20 report positive gains, 15 report toxicity, and 15 are inconclusive.

- **Current AI Chatbots** either hallucinate false consensus or provide non-committal summaries (*"There is mixed evidence"*), failing to explain **why** studies disagree.
- **Human PhD Systematic Reviews** require 6–12 months of manual extraction in spreadsheets.

**Veridex** automates this workflow with a 3-agent swarm backed by **CockroachDB distributed vector memory** and **AWS Bedrock**. Crucially, **there is zero cached consensus**—the evidence verdict is computed dynamically on demand at query time. Adding one new study instantly updates the consensus certainty and resolves or surfaces contradictions in real time.

---

## 2. System Architecture

```text
                                 ┌────────────────────────────────────────────────────────┐
                                 │                 AWS CLOUD INFRASTRUCTURE               │
                                 │                                                        │
                                 │   [Amazon S3]               [Amazon Bedrock]           │
                                 │  (PDF Paper Lake)      (Titan V2 Embeddings 1024-dim)  │
                                 └────────────▲─────────────────────────▲─────────────────┘
                                              │                         │
                                              │                         │
┌─────────────────────────────────────────────┴─────────────────────────┴────────────────────────────────────────────┐
│                                     VERIDEX MULTI-AGENT SWARM                                                      │
│                                                                                                                    │
│   New Paper ──▶ [1. Extractor Agent] ──writes──▶ CockroachDB Papers & Extractions Table                            │
│                         │                                  │                                                       │
│                         ▼                                  │                                                       │
│   Target Query ──▶ [2. Arbiter Agent] ──reads pairs ───────┴─writes──▶ CockroachDB Contradictions Graph             │
│                         │                                                    │                                     │
│                         ▼                                                    │                                     │
│   Target Query ──▶ [3. Synthesizer Agent] ──reads live extractions + edges ──┘ ──narrates──▶ Interactive Dashboard │
└─────────────────────────────────────────────────────┬──────────────────────────────────────────────────────────────┘
                                                      │
                                                      ▼
┌────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                      COCKROACHDB PERSISTENT AGENTIC MEMORY                                         │
│                                                                                                                    │
│   1. Distributed Vector Indexing   --> C-SPANN Vector Index (abstract_embedding VECTOR(1024))                      │
│   2. ACID Relational Extractions   --> Parametric study data (N, model_system, intervention, p-values, quotes)     │
│   3. Contradiction & Confounder Edges -> Pairwise dispute graph (RESOLVED vs. IRRECONCILABLE states)                │
│   4. Cloud Managed MCP Server      --> Read-only MCP interface allowing Cursor/Claude agents to query live evidence│
└────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Agent Responsibilities & Zero-Hallucination Design

| Agent | Core Function | Zero-Hallucination Guardrail |
| :--- | :--- | :--- |
| **1. Extractor** | Ingests paper text, calls Bedrock Titan V2 for 1024-dim vector embeddings, and extracts structured study parameters ($N$, dosage, $p$-values, effect direction). | Outputs `null` for any unstated parameter. Never estimates missing numbers. Requires verbatim quotes in `evidence_snippet`. |
| **2. Arbiter** | Adversarially inspects pairs of studies with opposing effect directions to isolate hidden methodological confounders. | Only cites confounders explicitly present in stated data. If unexplained, marks as **`IRRECONCILABLE`** rather than fabricating speculation. |
| **3. Synthesizer** | Narrates the overall consensus in plain language from pre-computed metrics. | Does **zero math**. Pure deterministic code calculates counts, percentages, and confidence tiers; the LLM only narrates the verified figures. |

### Deterministic Confidence Tier Rule (Pure Code)
```javascript
HIGH:     total_studies >= 5 AND (max(positive, negative) / total_studies) >= 0.8 AND majority risk_of_bias == LOW
MODERATE: total_studies >= 3 AND (max(positive, negative) / total_studies) >= 0.6
LOW:      everything else, OR open_contradictions > resolved_contradictions
```

---

## 4. Hackathon Criteria & Tool Mapping

### CockroachDB Tools Used ($\ge 2$ Required)
1. **CockroachDB Distributed Vector Indexing**:
   - `abstract_embedding VECTOR(1024)` indexed via native C-SPANN algorithm (`VECTOR INDEX (abstract_embedding)`).
   - Fast cosine distance retrieval (`<->`) over multi-paper claim clusters with zero maintenance windows.
2. **CockroachDB Cloud Managed MCP Server**:
   - Integrated endpoint (`https://cockroachlabs.cloud/mcp`) providing read-only SQL & vector query capability for external AI assistants (Cursor, Claude Code, VS Code).

### AWS Services Used ($\ge 1$ Required)
1. **AWS Lambda**: Serverless event handlers powering the Extractor, Arbiter, Synthesizer, and Query routing layers.
2. **Amazon Bedrock (Titan Text Embeddings V2)**: `amazon.titan-embed-text-v2:0` with `dimensions=1024, normalize=true` for dense semantic paper representations.
3. **Amazon S3**: Document storage for raw paper PDF artifacts (`s3_pdf_url`).

---

## 5. API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `POST` | `/papers` | Ingests paper, generates Titan V2 embedding, runs Extractor Agent, upserts into CockroachDB. |
| `POST` | `/research-queries/:query/arbitrate` | Runs Arbiter Agent over opposing pairs, writing new records to `contradictions`. |
| `GET` | `/research-queries/:query/matrix` | Computes live on-demand synthesis, returning unified `{ papers, extractions, contradictions, aggregate, narrative }`. |
| `GET` | `/papers/:id` | Fetches paper record with associated structured extractions. |
| `POST` | `/seed` | Ingests the 15-study curated benchmark dataset and triggers arbitration. |
| `GET` | `/health` | System health and database connectivity probe. |

---

## 6. Reproducibility & Cost Efficiency

- **Foundation Models**: Amazon Bedrock Titan Text V2 (`amazon.titan-embed-text-v2:0`).
- **Embedding Dimensions**: 1024 (L2 normalized).
- **Benchmark Corpus**: 15 peer-reviewed studies across *Nature Communications*, *Cell Metabolism*, *Aging Cell*, *PNAS*, and *Science* with verifiable dosage and model system variances.
- **Estimated Run Cost**: Under **$0.00015 USD** per paper ingestion; **$0.0009 USD** for full 15-paper swarm evaluation.
- **Known Limitations**: Production deployment requires multi-tenant JWT authentication on API Gateway (usage-plan key utilized for hackathon scope).

---

## 7. Quick Start & Local Development

### Prerequisites
- Node.js `v18.0.0+`
- `pnpm` (`v11.21.0+`)

### 1. Installation
```bash
git clone https://github.com/your-username/veridex.git
cd veridex
pnpm install
```

### 2. Configure Environment
```bash
cp .env.example .env
# Edit .env with your CockroachDB Cloud connection string and AWS keys (or run in local mock mode)
```

### 3. Run Automated Verification Tests
```bash
# Run unit & pipeline integration tests
pnpm test

# Run end-to-end dry run CLI
pnpm dry-run
```

### 4. Launch Local Development
```bash
# Start backend API (Port 4000)
pnpm dev

# In a separate terminal, start frontend dashboard (Port 3000)
pnpm --filter veridex-frontend dev
```
Open `http://localhost:3000` in your browser.

---

## 8. License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.
