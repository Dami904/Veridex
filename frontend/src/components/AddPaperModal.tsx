import React, { useState } from 'react';
import { addPaper, uploadPdfPaper } from '../api/client';
import { PlusCircle, Loader2, Sparkles, UploadCloud, FileText, CheckCircle2 } from 'lucide-react';

interface AddPaperModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPaperAdded: () => void;
  currentResearchQuery: string;
}

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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMessage(null);

    if (activeTab === 'pdf') {
      if (!selectedFile) {
        setError('Please select a PDF file to upload');
        return;
      }

      setIsSubmitting(true);
      try {
        await uploadPdfPaper(selectedFile, currentResearchQuery);
        setSuccessMessage(`Successfully parsed "${selectedFile.name}" and extracted claims!`);
        setTimeout(() => {
          onPaperAdded();
          onClose();
        }, 1200);
      } catch (err: any) {
        setError(err.message || 'Failed to parse and upload PDF');
      } finally {
        setIsSubmitting(false);
      }
      return;
    }

    if (!title.trim() || !abstractText.trim()) {
      setError('Title and Abstract text are required');
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

      setTitle('');
      setJournal('');
      setDoi('');
      setAbstractText('');
      onPaperAdded();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to ingest paper');
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
      setAbstractText('Daily administration of 10 mg/kg metformin in 18-month-old male mice (n = 80) preserved cerebral capillary density and enhanced spatial memory retention on Morris water maze. Mean overall survival was extended by 16.8% (p = 0.001) without adverse biomarker shifts.');
    } else if (type === 'negative') {
      setTitle('Supra-physiological metformin administration induces acute hepatic transaminitis in senescent models');
      setJournal('Toxicological Sciences');
      setYear(2025);
      setDoi('10.1093/toxsci/2025.202');
      setAbstractText('Evaluating high concentration metformin (400 mg/kg/day) in 22-month-old mice (n = 60) led to marked ALT/AST enzyme elevation and shortened maximum lifespan by 18.2% (p = 0.004) due to mitochondrial uncoupling and lactic acidosis.');
    } else {
      setTitle('Microglial phenotypic reprogramming by liraglutide preserves synaptogenesis in neurodegenerative models');
      setJournal('Brain, Behavior, and Immunity');
      setYear(2024);
      setDoi('10.1016/j.bbi.2024.04.019');
      setAbstractText('Evaluating central GLP-1 receptor agonist liraglutide (50 ug/kg/day) in aged APP/PS1 mice (n = 45). Treated cohorts exhibited a 42% downregulation in pro-inflammatory IL-1beta and TNF-alpha cytokines (p = 0.002) with marked preservation of dendritic spine density.');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <PlusCircle className="w-5 h-5 text-emerald-400" />
              Ingest Study Paper into Evidence Base
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Extractor Agent will generate Titan V2 vector embeddings & extract parameters live
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
          >
            ✕
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center gap-2 my-4 p-1 bg-slate-950/80 rounded-xl border border-slate-800 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('text')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all ${
              activeTab === 'text'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Paste Abstract / DOI
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('pdf')}
            className={`flex-1 py-1.5 rounded-lg font-medium transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'pdf'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <UploadCloud className="w-3.5 h-3.5 text-emerald-400" />
            Upload PDF Document
          </button>
        </div>

        {activeTab === 'pdf' ? (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="border-2 border-dashed border-slate-700/80 hover:border-emerald-500/50 rounded-2xl p-6 text-center bg-slate-950/60 transition-all">
              <input
                type="file"
                accept=".pdf"
                id="pdf-upload-input"
                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                className="hidden"
              />
              <label htmlFor="pdf-upload-input" className="cursor-pointer flex flex-col items-center gap-2">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <FileText className="w-6 h-6" />
                </div>
                <div>
                  <span className="text-xs font-semibold text-white">
                    {selectedFile ? selectedFile.name : 'Click to select or drop a PDF research paper'}
                  </span>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Auto-parses title, abstract, sample size, and upload to AWS S3 Paper Lake
                  </p>
                </div>
              </label>
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                <span>{successMessage}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 text-xs"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !selectedFile}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-semibold text-xs shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Parsing PDF & Extracting...
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    Parse PDF & Extract
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {/* Quick Demo Pre-fills */}
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2 font-medium">
                <span className="flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
                  Load Real-World Study Case:
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => loadExample('positive')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-all"
                >
                  + Positive (Low-Dose 10mg/kg)
                </button>
                <button
                  type="button"
                  onClick={() => loadExample('negative')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-all"
                >
                  - Negative (High-Dose 400mg/kg)
                </button>
                <button
                  type="button"
                  onClick={() => loadExample('glp1')}
                  className="text-[11px] px-2.5 py-1 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20 hover:bg-blue-500/20 transition-all"
                >
                  GLP-1 Neuroprotection Case
                </button>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Paper Title *</label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Metformin improves healthspan and lifespan in non-diabetic male mice"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-slate-300 font-medium mb-1">Journal</label>
                <input
                  type="text"
                  value={journal}
                  onChange={(e) => setJournal(e.target.value)}
                  placeholder="e.g., Nature Communications"
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-medium mb-1">Year</label>
                <input
                  type="number"
                  value={year}
                  onChange={(e) => setYear(parseInt(e.target.value, 10))}
                  className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">DOI (Digital Object Identifier)</label>
              <input
                type="text"
                value={doi}
                onChange={(e) => setDoi(e.target.value)}
                placeholder="e.g., 10.1038/ncomms3192"
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-medium mb-1">Paper Abstract / Full Study Text *</label>
              <textarea
                required
                rows={4}
                value={abstractText}
                onChange={(e) => setAbstractText(e.target.value)}
                placeholder="Paste study abstract containing intervention, sample size, p-values, and methodology..."
                className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500 font-sans text-xs leading-relaxed"
              />
            </div>

            {error && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-400 text-xs">
                {error}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-300 transition-all"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-slate-950 font-semibold shadow-lg shadow-emerald-500/20 flex items-center gap-1.5 transition-all"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Extracting Claims...
                  </>
                ) : (
                  <>
                    <PlusCircle className="w-4 h-4" />
                    Ingest & Synthesize
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
