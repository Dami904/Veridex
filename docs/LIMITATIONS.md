# Veridex — System Limitations & Scope Boundaries

Honest documentation of current scope boundaries and design trade-offs.

---

## 1. Input Modality & Parsing
- **Plain Text / Structured Abstract Input**: Veridex ingests paper titles, abstracts, and methodology excerpts as text rather than parsing arbitrary multi-column PDF layouts or OCR on figures. Full PDFs are linked via `s3_pdf_url` for auditability.
- **English Language**: The current prompts and embeddings are optimized for English-language scientific literature.

## 2. Agent Arbitration Scope
- **Pairwise Comparison**: The Arbiter currently compares pairs of studies with opposing effect directions (`POSITIVE` vs `NEGATIVE`). Higher-order multi-way ($N > 2$) confounder clustering is aggregated at the Synthesizer level.
- **Honesty over Speculation**: When studies use identical methodology but report different results with no stated confounder in the paper text, Veridex outputs `IRRECONCILABLE` rather than guessing a plausible-sounding explanation.

## 3. Statistical Aggregation vs Meta-Analysis
- **Deterministic Confidence Rating**: The confidence tier uses a rule-based algorithm (sample size, majority consensus $\ge 80\%$, risk of bias distribution) rather than a full Bayesian meta-regression.
- **No Direct Medical Advice**: Veridex synthesizes literature findings; it is not a clinical decision support tool and should not be used as medical advice.

## 4. Authentication & Multi-Tenancy
- **API Gateway Access**: Configured with usage-plan API keys for hackathon demonstration. Multi-tenant per-user authentication (OAuth/JWT) is marked as a production roadmap item.
