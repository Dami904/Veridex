import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { handleExtract } from '../lambdas/extractor/handler.js';
import { handleArbitrate } from '../lambdas/arbiter/handler.js';
import { handleQueryMatrix } from '../lambdas/query/handler.js';
import { query, formatVector } from '../shared/db.js';
import { generateTitanEmbedding } from '../shared/titanEmbed.js';
import { discoverLiteratureForQuery } from '../shared/literatureDiscovery.js';
import { generatePrismaMarkdownReport } from '../shared/prismaExporter.js';
import { generateBibtexExport, generateRisExport } from '../shared/citationExporter.js';
import { parsePdfBuffer } from '../shared/pdfParser.js';
import { uploadToS3 } from '../shared/s3.js';
import { jobManager } from './jobManager.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: '*' }));
app.use(express.json({ limit: '50mb' }));
app.use(express.raw({ type: 'application/pdf', limit: '50mb' }));

// Healthcheck & Configuration Status
app.get('/health', async (req, res) => {
  res.json({
    status: 'ok',
    service: 'Veridex Consensus API',
    cockroachdb_configured: Boolean(process.env.DATABASE_URL && !process.env.DATABASE_URL.includes('user:password@')),
    aws_bedrock_configured: Boolean(process.env.AWS_ACCESS_KEY_ID && !process.env.AWS_ACCESS_KEY_ID.includes('your-aws-access-key')),
    timestamp: new Date().toISOString(),
  });
});

// POST /papers — Ingestion & Extraction (Titan V2 1024-dim Vector + Extractor Agent)
app.post('/papers', async (req, res) => {
  try {
    const result = await handleExtract({ body: req.body });
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /papers/upload-pdf — Real PDF Upload Parser + S3 Storage + Live Extractor
app.post('/papers/upload-pdf', async (req, res) => {
  try {
    const researchQuery = req.query.research_query || req.headers['x-research-query'];
    if (!researchQuery) {
      return res.status(400).json({ error: 'Missing research_query query parameter or header' });
    }

    let pdfBuffer;
    let filename = 'study_document.pdf';

    if (Buffer.isBuffer(req.body)) {
      pdfBuffer = req.body;
    } else if (req.body && req.body.base64) {
      pdfBuffer = Buffer.from(req.body.base64, 'base64');
      filename = req.body.filename || filename;
    } else {
      return res.status(400).json({ error: 'Expected binary PDF body or JSON with base64 field' });
    }

    // 1. Parse PDF text sections
    const parsed = await parsePdfBuffer(pdfBuffer);

    // 2. Upload to S3 Paper Lake
    const s3Url = await uploadToS3(pdfBuffer, filename, 'application/pdf');

    // 3. Ingest into Extractor Agent & Vector Memory
    const extractResult = await handleExtract({
      body: {
        title: parsed.title,
        abstract_text: parsed.abstract || parsed.fullText.slice(0, 2000),
        year: parsed.year,
        s3_pdf_url: s3Url,
        research_query: decodeURIComponent(researchQuery),
      },
    });

    res.status(201).json({
      success: true,
      parsed_metadata: parsed,
      s3_pdf_url: s3Url,
      extraction: JSON.parse(extractResult.body),
    });
  } catch (err) {
    console.error('[PDF Upload Error]', err);
    res.status(500).json({ error: 'Failed to parse and ingest PDF', details: err.message });
  }
});

// POST /papers/search — C-SPANN Semantic Vector Search across CockroachDB
app.post('/papers/search', async (req, res) => {
  try {
    const { query: searchQuery, limit = 8 } = req.body;
    if (!searchQuery) {
      return res.status(400).json({ error: 'Missing search query' });
    }

    // 1. Generate Titan V2 1024-dim embedding for search term
    const queryEmbedding = await generateTitanEmbedding(searchQuery);
    const vectorString = formatVector(queryEmbedding);

    // 2. Query CockroachDB using cosine distance (<->)
    const sql = `
      SELECT id, doi, title, journal, year, abstract_text, s3_pdf_url, created_at,
             (abstract_embedding <-> $1) AS distance
      FROM papers
      ORDER BY abstract_embedding <-> $1 ASC
      LIMIT $2;
    `;
    const searchResult = await query(sql, [vectorString, limit]);

    // Attach similarity percentage
    const ranked = searchResult.rows.map((row) => ({
      ...row,
      similarity_pct: Math.max(0, Math.min(100, Math.round((1 - (row.distance || 0)) * 100))),
    }));

    res.json({
      success: true,
      query: searchQuery,
      total_matches: ranked.length,
      results: ranked,
    });
  } catch (err) {
    res.status(500).json({ error: 'Vector search failed', details: err.message });
  }
});

// POST /jobs/synthesize — Start Background Swarm Synthesis Job
app.post('/jobs/synthesize', async (req, res) => {
  try {
    const { research_query } = req.body;
    if (!research_query) {
      return res.status(400).json({ error: 'Missing research_query in body' });
    }

    const job = jobManager.createJob(research_query.trim());
    // Launch execution in background
    jobManager.runJob(job.id).catch((err) => {
      console.error(`[Job ${job.id} Execution Failed]`, err);
    });

    res.status(202).json({
      success: true,
      jobId: job.id,
      status: job.status,
      research_query: job.researchQuery,
      streamUrl: `/jobs/${job.id}/stream`,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create synthesis job', details: err.message });
  }
});

// GET /jobs/:jobId/stream — Server-Sent Events (SSE) Progress Stream
app.get('/jobs/:jobId/stream', (req, res) => {
  const { jobId } = req.params;
  const job = jobManager.getJob(jobId);

  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders?.();

  // Send initial state
  res.write(`data: ${JSON.stringify({ type: 'init', job })}\n\n`);

  const onUpdate = (data) => {
    res.write(`data: ${JSON.stringify(data)}\n\n`);
    if (data.type === 'complete' || data.type === 'error') {
      cleanup();
    }
  };

  jobManager.on(`job:${jobId}:update`, onUpdate);

  const cleanup = () => {
    jobManager.off(`job:${jobId}:update`, onUpdate);
  };

  req.on('close', cleanup);
});

// POST /research-queries/:query/arbitrate — Runs Arbiter over unverified pairs
app.post('/research-queries/:query/arbitrate', async (req, res) => {
  try {
    const result = await handleArbitrate({
      pathParameters: { query: decodeURIComponent(req.params.query) },
    });
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /research-queries/:query/matrix — Live on-demand consensus matrix
app.get('/research-queries/:query/matrix', async (req, res) => {
  try {
    const result = await handleQueryMatrix({
      pathParameters: { query: decodeURIComponent(req.params.query) },
    });
    res.status(result.statusCode).json(JSON.parse(result.body));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /research-queries/discover-and-synthesize — Automated Literature Discovery
app.post('/research-queries/discover-and-synthesize', async (req, res) => {
  try {
    const { research_query } = req.body;
    if (!research_query) {
      return res.status(400).json({ error: 'Missing research_query in body' });
    }

    const discovery = await discoverLiteratureForQuery(research_query);
    const targetQuery = discovery.research_query || research_query;
    const papers = discovery.papers || [];

    const extractedResults = [];
    for (const paper of papers) {
      const extRes = await handleExtract({
        body: {
          ...paper,
          research_query: targetQuery,
        },
      });
      extractedResults.push(JSON.parse(extRes.body));
    }

    const arbRes = await handleArbitrate({
      pathParameters: { query: targetQuery },
    });
    const arbitration = JSON.parse(arbRes.body);

    const matrixRes = await handleQueryMatrix({
      pathParameters: { query: targetQuery },
    });
    const matrix = JSON.parse(matrixRes.body);

    res.json({
      success: true,
      source: discovery.source,
      research_query: targetQuery,
      discovered_papers_count: papers.length,
      arbitration,
      matrix,
    });
  } catch (err) {
    console.error('[Discover and Synthesize Error]', err);
    res.status(500).json({ error: 'Failed to discover and synthesize literature', details: err.message });
  }
});

// GET /research-queries/:query/export/prisma — PRISMA 2020 Systematic Review Exporter
app.get('/research-queries/:query/export/prisma', async (req, res) => {
  try {
    const targetQuery = decodeURIComponent(req.params.query);
    const matrixRes = await handleQueryMatrix({
      pathParameters: { query: targetQuery },
    });
    const matrixData = JSON.parse(matrixRes.body);

    const markdownReport = generatePrismaMarkdownReport(matrixData);
    const format = req.query.format || 'json';

    if (format === 'markdown') {
      res.setHeader('Content-Type', 'text/markdown; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="Veridex_PRISMA_${Date.now()}.md"`);
      return res.send(markdownReport);
    }

    res.json({
      success: true,
      research_query: targetQuery,
      markdown_report: markdownReport,
      matrix_data: matrixData,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate PRISMA export', details: err.message });
  }
});

// GET /research-queries/:query/export/bibtex — BibTeX Exporter (Zotero / Mendeley / Overleaf)
app.get('/research-queries/:query/export/bibtex', async (req, res) => {
  try {
    const targetQuery = decodeURIComponent(req.params.query);
    const matrixRes = await handleQueryMatrix({
      pathParameters: { query: targetQuery },
    });
    const matrixData = JSON.parse(matrixRes.body);
    const bibtex = generateBibtexExport(matrixData);

    res.setHeader('Content-Type', 'application/x-bibtex; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Veridex_Citations_${Date.now()}.bib"`);
    res.send(bibtex);
  } catch (err) {
    res.status(500).json({ error: 'BibTeX export failed', details: err.message });
  }
});

// GET /research-queries/:query/export/ris — RIS Exporter (EndNote / RefMan)
app.get('/research-queries/:query/export/ris', async (req, res) => {
  try {
    const targetQuery = decodeURIComponent(req.params.query);
    const matrixRes = await handleQueryMatrix({
      pathParameters: { query: targetQuery },
    });
    const matrixData = JSON.parse(matrixRes.body);
    const ris = generateRisExport(matrixData);

    res.setHeader('Content-Type', 'application/x-research-info-systems; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="Veridex_Citations_${Date.now()}.ris"`);
    res.send(ris);
  } catch (err) {
    res.status(500).json({ error: 'RIS export failed', details: err.message });
  }
});

// GET /papers/:id — Single paper detail
app.get('/papers/:id', async (req, res) => {
  try {
    const result = await query(`SELECT * FROM papers WHERE id = $1;`, [req.params.id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Paper not found' });
    }
    const extractions = await query(`SELECT * FROM study_extractions WHERE paper_id = $1;`, [req.params.id]);
    res.json({
      paper: result.rows[0],
      extractions: extractions.rows,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /seed — Seeds the demo dataset into CockroachDB & runs Arbiter
app.post('/seed', async (req, res) => {
  try {
    const seedPath = path.resolve(__dirname, '../seed_data/demo_dataset.json');
    if (!fs.existsSync(seedPath)) {
      return res.status(404).json({ error: 'Seed dataset file not found' });
    }

    const data = JSON.parse(fs.readFileSync(seedPath, 'utf-8'));
    const papers = data.papers || [];
    const queryName = data.research_query || 'Does Low-Dose Metformin Extend Lifespan in Non-Diabetic Mammals?';

    const results = [];
    for (const p of papers) {
      const extractResult = await handleExtract({
        body: {
          ...p,
          research_query: queryName,
        },
      });
      results.push(JSON.parse(extractResult.body));
    }

    const arbitrateResult = await handleArbitrate({
      pathParameters: { query: queryName },
    });

    res.json({
      success: true,
      seeded_papers_count: results.length,
      arbitration: JSON.parse(arbitrateResult.body),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve built frontend assets if dist directory exists (e.g. Render all-in-one deploy)
const distPath = path.resolve(__dirname, '../frontend/dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (req, res, next) => {
    if (
      req.path.startsWith('/papers') ||
      req.path.startsWith('/research-queries') ||
      req.path.startsWith('/jobs') ||
      req.path.startsWith('/seed') ||
      req.path === '/health'
    ) {
      return next();
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`[Veridex API] Server listening on http://localhost:${PORT}`);
  });
}

export default app;
