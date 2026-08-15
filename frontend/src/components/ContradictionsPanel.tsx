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
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium rounded-lg transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isArbitrating ? 'animate-spin' : ''}`} />
            {isArbitrating ? 'Arbitrating...' : 'Re-run Arbiter'}
          </button>
        )}
      </div>

      {contradictions.length === 0 ? (
        <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-8 text-center">
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
                className={`border rounded-xl p-4 transition-all ${
                  isResolved
                    ? 'bg-slate-950/70 border-emerald-900/40 hover:border-emerald-700/60'
                    : 'bg-slate-950/70 border-amber-900/40 hover:border-amber-700/60'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span
                    className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold tracking-wide uppercase ${
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

                  <span className="text-[11px] font-mono text-slate-500 uppercase">
                    Confidence: {contradiction.confidence_tier}
                  </span>
                </div>

                <h4 className="text-xs font-semibold text-slate-100 leading-snug mt-2">
                  {contradiction.conflict_summary}
                </h4>

                {isResolved && contradiction.isolated_confounder ? (
                  <div className="mt-3 bg-emerald-950/30 border border-emerald-800/40 rounded-lg p-2.5 text-xs text-emerald-300">
                    <span className="font-semibold text-emerald-400 block mb-0.5 text-[11px] uppercase tracking-wider">
                      Isolated Confounder:
                    </span>
                    {contradiction.isolated_confounder}
                  </div>
                ) : (
                  <div className="mt-3 bg-amber-950/30 border border-amber-800/40 rounded-lg p-2.5 text-xs text-amber-300">
                    <span className="font-semibold text-amber-400 block mb-0.5 text-[11px] uppercase tracking-wider">
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
    </div>
  );
};
