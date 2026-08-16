import { describe, it, expect } from 'vitest';
import { handleExtract } from '../lambdas/extractor/handler.js';
import { handleArbitrate } from '../lambdas/arbiter/handler.js';
import { handleQueryMatrix } from '../lambdas/query/handler.js';
import { query } from '../shared/db.js';
import { generateFallbackEmbedding, cosineSimilarity } from '../shared/titanEmbed.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

describe('Veridex Core Subsystems & Endpoint Handlers', () => {
  const queryName = 'Does Low-Dose Metformin Extend Lifespan in Murine Models?';

  it('should seed benchmark dataset, execute Arbiter, and record contradictions', async () => {
    // 0. Clean slate for this test query
    await query('DELETE FROM study_extractions WHERE research_query = $1;', [queryName]);
    await query('DELETE FROM contradictions WHERE research_query = $1;', [queryName]);

    const seedPath = path.resolve(__dirname, '../seed_data/demo_dataset.json');
    const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
    const papers = data.papers || [];

    // 1. Ingest all 15 benchmark papers sequentially for this isolated query
    for (const p of papers) {
      const res = await handleExtract({
        body: {
          ...p,
          doi: p.doi ? `${p.doi}_endpoints_test` : null,
          research_query: queryName,
        },
      });
      expect(res.statusCode).toBe(201);
    }

    // 2. Run Arbiter over ingested studies
    const arbRes = await handleArbitrate({
      pathParameters: { query: queryName },
    });
    expect(arbRes.statusCode).toBe(200);

    const arbBody = JSON.parse(arbRes.body);
    expect(arbBody.analyzed_pairs).toBeGreaterThanOrEqual(1);
    expect(arbBody.new_contradictions.length).toBeGreaterThanOrEqual(1);
    expect(arbBody.new_contradictions[0].conflict_summary).toBeDefined();

    // 3. Query Matrix and verify narrative & contradiction counts
    const matrixRes = await handleQueryMatrix({
      pathParameters: { query: queryName },
    });
    expect(matrixRes.statusCode).toBe(200);

    const matrix = JSON.parse(matrixRes.body);
    expect(matrix.success).toBe(true);
    expect(matrix.papers.length).toBeGreaterThanOrEqual(10);
    expect(matrix.extractions.length).toBe(15);
    expect(matrix.contradictions.length).toBeGreaterThanOrEqual(1);
    expect(matrix.aggregate.total_studies).toBe(15);
    expect(matrix.aggregate.positive_count).toBe(9);
    expect(matrix.aggregate.negative_count).toBe(6);
    expect(matrix.aggregate.resolved_contradictions).toBeGreaterThanOrEqual(1);

    // Narrative must be human prose, not raw JSON
    expect(typeof matrix.narrative).toBe('string');
    expect(matrix.narrative).not.toContain('{"conflict_summary"');
    expect(matrix.narrative).not.toContain('"status":"RESOLVED"');
    expect(matrix.narrative).toContain('Evidence synthesis across');
  }, 60000);

  it('should guarantee semantic vector distance ranking without noise', () => {
    const q = 'metformin longevity and mammalian healthspan extension';
    const nearMatch = 'low-dose metformin preserves healthspan and extends survival in mammals';
    const farMatch = 'quantum computing cryogenic qubit coherence and quantum gates';

    const vQ = generateFallbackEmbedding(q);
    const vNear = generateFallbackEmbedding(nearMatch);
    const vFar = generateFallbackEmbedding(farMatch);

    const simNear = cosineSimilarity(vQ, vNear);
    const simFar = cosineSimilarity(vQ, vFar);

    expect(simNear).toBeGreaterThan(0.35);
    expect(simFar).toBeLessThan(0.15);
    expect(simNear).toBeGreaterThan(simFar * 2.5); // Near match must score significantly higher than unrelated
  });
});
