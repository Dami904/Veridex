import { handleExtract } from '../lambdas/extractor/handler.js';
import { handleArbitrate } from '../lambdas/arbiter/handler.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function seedDatabase() {
  console.log('[Veridex Seeder] Ingesting curated benchmark papers into CockroachDB...');

  const seedPath = path.resolve(__dirname, '../seed_data/demo_dataset.json');
  if (!fs.existsSync(seedPath)) {
    throw new Error(`Demo dataset not found at ${seedPath}`);
  }

  const seedData = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
  const queryName = seedData.research_query;
  const papers = seedData.papers || [];

  for (let i = 0; i < papers.length; i++) {
    const paper = papers[i];
    console.log(`  [${i + 1}/${papers.length}] Ingesting: "${paper.title.slice(0, 50)}..."`);
    await handleExtract({
      body: {
        ...paper,
        research_query: queryName,
      },
    });
  }

  console.log('[Veridex Seeder] Ingestion complete. Triggering Arbiter Agent...');
  const arbitrateRes = await handleArbitrate({
    pathParameters: { query: queryName },
  });
  const arbitrateBody = JSON.parse(arbitrateRes.body);

  console.log(`[Veridex Seeder] Seeding finished successfully! ${(arbitrateBody.new_contradictions || []).length} contradictions recorded.`);
}

seedDatabase().catch((err) => {
  console.error('[Veridex Seeder Error]', err);
  process.exit(1);
});
