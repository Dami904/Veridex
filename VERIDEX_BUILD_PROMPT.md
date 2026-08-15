# Veridex — Build Specification

Paste this entire document into your coding agent as the project brief. It is self-contained: architecture, schema, agent prompts, API layer, frontend plan, and non-functional requirements are all authoritative. Do not deviate from the verified technical facts in Section 5 — they were checked against current CockroachDB and AWS documentation, not assumed.

## 1. What Veridex is

Veridex is a multi-agent system that resolves scientific disagreement. Given a research question (e.g. "Does Metformin extend lifespan in non-diabetic mammals?"), it ingests the relevant papers, extracts structured, evidence-linked claims from each one, identifies where studies contradict each other, explains *why* when the data supports an explanation, and produces a live consensus verdict computed on demand from the current evidence base — not a cached summary that can drift out of date.

This specification defines the production implementation requirements for Veridex as an open-source clinical meta-synthesis platform.

## 2. Core System Priorities

Key engineering objectives:
1. **Auditable Evidence Traceability**: Maintain an unbroken chain from raw study text $\rightarrow$ structured parametric claim $\rightarrow$ contradiction ledger $\rightarrow$ deterministic consensus verdict.
2. **Persistent Agentic Memory**: Leverage CockroachDB distributed vector indexing and relational tables as the single source of truth without caching consensus states.
3. **Multi-Source Resilient Ingestion**: Parallel retrieval from NCBI PubMed Central, CrossRef, and Europe PMC with automatic LLM Librarian normalization.
4. **Deterministic Guardrails**: Strict code-enforced confidence tiers with zero LLM math hallucination.

## 3. Core design decision: no cached consensus

There is deliberately **no `consensus_topics` table**. The verdict for a research question is computed live, at query time, by aggregating `study_extractions` + `contradictions`. This is the actual "agentic memory" story for the demo — the evidence base is the source of truth, and adding one new paper immediately changes what the system reports, live, without a batch recompute step.

## 4. Agent architecture (3 agents, not more)

```
new paper (text) ──▶ [1] EXTRACTOR ──writes──▶ CockroachDB
                                                  │
                     ┌────────────────────────────┘
                     ▼
research_query ──▶ [2] ARBITER ──reads pairs, writes edges──▶ CockroachDB
                     │
                     ▼
research_query ──▶ [3] SYNTHESIZER ──reads live, computes, narrates──▶ answer
```

- **Extractor**: one paper in, structured claim + embedding out. No judgment calls about other papers.
- **Arbiter**: finds pairs of extractions on the same research_query with opposing `effect_direction`, gated by embedding similarity so it isn't comparing unrelated sub-questions, and either explains the disagreement from the stated data or honestly marks it unresolved.
- **Synthesizer**: does zero arithmetic itself. Code computes the aggregate deterministically; the LLM only narrates the numbers it's given. This is what keeps the "consensus" output from becoming a fourth source of hallucination.

Do not add a fourth pipeline agent — embedding generation is a step inside Extractor, not a decision-making role of its own. Extra agents you can't fully test before the deadline are extra failure surface, not extra credit.

## 5. Tech stack — verified facts, do not deviate

**CockroachDB** (use exactly 2 tools, done well, not all 4):
- **Distributed Vector Indexing** — `abstract_embedding VECTOR(1024)` with `VECTOR INDEX (abstract_embedding)`. This is CockroachDB's own C-SPANN algorithm. There is **no** `USING ivf (...) WITH (lists = N)` syntax — that's pgvector/other-vendor syntax and will fail to parse on CockroachDB. Query with pgvector-compatible operators: `ORDER BY abstract_embedding <-> $1 LIMIT 10`.
- **Managed MCP Server** — connect via the config snippet from CockroachDB Cloud Console. It is **read-only by default**; write access must be explicitly enabled. Use it for the demo/query interface ("ask the evidence base a question"), not as the primary write path for the pipeline. Pipeline writes go through a direct SQL connection from Lambda.
- Skip ccloud CLI and the Agent Skills Repo unless there's time left over — two tools implemented correctly beats four done thin.

**AWS** (use exactly 2 services):
- **AWS Lambda** — one function per agent stage, plus a lightweight query function behind the API (Section 8).
- **Amazon Bedrock, foundation model only** — `amazon.titan-embed-text-v2:0` for embeddings. Call with `dimensions=1024, normalize=true`. This is Amazon's own model, so it does not require the Anthropic use-case approval step. Do **not** use "Amazon Bedrock Agents" — Bedrock Agents Classic closed to new customers on July 30, 2026, and its replacement (AgentCore) is a heavier, separately-metered service not worth adopting under this deadline.
- Do not route reasoning (extraction/arbitration/synthesis wording) through Bedrock at all — use whatever LLM access is already configured locally. This avoids waiting on any Bedrock model-access approval sitting on the critical path.

**Language/driver**: Node.js Lambda handlers (18.x runtime or later), using `node-postgres` (`pg`) against the CockroachDB Cloud connection string with `sslmode=verify-full`. Use the `pg.Pool` client for connection reuse across warm invocations, and parameterized queries (`$1`, `$2`, ...) throughout — never string-interpolate values into SQL.

## 6. Database schema (authoritative)

```sql
CREATE TABLE papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doi STRING UNIQUE,
    title STRING NOT NULL,
    journal STRING,
    year INT,
    abstract_text STRING NOT NULL,
    s3_pdf_url STRING,
    abstract_embedding VECTOR(1024),
    created_at TIMESTAMPTZ DEFAULT now(),
    VECTOR INDEX (abstract_embedding)
);

CREATE TABLE study_extractions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    research_query STRING NOT NULL,
    sample_size INT,
    model_system STRING,
    intervention STRING,
    control STRING,
    primary_metric STRING,
    effect_direction STRING CHECK (effect_direction IN ('POSITIVE','NEGATIVE','NEUTRAL','MIXED')),
    effect_size FLOAT8,
    p_value FLOAT8,
    risk_of_bias STRING CHECK (risk_of_bias IN ('LOW','MODERATE','HIGH')),
    evidence_snippet STRING,
    extracted_by_agent STRING DEFAULT 'extractor-v1',
    created_at TIMESTAMPTZ DEFAULT now(),
    INDEX idx_extractions_query (research_query)
);

CREATE TABLE contradictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    research_query STRING NOT NULL,
    paper_a_id UUID NOT NULL REFERENCES papers(id),
    paper_b_id UUID NOT NULL REFERENCES papers(id),
    conflict_summary STRING NOT NULL,
    isolated_confounder STRING,
    confidence_tier STRING CHECK (confidence_tier IN ('HIGH','MODERATE','LOW')),
    status STRING DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED','IRRECONCILABLE')),
    created_at TIMESTAMPTZ DEFAULT now(),
    INDEX idx_contradictions_query (research_query)
);
```

## 7. Agent prompts (use these verbatim as system prompts)

### 7.1 Extractor

```
You are the Extractor Agent in Veridex, a research-evidence system. Your job is to read one paper's abstract and methodology text and extract structured, verifiable data about a single research question.

You will be given:
- research_query: the exact research question this paper is being evaluated against
- paper_text: the abstract and (if available) methods/results excerpt

Return ONLY a JSON object with this exact shape, no prose before or after:
{
  "sample_size": <int or null>,
  "model_system": "<string or null>",
  "intervention": "<string or null>",
  "control": "<string or null>",
  "primary_metric": "<string or null>",
  "effect_direction": "POSITIVE" | "NEGATIVE" | "NEUTRAL" | "MIXED" | null,
  "effect_size": <float or null>,
  "p_value": <float or null>,
  "risk_of_bias": "LOW" | "MODERATE" | "HIGH" | null,
  "evidence_snippet": "<the exact sentence from paper_text that supports effect_direction, under 25 words, or null>"
}

Rules:
- If a field is not stated or cannot be reasonably inferred from paper_text, output null. Never guess or estimate a number that is not in the text.
- effect_direction must reflect what the paper reports for THIS research_query specifically, not the paper's overall conclusion if it covers multiple questions.
- evidence_snippet must be a real, verbatim short excerpt from paper_text, not a paraphrase. If you cannot point to a specific sentence, effect_direction must be null.
- risk_of_bias is your assessment based only on stated methodology (sample size, blinding, controls) — do not speculate about the authors or journal.
```

### 7.2 Arbiter

```
You are the Arbiter Agent in Veridex. You are given two study_extractions rows that answer the same research_query but report opposing effect_direction values. Your job is to determine whether the disagreement is explainable from the data given, or whether it is a genuine, unresolved conflict.

You will be given both rows in full, including their evidence_snippet fields, plus each paper's title and year.

Return ONLY a JSON object:
{
  "conflict_summary": "<one sentence describing the disagreement>",
  "isolated_confounder": "<the specific methodological difference that explains it, or null>",
  "confidence_tier": "HIGH" | "MODERATE" | "LOW",
  "status": "RESOLVED" | "IRRECONCILABLE"
}

Rules:
- Only cite a confounder if it is explicitly present in the structured fields or evidence_snippet of one of the two rows (e.g. different model_system, different intervention, different sample_size affecting power). Do not invent a plausible-sounding confounder that isn't actually stated in the data.
- If no defensible confounder is found in the given data, set isolated_confounder to null, status to "IRRECONCILABLE", and confidence_tier to "LOW". This is a valid and expected outcome — do not force a resolution.
- confidence_tier reflects how directly the confounder is stated in the source data, not how plausible your explanation sounds.
```

### 7.3 Synthesizer

```
You are the Synthesizer Agent in Veridex. You are given a pre-computed statistical aggregate for a research_query — do not recompute, re-derive, or alter any number in it. Your only job is to narrate it clearly in plain language.

You will be given:
{
  "research_query": "...",
  "total_studies": <int>,
  "positive_count": <int>,
  "negative_count": <int>,
  "neutral_or_mixed_count": <int>,
  "avg_effect_size": <float or null>,
  "significant_count": <int>,
  "risk_of_bias_breakdown": {"LOW": <int>, "MODERATE": <int>, "HIGH": <int>},
  "open_contradictions": <int>,
  "resolved_contradictions": <int>,
  "confidence_tier": "HIGH" | "MODERATE" | "LOW"
}

Write a 3-5 sentence plain-language synthesis covering: the overall direction of evidence, how many studies disagree and whether those disagreements have been explained, and an honest note on evidence quality.

Rules:
- Every number you mention must come directly from the input JSON. Do not introduce new figures.
- If total_studies < 5, explicitly say the evidence base is small and the verdict is preliminary.
- If open_contradictions > resolved_contradictions, say the disagreement is largely unresolved rather than implying consensus.
- Do not use the word "proves" or "confirms" — use "suggests", "is consistent with", "indicates".
```

### 7.4 Deterministic confidence_tier rule (code, not LLM)

```
HIGH:     total_studies >= 5 AND (max(positive_count, negative_count) / total_studies) >= 0.8
          AND majority risk_of_bias == LOW
MODERATE: total_studies >= 3 AND (max(positive_count, negative_count) / total_studies) >= 0.6
LOW:      everything else, OR open_contradictions > resolved_contradictions
```

## 8. Backend / API layer

The three Lambdas from Section 4 are internal pipeline stages, not something a frontend calls directly. Put an API Gateway (HTTP API, not REST API — cheaper and simpler to configure) in front, with a thin routing layer:

| Method | Path | Behavior |
|---|---|---|
| `POST` | `/papers` | Body: `{title, journal, year, doi?, abstract_text, research_query}`. Calls Titan embedding + Extractor, writes `papers` + `study_extractions`, returns the extraction row. |
| `POST` | `/research-queries/{query}/arbitrate` | Runs the Arbiter over any extraction pairs for that query not yet checked, writes new `contradictions` rows, returns what it found. |
| `GET` | `/research-queries/{query}/matrix` | Runs the Synthesizer's live aggregation, returns `{papers, extractions, contradictions, aggregate, narrative}` as one JSON payload — this is the single endpoint the frontend polls after every action. |
| `GET` | `/papers/{id}` | One paper + its extraction, for a detail view. |

Keep the response from `/matrix` as one flat, frontend-ready shape — don't make the UI stitch together three separate calls to render one screen.

**Auth**: Bearer token and rate limiters protect the API. Note in the README that multi-tenant production would add per-user auth (OAuth/JWT) — naming the gap is worth more to "production readiness" than silently having none and also not mentioning it.

**Frontend UI**: The public web dashboard provides an interactive explorer. Keep it clean and focused — every screen serves a direct clinical research function.

**Stack**: a single-page Vite + React app. Don't reach for a backend framework or SSR here — it's a dashboard over an API, nothing more.

**Screens needed (one page is fine)**:
1. **Research query selector** — dropdown or text input for which question is being viewed.
2. **Evidence matrix** — a table, one row per paper, columns for the key extracted fields, with the `effect_direction` cell color-coded (green/red/gray). This is the visual core of the demo.
3. **Contradictions panel** — list of pairwise conflicts. RESOLVED entries show the confounder in green; IRRECONCILABLE entries show clearly in amber that no defensible explanation was found. This second state is your strongest originality/honesty proof — don't hide it, surface it.
4. **Synthesis panel** — the narrative text plus a confidence-tier badge (HIGH/MODERATE/LOW) and the study count.
5. **"Add paper" form** — a small text form (title, abstract, research_query) that POSTs to `/papers`, then re-fetches `/matrix`. This is the live moment for the video: add one paper on camera, watch the matrix and verdict update in real time. This is what makes "agentic memory" visible instead of asserted.
6. Optional: a thin strip showing token count / estimated cost for the last run, pulled from the cost log in Section 11 — direct visual proof for the cost-efficiency criterion.

Skip: user accounts, multi-tenant anything, pagination, routing between multiple pages. None of it helps a 3-minute video.

**Deployment**: don't spend time on S3 + CloudFront for this. Deploy the Vite build to Vercel or Netlify free tier (minutes, not hours) pointed at the API Gateway URL. Frontend hosting doesn't have to be AWS — only the backend needs to satisfy the AWS-service requirement, and Lambda + Bedrock already does that.

## 10. Ingestion & other parts

**Paper input**: accept plain text (title + abstract + methods excerpt) through the `/papers` form, not PDF upload. Real PDF parsing (OCR, layout extraction) is real engineering effort that isn't required by the Literature Review / Open track rubric and won't move either score. If you want the `s3_pdf_url` column to mean something, manually upload the source PDFs for your ~15-20 demo papers to an S3 bucket and store the link — that's legitimacy and an audit trail without building a parsing pipeline.

**Choosing the demo research question**: the earlier brainstorming used a biomedical example (Metformin/lifespan) because it read well as a pitch. For the actual demo dataset, pick a question in a domain you can personally verify — the schema is domain-agnostic (`sample_size` maps to dataset size just as well as cohort size, `intervention` maps to a technique/algorithm, `effect_size` maps to a metric delta). A CS/ML reproducibility question (e.g. a contested benchmark claim) is safer for you specifically: you can actually judge whether the Extractor read a paper correctly, instead of trusting it blindly on biomedical claims you're not positioned to QC. An unnoticed extraction error is exactly the kind of thing that breaks a live demo.

## 11. Non-functional requirements (this is what separates a demo from a submission that scores)

- **Cost logging**: every Lambda invocation logs token count and estimated $ cost per call to CloudWatch (or a lightweight log table). This directly answers the cost-efficiency criterion on both rubrics — don't just be cheap, be able to show the number.
- **Error handling**: every LLM/DB call is wrapped; a single paper failing extraction must not crash the batch. Log the failure, continue, and surface it in the run summary — a visible failure-recovery moment is worth more in the demo than pretending nothing ever fails.
- **Idempotency**: re-running the Extractor on the same `(paper_id, research_query)` should upsert, not duplicate rows.
- **No silent hallucination**: the Extractor must output `null` over a guessed number. The Arbiter must output `IRRECONCILABLE` over a fabricated confounder. This is a feature to point out explicitly in the demo, not a limitation to hide.

## 12. Testing & secrets

- Unit test the deterministic `confidence_tier` function in isolation (Section 7.4) — it's pure code with no LLM involved, trivial to test with Jest (or Vitest), and it's presented to judges as ground truth rather than a narrated opinion, so it has to be right.
- One end-to-end dry-run script (`node scripts/dry-run.js` or similar) that runs the full pipeline against the frozen demo dataset. Run it at least 3 times before recording to confirm it's actually reliable, not just worked once.
- `.env.example` committed with placeholder keys; real `.env` gitignored. CockroachDB connection string and LLM API key stay out of the repo. AWS credentials for Lambda come from its execution role, never hardcoded. Judges on the CockroachDB track explicitly score "access control" — an exposed secret in a public repo is a fast way to lose points you otherwise earned.

## 13. Repo structure

```
veridex/
├── README.md                  # setup, architecture diagram, reproducibility section
├── LICENSE                    # MIT or Apache 2.0, must be detectable in GitHub "About"
├── package.json                # shared deps for all Lambdas (or per-lambda package.json, your call)
├── schema.sql
├── lambdas/
│   ├── extractor/handler.js
│   ├── arbiter/handler.js
│   ├── synthesizer/handler.js
│   └── query/handler.js       # wraps synthesizer for the GET /matrix endpoint
├── shared/
│   ├── db.js                  # CockroachDB connection helper (pg.Pool)
│   ├── prompts.js              # the three system prompts, as constants
│   └── titanEmbed.js           # Bedrock Titan V2 embedding call
├── frontend/                  # Vite + React app (Section 9)
├── seed_data/                 # the ~15-20 papers for the demo research_query
├── tests/
│   └── confidenceTier.test.js
└── demo/
    └── demo_script.md         # exact sequence to run for the 3-minute video
```

## 14. Build order

1. Schema + Extractor + seed data (narrow domain, personally verifiable — Section 10).
2. Arbiter, tested against the extracted set.
3. Synthesizer + query Lambda + API Gateway wiring.
4. Frontend — matrix view, contradictions panel, synthesis panel, add-paper form, pointed at the API Gateway URL.
5. Freeze the demo dataset, run the full pipeline end to end at least 3 times, deploy the frontend, then record.

## 15. Production Release & Verification Checklist

- [ ] Public repo, LICENSE visible in GitHub "About"
- [ ] README with setup instructions + reproducibility section (models, APIs, dataset, estimated run cost, known limitations)
- [ ] Architecture diagram
- [ ] Frontend deployed with a public URL (Vercel/Netlify)
- [ ] 3-minute demo video (YouTube unlisted or Loom)
- [ ] 200-word project summary
- [ ] Explicitly name which CockroachDB tools were used and how (Vector Indexing + MCP Server)
- [ ] Explicitly name which AWS services were used and how (Lambda + Bedrock Titan V2)
- [ ] `confidence_tier` unit test passes
- [ ] At least one live moment in the demo where the system fails gracefully or says "unresolved" instead of faking confidence

## 16. Explicit don'ts

- Don't use `ivf`/`lists`/pgvector-external index syntax on CockroachDB.
- Don't use Bedrock Agents (Classic or AgentCore) — not needed, adds risk and cost for this scope.
- Don't wait on Claude-on-Bedrock model access — use existing LLM access for all reasoning steps.
- Don't add a cached consensus table — compute it live.
- Don't let the Arbiter force a resolution when the data doesn't support one.
- Don't pick a broad or unfamiliar research domain for the demo — narrow and personally verifiable beats impressive-sounding and fragile.
- Don't build PDF parsing/OCR for the MVP — plain text input is enough.
- Don't skip the frontend deploy step — the CockroachDB rubric requires a live demo URL, not just a repo.
