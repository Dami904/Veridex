import { query, formatVector } from '../../shared/db.js';
import { EXTRACTOR_SYSTEM_PROMPT } from '../../shared/prompts.js';
import { generateTitanEmbedding } from '../../shared/titanEmbed.js';
import { executeLLMCall } from '../../shared/llm.js';
import { randomUUID } from 'crypto';

/**
 * Validates and strictly sanitizes raw LLM extraction JSON before DB insertion
 */
export function validateAndSanitizeExtraction(raw) {
  if (!raw || typeof raw !== 'object') {
    return {
      sample_size: null,
      model_system: null,
      intervention: null,
      control: null,
      primary_metric: null,
      effect_direction: null,
      effect_size: null,
      p_value: null,
      risk_of_bias: null,
      evidence_snippet: null,
    };
  }

  // 1. sample_size: integer >= 0 or null
  let sample_size = null;
  if (raw.sample_size !== null && raw.sample_size !== undefined) {
    const parsedN = parseInt(raw.sample_size, 10);
    if (!isNaN(parsedN) && parsedN >= 0) {
      sample_size = parsedN;
    }
  }

  // 2. effect_direction: strictly one of POSITIVE, NEGATIVE, NEUTRAL, MIXED, or null
  let effect_direction = null;
  if (typeof raw.effect_direction === 'string') {
    const upperDir = raw.effect_direction.toUpperCase().trim();
    if (['POSITIVE', 'NEGATIVE', 'NEUTRAL', 'MIXED'].includes(upperDir)) {
      effect_direction = upperDir;
    }
  }

  // 3. risk_of_bias: strictly one of LOW, MODERATE, HIGH, or null
  let risk_of_bias = null;
  if (typeof raw.risk_of_bias === 'string') {
    const upperBias = raw.risk_of_bias.toUpperCase().trim();
    if (['LOW', 'MODERATE', 'HIGH'].includes(upperBias)) {
      risk_of_bias = upperBias;
    }
  }

  // 4. p_value: float between 0 and 1 or null
  let p_value = null;
  if (raw.p_value !== null && raw.p_value !== undefined) {
    const parsedP = parseFloat(raw.p_value);
    if (!isNaN(parsedP) && parsedP >= 0 && parsedP <= 1) {
      p_value = Number(parsedP.toFixed(6));
    }
  }

  // 5. effect_size: float or null
  let effect_size = null;
  if (raw.effect_size !== null && raw.effect_size !== undefined) {
    const parsedEff = parseFloat(raw.effect_size);
    if (!isNaN(parsedEff)) {
      effect_size = Number(parsedEff.toFixed(4));
    }
  }

  const sanitizeStr = (v, maxLen = 300) => {
    if (typeof v !== 'string' || v.trim().length === 0) return null;
    return v.trim().slice(0, maxLen);
  };

  return {
    sample_size,
    model_system: sanitizeStr(raw.model_system, 120),
    intervention: sanitizeStr(raw.intervention, 150),
    control: sanitizeStr(raw.control, 150),
    primary_metric: sanitizeStr(raw.primary_metric, 150),
    effect_direction,
    effect_size,
    p_value,
    risk_of_bias,
    evidence_snippet: sanitizeStr(raw.evidence_snippet, 500),
  };
}

/**
 * Extractor Lambda Handler
 * Ingests a single paper, generates Titan V2 embedding, extracts structured claim data,
 * and records both into CockroachDB with idempotent conflict resolution.
 */
export async function handleExtract(event) {
  const body = typeof event.body === 'string' ? JSON.parse(event.body) : (event.body || event);
  const {
    title,
    journal = null,
    year = null,
    doi = null,
    abstract_text,
    research_query,
    s3_pdf_url = null,
  } = body;

  if (!title || !abstract_text || !research_query) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required fields: title, abstract_text, research_query' }),
    };
  }

  try {
    // 1. Generate Amazon Bedrock Titan V2 1024-dim embedding
    const embeddingText = `${title}\n\n${abstract_text}`;
    const embeddingArray = await generateTitanEmbedding(embeddingText);
    const vectorString = formatVector(embeddingArray);

    // 2. Insert or update Paper record in CockroachDB (Idempotent by DOI)
    const paperId = randomUUID();
    let savedPaper = null;

    if (doi) {
      const paperUpsertQuery = `
        INSERT INTO papers (id, doi, title, journal, year, abstract_text, s3_pdf_url, abstract_embedding)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (doi) DO UPDATE SET
          title = EXCLUDED.title,
          journal = EXCLUDED.journal,
          year = EXCLUDED.year,
          abstract_text = EXCLUDED.abstract_text,
          s3_pdf_url = EXCLUDED.s3_pdf_url,
          abstract_embedding = EXCLUDED.abstract_embedding
        RETURNING id, doi, title, journal, year, abstract_text, s3_pdf_url, created_at;
      `;
      const paperResult = await query(paperUpsertQuery, [
        paperId,
        doi,
        title,
        journal,
        year ? parseInt(year, 10) : null,
        abstract_text,
        s3_pdf_url,
        vectorString,
      ]);
      savedPaper = paperResult.rows[0];
    } else {
      const paperInsertQuery = `
        INSERT INTO papers (id, doi, title, journal, year, abstract_text, s3_pdf_url, abstract_embedding)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING id, doi, title, journal, year, abstract_text, s3_pdf_url, created_at;
      `;
      const paperResult = await query(paperInsertQuery, [
        paperId,
        null,
        title,
        journal,
        year ? parseInt(year, 10) : null,
        abstract_text,
        s3_pdf_url,
        vectorString,
      ]);
      savedPaper = paperResult.rows[0];
    }

    if (!savedPaper) {
      savedPaper = { id: paperId, title, year, doi, journal, abstract_text };
    }

    // 3. Execute Extractor LLM Agent
    const userPrompt = `research_query: ${research_query}\n\npaper_text:\nTitle: ${title}\nYear: ${year || 'N/A'}\n\n${abstract_text}`;
    const llmResult = await executeLLMCall({
      systemPrompt: EXTRACTOR_SYSTEM_PROMPT,
      userPrompt,
      jsonOutput: true,
    });

    // 4. Strictly validate and sanitize extraction schema before DB insert
    const rawExtraction = llmResult.content || {};
    const extraction = validateAndSanitizeExtraction(rawExtraction);

    // 5. Clean prior extractions for this (paper_id, research_query) to maintain idempotency
    await query(`DELETE FROM study_extractions WHERE paper_id = $1 AND research_query = $2;`, [
      savedPaper.id,
      research_query,
    ]);

    // 6. Insert structured study extraction
    const extractionId = randomUUID();
    const extractionInsertQuery = `
      INSERT INTO study_extractions (
        id, paper_id, research_query, sample_size, model_system,
        intervention, control, primary_metric, effect_direction,
        effect_size, p_value, risk_of_bias, evidence_snippet, extracted_by_agent
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *;
    `;

    const extractionResult = await query(extractionInsertQuery, [
      extractionId,
      savedPaper.id,
      research_query,
      extraction.sample_size,
      extraction.model_system,
      extraction.intervention,
      extraction.control,
      extraction.primary_metric,
      extraction.effect_direction,
      extraction.effect_size,
      extraction.p_value,
      extraction.risk_of_bias,
      extraction.evidence_snippet,
      'extractor-v1',
    ]);

    const savedExtraction = extractionResult.rows[0] || { id: extractionId, ...extraction };

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        paper: savedPaper,
        extraction: savedExtraction,
        usage: llmResult.usage,
      }),
    };
  } catch (err) {
    console.error('[Extractor Handler Error]', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Extractor failed to process paper', details: err.message }),
    };
  }
}
