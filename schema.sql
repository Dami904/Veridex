-- ==============================================================================
-- Veridex — Authoritative CockroachDB Schema
-- Hybrid Vector Indexing (C-SPANN) + ACID Relational Study & Contradiction Graph
-- ==============================================================================

-- 1. Papers Table with Distributed Vector Column
CREATE TABLE IF NOT EXISTS papers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doi STRING UNIQUE,
    title STRING NOT NULL,
    journal STRING,
    year INT,
    abstract_text STRING NOT NULL,
    s3_pdf_url STRING,
    abstract_embedding VECTOR(1024),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Structured Study Extractions (ACID Relational Claim Records)
CREATE TABLE IF NOT EXISTS study_extractions (
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
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 3. Pairwise Contradictions & Confounder Graph
CREATE TABLE IF NOT EXISTS contradictions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    research_query STRING NOT NULL,
    paper_a_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    paper_b_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
    conflict_summary STRING NOT NULL,
    isolated_confounder STRING,
    confidence_tier STRING CHECK (confidence_tier IN ('HIGH','MODERATE','LOW')),
    status STRING DEFAULT 'OPEN' CHECK (status IN ('OPEN','RESOLVED','IRRECONCILABLE')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 4. Secondary & Vector Indexes

-- Standard relational indexes
CREATE INDEX IF NOT EXISTS idx_extractions_query ON study_extractions (research_query);
CREATE INDEX IF NOT EXISTS idx_contradictions_query ON contradictions (research_query);

-- True ANN vector index (CockroachDB 25.2+, C-SPANN algorithm).
-- Requires feature flag to be set once per cluster before this DDL runs:
--   SET CLUSTER SETTING feature.vector_index.enabled = true;
-- For non-empty tables, also requires:
--   SET sql_safe_updates = false;
-- Backfill temporarily blocks writes; run during a low-traffic window.
CREATE VECTOR INDEX IF NOT EXISTS idx_papers_embedding_cosine
    ON papers (abstract_embedding);
