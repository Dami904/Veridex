import React, { useEffect, useState } from 'react';
import {
  fetchMatrix,
  triggerArbitration,
  seedDemoDataset,
  discoverAndSynthesize,
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
  CheckCircle2,
  Share2,
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
    tag: 'Neuroscience',
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
    if (!customInputQuery.trim()) return;

    setIsDiscovering(true);
    setError(null);
    setAgentStep('Phase 1: Searching PubMed Central & Ingesting Papers...');

    try {
      setResearchQuery(customInputQuery.trim());
      const res = await discoverAndSynthesize(customInputQuery.trim());
      
      setAgentStep('Phase 2: Adversarial Arbiter Isolating Confounders...');
      await new Promise((r) => setTimeout(r, 600));

      setAgentStep('Phase 3: Synthesizer Computing Confidence Matrix...');
      await new Promise((r) => setTimeout(r, 400));

      if (res.matrix) {
        setMatrixData(res.matrix);
      } else {
        await loadMatrix(customInputQuery.trim());
      }
    } catch (err: any) {
      setError(err.message || 'Discovery and synthesis failed');
    } finally {
      setIsDiscovering(false);
      setAgentStep(null);
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

  const handleArbitrate = async () => {
    setIsArbitrating(true);
    try {
      await triggerArbitration(researchQuery);
      await loadMatrix(researchQuery);
    } catch (err: any) {
      console.error('Arbitration failed:', err);
    } finally {
      setIsArbitrating(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Navigation Header */}
      <header className="border-b border-slate-800/80 bg-slate-900/70 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/20">
              <Layers className="w-5 h-5 text-slate-950 font-bold" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">Veridex</h1>
                <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                  Autonomous Multi-Agent Engine
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Scientific Disagreement Resolution • CockroachDB Vector Memory
              </p>
            </div>
          </div>

          {/* Infrastructure & Action Badges */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setIsVectorModalOpen(true)}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <Database className="w-3.5 h-3.5 text-emerald-400" />
              <span>C-SPANN Vector Search</span>
            </button>

            <button
              onClick={() => setIsPrismaModalOpen(true)}
              disabled={!matrixData}
              className="px-3 py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700 text-xs text-slate-300 flex items-center gap-1.5 transition-all"
            >
              <FileText className="w-3.5 h-3.5 text-blue-400" />
              <span>PRISMA 2020 Export</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-semibold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-500/15 transition-all"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>Add Study Paper</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full space-y-6">
        {/* Research Query & Automated Discovery Bar */}
        <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wider font-semibold">
                Target Research Hypothesis
              </span>
              <form onSubmit={handleDiscoverAndSynthesize} className="flex items-center gap-2 mt-1">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={customInputQuery}
                    onChange={(e) => setCustomInputQuery(e.target.value)}
                    placeholder="Enter any biomedical or scientific question..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/80 border border-slate-700/80 rounded-xl text-sm font-medium text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isDiscovering}
                  className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-lg shadow-emerald-500/20 shrink-0"
                >
                  {isDiscovering ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Discovering Literature...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Search PubMed & Synthesize</span>
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0">
              <button
                onClick={handleArbitrate}
                disabled={isArbitrating || !matrixData}
                title="Run Arbiter Agent over opposing study pairs"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isArbitrating ? 'animate-spin text-emerald-400' : ''}`} />
                <span>Re-Arbitrate</span>
              </button>
              <button
                onClick={handleSeed}
                disabled={isSeeding}
                title="Populate 15-study curated benchmark dataset"
                className="px-3 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs rounded-xl border border-slate-700 flex items-center gap-1.5 transition-all"
              >
                <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                <span>{isSeeding ? 'Seeding...' : 'Seed Benchmark'}</span>
              </button>
            </div>
          </div>

          {/* Preset Topics Carousel */}
          <div className="flex items-center gap-2 mt-4 pt-3 border-t border-slate-800/80 overflow-x-auto text-xs">
            <span className="text-[11px] text-slate-400 shrink-0 font-medium">Curated Topics:</span>
            {TOPIC_PRESETS.map((preset) => {
              const isActive = researchQuery === preset.query;
              return (
                <button
                  key={preset.label}
                  onClick={() => handleSelectPreset(preset.query)}
                  className={`px-3 py-1 rounded-lg border text-xs whitespace-nowrap transition-all flex items-center gap-1.5 ${
                    isActive
                      ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 font-semibold'
                      : 'bg-slate-950/40 border-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                  }`}
                >
                  <span>{preset.label}</span>
                  <span className="text-[10px] opacity-60 font-mono">({preset.tag})</span>
                </button>
              );
            })}
          </div>

          {/* Active Swarm Agent Status Tracker */}
          {agentStep && (
            <div className="mt-3 p-3 bg-emerald-950/20 border border-emerald-500/30 rounded-xl flex items-center gap-2.5 text-xs text-emerald-300 animate-pulse">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-400" />
              <span className="font-medium">{agentStep}</span>
            </div>
          )}
        </div>

        {/* Error Notice */}
        {error && (
          <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl text-amber-300 text-xs flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={handleSeed}
              className="underline font-semibold hover:text-white ml-4"
            >
              Seed Metformin 15-Study Dataset Now
            </button>
          </div>
        )}

        {/* Loading Spinner */}
        {isLoading && (
          <div className="py-20 flex flex-col items-center justify-center gap-3 text-slate-400 text-sm">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
            <span>Computing live consensus matrix from CockroachDB vector memory...</span>
          </div>
        )}

        {/* Core Evidence Ledger Views */}
        {!isLoading && matrixData && (
          <>
            {/* 1. Synthesis Verdict Card */}
            <SynthesisCard
              aggregate={matrixData.aggregate}
              narrative={matrixData.narrative}
            />

            {/* 2. Interactive Contradiction & Confounder Node Graph */}
            <ContradictionGraph
              contradictions={matrixData.contradictions || []}
              extractions={matrixData.extractions || []}
              papers={matrixData.papers || []}
            />

            {/* 3. Contradictions & Confounder Detail Panel */}
            <ContradictionsPanel
              contradictions={matrixData.contradictions || []}
              onReArbitrate={handleArbitrate}
              isArbitrating={isArbitrating}
            />

            {/* 4. Structured Evidence Matrix Table */}
            <EvidenceMatrix
              papers={matrixData.papers || []}
              extractions={matrixData.extractions || []}
            />

            {/* 5. Live Cost & Execution Monitor */}
            {matrixData.usage && (
              <CostMonitor usage={matrixData.usage} />
            )}
          </>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/40 py-6 text-center text-xs text-slate-500 mt-auto">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>© {new Date().getFullYear()} Veridex Engine • Dual Submission for IIT Madras & CockroachDB × AWS Hackathons</p>
          <div className="flex items-center gap-4 text-slate-400 text-[11px]">
            <span>CockroachDB Cloud C-SPANN</span>
            <span>•</span>
            <span>AWS Bedrock Titan V2</span>
            <span>•</span>
            <span>Deterministic Synthesis</span>
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
