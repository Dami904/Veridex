import React from 'react';
import { Contradiction } from '../api/client';
import {
  GitCompare,
  CheckCircle2,
  AlertOctagon,
  RefreshCw,
  Sparkles,
  ShieldAlert,
} from 'lucide-react';

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
  const resolvedCount = contradictions.filter((c) => c.status === 'RESOLVED').length;
  const irreconcilableCount = contradictions.filter((c) => c.status === 'IRRECONCILABLE' || c.status === 'OPEN').length;

  return (
    <section className="surface-panel rounded-xl p-5 sm:p-6 relative overflow-hidden transition-all">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 hairline-b mb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <GitCompare className="w-4 h-4 text-amber-400" />
              Contradiction & Confounder Arbiter
            </h3>
            {contradictions.length > 0 && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-slate-300 border border-white/10">
                {resolvedCount} Resolved / {irreconcilableCount} Open
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Pairwise study disputes arbitrated by multi-agent methodological boundary analysis
          </p>
        </div>

        {onReArbitrate && (
          <button
            onClick={onReArbitrate}
            disabled={isArbitrating}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 surface-card hover:bg-surface-elevated text-slate-200 border border-white/10 text-xs font-mono font-medium rounded-lg transition-all disabled:opacity-50 active:scale-95 shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isArbitrating ? 'animate-spin text-emerald-400' : 'text-slate-400'}`} />
            <span>{isArbitrating ? 'Arbitrating Disputes...' : 'Re-Run Arbiter'}</span>
          </button>
        )}
      </div>

      {/* Contradiction List Grid */}
      {contradictions.length === 0 ? (
        <div className="surface-inset rounded-lg p-8 text-center border border-white/5">
          <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-90" />
          <h4 className="text-sm font-semibold text-slate-200 font-mono">
            Concordant Evidence Base (Zero Contradictions Detected)
          </h4>
          <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto leading-relaxed">
            The evaluated studies report consistent directional outcomes with no statistically significant methodological disputes or confounders.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[520px] overflow-y-auto pr-1">
          {contradictions.map((contradiction, idx) => {
            const isResolved = contradiction.status === 'RESOLVED';
            return (
              <div
                key={contradiction.id || idx}
                className={`rounded-lg p-4 sm:p-5 border transition-all ${
                  isResolved
                    ? 'surface-card border-emerald-500/30 hover:border-emerald-500/50 bg-emerald-950/5'
                    : 'surface-card border-amber-500/30 hover:border-amber-500/50 bg-amber-950/5'
                }`}
              >
                {/* Dispute Header */}
                <div className="flex items-center justify-between gap-2 mb-3">
                  <span
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded text-[11px] font-mono font-bold tracking-wide uppercase border ${
                      isResolved
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25'
                        : 'bg-amber-500/10 text-amber-400 border-amber-500/25'
                    }`}
                  >
                    {isResolved ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        CONFOUNDER ISOLATED
                      </>
                    ) : (
                      <>
                        <AlertOctagon className="w-3.5 h-3.5 text-amber-400" />
                        EMPIRICAL DISPUTE (OPEN)
                      </>
                    )}
                  </span>

                  <span className="text-[10px] font-mono text-slate-400 bg-surface-elevated px-2 py-0.5 rounded border border-white/10 uppercase">
                    Tier: {contradiction.confidence_tier}
                  </span>
                </div>

                {/* Dispute Title & Summary */}
                <h4 className="text-xs sm:text-sm font-semibold text-slate-100 leading-snug">
                  {contradiction.conflict_summary}
                </h4>

                {/* Opposing Studies Ref if available */}
                {(contradiction.paper_a_title || contradiction.paper_b_title) && (
                  <div className="mt-2.5 pt-2 hairline-t text-[11px] font-mono text-slate-400 space-y-1">
                    <div className="truncate">
                      <span className="text-emerald-400 font-semibold">Cohort A:</span> {contradiction.paper_a_title}
                    </div>
                    <div className="truncate">
                      <span className="text-rose-400 font-semibold">Cohort B:</span> {contradiction.paper_b_title}
                    </div>
                  </div>
                )}

                {/* Arbiter Confounder Analysis Callout */}
                {isResolved && contradiction.isolated_confounder ? (
                  <div className="mt-3.5 p-3 rounded-lg bg-emerald-950/30 border border-emerald-500/25 text-xs text-slate-200">
                    <span className="font-bold text-emerald-400 block mb-1 text-[10px] uppercase font-mono tracking-wider flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-emerald-400" />
                      Isolated Confounder Mechanism:
                    </span>
                    <p className="leading-relaxed text-slate-300 font-mono text-[11px]">
                      {contradiction.isolated_confounder}
                    </p>
                  </div>
                ) : (
                  <div className="mt-3.5 p-3 rounded-lg bg-amber-950/30 border border-amber-500/25 text-xs text-slate-200">
                    <span className="font-bold text-amber-400 block mb-1 text-[10px] uppercase font-mono tracking-wider flex items-center gap-1">
                      <ShieldAlert className="w-3 h-3 text-amber-400" />
                      Scientific Integrity Protection:
                    </span>
                    <p className="leading-relaxed text-slate-300 text-[11px]">
                      No defensible methodological confounder stated in the empirical data. Genuine disagreement retained rather than forcing artificial consensus.
                    </p>
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
