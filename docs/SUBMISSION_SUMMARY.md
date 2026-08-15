# Veridex — System Architecture & Technical Summary

---

## 1. Executive Summary

Scientific progress is severely bottlenecked by conflicting literature. When dozens of peer-reviewed studies evaluate a contested hypothesis (e.g., *Metformin in Longevity* or *GLP-1 in Neuroinflammation*), researchers spend months manually parsing methodology in spreadsheets. Existing AI tools either hallucinate false consensus or provide vague summaries without explaining *why* papers disagree.

**Veridex** is an autonomous multi-agent system that resolves scientific disagreement through distributed agentic memory:
1. **Librarian Agent**: Discovers and ingests literature across NCBI PubMed Central, CrossRef Scholarly API (JAMA, Lancet, Nature), and Europe PMC.
2. **Extractor Agent**: Extracts structured parameters ($N$, dosage, $p$-values, verbatim evidence quotes) and generates Bedrock Titan V2 1024-dim vector embeddings.
3. **Arbiter Agent**: Adversarially compares opposing studies to isolate hidden methodological confounders (e.g., dosage thresholds, in-vivo vs. in-vitro divergence) while honestly flagging unexplained disputes as `IRRECONCILABLE`.
4. **Synthesizer Agent**: Deterministically calculates statistical consensus metrics with zero LLM arithmetic hallucination.

Backed by **CockroachDB distributed vector memory** (C-SPANN) and **AWS Bedrock Titan V2**, Veridex operates with **zero cached consensus tables**—verdicts are computed live at query time. Adding one new study dynamically recalculates consensus certainty and updates the contradiction graph in under 200 milliseconds.

---

## 2. Core Infrastructure & Tooling

### Database & Vector Memory
1. **Distributed Vector Indexing (C-SPANN)**: Indexed 1024-dimensional semantic paper embeddings (`VECTOR(1024)` with `VECTOR INDEX`) in CockroachDB Cloud for rapid cosine similarity search without separate vector databases or consistency gaps.
2. **Model Context Protocol (MCP) Server**: Standard MCP server (`mcp/server.js`) allowing external AI agents (Claude Desktop, Cursor, Antigravity) to query live evidence directly.

### AI & Cloud Infrastructure
1. **Amazon Bedrock (Titan Text Embeddings V2)**: `amazon.titan-embed-text-v2:0` (1024-dim, normalized) for semantic paper representation.
2. **AWS Lambda & Express Handlers**: High-throughput asynchronous swarm orchestration with Server-Sent Events (SSE).
3. **Amazon S3**: Document storage for raw paper PDF artifacts (`s3_pdf_url`).

### Agentic Memory Design Highlight
Traditional AI research tools use ephemeral in-memory arrays or static cached summaries. Veridex uses CockroachDB as an immutable system of record storing both vector embeddings and ACID relational claim graphs. The consensus verdict is never cached—it is dynamically aggregated at query time from `study_extractions` and `contradictions`, ensuring the knowledge base never drifts out of date.
