import React, { useState, useEffect } from 'react';
import { fetchPrismaReport, downloadBibtex, downloadRis } from '../api/client';
import {
  FileText,
  Download,
  Copy,
  Check,
  Loader2,
  X,
  Bookmark,
  Share2,
} from 'lucide-react';

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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && researchQuery) {
      loadReport();
    }
  }, [isOpen, researchQuery]);

  const loadReport = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchPrismaReport(researchQuery);
      setReportMarkdown(data.markdown_report || '');
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to generate PRISMA 2020 report.');
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
      <div className="surface-elevated rounded-xl max-w-4xl w-full p-6 shadow-2xl relative border border-white/10 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 hairline-b">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                PRISMA 2020 Systematic Review & Citation Export
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Auditable systematic literature review document & citation reference sync
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

        {/* Content Preview Box */}
        <div className="flex-1 overflow-y-auto my-4 surface-inset rounded-lg p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed border border-white/5">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-emerald-400" />
              <span>Generating PRISMA 2020 review markdown from evidence memory...</span>
            </div>
          ) : errorMessage ? (
            <div className="text-rose-400 text-center py-8">{errorMessage}</div>
          ) : (
            reportMarkdown || 'No PRISMA report available for this query.'
          )}
        </div>

        {/* Actions Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 hairline-t text-xs font-mono">
          {/* Citation Direct Downloads */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-slate-500 uppercase tracking-wide">Sync:</span>
            <button
              onClick={() => downloadBibtex(researchQuery)}
              className="px-2.5 py-1.5 rounded-lg surface-card hover:bg-surface-card/80 border border-white/10 text-slate-200 flex items-center gap-1.5 transition-all text-xs"
              title="Download BibTeX (.bib) for Zotero, Mendeley & LaTeX"
            >
              <Bookmark className="w-3.5 h-3.5 text-amber-400" />
              <span>BibTeX (.bib)</span>
            </button>
            <button
              onClick={() => downloadRis(researchQuery)}
              className="px-2.5 py-1.5 rounded-lg surface-card hover:bg-surface-card/80 border border-white/10 text-slate-200 flex items-center gap-1.5 transition-all text-xs"
              title="Download RIS (.ris) for EndNote & Reference Manager"
            >
              <Share2 className="w-3.5 h-3.5 text-sky-400" />
              <span>EndNote (.ris)</span>
            </button>
          </div>

          {/* Markdown Copy & Download */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopy}
              disabled={isLoading || !reportMarkdown}
              className="px-3 py-1.5 rounded-lg surface-card hover:bg-surface-card/80 text-slate-200 border border-white/10 flex items-center gap-1.5 transition-all font-medium disabled:opacity-50"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied' : 'Copy Markdown'}</span>
            </button>
            <button
              onClick={handleDownload}
              disabled={isLoading || !reportMarkdown}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download .md</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
