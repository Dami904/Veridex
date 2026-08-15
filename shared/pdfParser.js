import { createRequire } from 'module';

const require = createRequire(import.meta.url);
let pdfParse = null;

try {
  pdfParse = require('pdf-parse');
} catch (e) {
  // Graceful fallback if module is missing
}

/**
 * Extracts structured study sections from an uploaded PDF buffer
 * @param {Buffer} dataBuffer
 * @returns {Promise<{ title: string, abstract: string, fullText: string, year?: number, sampleSize?: number }>}
 */
export async function parsePdfBuffer(dataBuffer) {
  try {
    let text = '';

    if (typeof pdfParse === 'function') {
      try {
        const data = await pdfParse(dataBuffer);
        text = data.text || '';
      } catch {
        text = dataBuffer.toString('utf-8');
      }
    } else {
      text = dataBuffer.toString('utf-8');
    }

    const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 0);

    // Heuristics for extracting title from top of document
    let title = lines.slice(0, 3).join(' ').replace(/^(article|research article|brief report|review|paper|%PDF-[0-9.]+)\s*[:\-]?\s*/i, '');
    if (title.length > 200) {
      title = title.slice(0, 197) + '...';
    }

    // Try finding Abstract block
    let abstract = '';
    const abstractMatch = text.match(/(?:abstract|summary)\s*[:\-]?\s*([\s\S]{100,1800}?)(?:\n\s*(?:introduction|keywords|background|methods|1\.\s+introduction))/i);

    if (abstractMatch && abstractMatch[1]) {
      abstract = abstractMatch[1].replace(/\s+/g, ' ').trim();
    } else {
      abstract = lines.slice(2, 15).join(' ').slice(0, 1200);
    }

    // Try finding year
    let year = new Date().getFullYear();
    const yearMatch = text.slice(0, 2000).match(/\b(19\d{2}|20[0-2]\d)\b/);
    if (yearMatch) {
      year = parseInt(yearMatch[1], 10);
    }

    // Try finding sample size
    let sampleSize = null;
    const nMatch = text.match(/\b[nN]\s*=\s*(\d{1,5})\b/);
    if (nMatch) {
      sampleSize = parseInt(nMatch[1], 10);
    }

    return {
      title: title || 'Uploaded Scientific PDF Study',
      abstract: abstract || text.slice(0, 1000),
      fullText: text.slice(0, 15000),
      year,
      sampleSize,
    };
  } catch (err) {
    console.warn('[PDF Parse Warning] Falling back to text slice:', err.message);
    return {
      title: 'Uploaded Document',
      abstract: 'Extracted raw study text from document artifact.',
      fullText: '',
      year: new Date().getFullYear(),
      sampleSize: null,
    };
  }
}
