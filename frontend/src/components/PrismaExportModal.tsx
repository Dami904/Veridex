import React, { useState, useEffect } from 'react';
import { fetchPrismaReport, downloadBibtex, downloadRis } from '../api/client';
import { FileText, Download, Copy, Check, Loader2, X, Bookmark, Share2 } from 'lucide-react';

interface PrismaExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  researchQuery: string;
}

export const PrismaExportModal: React.FC<PrismaExportModalProps> = ({
  isOpen,
  onClose,
  researchQuery,
}) => {
  const [reportMarkdown, setReportMarkdown] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && researchQuery) {
      loadReport();
    }
  }, [isOpen, researchQuery]);

  const loadReport = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await fetchPrismaReport(researchQuery);
      setReportMarkdown(data.markdown_report || '');
    } catch (err: any) {
      setError(err.message || 'Failed to generate PRISMA report');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(reportMarkdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([reportMarkdown], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Veridex_PRISMA_Review_${Date.now()}.md`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-4xl w-full p-6 shadow-2xl relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <FileText className="w-4 h-4 text-emerald-400" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white">
                PRISMA 2020 Systematic Review & Citation Exporter
              </h3>
              <p className="text-xs text-slate-400">
                Auditable systematic review report & direct Zotero / Mendeley / EndNote sync
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto my-4 bg-slate-950/80 border border-slate-800 rounded-xl p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Synthesizing PRISMA 2020 report from evidence memory...</span>
            </div>
          ) : error ? (
            <div className="text-rose-400 text-center py-8">{error}</div>
          ) : (
            reportMarkdown || 'No report content available.'
          )}
        </div>

        {/* Actions Footer */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-slate-800 text-xs">
          {/* Citation Sync Formats */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => downloadBibtex(researchQuery)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 flex items-center gap-1 transition-all"
              title="Download BibTeX (.bib) for Zotero, Mendeley & LaTeX"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>BibTeX (.bib)</span>
            </button>
            <button
              onClick={() => downloadRis(researchQuery)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 flex items-center gap-1 transition-all"
              title="Download RIS (.ris) for EndNote & Reference Manager"
            >
              <Share2 className="w-3.5 h-3.5 text-blue-400" />
              <span>EndNote (.ris)</span>
            </button>
          </div>

          {/* PRISMA Markdown Actions */}
          <div className="flex items-center gap-2.5">
            <button
              onClick={handleCopy}
              disabled={isLoading || !reportMarkdown}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 border border-slate-700 flex items-center gap-1.5 transition-all font-medium"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              {copied ? 'Copied Markdown' : 'Copy Markdown'}
            </button>
            <button
              onClick={handleDownload}
              disabled={isLoading || !reportMarkdown}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
            >
              <Download className="w-4 h-4" />
              Download PRISMA .md
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
