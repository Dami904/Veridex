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
      // 1. Discovery Phase (PubMed / Curated Registry)
      this.updateProgress(jobId, 15, 'Phase 1: Querying PubMed & Literature Discovery Engine...', `Searching peer-reviewed biomedical literature for "${job.researchQuery}"`);
      const discovery = await discoverLiteratureForQuery(job.researchQuery);

      if (discovery.source === 'insufficient_literature' || (discovery.papers || []).length === 0) {
        throw new Error(discovery.message || `Insufficient peer-reviewed studies found on PubMed for "${job.researchQuery}". Veridex strictly refuses to fabricate literature.`);
      }

      const papers = discovery.papers || [];
      const targetQuery = discovery.research_query || job.researchQuery;

      this.updateProgress(jobId, 30, `Phase 1: Retrieved ${papers.length} peer-reviewed studies (${discovery.source})`, `Discovered ${papers.length} papers from ${discovery.source}`);

      // 2. Extractor Agent Phase — Bounded Parallel Concurrent Processing
      this.updateProgress(jobId, 40, `Phase 2: Extractor Agent analyzing ${papers.length} studies in parallel...`, 'Generating Bedrock Titan V2 1024-dim embeddings & extracting structured clinical parameters');

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

      // 3. Arbiter Agent Phase (Pairwise Confounder Detection)
      this.updateProgress(jobId, 75, 'Phase 3: Arbiter Agent executing adversarial pairwise analysis...', 'Evaluating opposing study cohorts to isolate methodological confounders');
      const arbRes = await handleArbitrate({
        pathParameters: { query: targetQuery },
      });
      const arbBody = JSON.parse(arbRes.body);
      const arbitratedCount = (arbBody.new_contradictions || []).length;

      this.updateProgress(
        jobId,
        88,
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
