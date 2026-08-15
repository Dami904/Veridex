import dotenv from 'dotenv';
import { getDbPool } from '../shared/db.js';
import { generateTitanEmbedding } from '../shared/titanEmbed.js';

dotenv.config();

async function runHealthCheck() {
  console.log('\n======================================================');
  console.log('  🔍 VERIDEX LIVE CREDENTIALS & SERVICE PROBE');
  console.log('======================================================\n');

  // 1. Check CockroachDB
  console.log('[1/3] Testing CockroachDB Cloud Connection...');
  try {
    const pool = getDbPool();
    const res = await pool.query('SELECT version();');
    console.log('  ✅ CockroachDB Connected Successfully!');
    console.log(`     Database Version: ${res.rows[0]?.version?.slice(0, 45)}...`);
  } catch (err) {
    console.error('  ❌ CockroachDB Connection Failed:', err.message);
  }

  // 2. Check AWS Bedrock Titan V2 with Profile
  console.log('\n[2/3] Testing AWS Bedrock Titan V2 Embeddings...');
  const awsProfile = process.env.AWS_PROFILE || 'default';
  console.log(`  • Active AWS Profile : ${awsProfile}`);

  try {
    const vec = await generateTitanEmbedding('Veridex Bedrock Titan V2 verification probe');
    console.log(`  ✅ Titan V2 Embedding Generated! (Length: ${vec.length}-dim vector)`);
  } catch (err) {
    console.warn('  ⚠️  AWS Bedrock Notice:', err.message);
  }

  // 3. Check LLM Provider
  console.log('\n[3/3] Testing LLM Provider Configuration...');
  const provider = process.env.LLM_PROVIDER || 'gemini';
  const model = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
  const hasGemini = Boolean(process.env.GEMINI_API_KEY && !process.env.GEMINI_API_KEY.includes('your-gemini'));

  console.log(`  • Configured Provider : ${provider}`);
  console.log(`  • Gemini Model Target : ${model}`);
  console.log(`  • Gemini Key Active   : ${hasGemini ? 'Yes' : 'No (Local heuristic fallback active)'}`);
  console.log('\n======================================================\n');
}

runHealthCheck();
