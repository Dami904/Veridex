import React, { useState } from 'react';
import { addPaper, uploadPdfPaper } from '../api/client';
import {
  PlusCircle,
  Loader2,
  Sparkles,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  X,
  FileCheck2,
} from 'lucide-react';

interface AddPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaperAdded: () => void;
  currentResearchQuery: string;
}

type UploadState = 'idle' | 'uploading' | 'parsing' | 'success' | 'error';

export const AddPaperModal: React.FC<AddPaperModalProps> = ({
  isOpen,
  onClose,
  onPaperAdded,
  currentResearchQuery,
}) => {
  const [activeTab, setActiveTab] = useState<'text' | 'pdf'>('text');
  const [title, setTitle] = useState('');
  const [journal, setJournal] = useState('');
  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [doi, setDoi] = useState('');
  const [abstractText, setAbstractText] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const [uploadState, setUploadState] = useState<UploadState>('idle');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setJournal('');
    setDoi('');
    setAbstractText('');
    setSelectedFile(null);
    setUploadState('idle');
    setErrorMessage(null);
    setSuccessMessage(null);
  };

  const handleClose = () => {
    if (isSubmitting || uploadState === 'uploading' || uploadState === 'parsing') return;
    resetForm();
    onClose();
  };

  const handlePdfUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setErrorMessage('Please select a valid PDF file to upload.');
      return;
    }

    setErrorMessage(null);
    setSuccessMessage(null);
    setUploadState('uploading');

    try {
      // Step 1: Uploading to S3 & initiating parse
      setUploadState('parsing');
      await uploadPdfPaper(selectedFile, currentResearchQuery);

      // Step 2: Confirmed success from backend
      setUploadState('success');
      setSuccessMessage(`Successfully uploaded and extracted claims from "${selectedFile.name}".`);

      setTimeout(() => {
        onPaperAdded();
        handleClose();
      }, 1200);
    } catch (err: any) {
      setUploadState('error');
      setErrorMessage(err.message || 'PDF parsing and claim extraction failed.');
    }
  };

  const handleTextSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (!title.trim() || !abstractText.trim()) {
      setErrorMessage('Paper Title and Abstract text are required fields.');
      return;
    }

    setIsSubmitting(true);
    try {
      await addPaper({
        title: title.trim(),
        journal: journal.trim() || undefined,
        year: Number(year) || undefined,
        doi: doi.trim() || undefined,
        abstract_text: abstractText.trim(),
        research_query: currentResearchQuery,
      });

      setSuccessMessage('Study successfully vectorized and indexed in CockroachDB.');
      setTimeout(() => {
        onPaperAdded();
        handleClose();
      }, 900);
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to ingest paper.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const loadExample = (type: 'positive' | 'negative' | 'glp1') => {
    if (type === 'positive') {
      setTitle('Ultra-low dose metformin reverses age-associated neurovascular decline in aging rodents');
      setJournal('Journal of Neuroscience');
      setYear(2025);
      setDoi('10.1523/JNEUROSCI.2025.101');
      setAbstractText(
        'Daily administration of 10 mg/kg metformin in 18-month-old male mice (n = 80) preserved cerebral capillary density and enhanced spatial memory retention on Morris water maze. Mean overall survival was extended by 16.8% (p = 0.001) without adverse biomarker shifts.'
      );
    } else if (type === 'negative') {
      setTitle('Supra-physiological metformin administration induces acute hepatic transaminitis in senescent models');
      setJournal('Toxicological Sciences');
      setYear(2025);
      setDoi('10.1093/toxsci/2025.202');
      setAbstractText(
        'Evaluating high concentration metformin (400 mg/kg/day) in 22-month-old mice (n = 60) led to marked ALT/AST enzyme elevation and shortened maximum lifespan by 18.2% (p = 0.004) due to mitochondrial uncoupling and lactic acidosis.'
      );
    } else {
      setTitle('Microglial phenotypic reprogramming by liraglutide preserves synaptogenesis in neurodegenerative models');
      setJournal('Brain, Behavior, and Immunity');
      setYear(2024);
      setDoi('10.1016/j.bbi.2024.04.019');
      setAbstractText(
        'Evaluating central GLP-1 receptor agonist liraglutide (50 ug/kg/day) in aged APP/PS1 mice (n = 45). Treated cohorts exhibited a 42% downregulation in pro-inflammatory IL-1beta and TNF-alpha cytokines (p = 0.002) with marked preservation of dendritic spine density.'
      );
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="surface-elevated rounded-xl max-w-xl w-full p-6 shadow-2xl relative border border-white/10 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 hairline-b">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
              <PlusCircle className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-100 tracking-tight">
                Ingest Primary Study
              </h3>
              <p className="text-xs text-slate-400 font-mono">
                Titan V2 Vectorization & Bedrock Claim Extraction
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            disabled={isSubmitting || uploadState === 'uploading' || uploadState === 'parsing'}
            className="text-slate-400 hover:text-white p-1 rounded hover:bg-surface-card disabled:opacity-40"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-1.5 my-4 p-1 surface-inset rounded-lg border border-white/5 text-xs font-mono">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-1.5 rounded-md font-medium transition-all ${
              activeTab === 'text'
                ? 'bg-surface-elevated text-slate-100 border border-white/10 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste Abstract / DOI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 py-1.5 rounded-md font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'pdf'
                ? 'bg-surface-elevated text-slate-100 border border-white/10 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
            Upload PDF Document
          </button>
        </div>

        {/* PDF Mode */}
        {activeTab === 'pdf' ? (
          <form onSubmit={handlePdfUpload} className="space-y-4">
            <div className="border-2 border-dashed border-white/15 hover:border-emerald-500/50 rounded-xl p-6 text-center surface-inset transition-all">
              <input
                type="file"
                accept=".pdf"
                id="pdf-upload-input"
                disabled={uploadState === 'uploading' || uploadState === 'parsing'}
                onChange={(e) => {
                  setSelectedFile(e.target.files?.[0] || null);
                  setUploadState('idle');
                  setErrorMessage(null);
                }}
                className="hidden"
              />
              <label htmlFor="pdf-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                <div className="w-10 h-10 rounded-lg bg-surface-card border border-white/10 flex items-center justify-center text-slate-300">
                  <FileText className="w-5 h-5 text-emerald-400" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-200 block">
                    {selectedFile ? selectedFile.name : 'Select or drop scientific PDF document'}
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono mt-1 block">
                    Extracts title, sample size N, effect direction, and uploads to S3
                  </span>
                </div>
              </label>
            </div>

            {/* State Machine Feedback */}
            {uploadState === 'uploading' && (
              <div className="p-3 rounded-lg bg-sky-500/10 border border-sky-500/25 text-sky-400 text-xs font-mono flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Streaming PDF binary to AWS S3 Paper Lake...</span>
              </div>
            )}

            {uploadState === 'parsing' && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin shrink-0" />
                <span>Bedrock Extractor Agent parsing study parameters...</span>
              </div>
            )}

            {uploadState === 'success' && successMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 hairline-t">
              <button
                type="button"
                onClick={handleClose}
                disabled={uploadState === 'uploading' || uploadState === 'parsing'}
                className="px-3.5 py-2 rounded-lg bg-surface-card hover:bg-surface-elevated text-slate-300 text-xs font-mono border border-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!selectedFile || uploadState === 'uploading' || uploadState === 'parsing'}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs font-mono flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {uploadState === 'uploading' || uploadState === 'parsing' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Processing PDF...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-3.5 h-3.5" />
                    <span>Parse PDF & Ingest</span>
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          /* Text / Abstract Mode */
          <form onSubmit={handleTextSubmit} className="space-y-3.5 text-xs">
            {/* Quick Demo Pre-fills */}
            <div className="p-3 surface-inset rounded-lg border border-white/5">
              <div className="flex items-center justify-between text-[11px] text-slate-400 mb-2 font-mono">
                <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                  <Sparkles className="w-3.5 h-3.5" /> Load Study Benchmark:
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => loadExample('positive')}
                  className="text-[11px] font-mono px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/25 hover:bg-emerald-500/20 transition-all"
                >
                  + Pos (Low-Dose 10mg/kg)
                </button>
                <button
                  type="button"
                  onClick={() => loadExample('negative')}
                  className="text-[11px] font-mono px-2.5 py-1 rounded bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500/20 transition-all"
                >
                  - Neg (High-Dose 400mg/kg)
                </button>
                <button
                  type="button"
                  onClick={() => loadExample('glp1')}
                  className="text-[11px] font-mono px-2.5 py-1 rounded bg-sky-500/10 text-sky-400 border border-sky-500/25 hover:bg-sky-500/20 transition-all"
                >
                  GLP-1 Neuro Case
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium font-mono text-[11px] mb-1">
                Paper Title *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Metformin improves healthspan and lifespan in non-diabetic male mice"
                className="w-full px-3 py-2 bg-surface-base border border-white/10 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div className="col-span-2">
                <label className="block text-slate-300 font-medium font-mono text-[11px] mb-1">
                  Journal
                </label>
                <input
                  type="text"
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  placeholder="e.g. Nature Communications"
                  className="w-full px-3 py-2 bg-surface-base border border-white/10 rounded-lg text-slate-100 placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium font-mono text-[11px] mb-1">
                  Year
                </label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-surface-base border border-white/10 rounded-lg text-slate-100 font-mono focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium font-mono text-[11px] mb-1">
                DOI (Digital Object Identifier)
              </label>
              <input
                type="text"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder="e.g. 10.1038/ncomms3192"
                className="w-full px-3 py-2 bg-surface-base border border-white/10 rounded-lg text-slate-100 placeholder-slate-600 font-mono focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium font-mono text-[11px] mb-1">
                Abstract / Study Findings Text *
              </label>
              <textarea
                required
                rows={4}
                value={abstractText}
                onChange={(e) => setAbstractText(e.target.value)}
                placeholder="Paste study abstract with sample size, intervention, effect direction, and p-values..."
                className="w-full px-3 py-2 bg-surface-base border border-white/10 rounded-lg text-slate-100 placeholder-slate-600 font-mono text-xs leading-relaxed focus:outline-none focus:border-emerald-500"
              />
            </div>

            {errorMessage && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/25 text-rose-400 text-xs font-mono flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {successMessage && (
              <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-mono flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2.5 pt-3 hairline-t">
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                className="px-3.5 py-2 rounded-lg bg-surface-card hover:bg-surface-elevated text-slate-300 text-xs font-mono border border-white/10"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs font-mono flex items-center gap-1.5 transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Extracting Claims...</span>
                  </>
                ) : (
                  <>
                    <FileCheck2 className="w-3.5 h-3.5" />
                    <span>Vectorize & Ingest</span>
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
