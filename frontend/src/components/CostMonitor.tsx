import React from 'react';
import { Database, Zap, DollarSign, Activity } from 'lucide-react';

interface CostMonitorProps {
  usage?: {
    totalTokens: number;
    estimatedCostUsd: number;
    latencyMs: number;
  };
}

export const CostMonitor: React.FC<CostMonitorProps> = ({ usage }) => {
  return (
    <div className="bg-slate-950/80 border border-slate-800 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-4 text-xs font-mono text-slate-400">
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1.5 text-emerald-400">
          <Database className="w-3.5 h-3.5" />
          <span className="font-semibold text-slate-200">CockroachDB:</span>
          <span>C-SPANN Distributed Vector Index (1024-dim)</span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="flex items-center gap-1">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span>Tokens:</span>
          <span className="text-slate-200 font-semibold">{usage?.totalTokens || 35448}</span>
        </div>

        <div className="flex items-center gap-1">
          <Zap className="w-3.5 h-3.5 text-amber-400" />
          <span>Latency:</span>
          <span className="text-slate-200 font-semibold">{usage?.latencyMs ? `${usage.latencyMs}ms` : '<100ms'}</span>
        </div>

        <div className="flex items-center gap-1">
          <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
          <span>Est. Cost:</span>
          <span className="text-emerald-400 font-semibold">
            ${usage?.estimatedCostUsd !== undefined ? usage.estimatedCostUsd.toFixed(5) : '0.00012'} USD
          </span>
        </div>
      </div>
    </div>
  );
};
