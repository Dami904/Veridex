import React from 'react';
import { Aggregate } from '../api/client';
import { ShieldCheck, AlertTriangle, AlertCircle, Sparkles, TrendingUp, TrendingDown, Scale, CheckCircle2 } from 'lucide-react';

interface SynthesisCardProps {
  aggregate?: Aggregate;
  narrative?: string;
  loading?: boolean;
}

export const SynthesisCard: React.FC<SynthesisCardProps> = ({ aggregate, narrative, loading }) => {
  if (loading) {
    return (
      <div className="glass-panel rounded-2xl p-6 animate-pulse">
        <div className="h-6 bg-slate-800 rounded w-1/3 mb-4"></div>
        <div className="h-4 bg-slate-800 rounded w-full mb-2"></div>
        <div className="h-4 bg-slate-800 rounded w-5/6"></div>
      </div>
    );
  }

  if (!aggregate) {
    return null;
  }

  const getTierBadge = (tier: string) => {
    switch (tier) {
      case 'HIGH':
        return (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold tracking-wide uppercase shadow-sm shadow-emerald-500/10">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Grade: High Certainty (≥80% Consensus)</span>
          </div>
        );
      case 'MODERATE':
        return (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-semibold tracking-wide uppercase shadow-sm shadow-amber-500/10">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Grade: Moderate Certainty (60-79%)</span>
          </div>
        );
      case 'LOW':
      default:
        return (
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-xs font-semibold tracking-wide uppercase shadow-sm shadow-rose-500/10">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>Grade: Preliminary / Contested Evidence</span>
          </div>
        );
    }
  };

  return (
    <section className="glass-panel rounded-2xl p-6 sm:p-7 shadow-2xl relative overflow-hidden">
      {/* Background Soft Glow */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-24 -mt-24"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-5 relative z-10">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Live Evidence Synthesis & Meta-Review
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
            Scientific Consensus Verdict
          </h2>
        </div>
        <div>
          {getTierBadge(aggregate.confidence_tier)}
        </div>
      </div>

      {/* Narrative Section */}
      <div className="glass-card rounded-xl p-5 mb-6 relative z-10 border border-slate-800/80">
        <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider mb-2 font-semibold flex items-center gap-1.5">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          Executive Clinical Meta-Synthesis
        </div>
        <p className="text-slate-200 text-sm sm:text-base leading-relaxed font-normal">
          {narrative || 'Evidence aggregation in progress across ingested literature...'}
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 relative z-10">
        <div className="glass-card rounded-xl p-3.5 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Total Studies</div>
          <div className="text-xl font-bold text-white mt-1">{aggregate.total_studies}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">Analyzed corpus</div>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-emerald-900/40 bg-emerald-950/10">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>Positive</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold text-emerald-400 mt-1">{aggregate.positive_count}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">Efficacy reported</div>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-rose-900/40 bg-rose-950/10">
          <div className="flex items-center justify-between text-xs text-rose-400 font-medium">
            <span>Negative</span>
            <TrendingDown className="w-3.5 h-3.5" />
          </div>
          <div className="text-xl font-bold text-rose-400 mt-1">{aggregate.negative_count}</div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">Opposing / null</div>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-slate-800">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Mean Effect</span>
            <Scale className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold text-white mt-1">
            {aggregate.avg_effect_size !== null ? `${aggregate.avg_effect_size > 0 ? '+' : ''}${aggregate.avg_effect_size}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">Pooled delta</div>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">p &lt; 0.05 Sig.</div>
          <div className="text-xl font-bold text-emerald-400 mt-1">
            {aggregate.significant_count} <span className="text-xs font-normal text-slate-500">/ {aggregate.total_studies}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">Statistically valid</div>
        </div>

        <div className="glass-card rounded-xl p-3.5 border border-slate-800">
          <div className="text-xs text-slate-400 font-medium">Contradictions</div>
          <div className="text-xl font-bold text-white mt-1">
            <span className="text-emerald-400">{aggregate.resolved_contradictions}</span>
            <span className="text-slate-500 text-xs mx-1">/</span>
            <span className="text-amber-400">{aggregate.open_contradictions}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 font-mono">Resolved / Open</div>
        </div>
      </div>
    </section>
  );
};
