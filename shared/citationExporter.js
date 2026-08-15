/**
 * Citation & Reference Manager Exporter
 * Generates BibTeX (.bib) and RIS (.ris) formats for direct synchronization with
 * Zotero, Mendeley, EndNote, and LaTeX/Overleaf.
 */

export function generateBibtexExport(matrixData) {
  const papers = matrixData.papers || [];
  if (papers.length === 0) return '% No papers indexed in this matrix.\n';

  return papers.map((paper, idx) => {
    const key = `veridex_${paper.year || 2024}_${(paper.title || `study${idx + 1}`).toLowerCase().replace(/[^a-z0-9]/g, '_').slice(0, 24)}`;
    const journal = paper.journal || 'Peer-Reviewed Journal';
    const year = paper.year || 2024;
    const title = (paper.title || 'Untitled Study').replace(/[{}]/g, '');
    const doi = paper.doi ? `  doi       = {${paper.doi}},` : '';

    return `@article{${key},
  title     = {${title}},
  journal   = {${journal}},
  year      = {${year}},
${doi}
  note      = {Synthesized by Veridex Multi-Agent Consensus Engine}
}`.trim();
  }).join('\n\n');
}

export function generateRisExport(matrixData) {
  const papers = matrixData.papers || [];
  if (papers.length === 0) return '';

  return papers.map((paper) => {
    const title = paper.title || 'Untitled Study';
    const journal = paper.journal || 'Peer-Reviewed Journal';
    const year = paper.year || 2024;
    const doi = paper.doi ? `DO  - ${paper.doi}\n` : '';

    return `TY  - JOUR
TI  - ${title}
JO  - ${journal}
PY  - ${year}
${doi}AB  - ${paper.abstract_text || ''}
ER  -`.trim();
  }).join('\n\n');
}
