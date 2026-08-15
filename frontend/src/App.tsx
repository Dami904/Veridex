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
  PlusCircle,
  RefreshCw,
  Search,
  BookOpen,
  Sparkles,
  FileText,
  Loader2,
  Terminal,
  Activity,
} from 'lucide-react';

const TOPIC_PRESETS = [
  {
    label: 'Metformin in Longevity',
    query: 'Does Low-Dose Metformin Extend Lifespan in Non-Diabetic Mammals?',
    tag: 'Gerontology',
  },
  {
    label: 'GLP-1 in Neuroinflammation',
    query: 'Do GLP-1 Receptor Agonists Reduce Neuroinflammation and Cognitive Decline?',
    tag: 'Neurology',
  },
  {
    label: 'Rapamycin in Longevity',
    query: 'Does Intermittent Rapamycin Extend Longevity Without Immunosuppression?',
    tag: 'Immunology',
  },
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
  const abortStreamRef = useRef<(() => void) | null>(null);

  const loadMatrix = async (queryToLoad: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchMatrix(queryToLoad);
      setMatrixData(data);
    } catch (err: any) {
      console.warn('Matrix fetch notice:', err.message);
      setError('No papers loaded yet for this research question. Click "Search PubMed & Ingest" or "Seed Demo Dataset" to populate.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadMatrix(researchQuery);
  }, [researchQuery]);

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
    setProgressPct(5);
    setStreamLogs([]);
    setAgentStep('Phase 1: Initializing Swarm Orchestrator & PubMed Discovery...');
    setResearchQuery(queryToRun);

    const cancelStream = streamSynthesizeJob(
      queryToRun,
      (event) => {
        setProgressPct(event.progress);
        setAgentStep(event.step);
        if (event.log) {
          setStreamLogs((prev) => [...prev.slice(-6), event.log!]);
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
      setError(err.message || 'Arbitration failed');
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
      setError(err.message || 'Seeding failed');
    } finally {
      setIsSeeding(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Top Navbar */}
      <header className="sticky top-0 z-40 bg-slate-900/80 backdrop-blur-md border-b border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shadow-lg shadow-emerald-500/10">
              <Layers className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                Veridex
                <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/50">
                  Consensus Engine
                </span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setIsVectorModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Vector Search</span>
            </button>

            <button
              onClick={() => setIsPrismaModalOpen(true)}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">Export PRISMA</span>
            </button>

            <button
              onClick={handleSeed}
              disabled={isSeeding}
              className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
              title="Reset and populate CockroachDB with peer-reviewed benchmark datasets"
            >
              <Database className="w-3.5 h-3.5 text-blue-400" />
              <span className="hidden sm:inline">{isSeeding ? 'Seeding...' : 'Seed DB'}</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/20 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Add Paper</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex-1 w-full space-y-6">
        {/* Research Query Search Hero Bar */}
        <section className="bg-slate-900/60 border border-slate-800 rounded-2xl p-5 sm:p-6 shadow-xl backdrop-blur-md">
          <form onSubmit={handleDiscoverAndSynthesize} className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customInputQuery}
                onChange={(e) => setCustomInputQuery(e.target.value)}
                placeholder="Enter any scientific or medical question (e.g. Does Metformin extend mammalian lifespan?)..."
                className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors font-medium"
              />
            </div>
            <button
              type="submit"
              disabled={isDiscovering || !customInputQuery.trim()}
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-500/20 shrink-0"
            >
              {isDiscovering ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Swarm Streaming...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Search PubMed & Synthesize</span>
                </>
              )}
            </button>
          </form>

          {/* Preset Chips */}
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
            <span className="text-xs text-slate-400 font-medium flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5 text-emerald-400" /> Presets:
            </span>
            {TOPIC_PRESETS.map((preset) => (
              <button
                key={preset.label}
                onClick={() => handleSelectPreset(preset.query)}
                className={`px-3 py-1 rounded-lg text-xs transition-all font-medium border ${
                  researchQuery === preset.query
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40 shadow-sm'
                    : 'bg-slate-950/40 text-slate-400 border-slate-800 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Live Agent SSE Execution Status Banner */}
          {isDiscovering && agentStep && (
            <div className="mt-4 p-4 rounded-xl bg-slate-950 border border-emerald-500/30 text-xs animate-fade-in shadow-inner">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 text-emerald-400 font-semibold">
                  <Activity className="w-4 h-4 animate-pulse" />
                  <span>{agentStep}</span>
                </div>
                <span className="font-mono text-emerald-400 font-bold">{progressPct}%</span>
              </div>
              
              {/* Progress Bar */}
              <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden my-2">
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${progressPct}%` }}
                ></div>
              </div>

              {/* Real-time SSE Logs */}
              {streamLogs.length > 0 && (
                <div className="mt-2.5 pt-2 border-t border-slate-800/80 font-mono text-[11px] text-slate-400 space-y-1">
                  {streamLogs.map((log, idx) => (
                    <div key={idx} className="flex items-center gap-1.5 text-slate-300">
                      <Terminal className="w-3 h-3 text-emerald-400 shrink-0" />
                      <span className="truncate">{log}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </section>

        {/* Error Alert */}
        {error && (
          <div className="bg-rose-950/40 border border-rose-800/60 rounded-xl p-4 text-xs text-rose-300 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-200 font-bold">
              ✕
            </button>
          </div>
        )}

        {/* Skeleton Loader during initial cold starts */}
        {isLoading && !matrixData && (
          <div className="space-y-6 animate-pulse">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-56"></div>
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 h-80"></div>
          </div>
        )}

        {/* Synthesis Verdict Card */}
        {matrixData?.aggregate && (
          <SynthesisCard
            aggregate={matrixData.aggregate}
            narrative={matrixData.narrative}
          />
        )}

        {/* Interactive Contradiction & Confounder Topology Graph */}
        {matrixData && (
          <ContradictionGraph
            contradictions={matrixData.contradictions || []}
            extractions={matrixData.extractions || []}
            papers={matrixData.papers || []}
          />
        )}

        {/* Contradictions & Arbitration Section */}
        {matrixData && (
          <ContradictionsPanel
            contradictions={matrixData.contradictions || []}
            onReArbitrate={handleArbitrate}
            isArbitrating={isArbitrating}
          />
        )}

        {/* Structured Evidence Matrix Table */}
        {matrixData && (
          <EvidenceMatrix
            papers={matrixData.papers || []}
            extractions={matrixData.extractions || []}
          />
        )}

        {/* Execution Cost & Observability Monitor */}
        {matrixData?.usage && <CostMonitor usage={matrixData.usage} />}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 mt-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-4">
          <div className="flex items-center gap-2">
            <span>Veridex Scientific Consensus Engine</span>
            <span>•</span>
            <span>CockroachDB Distributed Vector Memory</span>
            <span>•</span>
            <span>NCBI PubMed E-Utilities</span>
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
              className="hover:text-slate-300 transition-colors"
            >
              GitHub Source
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
