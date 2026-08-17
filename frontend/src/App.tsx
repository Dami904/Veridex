import React, { useEffect, useMemo, useState, useRef } from 'react';
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

function useHashRouter() {
  const [hashParams, setHashParams] = useState(() => new URLSearchParams(window.location.hash.slice(1)));

  useEffect(() => {
    const handleHashChange = () => {
      setHashParams(new URLSearchParams(window.location.hash.slice(1)));
    };
    window.addEventListener('hashchange', handleHashChange);
    
    if (!window.location.hash) {
      window.location.hash = `query=${encodeURIComponent(TOPIC_PRESETS[0].query)}`;
    }
    
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  const setHash = (params: Record<string, string | undefined>) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== '') {
        searchParams.set(key, params[key]!);
      }
    });
    window.location.hash = searchParams.toString();
  };

  return { hashParams, setHash };
}

const ErrorAlert = ({ error, onDismiss }: { error: string; onDismiss: () => void }) => (
  <div className="surface-card border border-rose-500/30 rounded-lg p-4 text-xs font-mono text-rose-300 flex items-start justify-between gap-3">
    <div className="flex items-start gap-2">
      <ShieldAlert className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
      <div>
        <span className="font-bold text-rose-400 block mb-0.5">Literature Notice:</span>
        <span>{error}</span>
      </div>
    </div>
    <button onClick={onDismiss} className="text-rose-400 hover:text-rose-200 font-bold p-1">✕</button>
  </div>
);

const EmptyState = ({ onSelectPreset, onAddModal }: any) => (
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
        onClick={() => onSelectPreset(TOPIC_PRESETS[0].query)}
        className="px-3 py-1.5 rounded-lg bg-surface-card hover:bg-surface-elevated text-slate-200 text-xs font-mono border border-white/10"
      >
        Load Metformin Benchmark
      </button>
      <button
        onClick={() => onAddModal(true)}
        className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-mono font-semibold"
      >
        Ingest PDF or Abstract
      </button>
    </div>
  </div>
);

const SkeletonLoader = () => (
  <div className="space-y-4 animate-pulse">
    <div className="surface-panel rounded-xl p-6 h-48"></div>
    <div className="surface-panel rounded-xl p-6 h-72"></div>
  </div>
);

const ProgressPanel = ({
  agentStep,
  elapsedSeconds,
  progressPct,
  streamLogs
}: any) => {
  const getActiveStageIndex = (pct: number) => {
    if (pct < 25) return 0;
    if (pct < 60) return 1;
    if (pct < 85) return 2;
    return 3;
  };
  const activeStageIdx = getActiveStageIndex(progressPct);

  return (
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

      {/* Cold-Start Reassurance Notice */}
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
          {streamLogs.map((log: string, idx: number) => (
            <div key={idx} className="flex items-center gap-1.5 text-slate-300 font-mono">
              <Terminal className="w-3 h-3 text-emerald-400 shrink-0" />
              <span className="truncate">{log}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const App: React.FC = () => {
  const { hashParams, setHash } = useHashRouter();

  const isCompareMode = hashParams.has('compare') && hashParams.has('vs');

  const activeQuery1 = isCompareMode ? (hashParams.get('compare') || TOPIC_PRESETS[0].query) : (hashParams.get('query') || TOPIC_PRESETS[0].query);
  const activeQuery2 = isCompareMode ? (hashParams.get('vs') || TOPIC_PRESETS[1].query) : '';

  const [customInputQuery, setCustomInputQuery] = useState(activeQuery1);
  const [customInputQuery2, setCustomInputQuery2] = useState(activeQuery2);

  useEffect(() => {
    setCustomInputQuery(activeQuery1);
    setCustomInputQuery2(activeQuery2);
  }, [activeQuery1, activeQuery2]);

  // Query 1 States
  const [matrixData, setMatrixData] = useState<MatrixPayload | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isDiscovering, setIsDiscovering] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [agentStep, setAgentStep] = useState<string | null>(null);
  const [progressPct, setProgressPct] = useState<number>(0);
  const [streamLogs, setStreamLogs] = useState<string[]>([]);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Query 2 States
  const [matrixData2, setMatrixData2] = useState<MatrixPayload | null>(null);
  const [isLoading2, setIsLoading2] = useState(false);
  const [isDiscovering2, setIsDiscovering2] = useState(false);
  const [error2, setError2] = useState<string | null>(null);
  const [agentStep2, setAgentStep2] = useState<string | null>(null);
  const [progressPct2, setProgressPct2] = useState<number>(0);
  const [streamLogs2, setStreamLogs2] = useState<string[]>([]);
  const [elapsedSeconds2, setElapsedSeconds2] = useState(0);

  // Global States
  const [isArbitrating, setIsArbitrating] = useState(false);
  const [isSeeding, setIsSeeding] = useState(false);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isPrismaModalOpen, setIsPrismaModalOpen] = useState(false);
  const [isVectorModalOpen, setIsVectorModalOpen] = useState(false);
  const [dbStatus, setDbStatus] = useState<{ isCockroach: boolean; mode: string } | null>(null);

  const abortStreamRef = useRef<(() => void) | null>(null);
  const abortStreamRef2 = useRef<(() => void) | null>(null);
  const timerRef = useRef<any>(null);
  const timerRef2 = useRef<any>(null);
  const lastLoadedQuery1 = useRef<string>('');
  const lastLoadedQuery2 = useRef<string>('');

  const loadMatrix = async (
    queryToLoad: string,
    setMatrix: (d: MatrixPayload | null) => void,
    setErr: (e: string | null) => void,
    setLoad: (l: boolean) => void
  ) => {
    setLoad(true);
    setErr(null);
    try {
      const data = await fetchMatrix(queryToLoad);
      setMatrix(data);
    } catch (err: any) {
      console.warn('Matrix fetch notice:', err.message);
      setErr(
        'Insufficient peer-reviewed studies loaded yet for this research question. Click "Synthesize Literature Swarm" or "Seed Benchmark DB" to populate.'
      );
      setMatrix(null);
    } finally {
      setLoad(false);
    }
  };

  useEffect(() => {
    if (activeQuery1 && activeQuery1 !== lastLoadedQuery1.current && !isDiscovering) {
      lastLoadedQuery1.current = activeQuery1;
      loadMatrix(activeQuery1, setMatrixData, setError, setIsLoading);
    }
    if (isCompareMode && activeQuery2 && activeQuery2 !== lastLoadedQuery2.current && !isDiscovering2) {
      lastLoadedQuery2.current = activeQuery2;
      loadMatrix(activeQuery2, setMatrixData2, setError2, setIsLoading2);
    }
  }, [activeQuery1, activeQuery2, isCompareMode, isDiscovering, isDiscovering2]);

  useEffect(() => {
    if (isDiscovering) {
      setElapsedSeconds(0);
      timerRef.current = setInterval(() => setElapsedSeconds((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isDiscovering]);

  useEffect(() => {
    if (isDiscovering2) {
      setElapsedSeconds2(0);
      timerRef2.current = setInterval(() => setElapsedSeconds2((s) => s + 1), 1000);
    } else {
      clearInterval(timerRef2.current);
    }
    return () => clearInterval(timerRef2.current);
  }, [isDiscovering2]);

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

  const toggleCompareMode = () => {
    if (isCompareMode) {
      setHash({ query: activeQuery1 });
    } else {
      setHash({ compare: activeQuery1, vs: TOPIC_PRESETS[1].query });
    }
  };

  const handleSelectPreset = (presetQuery: string) => {
    if (isCompareMode) {
      setHash({ compare: presetQuery, vs: activeQuery2 });
    } else {
      setHash({ query: presetQuery });
    }
  };

  const handleDiscoverAndSynthesize = async (e?: React.FormEvent, isSecond: boolean = false) => {
    if (e) e.preventDefault();
    const queryToRun = isSecond ? customInputQuery2.trim() : customInputQuery.trim();
    if (!queryToRun) return;

    if (isSecond) {
      if (abortStreamRef2.current) abortStreamRef2.current();
    } else {
      if (abortStreamRef.current) abortStreamRef.current();
    }

    if (isCompareMode) {
      setHash({ compare: isSecond ? activeQuery1 : queryToRun, vs: isSecond ? queryToRun : activeQuery2 });
    } else {
      setHash({ query: queryToRun });
    }

    if (isSecond) {
      lastLoadedQuery2.current = queryToRun;
      setIsDiscovering2(true);
      setError2(null);
      setProgressPct2(8);
      setStreamLogs2([]);
      setAgentStep2('Harvesting PubMed Central & CrossRef registries...');
    } else {
      lastLoadedQuery1.current = queryToRun;
      setIsDiscovering(true);
      setError(null);
      setProgressPct(8);
      setStreamLogs([]);
      setAgentStep('Harvesting PubMed Central & CrossRef registries...');
    }

    const cancelStream = streamSynthesizeJob(
      queryToRun,
      (event) => {
        if (isSecond) {
          setProgressPct2(event.progress);
          setAgentStep2(event.step);
          if (event.log) setStreamLogs2((prev) => [...prev.slice(-8), event.log!]);
        } else {
          setProgressPct(event.progress);
          setAgentStep(event.step);
          if (event.log) setStreamLogs((prev) => [...prev.slice(-8), event.log!]);
        }
      },
      (matrix) => {
        if (isSecond) {
          setMatrixData2(matrix);
          setIsDiscovering2(false);
          setAgentStep2(null);
          setProgressPct2(100);
        } else {
          setMatrixData(matrix);
          setIsDiscovering(false);
          setAgentStep(null);
          setProgressPct(100);
        }
      },
      (err) => {
        if (isSecond) {
          setError2(err);
          setIsDiscovering2(false);
          setAgentStep2(null);
        } else {
          setError(err);
          setIsDiscovering(false);
          setAgentStep(null);
        }
      }
    );

    if (isSecond) {
      abortStreamRef2.current = cancelStream;
    } else {
      abortStreamRef.current = cancelStream;
    }
  };

  const handleArbitrate = async () => {
    setIsArbitrating(true);
    setError(null);
    if (isCompareMode) setError2(null);
    try {
      await triggerArbitration(activeQuery1);
      await loadMatrix(activeQuery1, setMatrixData, setError, setIsLoading);
      if (isCompareMode && activeQuery2) {
        await triggerArbitration(activeQuery2);
        await loadMatrix(activeQuery2, setMatrixData2, setError2, setIsLoading2);
      }
    } catch (err: any) {
      setError(err.message || 'Arbitration failed.');
    } finally {
      setIsArbitrating(false);
    }
  };

  const handleSeed = async () => {
    setIsSeeding(true);
    setError(null);
    if (isCompareMode) setError2(null);
    try {
      await seedDemoDataset();
      await loadMatrix(activeQuery1, setMatrixData, setError, setIsLoading);
      if (isCompareMode && activeQuery2) {
         await loadMatrix(activeQuery2, setMatrixData2, setError2, setIsLoading2);
      }
    } catch (err: any) {
      setError(err.message || 'Seeding failed.');
    } finally {
      setIsSeeding(false);
    }
  };

  // Memoized so these keep stable references across unrelated re-renders (e.g. the
  // once-a-second elapsed-time ticker below) — ContradictionGraph treats a new array
  // reference as new data and resets its force simulation to fresh random positions,
  // which without this made the graph reshuffle and re-animate every second.
  const allContradictions = useMemo(() => [
    ...(matrixData?.contradictions || []),
    ...(isCompareMode ? (matrixData2?.contradictions || []) : [])
  ], [matrixData?.contradictions, isCompareMode, matrixData2?.contradictions]);

  const allExtractions = useMemo(() => [
    ...(matrixData?.extractions || []),
    ...(isCompareMode ? (matrixData2?.extractions || []) : [])
  ], [matrixData?.extractions, isCompareMode, matrixData2?.extractions]);

  const allPapers = useMemo(() => [
    ...(matrixData?.papers || []),
    ...(isCompareMode ? (matrixData2?.papers || []) : [])
  ], [matrixData?.papers, isCompareMode, matrixData2?.papers]);

  return (
    <div className="min-h-screen bg-canvas text-slate-100 flex flex-col font-sans selection:bg-emerald-500/30 selection:text-emerald-200">
      <header className="sticky top-0 z-40 bg-surface-base/90 backdrop-blur-md hairline-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
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

          <div className="flex items-center gap-2">
            <button
              onClick={toggleCompareMode}
              className={`px-2.5 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 transition-colors ${
                isCompareMode
                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                  : 'bg-surface-card hover:bg-surface-elevated text-slate-300 border-white/10'
              }`}
              title="Toggle Compare Mode"
            >
              <GitBranch className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Compare</span>
            </button>

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

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-5">
        <section className="surface-panel rounded-xl p-5 relative overflow-hidden">
          <div className={`grid gap-4 ${isCompareMode ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
            <form onSubmit={(e) => handleDiscoverAndSynthesize(e, false)} className="flex flex-col sm:flex-row gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={customInputQuery}
                  onChange={(e) => setCustomInputQuery(e.target.value)}
                  placeholder="Enter scientific hypothesis (e.g. Does low-dose metformin...)"
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
                    <span>Synthesize</span>
                  </>
                )}
              </button>
            </form>

            {isCompareMode && (
              <form onSubmit={(e) => handleDiscoverAndSynthesize(e, true)} className="flex flex-col sm:flex-row gap-2.5">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customInputQuery2}
                    onChange={(e) => setCustomInputQuery2(e.target.value)}
                    placeholder="Enter secondary hypothesis for comparison..."
                    className="w-full bg-surface-base border border-white/10 rounded-lg pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 font-sans"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isDiscovering2 || !customInputQuery2.trim()}
                  className="px-4 py-2.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-xs sm:text-sm font-mono font-semibold flex items-center justify-center gap-2 transition-all active:scale-95 shrink-0"
                >
                  {isDiscovering2 ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Synthesizing ({progressPct2}%)...</span>
                    </>
                  ) : (
                    <>
                      <GitBranch className="w-4 h-4" />
                      <span>Synthesize</span>
                    </>
                  )}
                </button>
              </form>
            )}
          </div>

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

          <div className="flex flex-wrap items-center gap-2 mt-3.5 pt-3 hairline-t">
            <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wide flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-slate-400" /> Curated Benchmarks:
            </span>
            {TOPIC_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleSelectPreset(preset.query)}
                className={`px-2.5 py-1 rounded text-xs font-mono transition-all border flex items-center gap-1.5 ${
                  activeQuery1 === preset.query
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

          {isDiscovering && (
            <ProgressPanel
              isDiscovering={isDiscovering}
              agentStep={agentStep}
              elapsedSeconds={elapsedSeconds}
              progressPct={progressPct}
              streamLogs={streamLogs}
            />
          )}
          {isCompareMode && isDiscovering2 && (
            <ProgressPanel
              isDiscovering={isDiscovering2}
              agentStep={agentStep2}
              elapsedSeconds={elapsedSeconds2}
              progressPct={progressPct2}
              streamLogs={streamLogs2}
            />
          )}
        </section>

        {isCompareMode && matrixData?.aggregate && matrixData2?.aggregate && (
          <div className="surface-panel rounded-xl p-4 flex flex-col md:flex-row items-center justify-between border-t-4 border-t-emerald-500 gap-4">
            <div className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-emerald-400" />
              Comparison Summary
            </div>
            <div className="flex gap-6 text-xs font-mono">
              <div className="flex flex-col items-center">
                <span className="text-slate-400">Total Studies</span>
                <span className="text-slate-200">{matrixData.aggregate.total_studies} <span className="text-slate-500">vs</span> {matrixData2.aggregate.total_studies}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-slate-400">Positive Hits</span>
                <span className="text-slate-200 text-emerald-400">{matrixData.aggregate.positive_count} <span className="text-slate-500">vs</span> {matrixData2.aggregate.positive_count}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-slate-400">Confidence Tier</span>
                <span className="text-slate-200">{matrixData.aggregate.confidence_tier} <span className="text-slate-500">vs</span> {matrixData2.aggregate.confidence_tier}</span>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-slate-400">Avg Effect Size</span>
                <span className="text-slate-200">{matrixData.aggregate.avg_effect_size?.toFixed(2) ?? 'N/A'} <span className="text-slate-500">vs</span> {matrixData2.aggregate.avg_effect_size?.toFixed(2) ?? 'N/A'}</span>
              </div>
            </div>
          </div>
        )}

        {isCompareMode ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-5">
              <h2 className="text-sm font-mono font-bold text-emerald-400 border-b border-emerald-500/30 pb-2">Query A: {activeQuery1}</h2>
              {isLoading && !matrixData && <SkeletonLoader />}
              {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}
              {!isLoading && matrixData && (!matrixData.papers || matrixData.papers.length === 0) && (
                <EmptyState onSelectPreset={handleSelectPreset} onAddModal={setIsAddModalOpen} />
              )}
              {matrixData?.aggregate && <SynthesisCard aggregate={matrixData.aggregate} narrative={matrixData.narrative} />}
              {matrixData && <EvidenceMatrix papers={matrixData.papers || []} extractions={matrixData.extractions || []} />}
            </div>
            
            <div className="space-y-5">
              <h2 className="text-sm font-mono font-bold text-sky-400 border-b border-sky-500/30 pb-2">Query B: {activeQuery2}</h2>
              {isLoading2 && !matrixData2 && <SkeletonLoader />}
              {error2 && <ErrorAlert error={error2} onDismiss={() => setError2(null)} />}
              {!isLoading2 && matrixData2 && (!matrixData2.papers || matrixData2.papers.length === 0) && (
                <EmptyState onSelectPreset={(q: string) => setHash({compare: activeQuery1, vs: q})} onAddModal={setIsAddModalOpen} />
              )}
              {matrixData2?.aggregate && <SynthesisCard aggregate={matrixData2.aggregate} narrative={matrixData2.narrative} />}
              {matrixData2 && <EvidenceMatrix papers={matrixData2.papers || []} extractions={matrixData2.extractions || []} />}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {isLoading && !matrixData && <SkeletonLoader />}
            {error && <ErrorAlert error={error} onDismiss={() => setError(null)} />}
            {!isLoading && matrixData && (!matrixData.papers || matrixData.papers.length === 0) && (
              <EmptyState onSelectPreset={handleSelectPreset} onAddModal={setIsAddModalOpen} />
            )}
            {matrixData?.aggregate && <SynthesisCard aggregate={matrixData.aggregate} narrative={matrixData.narrative} />}
            {matrixData && <EvidenceMatrix papers={matrixData.papers || []} extractions={matrixData.extractions || []} />}
          </div>
        )}

        {(matrixData || matrixData2) && (allContradictions.length > 0 || allExtractions.length > 0) && (
          <div className="space-y-5">
            <ContradictionGraph
              contradictions={allContradictions}
              extractions={allExtractions}
              papers={allPapers}
            />
            <ContradictionsPanel
              contradictions={allContradictions}
              onReArbitrate={handleArbitrate}
              isArbitrating={isArbitrating}
            />
          </div>
        )}

        {matrixData?.usage && <CostMonitor usage={matrixData.usage} />}
      </main>

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
              onClick={() => {
                loadMatrix(activeQuery1, setMatrixData, setError, setIsLoading);
                if (isCompareMode) loadMatrix(activeQuery2, setMatrixData2, setError2, setIsLoading2);
              }}
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

      <AddPaperModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onPaperAdded={() => {
          loadMatrix(activeQuery1, setMatrixData, setError, setIsLoading);
          if (isCompareMode) loadMatrix(activeQuery2, setMatrixData2, setError2, setIsLoading2);
        }}
        currentResearchQuery={activeQuery1}
      />

      <PrismaExportModal
        isOpen={isPrismaModalOpen}
        onClose={() => setIsPrismaModalOpen(false)}
        researchQuery={activeQuery1}
      />

      <VectorSearchModal
        isOpen={isVectorModalOpen}
        onClose={() => setIsVectorModalOpen(false)}
      />
    </div>
  );
};
