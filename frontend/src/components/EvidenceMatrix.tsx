import React, { useState, useMemo } from 'react';
import { Paper, StudyExtraction } from '../api/client';
import {
  FileText,
  ExternalLink,
  Info,
  CheckCircle2,
  XCircle,
  MinusCircle,
  Database,
  UploadCloud,
  Search,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  Copy,
  Check,
  ShieldCheck,
  Bookmark,
} from 'lucide-react';

interface EvidenceMatrixProps {
  papers: Paper[];
  extractions: StudyExtraction[];
}

type SortField =
  | 'title'
  | 'provenance'
  | 'model_system'
  | 'sample_size'
  | 'effect_direction'
  | 'effect_size'
  | 'p_value'
  | 'risk_of_bias';

type SortOrder = 'asc' | 'desc';

export const EvidenceMatrix: React.FC<EvidenceMatrixProps> = ({ papers, extractions }) => {
  const [selectedItem, setSelectedItem] = useState<{
    paper: Paper;
    extraction?: StudyExtraction;
  } | null>(null);
  const [filterDirection, setFilterDirection] = useState<string>('ALL');
  const [filterBias, setFilterBias] = useState<string>('ALL');
  const [filterSignificant, setFilterSignificant] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');
  const [sorts, setSorts] = useState<{ field: SortField; order: SortOrder }[]>([
    { field: 'p_value', order: 'asc' },
  ]);
  const [copiedSnippet, setCopiedSnippet] = useState(false);

  const paperMap = useMemo(() => {
    const map = new Map<string, Paper>();
    papers.forEach((p) => map.set(p.id, p));
    return map;
  }, [papers]);

  const handleSort = (field: SortField, e: React.MouseEvent) => {
    if (e.shiftKey) {
      setSorts((prev) => {
        const existingIdx = prev.findIndex((s) => s.field === field);
        if (existingIdx >= 0) {
          const newSorts = [...prev];
          newSorts[existingIdx] = {
            ...newSorts[existingIdx],
            order: newSorts[existingIdx].order === 'asc' ? 'desc' : 'asc',
          };
          return newSorts;
        } else {
          return [...prev, { field, order: 'asc' }];
        }
      });
    } else {
      setSorts((prev) => {
        if (prev.length === 1 && prev[0].field === field) {
          return [{ field, order: prev[0].order === 'asc' ? 'desc' : 'asc' }];
        }
        return [{ field, order: 'asc' }];
      });
    }
  };

  const filteredAndSortedExtractions = useMemo(() => {
    return extractions
      .filter((e) => {
        if (filterDirection !== 'ALL' && e.effect_direction !== filterDirection) return false;
        if (filterBias !== 'ALL' && e.risk_of_bias !== filterBias) return false;
        if (filterSignificant && (e.p_value === null || e.p_value > 0.05)) return false;
        if (!searchFilter.trim()) return true;
        const p = paperMap.get(e.paper_id);
        const searchTarget = `${p?.title || ''} ${p?.journal || ''} ${e.model_system || ''} ${
          e.intervention || ''
        }`.toLowerCase();
        return searchTarget.includes(searchFilter.toLowerCase());
      })
      .sort((a, b) => {
        const paperA = paperMap.get(a.paper_id);
        const paperB = paperMap.get(b.paper_id);

        for (const sort of sorts) {
          let valA: any;
          let valB: any;

          switch (sort.field) {
            case 'title':
              valA = paperA?.title || a.paper_title || '';
              valB = paperB?.title || b.paper_title || '';
              break;
            case 'provenance':
              valA = paperA?.provenance || '';
              valB = paperB?.provenance || '';
              break;
            case 'model_system':
              valA = a.model_system || '';
              valB = b.model_system || '';
              break;
            case 'sample_size':
              valA = a.sample_size ?? -1;
              valB = b.sample_size ?? -1;
              break;
            case 'effect_direction':
              valA = a.effect_direction || '';
              valB = b.effect_direction || '';
              break;
            case 'effect_size':
              valA = a.effect_size ?? -999;
              valB = b.effect_size ?? -999;
              break;
            case 'p_value':
              valA = a.p_value ?? 999;
              valB = b.p_value ?? 999;
              break;
            case 'risk_of_bias':
              valA = a.risk_of_bias === 'LOW' ? 1 : a.risk_of_bias === 'MODERATE' ? 2 : 3;
              valB = b.risk_of_bias === 'LOW' ? 1 : b.risk_of_bias === 'MODERATE' ? 2 : 3;
              break;
            default:
              continue;
          }

          if (valA === valB) continue;

          if (typeof valA === 'string' && typeof valB === 'string') {
            return sort.order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
          }
          return sort.order === 'asc' ? valA - valB : valB - valA;
        }
        return 0;
      });
  }, [extractions, filterDirection, filterBias, filterSignificant, searchFilter, sorts, paperMap]);

  const getDirectionBadge = (dir: string | null) => {
    switch (dir) {
      case 'POSITIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/25">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
            POS (+)
          </span>
        );
      case 'NEGATIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
            <XCircle className="w-3 h-3 text-rose-400" />
            NEG (-)
          </span>
        );
      case 'NEUTRAL':
      case 'MIXED':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-slate-800 text-slate-300 border border-slate-700">
            <MinusCircle className="w-3 h-3 text-slate-400" />
            {dir}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-slate-500">
            UNSPECIFIED
          </span>
        );
    }
  };

  const getProvenanceBadge = (paper?: Paper, extraction?: StudyExtraction) => {
    const prov = paper?.provenance || extraction?.provenance;
    if (prov === 'PUBMED_CENTRAL' || paper?.pmid) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
          <Database className="w-2.5 h-2.5" /> PubMed
        </span>
      );
    }
    if (prov === 'CROSSREF_SCHOLARLY') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-sky-500/10 text-sky-400 border border-sky-500/20 font-medium">
          <Database className="w-2.5 h-2.5" /> CrossRef
        </span>
      );
    }
    if (prov === 'EUROPE_PMC') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
          <Database className="w-2.5 h-2.5" /> Europe PMC
        </span>
      );
    }
    if (prov === 'USER_UPLOAD' || paper?.s3_pdf_url) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 font-medium">
          <UploadCloud className="w-2.5 h-2.5" /> S3 PDF
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono bg-slate-800/80 text-slate-300 border border-slate-700/60 font-medium">
        <ShieldCheck className="w-2.5 h-2.5 text-slate-400" /> Benchmark
      </span>
    );
  };

  const getBiasBadge = (bias: string | null) => {
    switch (bias) {
      case 'LOW':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/25">
            LOW BIAS
          </span>
        );
      case 'MODERATE':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/25">
            MODERATE
          </span>
        );
      case 'HIGH':
        return (
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/25">
            HIGH BIAS
          </span>
        );
      default:
        return <span className="text-[11px] font-mono text-slate-500">N/A</span>;
    }
  };

  const renderSortIndicator = (field: SortField) => {
    const sortIdx = sorts.findIndex((s) => s.field === field);
    if (sortIdx === -1) {
      return <ArrowUpDown className="w-3 h-3 text-slate-600 opacity-60 inline ml-1" />;
    }
    const sort = sorts[sortIdx];
    const badgeNumbers = ['①', '②', '③', '④', '⑤'];
    const badge =
      sorts.length > 1 && sortIdx < badgeNumbers.length ? (
        <span className="ml-0.5 text-[9px] text-emerald-400 font-bold">
          {badgeNumbers[sortIdx]}
        </span>
      ) : null;

    return sort.order === 'asc' ? (
      <span className="inline-flex items-center">
        <ArrowUp className="w-3 h-3 text-emerald-400 inline ml-1" />
        {badge}
      </span>
    ) : (
      <span className="inline-flex items-center">
        <ArrowDown className="w-3 h-3 text-emerald-400 inline ml-1" />
        {badge}
      </span>
    );
  };

  const handleCopySnippet = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2000);
  };

  return (
    <section className="surface-panel rounded-xl p-5 sm:p-6 relative overflow-hidden transition-all">
      {/* Table Top Controls & Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 hairline-b mb-4">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Structured Evidence Matrix
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-surface-elevated text-slate-300 border border-white/10">
              {filteredAndSortedExtractions.length} of {extractions.length} Studies
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Verified study parameters extracted by Bedrock agents & indexed in CockroachDB
          </p>
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col items-end gap-2.5">
          {/* Row 1: Search & Direction */}
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {/* In-table Search */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                placeholder="Filter studies..."
                className="pl-8 pr-3 py-1.5 bg-surface-base border border-white/10 rounded-lg text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-emerald-500 w-40 sm:w-48"
              />
            </div>

            {/* Direction Filter Segmented Buttons */}
            <div className="flex items-center bg-surface-base p-1 rounded-lg border border-white/10 text-xs font-mono">
              {['ALL', 'POSITIVE', 'NEGATIVE', 'NEUTRAL'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterDirection(filter)}
                  className={`px-2.5 py-1 rounded transition-colors font-medium text-[11px] ${
                    filterDirection === filter
                      ? 'bg-surface-elevated text-slate-100 shadow-sm border border-white/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter === 'ALL'
                    ? 'All'
                    : filter === 'POSITIVE'
                    ? 'Pos (+)'
                    : filter === 'NEGATIVE'
                    ? 'Neg (-)'
                    : 'Neutral'}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Bias & Significance */}
          <div className="flex flex-wrap items-center justify-end gap-2.5">
            {/* Bias Filter Segmented Buttons */}
            <div className="flex items-center bg-surface-base p-1 rounded-lg border border-white/10 text-xs font-mono">
              <span className="px-2 text-slate-500 text-[10px] uppercase font-semibold">Bias:</span>
              {['ALL', 'LOW', 'MODERATE', 'HIGH'].map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterBias(filter)}
                  className={`px-2.5 py-1 rounded transition-colors font-medium text-[11px] ${
                    filterBias === filter
                      ? 'bg-surface-elevated text-slate-100 shadow-sm border border-white/10'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {filter === 'ALL' ? 'All' : filter === 'LOW' ? 'Low' : filter === 'MODERATE' ? 'Mod' : 'High'}
                </button>
              ))}
            </div>

            {/* Statistical Significance Toggle */}
            <button
              onClick={() => setFilterSignificant(!filterSignificant)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[11px] font-mono font-medium transition-colors ${
                filterSignificant
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                  : 'bg-surface-base text-slate-400 border-white/10 hover:text-slate-200'
              }`}
            >
              {filterSignificant ? <CheckCircle2 className="w-3.5 h-3.5" /> : <div className="w-3.5 h-3.5 rounded-full border border-slate-500" />}
              p ≤ 0.05 only
            </button>
          </div>
        </div>
      </div>

      {/* Main Table Container */}
      <div className="overflow-x-auto border border-white/10 rounded-lg surface-inset max-h-[560px] overflow-y-auto">
        <table className="w-full text-left text-xs tabular-nums">
          <thead className="sticky top-0 z-20 bg-surface-elevated text-slate-300 uppercase tracking-wider font-semibold font-mono text-[10px] hairline-b">
            <tr>
              <th
                onClick={(e) => handleSort('title', e)}
                className="py-3 px-4 cursor-pointer hover:text-white select-none whitespace-nowrap"
              >
                Study / Paper Title {renderSortIndicator('title')}
              </th>
              <th
                onClick={(e) => handleSort('provenance', e)}
                className="py-3 px-3 cursor-pointer hover:text-white select-none whitespace-nowrap"
              >
                Provenance {renderSortIndicator('provenance')}
              </th>
              <th
                onClick={(e) => handleSort('model_system', e)}
                className="py-3 px-3 cursor-pointer hover:text-white select-none whitespace-nowrap"
              >
                Model System {renderSortIndicator('model_system')}
              </th>
              <th
                onClick={(e) => handleSort('sample_size', e)}
                className="py-3 px-3 text-right cursor-pointer hover:text-white select-none whitespace-nowrap"
              >
                Sample (N) {renderSortIndicator('sample_size')}
              </th>
              <th
                onClick={(e) => handleSort('effect_direction', e)}
                className="py-3 px-3 text-center cursor-pointer hover:text-white select-none whitespace-nowrap"
              >
                Direction {renderSortIndicator('effect_direction')}
              </th>
              <th
                onClick={(e) => handleSort('effect_size', e)}
                className="py-3 px-3 text-right cursor-pointer hover:text-white select-none whitespace-nowrap"
              >
                Effect (Δ%) {renderSortIndicator('effect_size')}
              </th>
              <th
                onClick={(e) => handleSort('p_value', e)}
                className="py-3 px-3 text-right cursor-pointer hover:text-white select-none whitespace-nowrap"
              >
                p-value {renderSortIndicator('p_value')}
              </th>
              <th
                onClick={(e) => handleSort('risk_of_bias', e)}
                className="py-3 px-3 text-center cursor-pointer hover:text-white select-none whitespace-nowrap"
              >
                Risk of Bias {renderSortIndicator('risk_of_bias')}
              </th>
              <th className="py-3 px-3 text-center whitespace-nowrap">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/5 bg-surface-base/60">
            {filteredAndSortedExtractions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-12 text-center text-slate-500 font-mono text-xs">
                  No extracted studies matched the active filter criteria.
                </td>
              </tr>
            ) : (
              filteredAndSortedExtractions.map((extraction) => {
                const paper = paperMap.get(extraction.paper_id);
                const title = paper?.title || extraction.paper_title || 'Unknown Study';
                const journal = paper?.journal || extraction.journal || 'Peer-Reviewed';
                const year = paper?.year || extraction.paper_year;

                return (
                  <tr
                    key={extraction.id}
                    onClick={() => paper && setSelectedItem({ paper, extraction })}
                    className="hover:bg-surface-elevated/70 transition-colors group cursor-pointer"
                  >
                    {/* Title & Journal */}
                    <td className="py-3 px-4 font-normal text-slate-200 max-w-sm">
                      <div className="line-clamp-2 font-medium text-slate-100 group-hover:text-emerald-300 transition-colors leading-snug">
                        {title}
                      </div>
                      <div className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1.5">
                        <span className="truncate max-w-[200px]">{journal}</span>
                        {year && <span>• {year}</span>}
                      </div>
                    </td>

                    {/* Provenance Badge */}
                    <td className="py-3 px-3 whitespace-nowrap">
                      {getProvenanceBadge(paper, extraction)}
                    </td>

                    {/* Model System */}
                    <td className="py-3 px-3 text-slate-300 font-mono text-[11px] max-w-[130px] truncate">
                      {extraction.model_system || 'Standard Cohort'}
                    </td>

                    {/* Sample Size (N) */}
                    <td className="py-3 px-3 text-right font-mono font-medium text-slate-200">
                      {extraction.sample_size !== null ? extraction.sample_size : '—'}
                    </td>

                    {/* Direction */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {getDirectionBadge(extraction.effect_direction)}
                    </td>

                    {/* Effect Size (Δ%) */}
                    <td className="py-3 px-3 text-right font-mono font-semibold">
                      {extraction.effect_size !== null ? (
                        <span
                          className={
                            extraction.effect_size > 0
                              ? 'text-emerald-400'
                              : extraction.effect_size < 0
                              ? 'text-rose-400'
                              : 'text-slate-300'
                          }
                        >
                          {extraction.effect_size > 0 ? '+' : ''}
                          {extraction.effect_size}%
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* p-value */}
                    <td className="py-3 px-3 text-right font-mono">
                      {extraction.p_value !== null ? (
                        <span
                          className={
                            extraction.p_value <= 0.05
                              ? 'text-emerald-400 font-bold'
                              : 'text-slate-400'
                          }
                        >
                          {extraction.p_value}
                        </span>
                      ) : (
                        <span className="text-slate-500">—</span>
                      )}
                    </td>

                    {/* Risk of Bias */}
                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {getBiasBadge(extraction.risk_of_bias)}
                    </td>

                    {/* Audit Action */}
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (paper) setSelectedItem({ paper, extraction });
                        }}
                        className="p-1 rounded text-slate-400 hover:text-emerald-400 hover:bg-surface-elevated transition-colors"
                        title="Audit claim snippet & primary source"
                        aria-label="Audit study"
                      >
                        <Info className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Row Count / Audit Footer */}
      <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-3">
        <span>Click any row to inspect verbatim claims and primary DOI / PMID records</span>
        <span>Deterministic Extractor Output</span>
      </div>

      {/* Drawer Keyframes */}
      <style>{`
        @keyframes slideInRight {
          from { transform: translateX(100%); }
          to { transform: translateX(0); }
        }
      `}</style>

      {/* Audit Detail Drawer */}
      {selectedItem && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex justify-end animate-fade-in"
          onClick={() => setSelectedItem(null)}
        >
          {/* Drawer Panel */}
          <div 
            onClick={(e) => e.stopPropagation()}
            className="w-full sm:w-[420px] h-full bg-surface-elevated border-l border-white/10 shadow-2xl flex flex-col p-6 overflow-y-auto"
            style={{ animation: 'slideInRight 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards' }}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 pb-4 hairline-b">
              <div>
                <div className="flex items-center gap-2 mb-1.5">
                  <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wide font-bold">
                    PRIMARY SOURCE AUDIT TRAIL
                  </span>
                  {getProvenanceBadge(selectedItem.paper, selectedItem.extraction)}
                </div>
                <h4 className="text-base sm:text-lg font-bold text-slate-100 leading-snug">
                  {selectedItem.paper.title}
                </h4>
                <div className="text-xs text-slate-400 font-mono mt-2 flex flex-wrap items-center gap-3">
                  <span>Journal: {selectedItem.paper.journal || 'Peer-Reviewed'}</span>
                  <span>Year: {selectedItem.paper.year || 'N/A'}</span>
                  {selectedItem.paper.doi && (
                    <a
                      href={`https://doi.org/${selectedItem.paper.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                    >
                      DOI: {selectedItem.paper.doi}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedItem.paper.pmid && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${selectedItem.paper.pmid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-sky-400 hover:underline"
                    >
                      PMID: {selectedItem.paper.pmid}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedItem.paper.s3_pdf_url && (
                    <a
                      href={selectedItem.paper.s3_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-amber-400 hover:underline"
                    >
                      S3 PDF Lake
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-surface-card"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Verbatim Claim Snippet */}
            {selectedItem.extraction?.evidence_snippet && (
              <div className="my-4 p-4 rounded-lg bg-emerald-950/20 border border-emerald-500/30">
                <div className="flex items-center justify-between text-[11px] font-mono font-bold text-emerald-400 uppercase tracking-wide mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verbatim Claim Evidence Snippet
                  </span>
                  <button
                    onClick={() => handleCopySnippet(selectedItem.extraction?.evidence_snippet || '')}
                    className="inline-flex items-center gap-1 text-[10px] text-slate-400 hover:text-emerald-300"
                  >
                    {copiedSnippet ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    {copiedSnippet ? 'Copied' : 'Copy'}
                  </button>
                </div>
                <blockquote className="text-xs text-slate-200 font-mono italic leading-relaxed">
                  "{selectedItem.extraction.evidence_snippet}"
                </blockquote>
              </div>
            )}

            {/* Extracted Parameters Matrix */}
            {selectedItem.extraction && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 surface-inset p-3.5 rounded-lg border border-white/5 text-xs font-mono">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Intervention</span>
                  <span className="text-slate-200 font-medium truncate block">
                    {selectedItem.extraction.intervention || 'Standard'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Control</span>
                  <span className="text-slate-200 font-medium truncate block">
                    {selectedItem.extraction.control || 'Vehicle'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Sample (N)</span>
                  <span className="text-slate-200 font-bold tabular-nums">
                    {selectedItem.extraction.sample_size || 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">p-value</span>
                  <span className="text-emerald-400 font-bold tabular-nums">
                    {selectedItem.extraction.p_value || 'N/A'}
                  </span>
                </div>
              </div>
            )}

            {/* Full Abstract Text */}
            <div className="mt-4">
              <h5 className="text-[11px] font-mono font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                <Bookmark className="w-3 h-3 text-slate-400" /> Full Abstract
              </h5>
              <p className="text-xs text-slate-300 leading-relaxed surface-inset p-3.5 rounded-lg border border-white/5 max-h-48 overflow-y-auto">
                {selectedItem.paper.abstract_text}
              </p>
            </div>

            {/* Footer */}
            <div className="mt-5 flex items-center justify-between pt-3 hairline-t text-xs font-mono">
              <span className="text-slate-500 text-[10px]">
                Extracted by: {selectedItem.extraction?.extracted_by_agent || 'Bedrock Extractor Agent'}
              </span>
              <button
                onClick={() => setSelectedItem(null)}
                className="px-4 py-2 bg-surface-card hover:bg-surface-card/80 text-slate-200 text-xs font-mono rounded-lg border border-white/10 transition-colors"
              >
                Close Audit
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
