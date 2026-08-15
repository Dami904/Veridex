#!/usr/bin/env node

/**
 * Veridex Model Context Protocol (MCP) Server
 * Exposes autonomous biomedical research tools, vector search, and consensus arbitration
 * to Claude Desktop, Cursor, and Agentic IDEs via the Standard MCP JSON-RPC Stdio transport.
 */

import readline from 'readline';
import dotenv from 'dotenv';
import { discoverLiteratureForQuery } from '../shared/literatureDiscovery.js';
import { handleExtract } from '../lambdas/extractor/handler.js';
import { handleArbitrate } from '../lambdas/arbiter/handler.js';
import { handleQueryMatrix } from '../lambdas/query/handler.js';
import { query } from '../shared/db.js';
import { generateTitanEmbedding, cosineSimilarity } from '../shared/titanEmbed.js';
import { generatePrismaMarkdownReport } from '../shared/prismaExporter.js';

dotenv.config();

const TOOLS = [
  {
    name: 'veridex_discover_and_synthesize',
    description: 'Autonomous multi-agent research pipeline. Searches live PubMed Central, CrossRef (JAMA, Lancet, Nature), and Europe PMC, extracts sample sizes and p-values, arbitrates contradictions, and returns a deterministic scientific consensus matrix.',
    inputSchema: {
      type: 'object',
      properties: {
        research_query: {
          type: 'string',
          description: 'The scientific, clinical, or biological question (e.g. "Does low-dose metformin extend lifespan?" or "Does ejaculation frequency alter prostate cancer risk?").',
        },
      },
      required: ['research_query'],
    },
  },
  {
    name: 'veridex_search_vectors',
    description: 'Executes a semantic vector similarity search across CockroachDB distributed vector memory using Bedrock Titan V2 1024-dimensional embeddings and cosine distance.',
    inputSchema: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'The biomedical mechanism or concept to search for.',
        },
        limit: {
          type: 'number',
          description: 'Maximum number of results to return (default: 5).',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'veridex_arbitrate',
    description: 'Runs the Adversarial Arbiter Agent over opposing studies for a research question to detect and isolate methodological confounders (dosage disparity, in-vitro vs. in-vivo models).',
    inputSchema: {
      type: 'object',
      properties: {
        research_query: {
          type: 'string',
          description: 'The target research question to arbitrate.',
        },
      },
      required: ['research_query'],
    },
  },
  {
    name: 'veridex_export_prisma',
    description: 'Generates a publication-ready PRISMA 2020 Systematic Review Markdown Report for a given scientific query.',
    inputSchema: {
      type: 'object',
      properties: {
        research_query: {
          type: 'string',
          description: 'The research question to generate a PRISMA 2020 report for.',
        },
      },
      required: ['research_query'],
    },
  },
];

async function handleToolCall(name, args) {
  switch (name) {
    case 'veridex_discover_and_synthesize': {
      const { research_query } = args;
      if (!research_query) throw new Error('Missing research_query parameter');

      const discovery = await discoverLiteratureForQuery(research_query);
      if (discovery.source === 'insufficient_literature' || (discovery.papers || []).length === 0) {
        return {
          status: 'INSUFFICIENT_LITERATURE',
          message: discovery.message,
        };
      }

      const papers = discovery.papers || [];
      const targetQuery = discovery.research_query || research_query;

      // Extract parameters in parallel batches
      for (const paper of papers) {
        await handleExtract({
          body: {
            ...paper,
            research_query: targetQuery,
          },
        });
      }

      // Arbitrate contradictions
      await handleArbitrate({ pathParameters: { query: targetQuery } });

      // Generate synthesis matrix
      const matrixRes = await handleQueryMatrix({ pathParameters: { query: targetQuery } });
      return JSON.parse(matrixRes.body);
    }

    case 'veridex_search_vectors': {
      const { query: searchQuery, limit = 5 } = args;
      const targetVector = await generateTitanEmbedding(searchQuery);

      const dbRes = await query('SELECT id, doi, pmid, title, journal, year, abstract_text, provenance, abstract_embedding FROM papers;');
      const papers = dbRes.rows || [];

      const scored = papers.map((p) => {
        let sim = 0;
        if (p.abstract_embedding) {
          const emb = typeof p.abstract_embedding === 'string' ? JSON.parse(p.abstract_embedding) : p.abstract_embedding;
          sim = cosineSimilarity(targetVector, emb);
        }
        const { abstract_embedding: _, ...clean } = p;
        return {
          ...clean,
          similarity_pct: Math.round(sim * 100),
          distance: Number((1 - sim).toFixed(4)),
        };
      });

      scored.sort((a, b) => b.similarity_pct - a.similarity_pct);
      return {
        query: searchQuery,
        total_matches: scored.length,
        results: scored.slice(0, limit),
      };
    }

    case 'veridex_arbitrate': {
      const { research_query } = args;
      const arbRes = await handleArbitrate({ pathParameters: { query: research_query } });
      return JSON.parse(arbRes.body);
    }

    case 'veridex_export_prisma': {
      const { research_query } = args;
      const matrixRes = await handleQueryMatrix({ pathParameters: { query: research_query } });
      const matrixData = JSON.parse(matrixRes.body);
      const markdown = generatePrismaMarkdownReport(matrixData);
      return {
        research_query,
        markdown_report: markdown,
        matrix_summary: matrixData.aggregate,
      };
    }

    default:
      throw new Error(`Unknown Veridex tool: ${name}`);
  }
}

// JSON-RPC MCP Stdio Loop
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false,
});

function sendResponse(id, result, error = null) {
  const payload = {
    jsonrpc: '2.0',
    id,
    ...(error ? { error: { code: -32000, message: error.message || String(error) } } : { result }),
  };
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

rl.on('line', async (line) => {
  if (!line.trim()) return;

  try {
    const message = JSON.parse(line);
    const { id, method, params } = message;

    if (method === 'initialize') {
      sendResponse(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: {
          name: 'veridex-mcp',
          version: '1.0.0',
        },
      });
      return;
    }

    if (method === 'tools/list') {
      sendResponse(id, { tools: TOOLS });
      return;
    }

    if (method === 'tools/call') {
      const { name, arguments: toolArgs } = params || {};
      const result = await handleToolCall(name, toolArgs || {});
      sendResponse(id, {
        content: [
          {
            type: 'text',
            text: JSON.stringify(result, null, 2),
          },
        ],
      });
      return;
    }

    if (method === 'ping') {
      sendResponse(id, {});
      return;
    }

    sendResponse(id, null, new Error(`Method not implemented: ${method}`));
  } catch (err) {
    sendResponse(null, null, err);
  }
});
