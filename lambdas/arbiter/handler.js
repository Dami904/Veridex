import { query } from '../../shared/db.js';
import { ARBITER_SYSTEM_PROMPT } from '../../shared/prompts.js';
import { executeLLMCall } from '../../shared/llm.js';
import { randomUUID } from 'crypto';

/**
 * Arbiter Lambda Handler
 * Finds representative pairs of study extractions with opposing effect directions,
 * executes the Arbiter LLM to isolate methodological confounders, and records contradictions in CockroachDB.
 */
export async function handleArbitrate(event) {
  const queryParam = event.pathParameters?.query || event.research_query || (typeof event.body === 'string' ? JSON.parse(event.body).research_query : event.body?.research_query);

  if (!queryParam) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing research_query parameter' }),
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
          message: 'Insufficient studies (<2) to detect contradictions',
          contradictions: [],
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
    let totalUsage = { inputTokens: 0, outputTokens: 0, totalTokens: 0, estimatedCostUsd: 0 };
    const MAX_PAIRS_PER_RUN = 12; // Smart threshold to ensure responsive latency & bounded cost

    // 3. Pairwise arbitration over opposing effect directions
    let pairsProcessed = 0;
    for (const posStudy of positiveStudies) {
      for (const negStudy of negativeStudies) {
        if (pairsProcessed >= MAX_PAIRS_PER_RUN) break;

        const pairKey1 = `${posStudy.paper_id}_${negStudy.paper_id}`;
        const pairKey2 = `${negStudy.paper_id}_${posStudy.paper_id}`;

        if (existingPairs.has(pairKey1) || existingPairs.has(pairKey2)) {
          continue; // Already arbitrated
        }

        const userPrompt = `
Research Query: ${queryParam}

[Study A (Positive)]
Paper Title: ${posStudy.paper_title || 'Study A'}
Year: ${posStudy.paper_year || 'N/A'}
Sample Size: ${posStudy.sample_size || 'N/A'}
Model System: ${posStudy.model_system || 'N/A'}
Intervention: ${posStudy.intervention || 'N/A'}
Control: ${posStudy.control || 'N/A'}
Effect Direction: ${posStudy.effect_direction}
Effect Size: ${posStudy.effect_size || 'N/A'}
p-value: ${posStudy.p_value || 'N/A'}
Risk of Bias: ${posStudy.risk_of_bias || 'N/A'}
Evidence Snippet: "${posStudy.evidence_snippet || 'N/A'}"

[Study B (Negative)]
Paper Title: ${negStudy.paper_title || 'Study B'}
Year: ${negStudy.paper_year || 'N/A'}
Sample Size: ${negStudy.sample_size || 'N/A'}
Model System: ${negStudy.model_system || 'N/A'}
Intervention: ${negStudy.intervention || 'N/A'}
Control: ${negStudy.control || 'N/A'}
Effect Direction: ${negStudy.effect_direction}
Effect Size: ${negStudy.effect_size || 'N/A'}
p-value: ${negStudy.p_value || 'N/A'}
Risk of Bias: ${negStudy.risk_of_bias || 'N/A'}
Evidence Snippet: "${negStudy.evidence_snippet || 'N/A'}"
        `.trim();

        const llmResult = await executeLLMCall({
          systemPrompt: ARBITER_SYSTEM_PROMPT,
          userPrompt,
          jsonOutput: true,
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
        total_arbitrated: newContradictions.length,
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
