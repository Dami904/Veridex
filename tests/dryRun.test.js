import { describe, it, expect } from 'vitest';
import { runPipelineDryRun } from '../scripts/dry-run.js';

describe('Veridex Full Pipeline Integration Test', () => {
  it(
    'should successfully execute Extractor, Arbiter, and Synthesizer over demo dataset',
    async () => {
      const result = await runPipelineDryRun();

      expect(result.success).toBe(true);
      expect(result.papers.length).toBeGreaterThanOrEqual(10);
      expect(result.extractions.length).toBeGreaterThanOrEqual(10);
      expect(result.aggregate).toBeDefined();
      expect(result.aggregate.total_studies).toBeGreaterThanOrEqual(10);
      expect(result.aggregate.confidence_tier).toMatch(/HIGH|MODERATE|LOW/);
      expect(typeof result.narrative).toBe('string');
      expect(result.narrative.length).toBeGreaterThan(20);
    },
    60000
  );
});
