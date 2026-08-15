export interface Paper {
  id: string;
  doi: string | null;
  pmid?: string | null;
  title: string;
  journal: string | null;
  year: number | null;
  abstract_text: string;
  s3_pdf_url: string | null;
  provenance?: 'PUBMED_CENTRAL' | 'CURATED_BENCHMARK' | 'USER_UPLOAD';
  created_at: string;
  distance?: number;
  similarity_pct?: number;
}

export interface StudyExtraction {
  id: string;
  paper_id: string;
  research_query: string;
  sample_size: number | null;
  model_system: string | null;
  intervention: string | null;
  control: string | null;
  primary_metric: string | null;
  effect_direction: 'POSITIVE' | 'NEGATIVE' | 'NEUTRAL' | 'MIXED' | null;
  effect_size: number | null;
  p_value: number | null;
  risk_of_bias: 'LOW' | 'MODERATE' | 'HIGH' | null;
  evidence_snippet: string | null;
  extracted_by_agent: string;
  created_at: string;
  paper_title?: string;
  paper_year?: number;
  journal?: string;
  doi?: string | null;
  pmid?: string | null;
  provenance?: 'PUBMED_CENTRAL' | 'CURATED_BENCHMARK' | 'USER_UPLOAD';
}

export interface Contradiction {
  id: string;
  research_query: string;
  paper_a_id: string;
  paper_b_id: string;
  paper_a_title?: string;
  paper_b_title?: string;
  conflict_summary: string;
  isolated_confounder: string | null;
  confidence_tier: 'HIGH' | 'MODERATE' | 'LOW';
  status: 'OPEN' | 'RESOLVED' | 'IRRECONCILABLE';
  created_at: string;
}

export interface Aggregate {
  research_query: string;
  total_studies: number;
  positive_count: number;
  negative_count: number;
  neutral_or_mixed_count: number;
  avg_effect_size: number | null;
  significant_count: number;
  risk_of_bias_breakdown: {
    LOW: number;
    MODERATE: number;
    HIGH: number;
  };
  open_contradictions: number;
  resolved_contradictions: number;
  confidence_tier: 'HIGH' | 'MODERATE' | 'LOW';
}

export interface MatrixPayload {
  success: boolean;
  research_query: string;
  papers: Paper[];
  extractions: StudyExtraction[];
  contradictions: Contradiction[];
  aggregate: Aggregate;
  narrative: string;
  usage?: {
    totalTokens: number;
    estimatedCostUsd: number;
    latencyMs: number;
  };
}

export interface VectorSearchResult {
  success: boolean;
  query: string;
  total_matches: number;
  results: Paper[];
}

export interface PrismaExportResult {
  success: boolean;
  research_query: string;
  markdown_report: string;
  matrix_data: MatrixPayload;
}

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:4000');

export async function fetchMatrix(query: string): Promise<MatrixPayload> {
  const res = await fetch(`${API_BASE}/research-queries/${encodeURIComponent(query)}/matrix`);
  if (!res.ok) throw new Error(`Matrix request failed: ${res.statusText}`);
  return res.json();
}

export async function addPaper(paper: {
  title: string;
  journal?: string;
  year?: number;
  doi?: string;
  abstract_text: string;
  research_query: string;
  s3_pdf_url?: string;
}) {
  const res = await fetch(`${API_BASE}/papers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(paper),
  });
  if (!res.ok) throw new Error(`Add paper failed: ${res.statusText}`);
  return res.json();
}

export async function uploadPdfPaper(file: File, research_query: string) {
  const arrayBuffer = await file.arrayBuffer();
  const res = await fetch(`${API_BASE}/papers/upload-pdf?research_query=${encodeURIComponent(research_query)}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/pdf',
      'X-Research-Query': encodeURIComponent(research_query),
    },
    body: arrayBuffer,
  });
  if (!res.ok) throw new Error(`PDF upload and parse failed: ${res.statusText}`);
  return res.json();
}

export async function triggerArbitration(query: string) {
  const res = await fetch(`${API_BASE}/research-queries/${encodeURIComponent(query)}/arbitrate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Arbitration failed: ${res.statusText}`);
  return res.json();
}

export async function discoverAndSynthesize(research_query: string) {
  const res = await fetch(`${API_BASE}/research-queries/discover-and-synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ research_query }),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.message || `Literature discovery & synthesis failed: ${res.statusText}`);
  }
  return res.json();
}

/**
 * Resilient Real-Time SSE Stream with Instant Direct HTTP Fallback
 */
export function streamSynthesizeJob(
  research_query: string,
  onProgress: (event: { progress: number; step: string; log?: string }) => void,
  onComplete: (matrix: MatrixPayload) => void,
  onError: (error: string) => void
): () => void {
  let eventSource: EventSource | null = null;
  let isDone = false;
  let isAborted = false;

  const runDirectFallback = () => {
    if (isDone || isAborted) return;
    onProgress({
      progress: 45,
      step: 'Querying PubMed Central & Synthesizing Consensus...',
      log: `Executing deep analysis for "${research_query}"`,
    });
    discoverAndSynthesize(research_query)
      .then((res) => {
        if (!isDone && !isAborted) {
          isDone = true;
          eventSource?.close();
          onComplete(res.matrix);
        }
      })
      .catch((err) => {
        if (!isDone && !isAborted) {
          isDone = true;
          eventSource?.close();
          onError(err.message);
        }
      });
  };

  // Launch fallback timeout if SSE is blocked or buffered by proxy
  const fallbackTimer = setTimeout(() => {
    if (!isDone && !isAborted) {
      runDirectFallback();
    }
  }, 4000);

  fetch(`${API_BASE}/jobs/synthesize`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ research_query }),
  })
    .then(async (res) => {
      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.message || `Job creation failed: ${res.statusText}`);
      }
      return res.json();
    })
    .then((data) => {
      if (isAborted || isDone) return;
      const streamUrl = `${API_BASE}/jobs/${data.jobId}/stream`;
      eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (e) => {
        try {
          const payload = JSON.parse(e.data);

          if (payload.type === 'init') {
            if (payload.job?.status === 'COMPLETED' && payload.job?.matrix) {
              isDone = true;
              clearTimeout(fallbackTimer);
              eventSource?.close();
              onComplete(payload.job.matrix);
              return;
            }
            if (payload.job?.status === 'FAILED') {
              isDone = true;
              clearTimeout(fallbackTimer);
              eventSource?.close();
              onError(payload.job.error || 'Job failed');
              return;
            }
            if (payload.job?.currentStep) {
              onProgress({
                progress: payload.job.progress || 15,
                step: payload.job.currentStep,
              });
            }
          } else if (payload.type === 'progress') {
            onProgress({
              progress: payload.progress || 20,
              step: payload.step || 'Analyzing literature...',
              log: payload.log,
            });
          } else if (payload.type === 'complete') {
            isDone = true;
            clearTimeout(fallbackTimer);
            eventSource?.close();
            onComplete(payload.matrix);
          } else if (payload.type === 'error') {
            isDone = true;
            clearTimeout(fallbackTimer);
            eventSource?.close();
            onError(payload.error || 'Swarm execution failed');
          }
        } catch (err: any) {
          console.error('[SSE Parse Error]', err);
        }
      };

      eventSource.onerror = () => {
        eventSource?.close();
        if (!isDone && !isAborted) {
          runDirectFallback();
        }
      };
    })
    .catch(() => {
      if (!isDone && !isAborted) {
        runDirectFallback();
      }
    });

  return () => {
    isAborted = true;
    clearTimeout(fallbackTimer);
    eventSource?.close();
  };
}

export async function searchVectorPapers(query: string, limit = 6): Promise<VectorSearchResult> {
  const res = await fetch(`${API_BASE}/papers/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, limit }),
  });
  if (!res.ok) throw new Error(`Vector search failed: ${res.statusText}`);
  return res.json();
}

export async function fetchPrismaReport(query: string): Promise<PrismaExportResult> {
  const res = await fetch(`${API_BASE}/research-queries/${encodeURIComponent(query)}/export/prisma`);
  if (!res.ok) throw new Error(`PRISMA export failed: ${res.statusText}`);
  return res.json();
}

export function downloadBibtex(query: string) {
  window.open(`${API_BASE}/research-queries/${encodeURIComponent(query)}/export/bibtex`, '_blank');
}

export function downloadRis(query: string) {
  window.open(`${API_BASE}/research-queries/${encodeURIComponent(query)}/export/ris`, '_blank');
}

export async function seedDemoDataset() {
  const res = await fetch(`${API_BASE}/seed`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) throw new Error(`Seed failed: ${res.statusText}`);
  return res.json();
}
