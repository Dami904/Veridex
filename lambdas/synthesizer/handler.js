import { SYNTHESIZER_SYSTEM_PROMPT } from '../../shared/prompts.js';
import { executeLLMCall } from '../../shared/llm.js';

/**
 * Deterministic calculation of confidence_tier based on Section 7.4 rules.
 * Pure code function with zero LLM involvement.
 *
 * Rules:
 * HIGH:     total_studies >= 5 AND (max(positive_count, negative_count) / total_studies) >= 0.8
 *           AND majority risk_of_bias == LOW
 * MODERATE: total_studies >= 3 AND (max(positive_count, negative_count) / total_studies) >= 0.6
 * LOW:      everything else, OR open_contradictions > resolved_contradictions
 *
 * @param {Object} params
 * @returns {"HIGH" | "MODERATE" | "LOW"}
 */
export function computeConfidenceTier({
  totalStudies = 0,
  positiveCount = 0,
  negativeCount = 0,
  riskOfBiasBreakdown = { LOW: 0, MODERATE: 0, HIGH: 0 },
  openContradictions = 0,
  resolvedContradictions = 0,
}) {
  if (totalStudies < 3) {
    return 'LOW';
  }

  // If open contradictions outweigh resolved ones, downgrade to LOW
  if (openContradictions > resolvedContradictions) {
    return 'LOW';
  }

  const majorityCount = Math.max(positiveCount, negativeCount);
  const consensusRatio = totalStudies > 0 ? majorityCount / totalStudies : 0;
  const isMajorityLowBias = (riskOfBiasBreakdown.LOW || 0) > ((totalStudies) / 2);

  // Check HIGH condition
  if (totalStudies >= 5 && consensusRatio >= 0.8 && isMajorityLowBias) {
    return 'HIGH';
  }

  // Check MODERATE condition
  if (totalStudies >= 3 && consensusRatio >= 0.6) {
    return 'MODERATE';
  }

  return 'LOW';
}

/**
 * Deterministically computes the statistical aggregate across study extractions and contradictions
 * @param {Array} extractions
 * @param {Array} contradictions
 * @param {string} researchQuery
 * @returns {Object} Deterministic aggregate
 */
export function computeDeterministicAggregate(extractions = [], contradictions = [], researchQuery = '') {
  const totalStudies = extractions.length;
  let positiveCount = 0;
  let negativeCount = 0;
  let neutralOrMixedCount = 0;
  let significantCount = 0;
  let totalEffectSize = 0;
  let effectSizeCount = 0;

  const riskOfBiasBreakdown = { LOW: 0, MODERATE: 0, HIGH: 0 };

  for (const ext of extractions) {
    const dir = (ext.effect_direction || '').toUpperCase();
    if (dir === 'POSITIVE') positiveCount++;
    else if (dir === 'NEGATIVE') negativeCount++;
    else neutralOrMixedCount++;

    if (ext.p_value !== null && ext.p_value !== undefined && Number(ext.p_value) <= 0.05) {
      significantCount++;
    }

    if (ext.effect_size !== null && ext.effect_size !== undefined && !isNaN(Number(ext.effect_size))) {
      totalEffectSize += Number(ext.effect_size);
      effectSizeCount++;
    }

    const bias = (ext.risk_of_bias || 'MODERATE').toUpperCase();
    if (riskOfBiasBreakdown[bias] !== undefined) {
      riskOfBiasBreakdown[bias]++;
    } else {
      riskOfBiasBreakdown.MODERATE++;
    }
  }

  const avgEffectSize = effectSizeCount > 0 ? Number((totalEffectSize / effectSizeCount).toFixed(2)) : null;

  let openContradictions = 0;
  let resolvedContradictions = 0;

  for (const c of contradictions) {
    const status = (c.status || '').toUpperCase();
    if (status === 'RESOLVED') {
      resolvedContradictions++;
    } else {
      openContradictions++;
    }
  }

  const confidenceTier = computeConfidenceTier({
    totalStudies,
    positiveCount,
    negativeCount,
    riskOfBiasBreakdown,
    openContradictions,
    resolvedContradictions,
  });

  return {
    research_query: researchQuery,
    total_studies: totalStudies,
    positive_count: positiveCount,
    negative_count: negativeCount,
    neutral_or_mixed_count: neutralOrMixedCount,
    avg_effect_size: avgEffectSize,
    significant_count: significantCount,
    risk_of_bias_breakdown: riskOfBiasBreakdown,
    open_contradictions: openContradictions,
    resolved_contradictions: resolvedContradictions,
    confidence_tier: confidenceTier,
  };
}

/**
 * Synthesizer Lambda Handler
 * Calculates deterministic aggregate and runs Synthesizer LLM to narrate it.
 */
export async function handleSynthesize(extractions = [], contradictions = [], researchQuery = '') {
  const aggregate = computeDeterministicAggregate(extractions, contradictions, researchQuery);

  const userPrompt = JSON.stringify(aggregate, null, 2);
  const llmResult = await executeLLMCall({
    systemPrompt: SYNTHESIZER_SYSTEM_PROMPT,
    userPrompt,
    jsonOutput: false,
  });

  return {
    aggregate,
    narrative: llmResult.content || llmResult.raw,
    usage: llmResult.usage,
  };
}
