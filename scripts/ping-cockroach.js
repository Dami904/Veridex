import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const { Pool } = pg;

async function pingCockroach() {
  console.log('\n======================================================');
  console.log('  🪳 COCKROACHDB CLOUD DIRECT QUERY & ACTIVITY TRIGGER');
  console.log('======================================================\n');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl || databaseUrl.includes('user:password@')) {
    console.error('❌ DATABASE_URL is not set or contains placeholder!');
    return;
  }

  const pool = new Pool({
    connectionString: databaseUrl,
    ssl: { rejectUnauthorized: false },
  });

  try {
    const client = await pool.connect();
    console.log('✅ Client connected to CockroachDB Cloud cluster!');

    // 1. Get cluster metadata
    const meta = await client.query(`
      SELECT 
        current_database() as database,
        current_user as user,
        version() as version,
        now() as server_time;
    `);

    console.log('📊 Active Connection Details:');
    console.log(`   • Database    : ${meta.rows[0].database}`);
    console.log(`   • User        : ${meta.rows[0].user}`);
    console.log(`   • Server Time : ${meta.rows[0].server_time}`);
    console.log(`   • Engine      : ${meta.rows[0].version.slice(0, 50)}...`);

    // 2. Query table counts
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public';
    `);
    console.log(`\n📋 Tables found in public schema (${tables.rows.length}):`);
    for (const t of tables.rows) {
      console.log(`   - ${t.table_name}`);
    }

    // 3. Perform an active read/write query to trigger CockroachDB Cloud metric counters
    const paperCount = await client.query(`SELECT count(*) FROM papers;`);
    const extractionsCount = await client.query(`SELECT count(*) FROM study_extractions;`);
    const contradictionsCount = await client.query(`SELECT count(*) FROM contradictions;`);

    console.log('\n📈 Live Table Statistics:');
    console.log(`   • Papers Indexed        : ${paperCount.rows[0].count}`);
    console.log(`   • Extractions Recorded  : ${extractionsCount.rows[0].count}`);
    console.log(`   • Contradictions Mapped : ${contradictionsCount.rows[0].count}`);

    client.release();
    await pool.end();
    console.log('\n🎉 CockroachDB Cloud query executed successfully!');
    console.log('======================================================\n');
  } catch (err) {
    console.error('❌ CockroachDB Query Error:', err.message);
  }
}

pingCockroach();
