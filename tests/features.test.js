import { describe, it, expect } from 'vitest';
import { discoverLiteratureForQuery } from '../shared/literatureDiscovery.js';
import { generatePrismaMarkdownReport } from '../shared/prismaExporter.js';
import { generateBibtexExport, generateRisExport } from '../shared/citationExporter.js';
import { generateFallbackEmbedding, cosineSimilarity } from '../shared/titanEmbed.js';
import { parsePdfBuffer } from '../shared/pdfParser.js';
import { handleSynthesize } from '../lambdas/synthesizer/handler.js';
import { validateAndSanitizeExtraction } from '../lambdas/extractor/handler.js';
import { localMockExtraction } from '../shared/llm.js';
import { SYNTHESIZER_SYSTEM_PROMPT, ARBITER_SYSTEM_PROMPT } from '../shared/prompts.js';

describe('Veridex Extended Real-World Capabilities', () => {
  it('should discover literature for GLP-1 and Rapamycin research queries', async () => {
    const glp1Discovery = await discoverLiteratureForQuery('Do GLP-1 Receptor Agonists Reduce Neuroinflammation?');
    expect(glp1Discovery.papers.length).toBeGreaterThanOrEqual(3);
    expect(glp1Discovery.papers[0].title).toBeDefined();

    const rapamycinDiscovery = await discoverLiteratureForQuery('Does Intermittent Rapamycin Extend Longevity?');
    expect(rapamycinDiscovery.papers.length).toBeGreaterThanOrEqual(3);
  });

  it('should compute deterministic semantic fallback embeddings with proper cosine distance ranking', () => {
    const textTarget = 'Does low-dose metformin extend lifespan in non-diabetic mammals?';
    const textParaphrase = 'Low-dose metformin administration extends lifespan in mammals';
    const textRelated = 'High-dose metformin causes cellular toxicity and lactic acidosis';
    const textUnrelated = 'Quantum computing algorithms utilizing qubit superposition and quantum gates';

    const embTarget = generateFallbackEmbedding(textTarget);
    const embParaphrase = generateFallbackEmbedding(textParaphrase);
    const embRelated = generateFallbackEmbedding(textRelated);
    const embUnrelated = generateFallbackEmbedding(textUnrelated);

    expect(embTarget.length).toBe(1024);
    expect(embParaphrase.length).toBe(1024);
    expect(embRelated.length).toBe(1024);
    expect(embUnrelated.length).toBe(1024);

    const simParaphrase = cosineSimilarity(embTarget, embParaphrase);
    const simRelated = cosineSimilarity(embTarget, embRelated);
    const simUnrelated = cosineSimilarity(embTarget, embUnrelated);

    // Paraphrase must score high (>= 0.60)
    expect(simParaphrase).toBeGreaterThan(0.60);
    // Related topic must score moderately (>= 0.15)
    expect(simRelated).toBeGreaterThan(0.15);
    // Unrelated topic must score very low (<= 0.15)
    expect(simUnrelated).toBeLessThan(0.15);
    // Semantic hierarchy: Paraphrase > Related > Unrelated
    expect(simParaphrase).toBeGreaterThan(simRelated);
    expect(simRelated).toBeGreaterThan(simUnrelated);
  });

  it('should generate human-readable prose narrative in Synthesizer and never return raw Arbiter JSON', async () => {
    const extractions = [
      { effect_direction: 'POSITIVE', effect_size: 14.0, p_value: 0.01, risk_of_bias: 'LOW' },
      { effect_direction: 'POSITIVE', effect_size: 12.0, p_value: 0.02, risk_of_bias: 'LOW' },
      { effect_direction: 'NEGATIVE', effect_size: -10.0, p_value: 0.04, risk_of_bias: 'MODERATE' },
    ];
    const contradictions = [
      { status: 'RESOLVED', isolated_confounder: 'Dosage discrepancy' },
    ];

    const result = await handleSynthesize(extractions, contradictions, 'Metformin Longevity');
    expect(typeof result.narrative).toBe('string');
    expect(result.narrative).not.toContain('conflict_summary');
    expect(result.narrative).not.toContain('"status":"RESOLVED"');
    expect(result.narrative).toContain('Evidence synthesis across');

    // Also verify localMockExtraction direct discrimination
    const synthMock = localMockExtraction(JSON.stringify(result.aggregate), SYNTHESIZER_SYSTEM_PROMPT, false);
    expect(typeof synthMock).toBe('string');
    expect(synthMock).toContain('Evidence synthesis across');

    const arbiterMock = localMockExtraction('Opposing studies text', ARBITER_SYSTEM_PROMPT, true);
    expect(typeof arbiterMock).toBe('object');
    expect(arbiterMock.conflict_summary).toBeDefined();
    expect(arbiterMock.status).toBe('RESOLVED');
  });

  it('should strictly validate and sanitize study extraction schema before DB insertion', () => {
    const maliciousRaw = {
      sample_size: '150',
      model_system: '  Murine In-Vivo Model  ',
      effect_direction: 'positive',
      p_value: '0.00345',
      effect_size: '12.5',
      risk_of_bias: 'low',
      evidence_snippet: 'Metformin extended lifespan by 12.5% (p=0.003).',
    };

    const sanitized = validateAndSanitizeExtraction(maliciousRaw);
    expect(sanitized.sample_size).toBe(150);
    expect(sanitized.model_system).toBe('Murine In-Vivo Model');
    expect(sanitized.effect_direction).toBe('POSITIVE');
    expect(sanitized.p_value).toBe(0.00345);
    expect(sanitized.effect_size).toBe(12.5);
    expect(sanitized.risk_of_bias).toBe('LOW');

    // Test invalid / malicious directions and out-of-bound p-values
    const badRaw = {
      sample_size: -50,
      effect_direction: 'HACKED_DIRECTION',
      p_value: 99.5,
      risk_of_bias: 'INVALID_BIAS',
    };

    const sanitizedBad = validateAndSanitizeExtraction(badRaw);
    expect(sanitizedBad.sample_size).toBeNull();
    expect(sanitizedBad.effect_direction).toBeNull();
    expect(sanitizedBad.p_value).toBeNull();
    expect(sanitizedBad.risk_of_bias).toBeNull();
  });

  it('should generate a valid PRISMA 2020 Markdown systematic review report', () => {
    const mockMatrix = {
      research_query: 'Does Metformin Extend Lifespan in Non-Diabetic Models?',
      aggregate: {
        total_studies: 5,
        positive_count: 3,
        negative_count: 2,
        significant_count: 4,
        confidence_tier: 'MODERATE',
        resolved_contradictions: 2,
        open_contradictions: 0,
        risk_of_bias_breakdown: { LOW: 3, MODERATE: 2, HIGH: 0 },
      },
      narrative: 'A synthesis of 5 studies demonstrates moderate confidence in longevity outcomes under low-dose regimens.',
      papers: [
        { id: '1', title: 'Metformin study A', journal: 'Nature', year: 2020 },
        { id: '2', title: 'Metformin study B', journal: 'Aging', year: 2021 },
      ],
      extractions: [
        { paper_id: '1', effect_direction: 'POSITIVE', sample_size: 100, model_system: 'Rodent', p_value: 0.001 },
        { paper_id: '2', effect_direction: 'NEGATIVE', sample_size: 80, model_system: 'Cell', p_value: 0.01 },
      ],
      contradictions: [
        {
          paper_a_id: '1',
          paper_b_id: '2',
          conflict_summary: 'Opposing survival effect directions',
          isolated_confounder: 'Dosage discrepancy',
          status: 'RESOLVED',
        },
      ],
    };

    const report = generatePrismaMarkdownReport(mockMatrix);

    expect(report).toContain('PRISMA 2020 Systematic Review & Evidence Consensus Report');
    expect(report).toContain('Does Metformin Extend Lifespan in Non-Diabetic Models?');
    expect(report).toContain('[MODERATE]');
    expect(report).toContain('Metformin study A');
    expect(report).toContain('Dosage discrepancy');
  });

  it('should generate valid BibTeX and RIS citation exports for Zotero and EndNote', () => {
    const mockMatrix = {
      papers: [
        {
          id: 'p1',
          title: 'Metformin extends mouse lifespan',
          journal: 'Nature Communications',
          year: 2013,
          doi: '10.1038/ncomms3192',
          abstract_text: 'Study abstract...',
        },
      ],
    };

    const bibtex = generateBibtexExport(mockMatrix);
    expect(bibtex).toContain('@article{');
    expect(bibtex).toContain('Nature Communications');
    expect(bibtex).toContain('10.1038/ncomms3192');

    const ris = generateRisExport(mockMatrix);
    expect(ris).toContain('TY  - JOUR');
    expect(ris).toContain('TI  - Metformin extends mouse lifespan');
    expect(ris).toContain('DO  - 10.1038/ncomms3192');
  });

  it('should parse PDF buffer and extract metadata', async () => {
    const sampleBuffer = Buffer.from('%PDF-1.4 sample content Abstract: This study investigates longevity. n=80.');
    const parsed = await parsePdfBuffer(sampleBuffer);

    expect(parsed).toBeDefined();
    expect(typeof parsed.title).toBe('string');
  });
});
