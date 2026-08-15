import { EventEmitter } from 'events';
import { randomUUID } from 'crypto';
import { discoverLiteratureForQuery } from '../shared/literatureDiscovery.js';
import { handleExtract } from '../lambdas/extractor/handler.js';
import { handleArbitrate } from '../lambdas/arbiter/handler.js';
import { handleQueryMatrix } from '../lambdas/query/handler.js';

class SwarmJobManager extends EventEmitter {
  constructor() {
    super();
    this.jobs = new Map();
  }

  createJob(researchQuery) {
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
    return job;
  }

  getJob(jobId) {
    return this.jobs.get(jobId);
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

    try {
      // 1. Discovery Phase (PubMed / arXiv / Registry)
      this.updateProgress(jobId, 10, 'Phase 1: Querying PubMed & Scientific Literature APIs...', `Searching literature for "${job.researchQuery}"`);
      const discovery = await discoverLiteratureForQuery(job.researchQuery);
      const papers = discovery.papers || [];
      const targetQuery = discovery.research_query || job.researchQuery;

      this.updateProgress(jobId, 25, `Phase 1: Discovered ${papers.length} peer-reviewed studies`, `Retrieved ${papers.length} papers from ${discovery.source}`);

      // 2. Extractor Agent Phase (Titan V2 Embeddings + Structured Extractions)
      const extractedResults = [];
      for (let i = 0; i < papers.length; i++) {
        const paper = papers[i];
        const pct = Math.round(25 + ((i + 1) / papers.length) * 35);
        this.updateProgress(
          jobId,
          pct,
          `Phase 2: Extractor Agent analyzing study [${i + 1}/${papers.length}]...`,
          `Generating Bedrock Titan V2 1024-dim embedding & extracting parameters for "${paper.title.slice(0, 50)}..."`
        );

        const extRes = await handleExtract({
          body: {
            ...paper,
            research_query: targetQuery,
          },
        });
        extractedResults.push(JSON.parse(extRes.body));
      }

      // 3. Arbiter Agent Phase (Pairwise Confounder Detection)
      this.updateProgress(jobId, 70, 'Phase 3: Arbiter Agent executing adversarial pairwise analysis...', 'Evaluating opposing effect directions to isolate methodological confounders');
      const arbRes = await handleArbitrate({
        pathParameters: { query: targetQuery },
      });
      const arbBody = JSON.parse(arbRes.body);
      const arbitratedCount = (arbBody.new_contradictions || []).length;

      this.updateProgress(
        jobId,
        85,
        `Phase 3: Arbiter resolved ${arbitratedCount} contradiction pairs`,
        `Identified ${arbitratedCount} pairwise conflicts and assigned confidence tiers`
      );

      // 4. Synthesizer Agent Phase (Deterministic Live Synthesis)
      this.updateProgress(jobId, 95, 'Phase 4: Synthesizer Agent computing deterministic confidence matrix...', 'Calculating exact statistics with zero arithmetic hallucination');
      const matrixRes = await handleQueryMatrix({
        pathParameters: { query: targetQuery },
      });
      const matrixBody = JSON.parse(matrixRes.body);

      job.status = 'COMPLETED';
      job.progress = 100;
      job.currentStep = `Consensus Synthesis Complete • Confidence Grade [${matrixBody.aggregate?.confidence_tier || 'MODERATE'}]`;
      job.matrix = matrixBody;

      this.emit(`job:${jobId}:update`, {
        type: 'complete',
        progress: 100,
        matrix: matrixBody,
      });

      return matrixBody;
    } catch (err) {
      job.status = 'FAILED';
      job.error = err.message;
      this.emit(`job:${jobId}:update`, {
        type: 'error',
        error: err.message,
      });
      throw err;
    }
  }
}

export const jobManager = new SwarmJobManager();
