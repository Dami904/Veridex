import React, { useState } from 'react';
import { Paper, StudyExtraction } from '../api/client';
import { FileText, ExternalLink, Info, CheckCircle2, XCircle, MinusCircle, HelpCircle, ShieldCheck, Database, UploadCloud } from 'lucide-react';

interface EvidenceMatrixProps {
  papers: Paper[];
  extractions: StudyExtraction[];
}

export const EvidenceMatrix: React.FC<EvidenceMatrixProps> = ({ papers, extractions }) => {
  const [selectedPaper, setSelectedPaper] = useState<{ paper: Paper; extraction?: StudyExtraction } | null>(null);
  const [filterDirection, setFilterDirection] = useState<string>('ALL');

  const paperMap = new Map<string, Paper>();
  papers.forEach((p) => paperMap.set(p.id, p));

  const filteredExtractions = extractions.filter((e) => {
    if (filterDirection === 'ALL') return true;
    return e.effect_direction === filterDirection;
  });

  const getDirectionBadge = (dir: string | null) => {
    switch (dir) {
      case 'POSITIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle2 className="w-3 h-3" /> Positive
          </span>
        );
      case 'NEGATIVE':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <XCircle className="w-3 h-3" /> Negative
          </span>
        );
      case 'NEUTRAL':
      case 'MIXED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <MinusCircle className="w-3 h-3" /> {dir}
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-800 text-slate-400">
            <HelpCircle className="w-3 h-3" /> Unspecified
          </span>
        );
    }
  };

  const getProvenanceBadge = (paper?: Paper) => {
    const prov = paper?.provenance;
    if (prov === 'PUBMED_CENTRAL' || paper?.pmid) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20">
          <Database className="w-2.5 h-2.5" /> PubMed Central
        </span>
      );
    }
    if (prov === 'USER_UPLOAD' || paper?.s3_pdf_url) {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">
          <UploadCloud className="w-2.5 h-2.5" /> S3 Paper Lake
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
        <ShieldCheck className="w-2.5 h-2.5" /> Curated Benchmark
      </span>
    );
  };

  const getBiasBadge = (bias: string | null) => {
    switch (bias) {
      case 'LOW':
        return <span className="text-xs px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">Low Bias</span>;
      case 'MODERATE':
        return <span className="text-xs px-2 py-0.5 rounded bg-amber-950/60 text-amber-300 border border-amber-800/40">Moderate</span>;
      case 'HIGH':
        return <span className="text-xs px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40">High Bias</span>;
      default:
        return <span className="text-xs text-slate-500">N/A</span>;
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-400" />
            Structured Evidence Matrix
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time extracted study parameters linked to verified primary sources in CockroachDB
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
          {['ALL', 'POSITIVE', 'NEGATIVE', 'NEUTRAL'].map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterDirection(filter)}
              className={`px-2.5 py-1 rounded-md transition-colors font-medium ${
                filterDirection === filter
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto border border-slate-800/80 rounded-xl">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
            <tr>
              <th className="py-3 px-4">Study / Paper Title</th>
              <th className="py-3 px-3">Provenance</th>
              <th className="py-3 px-3">Model System</th>
              <th className="py-3 px-3 text-right">Sample (N)</th>
              <th className="py-3 px-3 text-center">Direction</th>
              <th className="py-3 px-3 text-right">Effect Size</th>
              <th className="py-3 px-3 text-right">p-value</th>
              <th className="py-3 px-3 text-center">Risk of Bias</th>
              <th className="py-3 px-4 text-center">Audit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 bg-slate-900/40">
            {filteredExtractions.length === 0 ? (
              <tr>
                <td colSpan={9} className="py-8 text-center text-slate-500">
                  No extracted studies found for this filter.
                </td>
              </tr>
            ) : (
              filteredExtractions.map((extraction) => {
                const paper = paperMap.get(extraction.paper_id);
                return (
                  <tr
                    key={extraction.id}
                    className="hover:bg-slate-800/40 transition-colors group cursor-pointer"
                    onClick={() => paper && setSelectedPaper({ paper, extraction })}
                  >
                    <td className="py-3.5 px-4 font-medium text-slate-100 max-w-xs">
                      <div className="line-clamp-2 group-hover:text-emerald-300 transition-colors">
                        {paper?.title || 'Unknown Paper'}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2">
                        <span>{paper?.journal || 'Journal'}</span>
                        {paper?.year && <span>• {paper.year}</span>}
                      </div>
                    </td>

                    <td className="py-3.5 px-3 whitespace-nowrap">
                      {getProvenanceBadge(paper)}
                    </td>

                    <td className="py-3.5 px-3 text-slate-300 max-w-[140px] truncate">
                      {extraction.model_system || 'Standard Cohort'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                      {extraction.sample_size !== null ? extraction.sample_size : '—'}
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {getDirectionBadge(extraction.effect_direction)}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono font-medium text-slate-100">
                      {extraction.effect_size !== null
                        ? `${extraction.effect_size > 0 ? '+' : ''}${extraction.effect_size}%`
                        : '—'}
                    </td>

                    <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                      {extraction.p_value !== null ? (
                        <span className={extraction.p_value <= 0.05 ? 'text-emerald-400 font-semibold' : 'text-slate-400'}>
                          {extraction.p_value}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>

                    <td className="py-3.5 px-3 text-center whitespace-nowrap">
                      {getBiasBadge(extraction.risk_of_bias)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (paper) setSelectedPaper({ paper, extraction });
                        }}
                        className="inline-flex items-center gap-1 text-slate-400 hover:text-emerald-400 transition-colors p-1"
                        title="View Evidence Snippet & Citations"
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

      {/* Detail Drawer Modal */}
      {selectedPaper && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-mono text-emerald-400 uppercase tracking-wide">
                    Paper Detail & Audit Trail
                  </span>
                  {getProvenanceBadge(selectedPaper.paper)}
                </div>
                <h4 className="text-lg font-bold text-white mt-1">
                  {selectedPaper.paper.title}
                </h4>
                <div className="text-xs text-slate-400 mt-2 flex flex-wrap items-center gap-3">
                  <span>Journal: {selectedPaper.paper.journal || 'N/A'}</span>
                  <span>Year: {selectedPaper.paper.year || 'N/A'}</span>
                  {selectedPaper.paper.doi && (
                    <a
                      href={`https://doi.org/${selectedPaper.paper.doi}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-emerald-400 hover:underline"
                    >
                      DOI: {selectedPaper.paper.doi}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedPaper.paper.pmid && (
                    <a
                      href={`https://pubmed.ncbi.nlm.nih.gov/${selectedPaper.paper.pmid}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                    >
                      PMID: {selectedPaper.paper.pmid}
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                  {selectedPaper.paper.s3_pdf_url && (
                    <a
                      href={selectedPaper.paper.s3_pdf_url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-amber-400 hover:underline"
                    >
                      S3 PDF Artifact
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              </div>
              <button
                onClick={() => setSelectedPaper(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Extracted Evidence Snippet */}
            {selectedPaper.extraction?.evidence_snippet && (
              <div className="my-4 bg-emerald-950/20 border border-emerald-800/40 rounded-xl p-3.5">
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Verbatim Claim Evidence Snippet
                </div>
                <blockquote className="text-sm italic text-slate-200 font-serif leading-relaxed">
                  "{selectedPaper.extraction.evidence_snippet}"
                </blockquote>
              </div>
            )}

            {/* Structured Parameters Breakdown */}
            {selectedPaper.extraction && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 my-4 bg-slate-950 p-3 rounded-xl border border-slate-800 text-xs">
                <div>
                  <span className="text-slate-500 block">Intervention:</span>
                  <span className="text-slate-200 font-medium">{selectedPaper.extraction.intervention || 'Standard'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Control:</span>
                  <span className="text-slate-200 font-medium">{selectedPaper.extraction.control || 'Vehicle'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">Sample Size (N):</span>
                  <span className="text-slate-200 font-mono font-medium">{selectedPaper.extraction.sample_size || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-slate-500 block">p-value:</span>
                  <span className="text-slate-200 font-mono font-medium">{selectedPaper.extraction.p_value || 'N/A'}</span>
                </div>
              </div>
            )}

            {/* Full Abstract */}
            <div className="mt-4">
              <h5 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1">
                Full Abstract Text
              </h5>
              <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                {selectedPaper.paper.abstract_text}
              </p>
            </div>

            <div className="mt-6 flex justify-end">
              <button
                onClick={() => setSelectedPaper(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-lg transition-colors"
              >
                Close Audit Detail
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
