# Veridex — Official Hackathon Submission Summaries

---

## 1. IIT Madras Research Agents Hack (200-Word Submission Summary)

**Word Count**: 194 words

Scientific progress is severely bottlenecked by conflicting literature. When dozens of peer-reviewed studies evaluate a contested hypothesis (e.g., *Metformin in Longevity*), researchers spend months manually parsing methodology in spreadsheets. Existing AI tools either hallucinate false consensus or provide vague summaries without explaining *why* papers disagree.

**Veridex** is an autonomous multi-agent system that resolves scientific disagreement through distributed agentic memory:
1. **Extractor Agent**: Ingests papers, extracts structured parameters ($N$, dosage, $p$-values, verbatim evidence quotes), and generates dense vector embeddings.
2. **Arbiter Agent**: Adversarially compares opposing studies to isolate hidden methodological confounders (e.g., dosage thresholds, in-vivo vs. in-vitro divergence) while honestly flagging unexplained disputes as `IRRECONCILABLE`.
3. **Synthesizer Agent**: Deterministically calculates statistical consensus metrics with zero LLM arithmetic hallucination.

Backed by **CockroachDB distributed vector memory** (C-SPANN) and **AWS Bedrock Titan V2**, Veridex operates with **zero cached consensus tables**—verdicts are computed live at query time. Adding one new study dynamically recalculates consensus certainty and updates the contradiction graph in under 200 milliseconds.

Veridex transforms static papers into an auditable, self-updating evidence graph, drastically accelerating systematic reviews with extreme cost efficiency (<$0.001 per review).

---

## 2. CockroachDB × AWS Hackathon (Submission Form Copy)

### Project Tagline
*Resolving scientific disagreement through distributed agentic memory and live consensus synthesis.*

### Which CockroachDB Tools Did You Use?
1. **Distributed Vector Indexing (C-SPANN)**: Indexed 1024-dimensional semantic paper embeddings (`VECTOR(1024)` with `VECTOR INDEX`) in CockroachDB Cloud for rapid cosine similarity search without separate vector databases or consistency gaps.
2. **CockroachDB Managed MCP Server**: Configured endpoint allowing external AI agents (Cursor, Claude Code) to inspect and query the live consensus evidence ledger via Model Context Protocol.

### Which AWS Services Did You Use?
1. **Amazon Bedrock (Titan Text Embeddings V2)**: `amazon.titan-embed-text-v2:0` (1024-dim, normalized) for semantic paper representation.
2. **AWS Lambda**: Serverless event handlers executing the Extractor, Arbiter, and Synthesizer pipeline.
3. **Amazon S3**: Document storage for raw paper PDF artifacts (`s3_pdf_url`).

### Agentic Memory Design Highlight
Traditional AI research tools use ephemeral in-memory arrays or static cached summaries. Veridex uses CockroachDB as an immutable system of record storing both vector embeddings and ACID relational claim graphs. The consensus verdict is never cached—it is dynamically aggregated at query time from `study_extractions` and `contradictions`, ensuring the knowledge base never drifts out of date.
