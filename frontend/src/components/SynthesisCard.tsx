import React, { useState } from 'react';
import { Aggregate } from '../api/client';
import {
  ShieldCheck,
  AlertTriangle,
  AlertCircle,
  Scale,
  CheckCircle2,
  HelpCircle,
  BarChart3,
  X,
  FileCheck,
} from 'lucide-react';

interface SynthesisCardProps {
  aggregate?: Aggregate;
  narrative?: string;
  loading?: boolean;
}

export const SynthesisCard: React.FC<SynthesisCardProps> = ({ aggregate, narrative, loading }) => {
  const [showFormulaModal, setShowFormulaModal] = useState(false);

  if (loading) {
    return (
      <div className="surface-panel rounded-xl p-5 animate-pulse space-y-4">
        <div className="flex items-center justify-between">
          <div className="h-5 bg-surface-elevated rounded w-1/4"></div>
          <div className="h-6 bg-surface-elevated rounded w-36"></div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-20 bg-surface-elevated rounded-lg"></div>
          ))}
        </div>
        <div className="h-16 bg-surface-elevated rounded-lg"></div>
      </div>
    );
  }

  if (!aggregate) return null;

  const total = aggregate.total_studies || 0;
  const positive = aggregate.positive_count || 0;
  const negative = aggregate.negative_count || 0;
  const neutral = aggregate.neutral_or_mixed_count || 0;
  const posPct = total > 0 ? Math.round((positive / total) * 100) : 0;
  const negPct = total > 0 ? Math.round((negative / total) * 100) : 0;
  const neuPct = total > 0 ? Math.max(0, 100 - posPct - negPct) : 0;

  const getTierDetails = (tier: string) => {
    switch (tier) {
      case 'HIGH':
        return {
          label: 'HIGH CERTAINTY',
          subtext: '≥5 studies • ≥80% consensus • majority low bias',
          badgeClass: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
          icon: <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />,
        };
      case 'MODERATE':
        return {
          label: 'MODERATE CERTAINTY',
          subtext: '≥3 studies • ≥60% consensus',
          badgeClass: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
          icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
        };
      case 'LOW':
      default:
        return {
          label: 'PRELIMINARY / LOW',
          subtext: '<3 studies or <60% consensus or open > resolved',
          badgeClass: 'bg-rose-500/10 text-rose-400 border-rose-500/30',
          icon: <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />,
        };
    }
  };

  const tierInfo = getTierDetails(aggregate.confidence_tier);

  return (
    <section className="surface-panel rounded-xl p-5 sm:p-6 relative overflow-hidden transition-all">
      {/* Top Banner: Consensus Verdict & Confidence Grade Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 hairline-b mb-5">
        <div>
          <div className="flex items-center gap-2 text-[11px] font-mono font-semibold uppercase tracking-wider text-slate-400 mb-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
            Deterministic Meta-Analysis
          </div>
          <h2 className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight flex items-center gap-2.5">
            Consensus Verdict
            <span className="text-xs font-mono font-normal text-slate-400">
              (Evaluated Corpus: {total} Papers)
            </span>
          </h2>
        </div>

        {/* Confidence Tier Badge with Formula Inspector trigger */}
        <div className="flex items-center gap-2">
          <div
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-semibold font-mono tracking-wide ${tierInfo.badgeClass}`}
          >
            {tierInfo.icon}
            <div>
              <span className="block leading-none">{tierInfo.label}</span>
              <span className="text-[9px] font-mono text-slate-400 block mt-0.5 leading-none">
                {tierInfo.subtext}
              </span>
            </div>
          </div>

          <button
            onClick={() => setShowFormulaModal(true)}
            className="p-1.5 rounded-lg border border-white/10 hover:border-white/20 text-slate-400 hover:text-slate-200 transition-colors"
            title="Inspect deterministic confidence tier algorithm & thresholds"
            aria-label="Inspect confidence tier rubric"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Primary Stat Block Grid — 6-Card High Density Layout */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-5">
        {/* 1. Analyzed Corpus */}
        <div className="surface-card rounded-lg p-3.5 border border-white/5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            Total Studies
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1 tabular-nums">
            {aggregate.total_studies}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">Primary sources</div>
        </div>

        {/* 2. Directional Consensus */}
        <div className="surface-card rounded-lg p-3.5 border border-white/5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            <span>Consensus</span>
            <BarChart3 className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono mt-1 flex items-baseline gap-1">
            <span className="text-emerald-400 tabular-nums">{positive}</span>
            <span className="text-xs text-slate-500 font-normal">pos /</span>
            <span className="text-rose-400 tabular-nums">{negative}</span>
            <span className="text-xs text-slate-500 font-normal">neg</span>
          </div>
          {/* Mini Stacked Ratio Bar */}
          <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden flex mt-1.5">
            <div
              className="bg-emerald-500 h-full transition-all"
              style={{ width: `${posPct}%` }}
              title={`Positive: ${positive} (${posPct}%)`}
            />
            <div
              className="bg-rose-500 h-full transition-all"
              style={{ width: `${negPct}%` }}
              title={`Negative: ${negative} (${negPct}%)`}
            />
            <div
              className="bg-slate-600 h-full transition-all"
              style={{ width: `${neuPct}%` }}
              title={`Neutral/Mixed: ${neutral} (${neuPct}%)`}
            />
          </div>
        </div>

        {/* 3. Pooled Mean Effect Size */}
        <div className="surface-card rounded-lg p-3.5 border border-white/5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            <span>Mean Effect</span>
            <Scale className="w-3.5 h-3.5 text-slate-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1 tabular-nums">
            {aggregate.avg_effect_size !== null
              ? `${aggregate.avg_effect_size > 0 ? '+' : ''}${aggregate.avg_effect_size}%`
              : '—'}
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">Pooled delta (Δ%)</div>
        </div>

        {/* 4. Statistical Significance */}
        <div className="surface-card rounded-lg p-3.5 border border-white/5">
          <div className="flex items-center justify-between text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            <span>p ≤ 0.05 Sig.</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-400 mt-1 tabular-nums">
            {aggregate.significant_count}{' '}
            <span className="text-xs font-normal text-slate-500">/ {aggregate.total_studies}</span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">
            {total > 0 ? `${Math.round((aggregate.significant_count / total) * 100)}% valid` : '—'}
          </div>
        </div>

        {/* 5. Contradictions Resolution */}
        <div className="surface-card rounded-lg p-3.5 border border-white/5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            Contradictions
          </div>
          <div className="text-2xl font-bold font-mono text-slate-100 mt-1 tabular-nums">
            <span className="text-emerald-400">{aggregate.resolved_contradictions}</span>
            <span className="text-slate-600 text-sm mx-1">/</span>
            <span
              className={aggregate.open_contradictions > 0 ? 'text-amber-400' : 'text-slate-400'}
            >
              {aggregate.open_contradictions}
            </span>
          </div>
          <div className="text-[10px] font-mono text-slate-500 mt-0.5">Resolved / Open</div>
        </div>

        {/* 6. Risk of Bias Breakdown */}
        <div className="surface-card rounded-lg p-3.5 border border-white/5">
          <div className="text-[11px] font-medium text-slate-400 uppercase tracking-wide">
            Risk of Bias
          </div>
          <div className="text-xs font-mono font-medium mt-2 space-y-1">
            <div className="flex items-center justify-between text-slate-300">
              <span className="text-sky-400">Low:</span>
              <span className="font-bold tabular-nums">
                {aggregate.risk_of_bias_breakdown?.LOW ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-400">
              <span className="text-amber-400">Mod:</span>
              <span className="font-bold tabular-nums">
                {aggregate.risk_of_bias_breakdown?.MODERATE ?? 0}
              </span>
            </div>
            <div className="flex items-center justify-between text-slate-500">
              <span className="text-rose-400">High:</span>
              <span className="font-bold tabular-nums">
                {aggregate.risk_of_bias_breakdown?.HIGH ?? 0}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Narrative Section — Executive Meta-Synthesis */}
      <div className="surface-inset rounded-lg p-4 sm:p-5 border border-white/5">
        <div className="flex items-center justify-between pb-2 mb-2.5 hairline-b">
          <div className="text-[11px] font-mono uppercase text-slate-400 tracking-wider font-semibold flex items-center gap-1.5">
            <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
            Executive Meta-Synthesis (Deterministic Audit Narrative)
          </div>
          <span className="text-[10px] font-mono text-slate-500 hidden sm:inline">
            Zero arithmetic hallucination • Sourced from extracted parameters
          </span>
        </div>
        <p className="text-slate-300 text-xs sm:text-sm leading-relaxed font-normal">
          {narrative || 'Evidence aggregation in progress across ingested literature...'}
        </p>
      </div>

      {/* Deterministic Confidence Rubric Modal */}
      {showFormulaModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="surface-elevated rounded-xl max-w-lg w-full p-6 shadow-2xl relative border border-white/10">
            <div className="flex items-center justify-between pb-3 hairline-b mb-4">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-100 uppercase tracking-tight font-mono">
                  Deterministic Confidence Rubric
                </h3>
              </div>
              <button
                onClick={() => setShowFormulaModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-surface-card"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-slate-300 mb-4 leading-relaxed">
              Veridex deterministically calculates consensus tiers according to strict mathematical
              gates in Section 7.4. The LLM never computes or alters these thresholds.
            </p>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                <div className="text-emerald-400 font-bold mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  HIGH CERTAINTY CRITERIA
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                  <li>Total studies evaluated ≥ 5</li>
                  <li>Directional consensus ratio ≥ 80%</li>
                  <li>Majority of studies report LOW risk of bias</li>
                  <li>Resolved contradictions ≥ Open contradictions</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30">
                <div className="text-amber-400 font-bold mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  MODERATE CERTAINTY CRITERIA
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                  <li>Total studies evaluated ≥ 3</li>
                  <li>Directional consensus ratio ≥ 60% and &lt; 80%</li>
                  <li>Or ≥ 80% consensus but majority risk of bias is MODERATE / HIGH</li>
                  <li>Resolved contradictions ≥ Open contradictions</li>
                </ul>
              </div>

              <div className="p-3 rounded-lg bg-rose-950/20 border border-rose-500/30">
                <div className="text-rose-400 font-bold mb-1 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-rose-400"></span>
                  PRELIMINARY / LOW CERTAINTY
                </div>
                <ul className="text-[11px] text-slate-300 space-y-1 list-disc list-inside">
                  <li>Total studies &lt; 3, OR</li>
                  <li>Consensus ratio &lt; 60%, OR</li>
                  <li>Open / Irreconcilable contradictions &gt; Resolved contradictions</li>
                </ul>
              </div>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={() => setShowFormulaModal(false)}
                className="px-4 py-2 bg-surface-card hover:bg-surface-card/80 text-slate-200 text-xs font-mono font-medium rounded-lg border border-white/10 transition-colors"
              >
                Close Rubric
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
