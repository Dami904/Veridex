import { describe, it, expect } from 'vitest';
import { discoverLiteratureForQuery } from '../shared/literatureDiscovery.js';
import { generatePrismaMarkdownReport } from '../shared/prismaExporter.js';
import { generateBibtexExport, generateRisExport } from '../shared/citationExporter.js';
import { generateTitanEmbedding, cosineSimilarity } from '../shared/titanEmbed.js';
import { parsePdfBuffer } from '../shared/pdfParser.js';

describe('Veridex Extended Real-World Capabilities', () => {
  it('should discover literature for GLP-1 and Rapamycin research queries', async () => {
    const glp1Discovery = await discoverLiteratureForQuery('Do GLP-1 Receptor Agonists Reduce Neuroinflammation?');
    expect(glp1Discovery.papers.length).toBeGreaterThanOrEqual(3);
    expect(glp1Discovery.papers[0].title).toBeDefined();

    const rapamycinDiscovery = await discoverLiteratureForQuery('Does Intermittent Rapamycin Extend Longevity?');
    expect(rapamycinDiscovery.papers.length).toBeGreaterThanOrEqual(3);
  });

  it('should compute normalized vector embeddings and cosine similarity', async () => {
    const textA = 'Low-dose metformin extends mammalian lifespan and enhances metabolic health';
    const textB = 'High-dose metformin induces renal failure and cytotoxicity in geriatric rodents';
    const textC = 'Quantum computing algorithms for portfolio optimization';

    const embA = await generateTitanEmbedding(textA);
    const embB = await generateTitanEmbedding(textB);
    const embC = await generateTitanEmbedding(textC);

    expect(embA.length).toBe(1024);
    expect(embB.length).toBe(1024);
    expect(embC.length).toBe(1024);

    const simAB = cosineSimilarity(embA, embB);
    const simAC = cosineSimilarity(embA, embC);

    expect(typeof simAB).toBe('number');
    expect(typeof simAC).toBe('number');
  }, 25000);

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
