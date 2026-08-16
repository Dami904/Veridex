import { query } from '../../shared/db.js';
import { ARBITER_SYSTEM_PROMPT } from '../../shared/prompts.js';
import { executeLLMCall } from '../../shared/llm.js';
import { randomUUID } from 'crypto';

/**
 * Arbiter Lambda Handler
 * Finds all opposing study pairs for a research_query and resolves methodological confounders.
 */
export async function handleArbitrate(event) {
  const queryParam =
    event.pathParameters?.query ||
    event.queryStringParameters?.query ||
    (typeof event.body === 'string' ? JSON.parse(event.body).query : event.body?.query);

  if (!queryParam) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing query parameter in pathParameters or body' }),
    };
  }

  try {
    // 1. Fetch extractions joined with papers
    const extractionsResult = await query(
      `SELECT e.*, p.title as paper_title, p.year as paper_year, p.journal
       FROM study_extractions e
       LEFT JOIN papers p ON e.paper_id = p.id
       WHERE e.research_query = $1
       ORDER BY e.created_at ASC;`,
      [queryParam]
    );
    const extractions = extractionsResult.rows;

    if (extractions.length < 2) {
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          success: true,
          message: 'Insufficient studies (<2) to detect contradictions',
          contradictions: [],
          new_contradictions: [],
          total_arbitrated: 0,
          analyzed_pairs: 0,
        }),
      };
    }

    // 2. Fetch existing contradiction pairs to avoid redundant arbitration
    const existingContradictionsResult = await query(
      `SELECT paper_a_id, paper_b_id FROM contradictions WHERE research_query = $1;`,
      [queryParam]
    );
    const existingPairs = new Set(
      existingContradictionsResult.rows.map((r) => `${r.paper_a_id}_${r.paper_b_id}`)
    );

    const positiveStudies = extractions.filter((e) => e.effect_direction === 'POSITIVE');
    const negativeStudies = extractions.filter((e) => e.effect_direction === 'NEGATIVE');

    const newContradictions = [];
    const totalUsage = {
      provider: 'arbiter-ensemble',
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
      estimatedCostUsd: 0,
      latencyMs: 0,
    };

    // Bounded pairwise arbitration (max 10 pairs per invocation)
    const MAX_PAIRS_PER_RUN = 10;
    let pairsProcessed = 0;

    for (const posStudy of positiveStudies) {
      for (const negStudy of negativeStudies) {
        if (pairsProcessed >= MAX_PAIRS_PER_RUN) break;

        const pairKey1 = `${posStudy.paper_id}_${negStudy.paper_id}`;
        const pairKey2 = `${negStudy.paper_id}_${posStudy.paper_id}`;

        if (existingPairs.has(pairKey1) || existingPairs.has(pairKey2)) {
          continue;
        }

        // 3. Format study pair for Arbiter LLM
        const userPrompt = `research_query: ${queryParam}

STUDY A (POSITIVE):
Paper Title: ${posStudy.paper_title || 'N/A'} (${posStudy.paper_year || 'N/A'})
Sample Size: ${posStudy.sample_size || 'N/A'}
Model System: ${posStudy.model_system || 'N/A'}
Intervention: ${posStudy.intervention || 'N/A'}
Control: ${posStudy.control || 'N/A'}
Primary Metric: ${posStudy.primary_metric || 'N/A'}
Effect Size: ${posStudy.effect_size !== null ? posStudy.effect_size : 'N/A'}
P-Value: ${posStudy.p_value !== null ? posStudy.p_value : 'N/A'}
Risk of Bias: ${posStudy.risk_of_bias || 'N/A'}
Evidence Snippet: "${posStudy.evidence_snippet || 'N/A'}"

STUDY B (NEGATIVE):
Paper Title: ${negStudy.paper_title || 'N/A'} (${negStudy.paper_year || 'N/A'})
Sample Size: ${negStudy.sample_size || 'N/A'}
Model System: ${negStudy.model_system || 'N/A'}
Intervention: ${negStudy.intervention || 'N/A'}
Control: ${negStudy.control || 'N/A'}
Primary Metric: ${negStudy.primary_metric || 'N/A'}
Effect Size: ${negStudy.effect_size !== null ? negStudy.effect_size : 'N/A'}
P-Value: ${negStudy.p_value !== null ? negStudy.p_value : 'N/A'}
Risk of Bias: ${negStudy.risk_of_bias || 'N/A'}
Evidence Snippet: "${negStudy.evidence_snippet || 'N/A'}"`;

        const llmResult = await executeLLMCall({
          systemPrompt: ARBITER_SYSTEM_PROMPT,
          userPrompt,
          jsonOutput: true,
          agent: 'arbiter',
        });

        const arbVerdict = llmResult.content || {};

        totalUsage.inputTokens += llmResult.usage.inputTokens;
        totalUsage.outputTokens += llmResult.usage.outputTokens;
        totalUsage.totalTokens += llmResult.usage.totalTokens;
        totalUsage.estimatedCostUsd += llmResult.usage.estimatedCostUsd;

        const contradictionId = randomUUID();
        const insertQuery = `
          INSERT INTO contradictions (
            id, research_query, paper_a_id, paper_b_id,
            conflict_summary, isolated_confounder, confidence_tier, status
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING *;
        `;

        const savedResult = await query(insertQuery, [
          contradictionId,
          queryParam,
          posStudy.paper_id,
          negStudy.paper_id,
          arbVerdict.conflict_summary || 'Observed opposing effect directions.',
          arbVerdict.isolated_confounder || null,
          arbVerdict.confidence_tier || 'LOW',
          arbVerdict.status || (arbVerdict.isolated_confounder ? 'RESOLVED' : 'IRRECONCILABLE'),
        ]);

        newContradictions.push(savedResult.rows[0] || { id: contradictionId, ...arbVerdict });
        existingPairs.add(pairKey1);
        pairsProcessed++;
      }
      if (pairsProcessed >= MAX_PAIRS_PER_RUN) break;
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        research_query: queryParam,
        new_contradictions: newContradictions,
        contradictions: newContradictions,
        total_arbitrated: newContradictions.length,
        analyzed_pairs: pairsProcessed,
        usage: totalUsage,
      }),
    };
  } catch (err) {
    console.error('[Arbiter Handler Error]', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Arbiter failed to process query', details: err.message }),
    };
  }
}
