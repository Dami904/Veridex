import React, { useState } from 'react';
import { Contradiction, StudyExtraction, Paper } from '../api/client';
import { GitCommit, Sparkles, CheckCircle2, Network, Split } from 'lucide-react';

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
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Positive and Negative extractions
  const posExtractions = extractions.filter((e) => e.effect_direction === 'POSITIVE');
  const negExtractions = extractions.filter((e) => e.effect_direction === 'NEGATIVE');

  // Fallback demo items if 0 contradictions
  const activeContradictions =
    contradictions.length > 0
      ? contradictions
      : [
          {
            id: 'demo-1',
            research_query: 'Metformin longevity',
            paper_a_id: posExtractions[0]?.paper_id || 'pos-1',
            paper_b_id: negExtractions[0]?.paper_id || 'neg-1',
            conflict_summary: 'Discrepancy in reported survival benefit between low and high dose cohorts',
            isolated_confounder: 'Dosage Threshold Confounder (10 mg/kg therapeutic vs 400 mg/kg toxic threshold)',
            confidence_tier: 'HIGH' as const,
            status: 'RESOLVED' as const,
            created_at: new Date().toISOString(),
          },
        ];

  const currentSelection = selectedContradiction || activeContradictions[0];

  return (
    <section className="glass-panel rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-slate-800/80 gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              Contradiction & Confounder Topology
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Interactive Graph
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Topological bridge isolating methodological confounders across opposing study cohorts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Positive Studies ({posExtractions.length || 0})
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 border border-rose-500/30 text-rose-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse"></span>
            Negative Studies ({negExtractions.length || 0})
          </div>
        </div>
      </div>

      {/* Visual SVG Network Topology Canvas */}
      <div className="my-6 glass-card rounded-2xl p-4 sm:p-6 relative overflow-hidden border border-slate-800/80">
        {/* Background Network Grid */}
        <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]"></div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center relative z-10 py-2">
          {/* Column 1: Positive Studies Node Column */}
          <div className="space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              Positive Cohort Cluster
            </div>

            {(posExtractions.slice(0, 3).length > 0 ? posExtractions.slice(0, 3) : [1, 2]).map((item, idx) => {
              const p = typeof item === 'object' ? papers.find((paper) => paper.id === item.paper_id) : null;
              const title = p?.title || (idx === 0 ? 'Low-Dose Metformin Extends Mammalian Lifespan' : 'Metformin Delays Cellular Senescence');

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredNode(`pos-${idx}`)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer text-xs ${
                    hoveredNode === `pos-${idx}`
                      ? 'bg-emerald-950/60 border-emerald-400 shadow-lg shadow-emerald-500/20 scale-[1.02]'
                      : 'bg-emerald-950/20 border-emerald-500/30 hover:border-emerald-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-emerald-400 text-[11px] font-semibold mb-1">
                    <span>Study #{idx + 1} (+)</span>
                    <span className="font-mono text-[10px] bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      p &lt; 0.05
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium line-clamp-2 leading-relaxed">{title}</p>
                </div>
              );
            })}
          </div>

          {/* Column 2: Center Confounder Arbitration Bridge */}
          <div className="flex flex-col items-center justify-center px-2 py-4">
            <div className="w-full glass-card border-2 border-amber-500/40 rounded-2xl p-5 shadow-xl text-center relative hover:border-amber-400 transition-all">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-amber-500 text-slate-950 text-[10px] font-bold uppercase tracking-wider px-3 py-0.5 rounded-full flex items-center gap-1 shadow-md font-mono">
                <Sparkles className="w-3 h-3" />
                Arbiter Confounder Bridge
              </div>

              <div className="mt-2 text-xs font-bold text-white uppercase tracking-tight font-mono text-amber-300">
                {currentSelection?.isolated_confounder || 'Dosage Discrepancy & Model System Variance'}
              </div>

              <p className="text-xs text-slate-300 mt-2.5 leading-relaxed">
                {currentSelection?.conflict_summary || 'Apparent disagreement resolved by dosage variance (therapeutic low dose vs supra-physiological toxicity).'}
              </p>

              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-semibold">
                  <CheckCircle2 className="w-3 h-3" />
                  STATUS: {currentSelection?.status || 'RESOLVED'}
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800/80 px-2 py-0.5 rounded border border-slate-700/50">
                  Grade: {currentSelection?.confidence_tier || 'MODERATE'}
                </span>
              </div>
            </div>
          </div>

          {/* Column 3: Negative Studies Node Column */}
          <div className="space-y-3">
            <div className="text-[11px] font-mono uppercase tracking-wider text-rose-400 font-semibold flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-rose-400"></span>
              Negative Cohort Cluster
            </div>

            {(negExtractions.slice(0, 3).length > 0 ? negExtractions.slice(0, 3) : [1, 2]).map((item, idx) => {
              const p = typeof item === 'object' ? papers.find((paper) => paper.id === item.paper_id) : null;
              const title = p?.title || (idx === 0 ? 'High-Dose Metformin Causes Lactic Acidosis & Toxicity' : 'Metformin Fails to Extend Survival in Aged Cohort');

              return (
                <div
                  key={idx}
                  onMouseEnter={() => setHoveredNode(`neg-${idx}`)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer text-xs ${
                    hoveredNode === `neg-${idx}`
                      ? 'bg-rose-950/60 border-rose-400 shadow-lg shadow-rose-500/20 scale-[1.02]'
                      : 'bg-rose-950/20 border-rose-500/30 hover:border-rose-500/60'
                  }`}
                >
                  <div className="flex items-center justify-between text-rose-400 text-[11px] font-semibold mb-1">
                    <span>Study #{idx + 1} (-)</span>
                    <span className="font-mono text-[10px] bg-rose-500/10 px-1.5 py-0.5 rounded border border-rose-500/20">
                      Opposing
                    </span>
                  </div>
                  <p className="text-slate-200 font-medium line-clamp-2 leading-relaxed">{title}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Dispute Selection Tabs */}
      {activeContradictions.length > 1 && (
        <div className="mt-4 pt-3 border-t border-slate-800/80">
          <div className="text-xs font-semibold text-slate-300 mb-2.5 flex items-center gap-1.5">
            <GitCommit className="w-3.5 h-3.5 text-emerald-400" />
            Select Pairwise Dispute to Inspect Resolution:
          </div>
          <div className="flex flex-wrap gap-2">
            {activeContradictions.map((c, idx) => (
              <button
                key={c.id || idx}
                onClick={() => setSelectedContradiction(c)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-medium border transition-all flex items-center gap-1.5 ${
                  selectedContradiction?.id === c.id
                    ? 'bg-slate-800 border-emerald-500 text-white shadow-md'
                    : 'glass-card border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Split className="w-3 h-3 text-amber-400" />
                Dispute #{idx + 1} [{c.status}]
              </button>
            ))}
          </div>
        </div>
      )}
    </section>
  );
};
