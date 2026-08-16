import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { discoverLiteratureForQuery } from '../shared/literatureDiscovery.js';
import { handleExtract } from '../lambdas/extractor/handler.js';
import { handleArbitrate } from '../lambdas/arbiter/handler.js';
import { handleQueryMatrix } from '../lambdas/query/handler.js';
import { query } from '../shared/db.js';
import { logger } from '../shared/logger.js';

function rowToJob(row) {
  const logs = row.logs;
  const matrix = row.matrix;
  return {
    id: row.id,
    researchQuery: row.research_query,
    status: row.status,
    progress: row.progress,
    currentStep: row.current_step,
    logs: typeof logs === 'string' ? JSON.parse(logs) : (logs || []),
    matrix: typeof matrix === 'string' ? JSON.parse(matrix) : (matrix || null),
    error: row.error,
    createdAt: row.created_at,
  };
}

class SwarmJobManager extends EventEmitter {
  constructor() {
    super();
    // In-process cache: avoids a DB round-trip on every progress tick for jobs
    // started by this server instance. Persistence (below) is what makes jobs
    // survive a restart; this is purely a hot-path optimization.
    this.jobs = new Map();

    // A job left QUEUED/RUNNING means the process that owned it died mid-run —
    // there is no worker left to advance it, so it would otherwise show as
    // "in progress" forever. Mark it FAILED so the frontend reflects reality.
    query(
      `UPDATE jobs SET status = 'FAILED', error = 'Job interrupted by server restart', updated_at = now()
       WHERE status IN ('QUEUED', 'RUNNING')`
    ).catch((err) => logger.error('Failed to reap orphaned jobs on startup', err));
  }

  async _persist(job) {
    try {
      await query(
        `UPSERT INTO jobs (id, research_query, status, progress, current_step, logs, matrix, error, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, now())`,
        [
          job.id,
          job.researchQuery,
          job.status,
          job.progress,
          job.currentStep,
          JSON.stringify(job.logs || []),
          job.matrix ? JSON.stringify(job.matrix) : null,
          job.error,
          job.createdAt,
        ]
      );
    } catch (err) {
      logger.error(`Failed to persist job ${job.id}`, err, { jobId: job.id });
    }
  }

  async createJob(researchQuery) {
    const jobId = randomUUID();
    const job = {
      id: jobId,
      researchQuery,
      status: 'QUEUED', // QUEUED, RUNNING, COMPLETED, FAILED
      progress: 0,
      currentStep: 'Job queued in Swarm orchestrator',
      logs: [],
      matrix: null,
      error: null,
      createdAt: new Date().toISOString(),
    };
    this.jobs.set(jobId, job);
    await this._persist(job);
    return job;
  }

  async getJob(jobId) {
    const cached = this.jobs.get(jobId);
    if (cached) return cached;

    const { rows } = await query('SELECT * FROM jobs WHERE id = $1', [jobId]);
    if (rows.length === 0) return null;

    const job = rowToJob(rows[0]);
    this.jobs.set(jobId, job); // warm the cache so subsequent reads/writes skip the DB
    return job;
  }

  updateProgress(jobId, percent, stepMessage, logDetail = null) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.progress = percent;
    job.currentStep = stepMessage;
    if (logDetail) {
      job.logs.push({
        timestamp: new Date().toISOString(),
        message: logDetail,
      });
    }
    this._persist(job).catch(() => {});

    this.emit(`job:${jobId}:update`, {
      type: 'progress',
      progress: percent,
      step: stepMessage,
      log: logDetail,
    });
  }

  async runJob(jobId) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'RUNNING';
    await this._persist(job);
    logger.agent('Orchestrator', `Starting Swarm synthesis job ${jobId.slice(0, 8)}`, {
      jobId,
      researchQuery: job.researchQuery,
    });

    try {
      // 1. Discovery Phase (PubMed / Curated Registry)
      this.updateProgress(jobId, 15, 'Phase 1: Querying PubMed & Literature Discovery Engine...', `Searching peer-reviewed biomedical literature for "${job.researchQuery}"`);
      logger.agent('Librarian', `Querying multi-source medical registries for "${job.researchQuery}"`, { jobId });
      const discovery = await discoverLiteratureForQuery(job.researchQuery);

      if (discovery.source === 'insufficient_literature' || (discovery.papers || []).length === 0) {
        throw new Error(discovery.message || `Insufficient peer-reviewed studies found on PubMed for "${job.researchQuery}". Veridex strictly refuses to fabricate literature.`);
      }

      const papers = discovery.papers || [];
      const targetQuery = discovery.research_query || job.researchQuery;

      logger.agent('Librarian', `Discovered ${papers.length} peer-reviewed studies from ${discovery.source}`, {
        jobId,
        source: discovery.source,
        paperCount: papers.length,
      });

      this.updateProgress(jobId, 30, `Phase 1: Retrieved ${papers.length} peer-reviewed studies (${discovery.source})`, `Discovered ${papers.length} papers from ${discovery.source}`);

      // 2. Extractor Agent Phase — Bounded Parallel Concurrent Processing
      this.updateProgress(jobId, 40, `Phase 2: Extractor Agent analyzing ${papers.length} studies in parallel...`, 'Generating Bedrock Titan V2 1024-dim embeddings & extracting structured clinical parameters');
      logger.agent('Extractor', `Beginning batch extraction across ${papers.length} studies (concurrency=3)`, { jobId });

      const extractedResults = [];
      const concurrencyLimit = 3;
      for (let i = 0; i < papers.length; i += concurrencyLimit) {
        const chunk = papers.slice(i, i + concurrencyLimit);
        const chunkPromises = chunk.map(async (paper, idx) => {
          const globalIdx = i + idx + 1;
          const extRes = await handleExtract({
            body: {
              ...paper,
              research_query: targetQuery,
            },
          });
          return { paperTitle: paper.title, result: JSON.parse(extRes.body), index: globalIdx };
        });

        const chunkResults = await Promise.all(chunkPromises);
        for (const res of chunkResults) {
          extractedResults.push(res.result);
          const currentPct = Math.min(70, Math.round(40 + (extractedResults.length / papers.length) * 30));
          this.updateProgress(
            jobId,
            currentPct,
            `Phase 2: Extracted parameters for study [${extractedResults.length}/${papers.length}]`,
            `Extracted: "${res.paperTitle.slice(0, 45)}..."`
          );
        }
      }

      logger.agent('Extractor', `Completed extraction for ${extractedResults.length}/${papers.length} studies`, { jobId });

      // 3. Arbiter Agent Phase (Pairwise Confounder Detection)
      this.updateProgress(jobId, 75, 'Phase 3: Arbiter Agent executing adversarial pairwise analysis...', 'Evaluating opposing study cohorts to isolate methodological confounders');
      logger.agent('Arbiter', `Executing adversarial pairwise conflict analysis for "${targetQuery}"`, { jobId });
      const arbRes = await handleArbitrate({
        pathParameters: { query: targetQuery },
      });
      const arbBody = JSON.parse(arbRes.body);
      const arbitratedCount = (arbBody.new_contradictions || []).length;

      logger.agent('Arbiter', `Resolved ${arbitratedCount} pairwise contradiction pairs`, {
        jobId,
        arbitratedCount,
      });

      this.updateProgress(
        jobId,
        88,
        `Phase 3: Arbiter resolved ${arbitratedCount} contradiction pairs`,
        `Identified ${arbitratedCount} pairwise conflicts and assigned confidence tiers`
      );

      // 4. Synthesizer Agent Phase (Deterministic Live Synthesis)
      this.updateProgress(jobId, 95, 'Phase 4: Synthesizer Agent computing deterministic confidence matrix...', 'Calculating exact statistics with zero arithmetic hallucination');
      logger.agent('Synthesizer', 'Computing deterministic confidence matrix and executive narrative', { jobId });
      const matrixRes = await handleQueryMatrix({
        pathParameters: { query: targetQuery },
      });
      const matrixBody = JSON.parse(matrixRes.body);

      job.status = 'COMPLETED';
      job.progress = 100;
      job.currentStep = `Consensus Synthesis Complete • Confidence Grade [${matrixBody.aggregate?.confidence_tier || 'MODERATE'}]`;
      job.matrix = matrixBody;
      await this._persist(job);

      logger.agent('Orchestrator', `Job ${jobId.slice(0, 8)} successfully finished [${matrixBody.aggregate?.confidence_tier}]`, {
        jobId,
        confidenceTier: matrixBody.aggregate?.confidence_tier,
      });

      this.emit(`job:${jobId}:update`, {
        type: 'complete',
        progress: 100,
        matrix: matrixBody,
      });

      return matrixBody;
    } catch (err) {
      job.status = 'FAILED';
      job.error = err.message;
      await this._persist(job);
      logger.error(`Job ${jobId.slice(0, 8)} failed`, err, { jobId });
      this.emit(`job:${jobId}:update`, {
        type: 'error',
        error: err.message,
      });
      throw err;
    }
  }
}

export const jobManager = new SwarmJobManager();
