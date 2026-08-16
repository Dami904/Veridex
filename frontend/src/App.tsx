import React, { useEffect, useState, useRef } from 'react';
import {
  fetchMatrix,
  triggerArbitration,
  seedDemoDataset,
  streamSynthesizeJob,
  MatrixPayload,
} from './api/client';
import { SynthesisCard } from './components/SynthesisCard';
import { EvidenceMatrix } from './components/EvidenceMatrix';
import { ContradictionsPanel } from './components/ContradictionsPanel';
import { ContradictionGraph } from './components/ContradictionGraph';
import { AddPaperModal } from './components/AddPaperModal';
import { PrismaExportModal } from './components/PrismaExportModal';
import { VectorSearchModal } from './components/VectorSearchModal';
import { CostMonitor } from './components/CostMonitor';
import {
  Layers,
  Database,
  Plus,
  RefreshCw,
  Search,
  BookOpen,
  FileText,
  Loader2,
  Terminal,
  Activity,
  ShieldAlert,
  CheckCircle2,
  GitBranch,
  ExternalLink,
} from 'lucide-react';

const TOPIC_PRESETS = [
  {
    label: 'Metformin in Longevity',
    query: 'Does Low-Dose Metformin Extend Lifespan in Non-Diabetic Mammals?',
    tag: 'GERONTOLOGY',
  },
  {
    label: 'GLP-1 in Neuroinflammation',
    query: 'Do GLP-1 Receptor Agonists Reduce Neuroinflammation and Cognitive Decline?',
    tag: 'NEUROLOGY',
  },
  {
    label: 'Rapamycin in Longevity',
    query: 'Does Intermittent Rapamycin Extend Longevity Without Immunosuppression?',
    tag: 'IMMUNOLOGY',
  },
];

const PIPELINE_STAGES = [
  { key: 'discovery', label: '1. Discovery & Harvest', desc: 'PubMed & CrossRef' },
  { key: 'extraction', label: '2. Claim Extraction', desc: 'Bedrock Titan & Claude' },
  { key: 'arbitration', label: '3. Arbitration', desc: 'Confounder Isolation' },
  { key: 'synthesis', label: '4. Meta-Synthesis', desc: 'Deterministic Tier' },
];

export const App: React.FC = () => {
  const [researchQuery, setResearchQuery] = useState(TOPIC_PRESETS[0].query);
  const [customInputQuery, setCustomInputQuery] = useState(TOPIC_PRESETS[0].query);
  const [matrixData, setMatrixData] = useState<MatrixPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [isArbitrating, setIsArbitrating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPrismaModalOpen, setIsPrismaModalOpen] = useState(false);
  const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentStep, setAgentStep] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [streamLogs, setStreamLogs] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const abortStreamRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<any>(null);

  const loadMatrix = async (queryToLoad: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMatrix(queryToLoad);
      setMatrixData(data);
    } catch (err: any) {
      console.warn('Matrix fetch notice:', err.message);
      setError(
        'Insufficient peer-reviewed studies loaded yet for this research question. Click "Synthesize Literature Swarm" or "Seed Benchmark DB" to populate.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix(researchQuery);
  }, [researchQuery]);

  // Elapsed timer during discovery
  useEffect(() => {
    if (isDiscovering) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => {
        setElapsedSeconds((s) => s + 1);
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isDiscovering]);

  const handleSelectPreset = (presetQuery: string) => {
    setResearchQuery(presetQuery);
    setCustomInputQuery(presetQuery);
  };

  const handleDiscoverAndSynthesize = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const queryToRun = customInputQuery.trim();
    if (!queryToRun) return;

    if (abortStreamRef.current) {
      abortStreamRef.current();
    }

    setIsDiscovering(true);
    setError(null);
    setProgressPct(8);
    setStreamLogs([]);
    setAgentStep('Harvesting PubMed Central & CrossRef registries...');
    setResearchQuery(queryToRun);

    const cancelStream = streamSynthesizeJob(
      queryToRun,
      (event) => {
        setProgressPct(event.progress);
        setAgentStep(event.step);
        if (event.log) {
          setStreamLogs((prev) => [...prev.slice(-8), event.log!]);
        }
      },
      (matrix) => {
        setMatrixData(matrix);
        setIsDiscovering(false);
        setAgentStep(null);
        setProgressPct(100);
      },
      (err) => {
        setError(err);
        setIsDiscovering(false);
        setAgentStep(null);
      }
    );

    abortStreamRef.current = cancelStream;
  };

  const handleArbitrate = async () => {
    setIsArbitrating(true);
    setError(null);
    try {
      await triggerArbitration(researchQuery);
      await loadMatrix(researchQuery);
    } catch (err: any) {
      setError(err.message || 'Arbitration failed.');
    } finally {
      setIsArbitrating(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    setError(null);
    try {
      await seedDemoDataset();
      await loadMatrix(researchQuery);
    } catch (err: any) {
      setError(err.message || 'Seeding failed.');
    } finally {
      setIsSeeding(false);
    }
  };

  const [dbStatus, setDbStatus] = useState<{ isCockroach: boolean; mode: string } | null>(null);

  useEffect(() => {
    const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:4000');
    fetch(`${API_BASE}/health`)
      .then((r) => r.json())
      .then((d) => {
        setDbStatus({
          isCockroach: Boolean(d.cockroachdb_configured),
          mode: d.cockroachdb_configured ? 'CockroachDB Cloud' : 'In-Memory Store',
        });
      })
      .catch(() => {});
  }, []);

  const getActiveStageIndex = (pct: number) => {
    if (pct < 25) return 0;
    if (pct < 60) return 1;
    if (pct < 85) return 2;
    return 3;
  };

  const activeStageIdx = getActiveStageIndex(progressPct);

  return (
    <div className="min-h-screen bg-canvas text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      {/* Top Navigation / App Shell Header */}
      <header className="sticky top-0 z-40 bg-surface-base/90 backdrop-blur-md hairline-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
          {/* Logo & Product Identity */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Layers className="w-4 h-4" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-slate-100 flex items-center gap-2">
                Veridex
                <span className="text-[10px] font-mono font-semibold uppercase px-1.5 py-0.5 rounded bg-surface-elevated text-emerald-400 border border-emerald-500/25">
                  Consensus Engine
                </span>
              </span>

              {/* Live DB Connection Badge */}
              {dbStatus && (
                <span
                  className={`hidden md:inline-flex items-center gap-1.5 text-[10px] font-mono px-2 py-0.5 rounded border ${
                    dbStatus.isCockroach
                      ? 'bg-emerald-950/40 text-emerald-400 border-emerald-500/25'
                      : 'bg-amber-950/40 text-amber-400 border-amber-500/25'
                  }`}
                  title={
                    dbStatus.isCockroach
                      ? 'Live CockroachDB Distributed Cloud Cluster Connected'
                      : 'Running in In-Memory Vector Mode for local testing'
                  }
                >
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      dbStatus.isCockroach ? 'bg-emerald-400' : 'bg-amber-400'
                    }`}
                  />
                  {dbStatus.mode}
                </span>
              )}
            </div>
          </div>

          {/* Action Bar Hierarchy */}
          <div className="flex items-center gap-2">
            {/* Secondary Utilities */}
            <button
              onClick={() => setIsVectorModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-surface-card hover:bg-surface-elevated text-slate-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
              title="Cosine vector similarity search over CockroachDB"
            >
              <Search className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">Vector Search</span>
            </button>

            <button
              onClick={() => setIsPrismaModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-surface-card hover:bg-surface-elevated text-slate-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors"
              title="Export PRISMA 2020 Markdown & Citation files (BibTeX/RIS)"
            >
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">PRISMA Export</span>
            </button>

            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="px-2.5 py-1.5 rounded-lg border border-white/10 bg-surface-card hover:bg-surface-elevated text-slate-300 text-xs font-mono font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Reset and populate CockroachDB with peer-reviewed benchmark datasets"
            >
              <Database className="w-3.5 h-3.5 text-slate-400" />
              <span className="hidden sm:inline">{isSeeding ? 'Seeding...' : 'Seed DB'}</span>
            </button>

            {/* Primary Action */}
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-semibold flex items-center gap-1.5 transition-all shadow-sm active:scale-95 ml-1"
            >
              <Plus className="w-3.5 h-3.5 stroke-[3]" />
              <span>Ingest Study</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-5">
        {/* Research Query Search Box */}
        <section className="surface-panel rounded-xl p-5 relative overflow-hidden">
          <form onSubmit={handleDiscoverAndSynthesize} className="flex flex-col sm:flex-row gap-2.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customInputQuery}
                onChange={(e) => setCustomInputQuery(e.target.value)}
                placeholder="Enter scientific hypothesis (e.g. Does low-dose metformin extend lifespan in non-diabetic mammals?)..."
                className="w-full bg-surface-base border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
              />
            </div>
            <button
              type="submit"
              disabled={isDiscovering || !customInputQuery.trim()}
              className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs sm:text-sm font-mono font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Synthesizing ({progressPct}%)...</span>
                </>
              ) : (
                <>
                  <GitBranch className="w-4 h-4" />
                  <span>Synthesize Literature Swarm</span>
                </>
              )}
            </button>
          </form>

          {/* Active Scholarly Registries Indicator */}
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 text-[11px] font-mono text-slate-400">
            <span className="font-semibold text-slate-300">Live Registries:</span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-card border border-white/5 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> NCBI PubMed Central
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-card border border-white/5 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400"></span> CrossRef (Nature / Lancet / JAMA)
            </span>
            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-surface-card border border-white/5 text-slate-300">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400"></span> Europe PMC (14M+ Articles)
            </span>
          </div>

          {/* Preset Chips (Saved Queries / Benchmark Shortcuts) */}
          <div className="flex flex-wrap items-center gap-2 mt-3.5 pt-3 hairline-t">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Curated Benchmarks:
            </span>
            {TOPIC_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleSelectPreset(preset.query)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all border flex items-center gap-1.5 ${
                  researchQuery === preset.query
                    ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                    : 'bg-surface-base text-slate-400 border-white/5 hover:text-slate-200 hover:border-white/10'
                }`}
              >
                <span className="text-[9px] uppercase px-1 py-0.2 rounded bg-surface-card text-slate-400 font-semibold">
                  [{preset.tag}]
                </span>
                <span>{preset.label}</span>
              </button>
            ))}
          </div>

          {/* Multi-Stage Background Execution Progress Panel */}
          {isDiscovering && (
            <div className="mt-4 p-4 rounded-lg surface-inset border border-emerald-500/30 text-xs font-mono animate-fade-in space-y-3">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>{agentStep || 'Swarm Orchestration Active...'}</span>
                </div>
                <div className="flex items-center gap-2 text-slate-400">
                  <span>Elapsed: {elapsedSeconds}s</span>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold tabular-nums">{progressPct}%</span>
                </div>
              </div>

              {/* 4-Stage Progress Pipeline Indicator */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
                {PIPELINE_STAGES.map((stage, sIdx) => {
                  const isDone = activeStageIdx > sIdx;
                  const isCurrent = activeStageIdx === sIdx;
                  return (
                    <div
                      key={stage.key}
                      className={`p-2 rounded border transition-all ${
                        isDone
                          ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-300'
                          : isCurrent
                          ? 'bg-surface-card border-emerald-500 text-slate-100 shadow-sm'
                          : 'surface-base border-white/5 text-slate-500'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase mb-0.5">
                        <span>{stage.label}</span>
                        {isDone ? (
                          <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                        ) : isCurrent ? (
                          <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                        ) : null}
                      </div>
                      <div className="text-[9px] text-slate-400 font-normal">{stage.desc}</div>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar */}
              <div className="w-full bg-surface-card rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              {/* Cold-Start Reassurance Notice if > 12s */}
              {elapsedSeconds > 12 && (
                <div className="text-[11px] text-amber-300/80 bg-amber-950/20 border border-amber-500/20 rounded p-2 flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400 shrink-0" />
                  <span>
                    Free-tier server cold start & deep PubMed harvesting in progress. Full pipeline extracts real studies with zero arithmetic fabrication.
                  </span>
                </div>
              )}

              {/* Real-time Streaming Terminal Log Feed */}
              {streamLogs.length > 0 && (
                <div className="pt-2 hairline-t text-[11px] text-slate-400 space-y-1 max-h-28 overflow-y-auto">
                  {streamLogs.map((log, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-slate-300 font-mono">
                      <Terminal className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{log}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Error / Refusal Alert */}
        {error && (
          <div className="surface-card border border-rose-500/30 rounded-lg p-4 text-xs font-mono text-rose-300 flex items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold text-rose-400 block mb-0.5">Literature Notice:</span>
                <span>{error}</span>
              </div>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-rose-400 hover:text-rose-200 font-bold p-1"
            >
              ✕
            </button>
          </div>
        )}

        {/* Skeleton Loader during initial cold starts */}
        {isLoading && !matrixData && (
          <div className="space-y-4 animate-pulse">
            <div className="surface-panel rounded-xl p-6 h-48"></div>
            <div className="surface-panel rounded-xl p-6 h-72"></div>
          </div>
        )}

        {/* Zero-Fabrication Scientific Refusal / Empty State */}
        {!isLoading && matrixData && (!matrixData.papers || matrixData.papers.length === 0) && (
          <div className="surface-panel rounded-xl p-8 text-center border border-white/10 space-y-3">
            <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto opacity-90" />
            <h3 className="text-base font-bold text-slate-100 font-mono">
              Insufficient Literature in Indexed Registries
            </h3>
            <p className="text-xs text-slate-400 max-w-lg mx-auto leading-relaxed">
              Veridex strictly enforces zero-fabrication guarantees. No peer-reviewed studies matched this specific hypothesis in indexed PubMed Central or benchmark memory.
            </p>
            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <button
                onClick={() => handleSelectPreset(TOPIC_PRESETS[0].query)}
                className="px-3 py-1.5 rounded-lg bg-surface-card hover:bg-surface-elevated text-slate-200 text-xs font-mono border border-white/10"
              >
                Load Metformin Benchmark
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-semibold"
              >
                Ingest PDF or Abstract
              </button>
            </div>
          </div>
        )}

        {/* 1. Synthesis Verdict Stat Block */}
        {matrixData?.aggregate && (
          <SynthesisCard aggregate={matrixData.aggregate} narrative={matrixData.narrative} />
        )}

        {/* 2. Interactive Contradiction & Confounder Topology Graph */}
        {matrixData && (
          <ContradictionGraph
            contradictions={matrixData.contradictions || []}
            extractions={matrixData.extractions || []}
            papers={matrixData.papers || []}
          />
        )}

        {/* 3. Contradictions & Arbitration Companion Panel */}
        {matrixData && (
          <ContradictionsPanel
            contradictions={matrixData.contradictions || []}
            onReArbitrate={handleArbitrate}
            isArbitrating={isArbitrating}
          />
        )}

        {/* 4. Structured Evidence Matrix Table */}
        {matrixData && (
          <EvidenceMatrix
            papers={matrixData.papers || []}
            extractions={matrixData.extractions || []}
          />
        )}

        {/* 5. Telemetry & Observability Cost Monitor */}
        {matrixData?.usage && <CostMonitor usage={matrixData.usage} />}
      </main>

      {/* Footer */}
      <footer className="hairline-t bg-canvas py-5 mt-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[11px] font-mono text-slate-400 gap-3">
          <div className="flex items-center gap-2">
            <span>Veridex Consensus Engine</span>
            <span>•</span>
            <span>CockroachDB Vector Memory</span>
            <span>•</span>
            <span>NCBI PubMed Central E-Utilities</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => loadMatrix(researchQuery)}
              className="hover:text-slate-300 flex items-center gap-1 transition-colors"
            >
              <RefreshCw className="w-3 h-3" /> Refresh
            </button>
            <a
              href="https://github.com/Dami904/Veridex"
              target="_blank"
              rel="noreferrer"
              className="hover:text-slate-300 transition-colors flex items-center gap-1"
            >
              GitHub Source <ExternalLink className="w-2.5 h-2.5" />
            </a>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AddPaperModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onPaperAdded={() => loadMatrix(researchQuery)}
        currentResearchQuery={researchQuery}
      />

      <PrismaExportModal
        isOpen={isPrismaModalOpen}
        onClose={() => setIsPrismaModalOpen(false)}
        researchQuery={researchQuery}
      />

      <VectorSearchModal
        isOpen={isVectorModalOpen}
        onClose={() => setIsVectorModalOpen(false)}
      />
    </div>
  );
};
