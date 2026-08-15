import { query, formatVector } from '../../shared/db.js';
import { EXTRACTOR_SYSTEM_PROMPT } from '../../shared/prompts.js';
import { generateTitanEmbedding } from '../../shared/titanEmbed.js';
import { executeLLMCall } from '../../shared/llm.js';
import { randomUUID } from 'crypto';

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

    const extraction = llmResult.content || {};

    // 4. Clean prior extractions for this (paper_id, research_query) to maintain idempotency
    await query(`DELETE FROM study_extractions WHERE paper_id = $1 AND research_query = $2;`, [
      savedPaper.id,
      research_query,
    ]);

    // 5. Insert structured study extraction
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
      extraction.sample_size !== undefined ? extraction.sample_size : null,
      extraction.model_system || null,
      extraction.intervention || null,
      extraction.control || null,
      extraction.primary_metric || null,
      extraction.effect_direction || null,
      extraction.effect_size !== undefined ? extraction.effect_size : null,
      extraction.p_value !== undefined ? extraction.p_value : null,
      extraction.risk_of_bias || null,
      extraction.evidence_snippet || null,
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
