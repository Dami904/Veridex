import { handleExtract } from '../lambdas/extractor/handler.js';
import { handleArbitrate } from '../lambdas/arbiter/handler.js';
import { handleQueryMatrix } from '../lambdas/query/handler.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runPipelineDryRun() {
  console.log('\n================================================================');
  console.log('  🧪 VERIDEX PIPELINE DRY RUN — END-TO-END VALIDATION');
  console.log('================================================================\n');

  const seedPath = path.resolve(__dirname, '../seed_data/demo_dataset.json');
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Demo dataset not found at ${seedPath}`);
  }

  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const queryName = seedData.research_query;
  const papers = seedData.papers || [];

  console.log(`[Target Research Query]: "${queryName}"`);
  console.log(`[Input Corpus]: Ingesting ${papers.length} peer-reviewed studies...\n`);

  const startTime = Date.now();
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalCostUsd = 0;

  // Phase 1: Ingestion & Extractor Agent
  console.log('--- Phase 1: Extractor Agent & Bedrock Titan V2 Embeddings ---');
  const extractedResults = [];

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];
    process.stdout.write(`  [${i + 1}/${papers.length}] Extracting: "${paper.title.slice(0, 48)}..." `);

    const extractEvent = {
      body: {
        ...paper,
        research_query: queryName,
      },
    };

    const res = await handleExtract(extractEvent);
    const body = JSON.parse(res.body);

    if (body.success) {
      extractedResults.push(body);
      if (body.usage) {
        totalInputTokens += body.usage.inputTokens || 0;
        totalOutputTokens += body.usage.outputTokens || 0;
        totalCostUsd += body.usage.estimatedCostUsd || 0;
      }
      console.log(`✓ [${body.extraction.effect_direction || 'NEUTRAL'}, N=${body.extraction.sample_size || 'N/A'}]`);
    } else {
      console.log(`✗ [ERROR: ${body.error}]`);
    }
  }

  console.log(`\n✓ Phase 1 Complete: ${extractedResults.length}/${papers.length} studies structured & vector-indexed.\n`);

  // Phase 2: Arbiter Agent (Pairwise Contradiction & Confounder Analysis)
  console.log('--- Phase 2: Arbiter Agent (Contradiction & Confounder Detection) ---');
  const arbitrateRes = await handleArbitrate({
    pathParameters: { query: queryName },
  });
  const arbitrateBody = JSON.parse(arbitrateRes.body);

  if (arbitrateBody.usage) {
    totalInputTokens += arbitrateBody.usage.inputTokens || 0;
    totalOutputTokens += arbitrateBody.usage.outputTokens || 0;
    totalCostUsd += arbitrateBody.usage.estimatedCostUsd || 0;
  }

  console.log(`✓ Detected & Arbitrated ${(arbitrateBody.new_contradictions || []).length} contradiction pairs:`);
  for (const c of arbitrateBody.new_contradictions || []) {
    const icon = c.status === 'RESOLVED' ? '🟢' : '🟠';
    console.log(`  ${icon} [${c.status}] ${c.conflict_summary}`);
    if (c.isolated_confounder) {
      console.log(`     ↳ Confounder: "${c.isolated_confounder}"`);
    }
  }

  // Phase 3: Synthesizer Agent & Live Query Matrix
  console.log('\n--- Phase 3: Synthesizer Agent (Deterministic Live Matrix) ---');
  const matrixRes = await handleQueryMatrix({
    pathParameters: { query: queryName },
  });
  const matrixBody = JSON.parse(matrixRes.body);

  const agg = matrixBody.aggregate || {};
  const totalDurationSec = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n================================================================');
  console.log('  📊 VERIDEX LIVE EVIDENCE MATRIX SUMMARY');
  console.log('================================================================');
  console.log(`  • Total Evaluated Studies : ${agg.total_studies}`);
  console.log(`  • Positive Direction     : ${agg.positive_count}`);
  console.log(`  • Negative Direction     : ${agg.negative_count}`);
  console.log(`  • Average Effect Size    : +${agg.avg_effect_size}%`);
  console.log(`  • Statistically Sig (p<.05): ${agg.significant_count}/${agg.total_studies}`);
  console.log(`  • Contradictions          : ${agg.resolved_contradictions} Resolved, ${agg.open_contradictions} Open/Irreconcilable`);
  console.log(`  • Confidence Tier         : 🎖️ [${agg.confidence_tier}]`);
  console.log('----------------------------------------------------------------');
  console.log('  📝 Live Synthesizer Narrative:');
  console.log(`  "${matrixBody.narrative}"`);
  console.log('----------------------------------------------------------------');
  console.log(`  ⚡ Run Performance:`);
  console.log(`  • Total Execution Time    : ${totalDurationSec}s`);
  console.log(`  • Total Token Volume      : ${totalInputTokens + totalOutputTokens} tokens`);
  console.log(`  • Estimated API Cost      : $${totalCostUsd.toFixed(5)} USD`);
  console.log('================================================================\n');

  return matrixBody;
}

// Run if called directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runPipelineDryRun().catch((err) => {
    console.error('Pipeline dry run failed:', err);
    process.exit(1);
  });
}

export { runPipelineDryRun };
