# Veridex — 3-Minute Video Demo Script

**Project Title**: Veridex — Autonomous Multi-Agent Consensus & Contradiction Engine  
**Track**: Literature Review & Synthesis (IIT Madras) / Build with Agentic Memory (CockroachDB × AWS)  
**Target Video Duration**: 2 minutes 50 seconds (under 3:00 limit)

---

### [0:00 – 0:40] The Problem: The $28B Research Contradiction Bottleneck
* **Visual**: Open a browser with conflicting papers on *Metformin in Longevity* (Nature vs Cell Metabolism vs PNAS).
* **Narrative**:
  > "Scientific progress is paralyzed by conflicting literature. On a question like *'Does Metformin extend lifespan in healthy models?'*, 20 papers say YES, 15 say NO, and 10 are inconclusive.
  >
  > Today, PhDs spend 6 to 12 months manually extracting data into spreadsheets. Meanwhile, current AI chatbots either hallucinate or give vague summaries like *'There is mixed evidence'*, without explaining **why**.
  >
  > Welcome to **Veridex** — an autonomous multi-agent system that resolves scientific disagreement using CockroachDB distributed vector memory and AWS Bedrock."

---

### [0:40 – 1:30] Live System & Multi-Agent Architecture
* **Visual**: Open the live **Veridex Evidence Dashboard** (`localhost:3000`). Show the query *"Does Low-Dose Metformin Extend Lifespan in Non-Diabetic Mammals?"*.
* **Narrative**:
  > "Veridex runs three specialized agents with zero cached consensus tables:
  > 
  > 1. **The Extractor Agent**: Reads papers, generates 1024-dimensional embeddings via **Amazon Bedrock Titan V2**, and structures sample sizes, dosages, $p$-values, and verbatim quotes directly into CockroachDB.
  > 2. **The Arbiter Agent**: An adversarial critic that compares opposing studies to isolate hidden methodological confounders.
  > 3. **The Synthesizer Agent**: Computes deterministic statistical aggregates with zero arithmetic hallucination."

---

### [1:30 – 2:15] The Live Proof: Agentic Memory & Confounder Isolation
* **Visual**:
  1. Scroll down to the **Contradictions Panel**.
  2. Point to the **GREEN badge**: *"Confounder Isolated: Dosage Discrepancy (Low-dose 50mg vs High-dose 250mg toxicity threshold)"*.
  3. Point to the **AMBER badge**: *"Irreconcilable Disagreement: Identical C57BL/6 cohorts under standard protocol"*.
* **Narrative**:
  > "Look at what the Arbiter found. It didn't just say studies disagree—it isolated that studies reporting negative longevity were administering *supra-physiological doses of 250mg/kg*, which exceeds renal clearance.
  >
  > And where no methodological difference exists, Veridex honestly marks the conflict as **IRRECONCILABLE** rather than forcing a fake consensus.
  >
  > Now, watch live **Agentic Memory** in action: I'll click **Add Paper**, paste a new 2025 study, and click Extract. In under 200 milliseconds, CockroachDB's distributed C-SPANN vector index and relational state update, recalculating our certainty badge and synthesis narrative in real time."

---

### [2:15 – 2:45] CockroachDB & AWS Infrastructure
* **Visual**: Show the CockroachDB Cloud Console and the bottom status bar with token/cost tracking.
* **Narrative**:
  > "Under the hood:
  > - **CockroachDB Cloud** serves as our system of record with native C-SPANN distributed vector indexing alongside ACID relational study graphs.
  > - **CockroachDB Managed MCP Server** enables external AI agents like Claude or Cursor to query the live consensus graph directly over MCP.
  > - **AWS Lambda & Amazon Bedrock** handle serverless execution and vector embeddings.
  > - The entire 15-paper evaluation ran for **less than $0.001 USD**, proving extreme production cost-efficiency."

---

### [2:45 – 3:00] Conclusion
* **Visual**: Return to the full Veridex dashboard with the active matrix and confidence badge.
* **Narrative**:
  > "Veridex turns static research papers into an auditable, living consensus graph that never goes stale. Thank you."
