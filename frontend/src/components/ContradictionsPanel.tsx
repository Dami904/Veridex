import React from 'react';
import { Contradiction } from '../api/client';
import { GitCompare, CheckCircle, AlertOctagon, RefreshCw } from 'lucide-react';

interface ContradictionsPanelProps {
  contradictions: Contradiction[];
  onReArbitrate?: () => void;
  isArbitrating?: boolean;
}

export const ContradictionsPanel: React.FC<ContradictionsPanelProps> = ({
  contradictions,
  onReArbitrate,
  isArbitrating = false,
}) => {
  return (
    <section className="glass-panel rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-amber-400" />
            Contradictions & Confounder Arbiter
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Pairwise study disputes analyzed by the Arbiter Agent with methodological isolation
          </p>
        </div>

        {onReArbitrate && (
          <button
            onClick={onReArbitrate}
            disabled={isArbitrating}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 glass-card hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-medium rounded-xl transition-all disabled:opacity-50 active:scale-95"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isArbitrating ? 'animate-spin' : ''}`} />
            {isArbitrating ? 'Arbitrating...' : 'Re-run Arbiter'}
          </button>
        )}
      </div>

      {contradictions.length === 0 ? (
        <div className="glass-card rounded-xl p-8 text-center border border-slate-800">
          <CheckCircle className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-80" />
          <h4 className="text-sm font-semibold text-slate-200">No Opposing Contradictions Detected</h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
            The ingested study extractions report concordant effect directions, or insufficient opposing pairs exist for this research query.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[500px] overflow-y-auto pr-1">
          {contradictions.map((contradiction, idx) => {
            const isResolved = contradiction.status === 'RESOLVED';
            return (
              <div
                key={contradiction.id || idx}
                className={`border rounded-xl p-4 sm:p-5 transition-all ${
                  isResolved
                    ? 'glass-card border-emerald-900/40 hover:border-emerald-700/60 bg-emerald-950/10'
                    : 'glass-card border-amber-900/40 hover:border-amber-700/60 bg-amber-950/10'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2.5">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase font-mono ${
                      isResolved
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {isResolved ? (
                      <>
                        <CheckCircle className="w-3 h-3 text-emerald-400" />
                        Confounder Isolated
                      </>
                    ) : (
                      <>
                        <AlertOctagon className="w-3 h-3 text-amber-400" />
                        Irreconcilable (Open Disagreement)
                      </>
                    )}
                  </span>

                  <span className="text-[11px] font-mono text-slate-400 uppercase bg-slate-800/80 px-2 py-0.5 rounded">
                    Confidence: {contradiction.confidence_tier}
                  </span>
                </div>

                <h4 className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug mt-2">
                  {contradiction.conflict_summary}
                </h4>

                {isResolved && contradiction.isolated_confounder ? (
                  <div className="mt-3 bg-emerald-950/40 border border-emerald-800/40 rounded-xl p-3 text-xs text-emerald-300">
                    <span className="font-semibold text-emerald-400 block mb-1 text-[11px] uppercase tracking-wider font-mono">
                      Isolated Confounder:
                    </span>
                    {contradiction.isolated_confounder}
                  </div>
                ) : (
                  <div className="mt-3 bg-amber-950/40 border border-amber-800/40 rounded-xl p-3 text-xs text-amber-300">
                    <span className="font-semibold text-amber-400 block mb-1 text-[11px] uppercase tracking-wider font-mono">
                      Scientific Integrity Note:
                    </span>
                    No defensible methodological confounder stated in the data. Genuine empirical dispute retained rather than forcing speculative consensus.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
