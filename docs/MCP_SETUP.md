# 🔌 Veridex Model Context Protocol (MCP) Integration

The **Veridex MCP Server** exposes autonomous biomedical research tools, CockroachDB distributed vector search, and contradiction arbitration directly to **Claude Desktop**, **Cursor**, and **Agentic IDEs**.

---

## 🛠️ Available MCP Tools

| Tool Name | Parameters | Description |
| :--- | :--- | :--- |
| `veridex_discover_and_synthesize` | `research_query: string` | Dispatches the autonomous multi-agent swarm to search live PubMed, CrossRef (JAMA, Lancet, Nature), and Europe PMC, extract clinical parameters ($N$, $p$-values), arbitrate contradictions, and generate a deterministic consensus matrix. |
| `veridex_search_vectors` | `query: string, limit?: number` | Performs 1024-dimensional semantic cosine similarity search across CockroachDB distributed vector memory. |
| `veridex_arbitrate` | `research_query: string` | Executes the Adversarial Arbiter Agent over opposing studies to isolate methodological confounders (dosage disparity, animal vs. human models). |
| `veridex_export_prisma` | `research_query: string` | Generates a publication-ready **PRISMA 2020 Systematic Review Markdown Report**. |

---

## 💻 Configuration for Claude Desktop

Add this configuration to your Claude Desktop config file:
- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`

```json
{
  "mcpServers": {
    "veridex": {
      "command": "node",
      "args": ["C:/Users/USER/Veridex/mcp/server.js"],
      "env": {
        "DATABASE_URL": "postgresql://...",
        "GEMINI_API_KEY": "...",
        "AWS_ACCESS_KEY_ID": "...",
        "AWS_SECRET_ACCESS_KEY": "..."
      }
    }
  }
}
```

---

## ⚡ Fast Pre-Deployment Smoke Testing

Before deploying updates, run the instant (< 2s) smoke test suite:

```bash
pnpm smoke
```

Outputs:
```text
================================================================
  ⚡ VERIDEX FAST PRE-DEPLOYMENT SMOKE TEST
================================================================

  🟢 [PASS] Deterministic Confidence Tier Math (1ms) — Exact Tier Logic Validated
  🟢 [PASS] Vector Distance & Cosine Operator (0ms) — Cosine Space Math Validated
  🟢 [PASS] PRISMA 2020 Markdown Exporter (4ms) — Standard Systematic Review Generator OK
  🟢 [PASS] CrossRef Academic DOI Registry (877ms) — Live CrossRef Scholarly API reachable
  🟢 [PASS] NCBI PubMed Central E-Utilities API (1011ms) — Live NCBI API reachable (1 sample hits)
  🟢 [PASS] Europe PMC Open Access Database (1392ms) — Live Europe PMC API reachable

----------------------------------------------------------------
  📊 SMOKE RESULTS: 6/6 Passed in 1.51s
----------------------------------------------------------------
```
