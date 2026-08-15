#!/usr/bin/env node

/**
 * Veridex Fast Pre-Deployment Smoke Test Suite (< 2.5s)
 * Verifies live medical registries, deterministic math, vector computations, and PRISMA generation.
 */

import { computeConfidenceTier } from '../lambdas/synthesizer/handler.js';
import { cosineSimilarity } from '../shared/titanEmbed.js';
import { generatePrismaMarkdownReport } from '../shared/prismaExporter.js';

const startAll = Date.now();
console.log('\n================================================================');
console.log('  ⚡ VERIDEX FAST PRE-DEPLOYMENT SMOKE TEST');
console.log('================================================================\n');

const checks = [];

async function runCheck(name, fn) {
  const start = Date.now();
  try {
    const detail = await fn();
    const durationMs = Date.now() - start;
    checks.push({ name, status: 'PASS', durationMs, detail: detail || 'OK' });
    console.log(`  🟢 [PASS] ${name} (${durationMs}ms) — ${detail || 'OK'}`);
  } catch (err) {
    const durationMs = Date.now() - start;
    checks.push({ name, status: 'FAIL', durationMs, error: err.message });
    console.error(`  🔴 [FAIL] ${name} (${durationMs}ms) — ${err.message}`);
  }
}

// 1. Check Deterministic Confidence Math
await runCheck('Deterministic Confidence Tier Math', async () => {
  const highTier = computeConfidenceTier({
    totalStudies: 6,
    positiveCount: 5,
    negativeCount: 1,
    riskOfBiasBreakdown: { LOW: 4, MODERATE: 2, HIGH: 0 },
    openContradictions: 0,
    resolvedContradictions: 2,
  });
  if (highTier !== 'HIGH') throw new Error(`Expected HIGH, got ${highTier}`);

  const lowTier = computeConfidenceTier({
    totalStudies: 2,
    positiveCount: 2,
    negativeCount: 0,
    riskOfBiasBreakdown: { LOW: 2, MODERATE: 0, HIGH: 0 },
    openContradictions: 0,
    resolvedContradictions: 0,
  });
  if (lowTier !== 'LOW') throw new Error(`Expected LOW for <3 studies, got ${lowTier}`);

  return 'Exact Tier Logic Validated';
});

// 2. Check Vector Cosine Similarity
await runCheck('Vector Distance & Cosine Operator', async () => {
  const vecA = [1, 0, 0];
  const vecB = [1, 0, 0];
  const vecC = [0, 1, 0];

  const simIdentical = cosineSimilarity(vecA, vecB);
  const simOrthogonal = cosineSimilarity(vecA, vecC);

  if (Math.abs(simIdentical - 1.0) > 0.001) throw new Error(`Identical vectors must equal 1.0, got ${simIdentical}`);
  if (Math.abs(simOrthogonal - 0.0) > 0.001) throw new Error(`Orthogonal vectors must equal 0.0, got ${simOrthogonal}`);

  return 'Cosine Space Math Validated';
});

// 3. Check PRISMA 2020 Systematic Review Markdown Generator
await runCheck('PRISMA 2020 Markdown Exporter', async () => {
  const report = generatePrismaMarkdownReport({
    research_query: 'Metformin Longevity Efficacy',
    papers: [{ id: '1', title: 'Study 1', journal: 'Nature', year: 2023, provenance: 'PUBMED_CENTRAL' }],
    extractions: [{ paper_id: '1', sample_size: 100, effect_direction: 'POSITIVE', p_value: 0.01, risk_of_bias: 'LOW' }],
    contradictions: [],
    aggregate: { total_studies: 1, positive_count: 1, negative_count: 0, confidence_tier: 'LOW' },
    narrative: 'Sample synthesis narrative.',
  });

  if (!report.includes('# PRISMA 2020 Systematic Review')) {
    throw new Error('Missing PRISMA 2020 header in markdown output');
  }
  return 'Standard Systematic Review Generator OK';
});

// 4. Live Parallel Network Connectivity: PubMed, CrossRef, Europe PMC
await Promise.all([
  runCheck('NCBI PubMed Central E-Utilities API', async () => {
    const res = await fetch('https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&term=metformin&retmode=json&retmax=1', {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    const count = data.esearchresult?.idlist?.length || 0;
    return `Live NCBI API reachable (${count} sample hits)`;
  }),

  runCheck('CrossRef Academic DOI Registry', async () => {
    const res = await fetch('https://api.crossref.org/works?query=metformin&rows=1', {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return 'Live CrossRef Scholarly API reachable';
  }),

  runCheck('Europe PMC Open Access Database', async () => {
    const res = await fetch('https://www.ebi.ac.uk/europepmc/webservices/rest/search?query=metformin&format=json&pageSize=1', {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return 'Live Europe PMC API reachable';
  }),
]);

const totalDurationMs = Date.now() - startAll;
const failures = checks.filter((c) => c.status === 'FAIL');

console.log('\n----------------------------------------------------------------');
console.log(`  📊 SMOKE RESULTS: ${checks.length - failures.length}/${checks.length} Passed in ${(totalDurationMs / 1000).toFixed(2)}s`);
console.log('----------------------------------------------------------------\n');

if (failures.length > 0) {
  console.error(`💥 ${failures.length} smoke check(s) failed.`);
  process.exit(1);
} else {
  console.log('🚀 All Veridex core services and algorithms are nominal!\n');
}
