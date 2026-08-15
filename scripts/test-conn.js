import { getDbPool } from '../shared/db.js';

async function test() {
  const pool = getDbPool();
  try {
    const q1 = `CREATE TABLE IF NOT EXISTS papers (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      doi STRING UNIQUE,
      title STRING NOT NULL,
      journal STRING,
      year INT,
      abstract_text STRING NOT NULL,
      s3_pdf_url STRING,
      created_at TIMESTAMPTZ DEFAULT now()
    );`;
    await pool.query(q1);
    console.log('Successfully created papers table without vector index');

    try {
      await pool.query(`ALTER TABLE papers ADD COLUMN IF NOT EXISTS abstract_embedding VECTOR(1024);`);
      console.log('Successfully added abstract_embedding column');
    } catch (e) {
      console.log('Failed to add VECTOR(1024) column:', e.message);
    }

    try {
      await pool.query(`CREATE VECTOR INDEX IF NOT EXISTS idx_papers_embedding ON papers(abstract_embedding);`);
      console.log('Successfully created vector index');
    } catch (e) {
      console.log('Failed to create vector index:', e.message);
    }
  } catch (err) {
    console.error('Core table creation failed:', err.message);
  }
}

test();
