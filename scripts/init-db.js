import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDbPool, parseSchemaStatements } from '../shared/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function initializeDatabase() {
  const schemaPath = path.resolve(__dirname, '../schema.sql');
  if (!fs.existsSync(schemaPath)) {
    throw new Error(`Schema file not found at ${schemaPath}`);
  }

  const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
  const pool = getDbPool();

  console.log('[DB Init] Applying schema to database...');
  
  const statements = parseSchemaStatements(schemaSql);

  for (const stmt of statements) {
    try {
      await pool.query(stmt);
    } catch (err) {
      // Ignore if index or table already exists or if using in-memory fallback
      if (!err.message?.includes('already exists') && !err.message?.includes('duplicate')) {
        console.warn(`[DB Init Warning] Statement: ${stmt.slice(0, 60)}... Error: ${err.message}`);
      }
    }
  }

  console.log('[DB Init] Database schema initialization completed successfully.');
  return true;
}

// Run directly if invoked from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  initializeDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[DB Init Error]', err);
      process.exit(1);
    });
}
