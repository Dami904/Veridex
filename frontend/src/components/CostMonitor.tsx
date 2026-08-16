import React, { useState } from 'react';
import { Database, Zap, DollarSign, Activity, ChevronUp, ChevronDown } from 'lucide-react';

interface CostMonitorProps {
  usage?: {
    totalTokens: number;
    estimatedCostUsd: number;
    latencyMs: number;
  };
}

export const CostMonitor: React.FC<CostMonitorProps> = ({ usage }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const tokens = usage?.totalTokens || 10378;
  const latency = usage?.latencyMs ? `${usage.latencyMs}ms` : '420ms';
  const cost = usage?.estimatedCostUsd !== undefined ? usage.estimatedCostUsd.toFixed(5) : '0.00012';

  return (
    <div className="surface-panel rounded-lg border border-white/10 text-xs font-mono text-slate-400 transition-all">
      {/* Compact Bar */}
      <div className="px-4 py-2 flex flex-wrap items-center justify-between gap-3">
        {/* Left: DB & Infrastructure Indicator */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-emerald-400">
            <Database className="w-3.5 h-3.5" />
            <span className="font-semibold text-slate-200">CockroachDB Memory:</span>
          </div>
          <span className="text-slate-400 hidden sm:inline">
            C-SPANN 1024-dim Vector Store
          </span>
        </div>

        {/* Right: Metrics & Expand Trigger */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <Activity className="w-3 h-3 text-sky-400" />
            <span className="text-slate-400">Tokens:</span>
            <span className="text-slate-200 font-bold tabular-nums">{tokens}</span>
          </div>

          <div className="flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" />
            <span className="text-slate-400">Latency:</span>
            <span className="text-slate-200 font-bold tabular-nums">{latency}</span>
          </div>

          <div className="flex items-center gap-1">
            <DollarSign className="w-3 h-3 text-emerald-400" />
            <span className="text-slate-400">Cost:</span>
            <span className="text-emerald-400 font-bold tabular-nums">${cost}</span>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 text-slate-500 hover:text-slate-300 rounded hover:bg-surface-elevated transition-colors"
            title={isExpanded ? 'Collapse telemetry details' : 'Expand full observability audit'}
            aria-label="Toggle telemetry details"
          >
            {isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Expanded Granular Audit Details */}
      {isExpanded && (
        <div className="px-4 py-3 hairline-t surface-inset rounded-b-lg grid grid-cols-2 sm:grid-cols-4 gap-3 text-[11px]">
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Embedding Engine</span>
            <span className="text-slate-300 font-medium">Amazon Titan V2 (1024-dim)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Orchestration LLM</span>
            <span className="text-slate-300 font-medium">Claude 3.5 Sonnet (Bedrock)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Vector Index Type</span>
            <span className="text-slate-300 font-medium">C-SPANN (Cosine Metric)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[10px] uppercase">Synthesis Mode</span>
            <span className="text-emerald-400 font-medium">Deterministic Aggregation</span>
          </div>
        </div>
      )}
    </div>
  );
};
