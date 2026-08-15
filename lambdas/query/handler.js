import { query } from '../../shared/db.js';
import { handleSynthesize } from '../synthesizer/handler.js';

/**
 * Query Lambda Handler
 * Implements the live consensus aggregator for GET /research-queries/{query}/matrix
 * Pulls papers, study extractions, and contradiction records, executes live synthesis,
 * and returns a single unified frontend-ready JSON payload.
 */
export async function handleQueryMatrix(event) {
  const queryParam = event.pathParameters?.query || event.research_query || (typeof event.body === 'string' ? JSON.parse(event.body).research_query : event.body?.research_query);

  if (!queryParam) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing research_query parameter' }),
    };
  }

  try {
    // 1. Fetch study extractions for this query
    const extractionsResult = await query(
      `SELECT * FROM study_extractions WHERE research_query = $1 ORDER BY created_at DESC;`,
      [queryParam]
    );
    const extractions = extractionsResult.rows;

    // 2. Fetch associated papers
    const paperIds = [...new Set(extractions.map((e) => e.paper_id))];
    let papers = [];
    if (paperIds.length > 0) {
      // Query papers
      const placeholders = paperIds.map((_, i) => `$${i + 1}`).join(',');
      const papersResult = await query(
        `SELECT id, doi, title, journal, year, abstract_text, s3_pdf_url, created_at FROM papers WHERE id IN (${placeholders});`,
        paperIds
      );
      papers = papersResult.rows;
    }

    // 3. Fetch contradictions for this query
    const contradictionsResult = await query(
      `SELECT * FROM contradictions WHERE research_query = $1 ORDER BY created_at DESC;`,
      [queryParam]
    );
    const contradictions = contradictionsResult.rows;

    // 4. Compute live, on-demand deterministic aggregate & narrative
    const synthesisResult = await handleSynthesize(extractions, contradictions, queryParam);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        success: true,
        research_query: queryParam,
        papers,
        extractions,
        contradictions,
        aggregate: synthesisResult.aggregate,
        narrative: synthesisResult.narrative,
        usage: synthesisResult.usage,
      }),
    };
  } catch (err) {
    console.error('[Query Matrix Handler Error]', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Failed to aggregate matrix', details: err.message }),
    };
  }
}
