import pg from 'pg';
import dotenv from 'dotenv';
import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { cosineSimilarity } from './titanEmbed.js';

dotenv.config();

const { Pool } = pg;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-memory fallback storage for offline development and testing
class InMemoryDatabase {
  constructor() {
    this.papers = new Map();
    this.study_extractions = new Map();
    this.contradictions = new Map();
  }

  async query(text, params = []) {
    const trimmed = text.trim().toUpperCase();

    // 1. Vector Cosine Similarity Search
    if (trimmed.includes('FROM PAPERS') && (trimmed.includes('<->') || trimmed.includes('DISTANCE') || trimmed.includes('ORDER BY ABSTRACT_EMBEDDING'))) {
      const targetVector = typeof params[0] === 'string' ? JSON.parse(params[0]) : (Array.isArray(params[0]) ? params[0] : null);
      const limit = Number(params[1]) || 10;

      const paperList = Array.from(this.papers.values());
      if (!targetVector) {
        return { rows: paperList.slice(0, limit) };
      }

      const scored = paperList.map((paper) => {
        let sim = 0;
        if (paper.abstract_embedding) {
          const emb = typeof paper.abstract_embedding === 'string' ? JSON.parse(paper.abstract_embedding) : paper.abstract_embedding;
          sim = cosineSimilarity(targetVector, emb);
        }
        return {
          ...paper,
          distance: 1.0 - sim, // Cosine distance = 1 - cosine similarity
          similarity: sim,
        };
      });

      scored.sort((a, b) => a.distance - b.distance);
      return { rows: scored.slice(0, limit) };
    }

    // 2. SELECT from papers WHERE id = $1
    if (trimmed.startsWith('SELECT') && trimmed.includes('FROM PAPERS') && trimmed.includes('WHERE ID = $1')) {
      const paper = this.papers.get(params[0]);
      return { rows: paper ? [paper] : [] };
    }

    // 3. SELECT papers WHERE id IN (...)
    if (trimmed.startsWith('SELECT') && trimmed.includes('FROM PAPERS') && trimmed.includes('WHERE ID IN')) {
      const results = params.map((id) => this.papers.get(id)).filter(Boolean);
      return { rows: results };
    }

    // 4. INSERT into papers
    if (trimmed.startsWith('INSERT INTO PAPERS')) {
      const id = params[0] || randomUUID();
      const paper = {
        id,
        doi: params[1] || null,
        title: params[2],
        journal: params[3] || null,
        year: params[4] || null,
        abstract_text: params[5],
        s3_pdf_url: params[6] || null,
        abstract_embedding: params[7] || null,
        created_at: new Date().toISOString(),
      };
      this.papers.set(id, paper);
      return { rows: [paper] };
    }

    // 5. INSERT into study_extractions (upsert)
    if (trimmed.startsWith('INSERT INTO STUDY_EXTRACTIONS')) {
      const id = params[0] || randomUUID();
      const extraction = {
        id,
        paper_id: params[1],
        research_query: params[2],
        sample_size: params[3],
        model_system: params[4],
        intervention: params[5],
        control: params[6],
        primary_metric: params[7],
        effect_direction: params[8],
        effect_size: params[9],
        p_value: params[10],
        risk_of_bias: params[11],
        evidence_snippet: params[12],
        extracted_by_agent: params[13] || 'extractor-v1',
        created_at: new Date().toISOString(),
      };

      // Check for existing (paper_id, research_query)
      for (const [existingId, item] of this.study_extractions.entries()) {
        if (item.paper_id === extraction.paper_id && item.research_query === extraction.research_query) {
          this.study_extractions.delete(existingId);
        }
      }

      this.study_extractions.set(id, extraction);
      return { rows: [extraction] };
    }

    // 6. SELECT study_extractions by query
    if (trimmed.startsWith('SELECT') && trimmed.includes('FROM STUDY_EXTRACTIONS') && trimmed.includes('WHERE RESEARCH_QUERY = $1')) {
      const results = [];
      for (const item of this.study_extractions.values()) {
        if (item.research_query === params[0]) {
          const paper = this.papers.get(item.paper_id) || {};
          results.push({
            ...item,
            paper_title: paper.title,
            paper_year: paper.year,
            paper_doi: paper.doi,
            journal: paper.journal,
            s3_pdf_url: paper.s3_pdf_url,
          });
        }
      }
      return { rows: results };
    }

    // 7. SELECT study_extractions WHERE paper_id = $1
    if (trimmed.startsWith('SELECT') && trimmed.includes('FROM STUDY_EXTRACTIONS') && trimmed.includes('WHERE PAPER_ID = $1')) {
      const results = [];
      for (const item of this.study_extractions.values()) {
        if (item.paper_id === params[0]) {
          results.push(item);
        }
      }
      return { rows: results };
    }

    // 8. INSERT into contradictions
    if (trimmed.startsWith('INSERT INTO CONTRADICTIONS')) {
      const id = params[0] || randomUUID();
      const contradiction = {
        id,
        research_query: params[1],
        paper_a_id: params[2],
        paper_b_id: params[3],
        conflict_summary: params[4],
        isolated_confounder: params[5],
        confidence_tier: params[6],
        status: params[7] || 'OPEN',
        created_at: new Date().toISOString(),
      };
      this.contradictions.set(id, contradiction);
      return { rows: [contradiction] };
    }

    // 9. SELECT contradictions by query
    if (trimmed.startsWith('SELECT') && trimmed.includes('FROM CONTRADICTIONS') && trimmed.includes('WHERE RESEARCH_QUERY = $1')) {
      const results = [];
      for (const item of this.contradictions.values()) {
        if (item.research_query === params[0]) {
          const paperA = this.papers.get(item.paper_a_id) || {};
          const paperB = this.papers.get(item.paper_b_id) || {};
          results.push({
            ...item,
            paper_a_title: paperA.title,
            paper_b_title: paperB.title,
          });
        }
      }
      return { rows: results };
    }

    // 10. General SELECT papers
    if (trimmed.startsWith('SELECT') && trimmed.includes('FROM PAPERS')) {
      return { rows: Array.from(this.papers.values()) };
    }

    return { rows: [] };
  }

  async close() {
    this.papers.clear();
    this.study_extractions.clear();
    this.contradictions.clear();
  }
}

let pool = null;
let memoryDb = null;
let schemaInitialized = false;

async function autoInitSchema(clientPool) {
  if (schemaInitialized) return;
  try {
    const schemaPath = path.resolve(__dirname, '../schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schemaSql = fs.readFileSync(schemaPath, 'utf-8');
      const statements = schemaSql
        .split(';')
        .map((s) => s.trim())
        .filter((s) => s.length > 0 && !s.startsWith('--'));

      for (const stmt of statements) {
        try {
          await clientPool.query(stmt);
        } catch {
          // Continue if already exists
        }
      }
      schemaInitialized = true;
    }
  } catch (err) {
    console.warn('[DB Auto-Init Warning]', err.message);
  }
}

export function getDbPool() {
  const databaseUrl = process.env.DATABASE_URL;

  // Use CockroachDB pool if a valid connection string is provided
  if (databaseUrl && !databaseUrl.includes('user:password@')) {
    if (!pool) {
      pool = new Pool({
        connectionString: databaseUrl,
        ssl: databaseUrl.includes('sslmode=disable')
          ? false
          : { rejectUnauthorized: false }, // Supports CockroachDB Cloud SSL
        max: 20,
        idleTimeoutMillis: 30000,
        connectionTimeoutMillis: 5000,
      });

      pool.on('error', (err) => {
        console.error('[CockroachDB Pool Error]', err);
      });

      // Trigger background auto-init
      autoInitSchema(pool).catch(() => {});
    }
    return pool;
  }

  // Fallback to in-memory store for offline development and automated testing
  if (!memoryDb) {
    memoryDb = new InMemoryDatabase();
  }
  return memoryDb;
}

/**
 * Execute parameterized query safely with auto-recovery
 */
export async function query(text, params = []) {
  const db = getDbPool();
  try {
    return await db.query(text, params);
  } catch (err) {
    // If relation does not exist on live DB, attempt auto-init and retry once
    if (err.code === '42P01' && pool) {
      console.log('[DB Query] Missing tables detected. Auto-initializing schema...');
      await autoInitSchema(pool);
      return await db.query(text, params);
    }
    console.error('[DB Query Error]', { text: text.slice(0, 100), params, error: err.message });
    throw err;
  }
}

/**
 * Format vector array into CockroachDB pgvector-compatible format: '[0.123, -0.456, ...]'
 */
export function formatVector(embeddingArray) {
  if (!Array.isArray(embeddingArray)) return null;
  return `[${embeddingArray.join(',')}]`;
}
