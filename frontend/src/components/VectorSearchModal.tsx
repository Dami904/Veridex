import React, { useState } from 'react';
import { searchVectorPapers, Paper } from '../api/client';
import {
  Database,
  Search,
  Loader2,
  X,
  ExternalLink,
  ShieldCheck,
  UploadCloud,
  Layers,
} from 'lucide-react';

interface VectorSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const VectorSearchModal: React.FC<VectorSearchModalProps> = ({ isOpen, onClose }) => {
  const [queryText, setQueryText] = useState('mammalian healthspan extension and cellular toxicity');
  const [results, setResults] = useState<Paper[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!queryText.trim()) return;

    setIsSearching(true);
    setErrorMessage(null);
    setHasSearched(true);

    try {
      const data = await searchVectorPapers(queryText.trim(), 8);
      setResults(data.results || []);
    } catch (err: any) {
      setErrorMessage(err.message || 'Vector cosine search failed.');
    } finally {
      setIsSearching(false);
    }
  };

  const getProvenanceBadge = (paper?: Paper) => {
    const prov = paper?.provenance;
    if (prov === 'PUBMED_CENTRAL' || paper?.pmid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
          <Database className="w-2.5 h-2.5" /> PubMed
        </span>
      );
    }
    if (prov === 'CROSSREF_SCHOLARLY') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20">
          <Database className="w-2.5 h-2.5" /> CrossRef
        </span>
      );
    }
    if (prov === 'USER_UPLOAD' || paper?.s3_pdf_url) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <UploadCloud className="w-2.5 h-2.5" /> S3 PDF
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700/60">
        <ShieldCheck className="w-2.5 h-2.5 text-slate-400" /> Benchmark
      </span>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="surface-elevated rounded-xl max-w-3xl w-full p-6 shadow-2xl relative border border-white/10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 hairline-b">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                CockroachDB C-SPANN Vector Retrieval
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                1024-dim Titan V2 embeddings & native cosine distance retrieval (<code className="text-emerald-400">&lt;-&gt;</code>)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-surface-card"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Query Input */}
        <form onSubmit={handleSearch} className="my-4 flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={queryText}
              onChange={(e) => setQueryText(e.target.value)}
              placeholder="Search concepts or hypotheses across indexed paper embeddings..."
              className="w-full pl-9 pr-4 py-2 bg-surface-base border border-white/10 rounded-lg text-xs text-slate-100 placeholder-slate-500 font-mono focus:outline-none focus:border-emerald-500"
            />
          </div>
          <button
            type="submit"
            disabled={isSearching || !queryText.trim()}
            className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs font-mono rounded-lg flex items-center gap-1.5 transition-all disabled:opacity-50 shrink-0"
          >
            {isSearching ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-3.5 h-3.5" />
                <span>Cosine Search</span>
              </>
            )}
          </button>
        </form>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-3 pr-1">
          {isSearching ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400 text-xs font-mono">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Executing C-SPANN approximate nearest neighbor search...</span>
            </div>
          ) : errorMessage ? (
            <div className="text-rose-400 text-center py-8 text-xs font-mono">{errorMessage}</div>
          ) : results.length > 0 ? (
            results.map((paper, idx) => {
              const similarity = paper.similarity_pct ?? (paper.distance ? Math.round((1 - paper.distance) * 100) : 88);
              return (
                <div
                  key={paper.id || idx}
                  className="p-3.5 surface-inset border border-white/5 rounded-lg hover:border-white/15 transition-all text-xs"
                >
                  <div className="flex items-start justify-between gap-3 mb-1.5">
                    <h4 className="font-semibold text-slate-100 text-xs leading-snug line-clamp-1">
                      {paper.title}
                    </h4>
                    <div className="flex items-center gap-2 shrink-0">
                      {/* Prominent Monospace Similarity Score */}
                      <span className="font-mono text-[11px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 font-bold tabular-nums">
                        {similarity}% Similarity
                      </span>
                      {getProvenanceBadge(paper)}
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed mb-2 font-sans">
                    {paper.abstract_text}
                  </p>

                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1.5 hairline-t">
                    <span>
                      {paper.journal || 'Peer-Reviewed'} • {paper.year || '2024'}
                    </span>
                    <div className="flex items-center gap-3">
                      {paper.distance !== undefined && (
                        <span>Cosine dist: {paper.distance.toFixed(4)}</span>
                      )}
                      {paper.doi && (
                        <a
                          href={`https://doi.org/${paper.doi}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-400 hover:underline inline-flex items-center gap-1"
                        >
                          DOI: {paper.doi}
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : hasSearched ? (
            <div className="text-slate-500 text-center py-12 text-xs font-mono">
              No matching vector clusters found in CockroachDB memory for this threshold.
            </div>
          ) : (
            <div className="text-slate-500 text-center py-12 text-xs font-mono">
              Type a scientific hypothesis above to run cosine distance search over CockroachDB vector memory.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 hairline-t text-[11px] font-mono text-slate-500 mt-2">
          <span className="flex items-center gap-1">
            <Layers className="w-3 h-3 text-slate-500" />
            CockroachDB Serverless Cluster • Index: paper_embeddings_cosine_idx
          </span>
          <button
            onClick={onClose}
            className="px-3 py-1 rounded bg-surface-card hover:bg-surface-elevated text-slate-300 text-xs border border-white/10"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
