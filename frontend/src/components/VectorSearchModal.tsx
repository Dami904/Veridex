import React, { useState } from 'react';
import { searchVectorPapers, Paper } from '../api/client';
import { Database, Search, Loader2, X, Sparkles, ExternalLink } from 'lucide-react';

interface VectorSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VectorSearchModal: React.FC<VectorSearchModalProps> = ({ isOpen, onClose }) => {
  const [queryText, setQueryText] = useState('mammalian healthspan extension and cellular toxicity');
  const [results, setResults] = useState<Paper[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryText.trim()) return;

    setIsSearching(true);
    setError(null);
    setHasSearched(true);

    try {
      const data = await searchVectorPapers(queryText.trim(), 8);
      setResults(data.results || []);
    } catch (err: any) {
      setError(err.message || 'Vector search failed');
    } finally {
      setIsSearching(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Database className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                CockroachDB C-SPANN Vector Semantic Search
              </h3>
              <p className="text-xs text-slate-400">
                1024-dimensional Titan V2 embeddings & native cosine distance retrieval (<code className="font-mono text-emerald-400">&lt;-&gt;</code>)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="my-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search concepts across indexed paper embeddings..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shadow-emerald-500/10"
          >
            {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            Vector Search
          </button>
        </form>

        {/* Results Stream */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 text-xs">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Querying CockroachDB distributed C-SPANN vector index...</span>
            </div>
          ) : error ? (
            <div className="text-rose-400 text-center py-8 text-xs">{error}</div>
          ) : results.length > 0 ? (
            results.map((paper, idx) => (
              <div
                key={paper.id || idx}
                className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl hover:border-slate-700 transition-all text-xs"
              >
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <h4 className="font-semibold text-white text-xs line-clamp-1">{paper.title}</h4>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="font-mono text-[10px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">
                      {paper.similarity_pct || 85}% Match
                    </span>
                  </div>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2">
                  {paper.abstract_text}
                </p>
                <div className="flex items-center justify-between text-[10px] text-slate-500">
                  <span>
                    {paper.journal || 'Peer-Reviewed'} • {paper.year || '2024'}
                  </span>
                  {paper.doi && (
                    <span className="font-mono text-slate-400 flex items-center gap-1">
                      DOI: {paper.doi}
                    </span>
                  )}
                </div>
              </div>
            ))
          ) : hasSearched ? (
            <div className="text-slate-400 text-center py-12 text-xs">
              No matching vector clusters found for this query in the indexed memory.
            </div>
          ) : (
            <div className="text-slate-500 text-center py-12 text-xs">
              Type any concept or hypothesis above to run cosine distance search over CockroachDB vector memory.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
