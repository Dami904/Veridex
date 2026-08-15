import { describe, it, expect } from 'vitest';
import {
  computeConfidenceTier,
  computeDeterministicAggregate,
} from '../lambdas/synthesizer/handler.js';

describe('Veridex Deterministic Confidence Tier Logic (Section 7.4)', () => {
  it('should return HIGH when total_studies >= 5, consensus >= 80%, majority LOW risk of bias, and resolved >= open contradictions', () => {
    const tier = computeConfidenceTier({
      totalStudies: 10,
      positiveCount: 8,
      negativeCount: 2,
      riskOfBiasBreakdown: { LOW: 7, MODERATE: 2, HIGH: 1 },
      openContradictions: 1,
      resolvedContradictions: 3,
    });
    expect(tier).toBe('HIGH');
  });

  it('should downgrade to LOW when open_contradictions > resolved_contradictions, even with 90% consensus', () => {
    const tier = computeConfidenceTier({
      totalStudies: 10,
      positiveCount: 9,
      negativeCount: 1,
      riskOfBiasBreakdown: { LOW: 8, MODERATE: 2, HIGH: 0 },
      openContradictions: 5,
      resolvedContradictions: 1,
    });
    expect(tier).toBe('LOW');
  });

  it('should downgrade to MODERATE when consensus is >= 60% but < 80%', () => {
    const tier = computeConfidenceTier({
      totalStudies: 6,
      positiveCount: 4, // 4/6 = 66.7%
      negativeCount: 2,
      riskOfBiasBreakdown: { LOW: 4, MODERATE: 2, HIGH: 0 },
      openContradictions: 1,
      resolvedContradictions: 2,
    });
    expect(tier).toBe('MODERATE');
  });

  it('should downgrade to MODERATE if total_studies >= 5 and consensus >= 80% but majority risk of bias is MODERATE or HIGH', () => {
    const tier = computeConfidenceTier({
      totalStudies: 5,
      positiveCount: 4, // 80%
      negativeCount: 1,
      riskOfBiasBreakdown: { LOW: 2, MODERATE: 3, HIGH: 0 }, // Not majority LOW (> 2.5)
      openContradictions: 0,
      resolvedContradictions: 1,
    });
    expect(tier).toBe('MODERATE');
  });

  it('should return LOW when total_studies < 3', () => {
    const tier = computeConfidenceTier({
      totalStudies: 2,
      positiveCount: 2,
      negativeCount: 0,
      riskOfBiasBreakdown: { LOW: 2, MODERATE: 0, HIGH: 0 },
      openContradictions: 0,
      resolvedContradictions: 0,
    });
    expect(tier).toBe('LOW');
  });

  it('should return LOW when consensus ratio is below 60%', () => {
    const tier = computeConfidenceTier({
      totalStudies: 6,
      positiveCount: 3, // 50%
      negativeCount: 3,
      riskOfBiasBreakdown: { LOW: 5, MODERATE: 1, HIGH: 0 },
      openContradictions: 1,
      resolvedContradictions: 1,
    });
    expect(tier).toBe('LOW');
  });
});

describe('Veridex Deterministic Statistical Aggregate (Section 7.3)', () => {
  it('should calculate exact study counts, effect averages, significance, and contradictions', () => {
    const extractions = [
      { effect_direction: 'POSITIVE', effect_size: 10.0, p_value: 0.01, risk_of_bias: 'LOW' },
      { effect_direction: 'POSITIVE', effect_size: 20.0, p_value: 0.02, risk_of_bias: 'LOW' },
      { effect_direction: 'POSITIVE', effect_size: 15.0, p_value: 0.04, risk_of_bias: 'LOW' },
      { effect_direction: 'POSITIVE', effect_size: 12.0, p_value: 0.03, risk_of_bias: 'LOW' },
      { effect_direction: 'NEGATIVE', effect_size: -8.0, p_value: 0.01, risk_of_bias: 'MODERATE' },
    ];

    const contradictions = [
      { status: 'RESOLVED' },
      { status: 'RESOLVED' },
      { status: 'IRRECONCILABLE' },
    ];

    const agg = computeDeterministicAggregate(extractions, contradictions, 'Metformin Lifespan');

    expect(agg.total_studies).toBe(5);
    expect(agg.positive_count).toBe(4);
    expect(agg.negative_count).toBe(1);
    expect(agg.significant_count).toBe(5);
    expect(agg.avg_effect_size).toBe(9.8); // (10 + 20 + 15 + 12 - 8) / 5 = 49 / 5 = 9.8
    expect(agg.risk_of_bias_breakdown.LOW).toBe(4);
    expect(agg.risk_of_bias_breakdown.MODERATE).toBe(1);
    expect(agg.resolved_contradictions).toBe(2);
    expect(agg.open_contradictions).toBe(1);
    expect(agg.confidence_tier).toBe('HIGH');
  });
});
