# 📖 Veridex — User Guide & Operational Manual

Welcome to **Veridex**, the autonomous scientific consensus engine powered by CockroachDB distributed vector memory, multi-agent arbitration, and live PubMed literature discovery.

---

## 🌐 Quick Access Links

| Service | Access URL | Description |
| :--- | :--- | :--- |
| **Live Production Web App** | [https://veridex-frontend.vercel.app](https://veridex-frontend.vercel.app) | Interactive browser dashboard hosted on Vercel Edge CDN |
| **Live Production API** | [https://veridex-consensus-engine.onrender.com](https://veridex-consensus-engine.onrender.com) | Express Node.js Swarm Backend on Render |
| **Source Repository** | [https://github.com/Dami904/Veridex](https://github.com/Dami904/Veridex) | Full source code with automated CI verification gates |

---

## 🚀 Key Workflows & Features Walkthrough

```text
┌────────────────────────────────────────────────────────────────────────────────────────┐
│                                VERIDEX OPERATION FLOW                                  │
│                                                                                        │
│   1. Enter Hypothesis ──▶ 2. Real-Time PubMed  ──▶ 3. Extractor Agent Live Analysis    │
│      (or select preset)       Discovery Stream        (N, p-values, Titan V2 Vectors)  │
│                                                              │                         │
│                                                              ▼                         │
│   6. 1-Click Export   ◀── 5. Contradiction Graph ◀── 4. Adversarial Arbiter            │
│      • PRISMA 2020 .md       Positive vs. Negative      (Isolates dosage/model         │
│      • BibTeX (Zotero)       Confounder Bridges          confounders)                  │
│      • RIS (EndNote)                                                                   │
└────────────────────────────────────────────────────────────────────────────────────────┘
```

---

### 1. 🔍 Automated Literature Discovery & Consensus Search
You can evaluate **any medical, biological, or scientific question in the world**:

1. Open the [Veridex Dashboard](https://veridex-frontend.vercel.app).
2. In the top search bar, type your target scientific question (e.g., *"Do GLP-1 receptor agonists reduce neuroinflammation?"* or *"Does low-dose metformin extend lifespan?"*).
   - *Tip*: You can also click any of the **Topic Presets** below the search bar for instant 1-click loading (Metformin, GLP-1, Rapamycin).
3. Click **"Search PubMed & Synthesize"**.
4. The system will:
   - Stream live Server-Sent Events (SSE) from the backend.
   - Query NCBI PubMed Central API in real time.
   - Dispatch the **Extractor Agent** across parallel batches to extract sample sizes ($N$), effect directions, and $p$-values.
   - Dispatch the **Arbiter Agent** to resolve methodological disputes.
   - Render the complete consensus matrix.

---

### 2. 📊 Reading the Synthesis Verdict Card & Exact Tier Criteria
At the top of the evidence dashboard, the **Synthesis Card** displays the mathematical consensus computed with **zero LLM arithmetic**:

#### 🎖️ Exact Deterministic Confidence Tier Rules (`lambdas/synthesizer/handler.js`):
- 🟢 **`HIGH`**: 
  - Total studies $\ge 5$
  - Consensus directional ratio $\ge 80\%$ (i.e. $\ge 80\%$ of studies agree on positive or negative)
  - Majority of studies have **Low Risk of Bias**
  - Open contradictions $\le$ resolved contradictions
- 🟡 **`MODERATE`**: 
  - Total studies $\ge 3$
  - Consensus directional ratio $\ge 60\%$
  - Open contradictions $\le$ resolved contradictions
- 🔴 **`LOW`**: 
  - Fewer than 3 studies, or consensus ratio $< 60\%$, or open/unresolved contradictions outweigh resolved contradictions.

---

### 3. 🕸️ Exploring the Visual Contradiction & Confounder Graph
Directly below the synthesis card is the interactive **Visual Topology Graph**:
- **Emerald Nodes (Left)**: Studies reporting positive / beneficial outcomes.
- **Rose Nodes (Right)**: Studies reporting negative / contradictory outcomes.
- **Center Confounder Bridges**:
  - Clicking any conflict bridge displays the **Isolated Methodological Confounder** (e.g., *Dosage disparity: 10 mg/kg low-dose vs. 400 mg/kg toxic threshold*, or *In-vitro cellular model vs. In-vivo mammalian cohort*).
  - Status indicator: `🟢 RESOLVED` vs. `🔴 IRRECONCILABLE`.

---

### 4. 📄 Ingesting Custom Research Papers & Binary PDFs
If you have your own research papers, unpublished manuscripts, or specific DOIs:

1. Click the **"+ Add Paper"** button in the top right.
2. Choose your input method:
   - **Tab 1: Abstract & DOI**: Paste raw study text, title, journal, year, and DOI.
   - **Tab 2: PDF Document Upload**: Drag and drop any `.pdf` research paper. Veridex parses the text, attempts cloud persistence to the **Amazon S3 Paper Lake** (`veridex-paper-lake-54271`), and ingests parameters directly into CockroachDB vector memory. If S3 credentials are unavailable, it logs an explicit notification and records `s3_pdf_url: null` without broken 404 links.
3. Click **"Ingest & Synthesize"**. The matrix recalculates instantly.

---

### 5. ⚡ C-SPANN Semantic Vector Search Explorer
To find semantically related literature across the distributed CockroachDB vector database:

1. Click **"Vector Search"** (Radar icon) in the header.
2. Enter any concept or biological mechanism (e.g., *"mitochondrial complex I inhibition"* or *"microglial activation in hippocampus"*).
3. The engine uses Bedrock Titan V2 / normalized 1024-dimensional vectors and CockroachDB's native `<->` cosine distance operator to rank papers by semantic similarity percentage.

---

### 6. 📥 Exporting Systematic Reviews & Reference Manager Sync
To use Veridex results in your research papers, grants, or publications:

1. Click **"Export PRISMA"** in the top navigation.
2. In the export modal:
   - **Download PRISMA .md**: Generates a publication-ready **PRISMA 2020 Systematic Review Markdown Report** containing study flow, risk of bias, and contradiction ledgers.
   - **BibTeX (`.bib`)**: 1-click download for **Zotero**, **Mendeley**, and **LaTeX / Overleaf**.
   - **EndNote (`.ris`)**: 1-click export for **EndNote** and Reference Manager.

---

## 💻 Programmatic API Reference

```bash
# 1. Health & Cluster Status
curl https://veridex-consensus-engine.onrender.com/health

# 2. Automated Literature Discovery & Consensus
curl -X POST https://veridex-consensus-engine.onrender.com/research-queries/discover-and-synthesize \
  -H "Content-Type: application/json" \
  -d '{"research_query": "Does intermittent fasting improve insulin sensitivity?"}'

# 3. CockroachDB C-SPANN Vector Semantic Search
curl -X POST https://veridex-consensus-engine.onrender.com/papers/search \
  -H "Content-Type: application/json" \
  -d '{"query": "autophagy and cellular senescence", "limit": 5}'

# 4. Download PRISMA Markdown Report
curl https://veridex-consensus-engine.onrender.com/research-queries/Does%20Low-Dose%20Metformin%20Extend%20Lifespan%20in%20Non-Diabetic%20Mammals%3F/export/prisma?format=markdown

# 5. Download Zotero / Mendeley BibTeX File
curl https://veridex-consensus-engine.onrender.com/research-queries/Does%20Low-Dose%20Metformin%20Extend%20Lifespan%20in%20Non-Diabetic%20Mammals%3F/export/bibtex
```
