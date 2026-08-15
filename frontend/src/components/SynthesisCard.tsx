import React from 'react';
import { Aggregate } from '../api/client';
import { ShieldCheck, AlertTriangle, AlertCircle, Sparkles, TrendingUp, TrendingDown, Scale } from 'lucide-react';

interface SynthesisCardProps {
  aggregate?: Aggregate;
  narrative?: string;
  loading?: boolean;
}

export const SynthesisCard: React.FC<SynthesisCardProps> = ({ aggregate, narrative, loading }) => {
  if (loading) {
    return (
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-6 animate-pulse">
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
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 rounded-full text-xs font-semibold tracking-wide uppercase">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Certainty: High
          </div>
        );
      case 'MODERATE':
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-500/10 border border-amber-500/30 text-amber-400 rounded-full text-xs font-semibold tracking-wide uppercase">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            Certainty: Moderate
          </div>
        );
      case 'LOW':
      default:
        return (
          <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-rose-500/10 border border-rose-500/30 text-rose-400 rounded-full text-xs font-semibold tracking-wide uppercase">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            Certainty: Low (Preliminary / Disputed)
          </div>
        );
    }
  };

  return (
    <div className="bg-gradient-to-b from-slate-900 to-slate-950 border border-slate-800/80 rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-5 mb-5">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-3.5 h-3.5" />
            Live On-Demand Consensus Synthesis
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            Evidence Verdict & Consensus State
          </h2>
        </div>
        <div>
          {getTierBadge(aggregate.confidence_tier)}
        </div>
      </div>

      {/* Narrative Section */}
      <div className="bg-slate-950/60 border border-slate-800/60 rounded-xl p-4 mb-6">
        <p className="text-slate-200 text-sm leading-relaxed font-normal">
          {narrative || 'Evidence aggregation in progress across ingested literature...'}
        </p>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 font-medium">Total Studies</div>
          <div className="text-lg font-bold text-white mt-1">{aggregate.total_studies}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Ingested papers</div>
        </div>

        <div className="bg-slate-900/60 border border-emerald-900/30 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-medium">
            <span>Positive</span>
            <TrendingUp className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-emerald-400 mt-1">{aggregate.positive_count}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Supporting effect</div>
        </div>

        <div className="bg-slate-900/60 border border-rose-900/30 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-rose-400 font-medium">
            <span>Negative</span>
            <TrendingDown className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-rose-400 mt-1">{aggregate.negative_count}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Opposing / toxic</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
          <div className="flex items-center justify-between text-xs text-slate-400 font-medium">
            <span>Avg Effect</span>
            <Scale className="w-3.5 h-3.5" />
          </div>
          <div className="text-lg font-bold text-white mt-1">
            {aggregate.avg_effect_size !== null ? `${aggregate.avg_effect_size > 0 ? '+' : ''}${aggregate.avg_effect_size}%` : 'N/A'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Mean delta</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 font-medium">p &lt; 0.05 Sig.</div>
          <div className="text-lg font-bold text-emerald-400 mt-1">
            {aggregate.significant_count} <span className="text-xs font-normal text-slate-500">/ {aggregate.total_studies}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Statistically valid</div>
        </div>

        <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-3">
          <div className="text-xs text-slate-400 font-medium">Contradictions</div>
          <div className="text-lg font-bold text-white mt-1">
            <span className="text-emerald-400">{aggregate.resolved_contradictions}</span>
            <span className="text-slate-500 text-xs mx-1">/</span>
            <span className="text-amber-400">{aggregate.open_contradictions}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Resolved / Open</div>
        </div>
      </div>
    </div>
  );
};
