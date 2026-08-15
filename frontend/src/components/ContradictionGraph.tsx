import React, { useState } from 'react';
import { Contradiction, StudyExtraction, Paper } from '../api/client';
import { GitCommit, Sparkles, CheckCircle2, AlertTriangle, Info } from 'lucide-react';

interface ContradictionGraphProps {
  contradictions: Contradiction[];
  extractions: StudyExtraction[];
  papers: Paper[];
}

export const ContradictionGraph: React.FC<ContradictionGraphProps> = ({
  contradictions,
  extractions,
  papers,
}) => {
  const [selectedContradiction, setSelectedContradiction] = useState<Contradiction | null>(
    contradictions[0] || null
  );

  if (contradictions.length === 0) {
    return (
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl p-6 text-center text-slate-400">
        <GitCommit className="w-8 h-8 text-slate-500 mx-auto mb-2 opacity-50" />
        <p className="text-sm">No conflicting pairs detected in current evidence corpus.</p>
      </div>
    );
  }

  // Get positive & negative studies
  const posExtractions = extractions.filter((e) => e.effect_direction === 'POSITIVE');
  const negExtractions = extractions.filter((e) => e.effect_direction === 'NEGATIVE');

  return (
    <div className="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-5 shadow-xl backdrop-blur-md">
      <div className="flex items-center justify-between pb-4 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
            <GitCommit className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white tracking-wide">
              Contradiction & Confounder Visual Graph
            </h3>
            <p className="text-xs text-slate-400">
              Interactive node topology mapping opposing study pairs and isolated methodological confounders
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono">
          <span className="flex items-center gap-1 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span> Positive ({posExtractions.length})
          </span>
          <span className="flex items-center gap-1 text-rose-400 ml-2">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span> Negative ({negExtractions.length})
          </span>
        </div>
      </div>

      {/* Interactive Contradiction Selector List & Visual Bridge */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 mt-4">
        {/* Left: Dispute Selection Pills */}
        <div className="lg:col-span-5 space-y-2 max-h-80 overflow-y-auto pr-1">
          {contradictions.map((c, idx) => {
            const isSelected = selectedContradiction?.id === c.id;
            const isResolved = c.status === 'RESOLVED';
            const paperA = papers.find((p) => p.id === c.paper_a_id) || {};
            const paperB = papers.find((p) => p.id === c.paper_b_id) || {};

            return (
              <button
                key={c.id || idx}
                onClick={() => setSelectedContradiction(c)}
                className={`w-full text-left p-3 rounded-xl border transition-all text-xs flex flex-col gap-1.5 ${
                  isSelected
                    ? 'bg-slate-800/90 border-emerald-500/50 shadow-md shadow-emerald-500/10'
                    : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 hover:bg-slate-850'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-200">Dispute #{idx + 1}</span>
                  <span
                    className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded border ${
                      isResolved
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    }`}
                  >
                    {c.status}
                  </span>
                </div>
                <div className="text-[11px] text-slate-300 line-clamp-1">
                  <span className="text-emerald-400 font-medium">Study A</span> vs{' '}
                  <span className="text-rose-400 font-medium">Study B</span>: {c.conflict_summary}
                </div>
                {c.isolated_confounder && (
                  <div className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <Sparkles className="w-3 h-3 text-amber-400 shrink-0" />
                    <span className="truncate">{c.isolated_confounder}</span>
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Right: Visual Node Bridge Detail */}
        <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800/80 rounded-xl p-4 flex flex-col justify-between">
          {selectedContradiction ? (
            <div>
              <div className="flex items-center justify-between pb-3 border-b border-slate-850">
                <div className="flex items-center gap-1.5 text-xs text-slate-300 font-medium">
                  <Info className="w-3.5 h-3.5 text-blue-400" />
                  Methodological Divergence Bridge
                </div>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  Confidence: {selectedContradiction.confidence_tier}
                </span>
              </div>

              {/* Opposing Nodes Canvas */}
              <div className="my-4 grid grid-cols-1 md:grid-cols-2 gap-3 relative">
                {/* Node A (Positive) */}
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mb-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                    Study A (+ Direction)
                  </div>
                  <p className="text-xs text-slate-200 font-medium line-clamp-2">
                    {papers.find((p) => p.id === selectedContradiction.paper_a_id)?.title ||
                      selectedContradiction.paper_a_title ||
                      'Study A (Positive)'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {papers.find((p) => p.id === selectedContradiction.paper_a_id)?.journal || 'Peer-Reviewed'}
                  </p>
                </div>

                {/* Node B (Negative) */}
                <div className="bg-rose-950/20 border border-rose-500/30 rounded-xl p-3">
                  <div className="flex items-center gap-1.5 text-rose-400 text-xs font-semibold mb-1">
                    <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                    Study B (- Direction)
                  </div>
                  <p className="text-xs text-slate-200 font-medium line-clamp-2">
                    {papers.find((p) => p.id === selectedContradiction.paper_b_id)?.title ||
                      selectedContradiction.paper_b_title ||
                      'Study B (Negative)'}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">
                    {papers.find((p) => p.id === selectedContradiction.paper_b_id)?.journal || 'Peer-Reviewed'}
                  </p>
                </div>
              </div>

              {/* Arbiter Confounder Resolution Banner */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 mt-2">
                <div className="flex items-center gap-2 mb-1.5">
                  {selectedContradiction.status === 'RESOLVED' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                  )}
                  <span className="text-xs font-semibold text-white">
                    {selectedContradiction.status === 'RESOLVED'
                      ? 'Arbiter Isolated Confounder'
                      : 'Irreconcilable Methodological Conflict'}
                  </span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {selectedContradiction.isolated_confounder ||
                    selectedContradiction.conflict_summary ||
                    'Opposing outcomes without stated methodological variance.'}
                </p>
                <div className="text-[10px] text-slate-400 mt-2 font-mono">
                  Conflict Summary: {selectedContradiction.conflict_summary}
                </div>
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-400 text-center my-auto">
              Select a dispute pair from the list to view the node resolution details.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
