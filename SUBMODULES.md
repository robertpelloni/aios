# Submodule Dashboard

**Generated:** 2026-01-14
**Status:** Deep Initialization & Audit Complete
**Project Version:** 0.4.2
**Total Submodules:** 301

This dashboard categorizes submodules by their functional role in the AIOS SuperAI ecosystem.

## 1. Core Infrastructure
Critical components for the runtime and orchestration layer.

| Repo | Description | Role |
|------|-------------|------|
| `opencode-autopilot` | Session orchestration & Council | **Kernel** |
| `metamcp` | Docker-based MCP hub | **Hub** |
| `agent-client-protocol` | MCP specification | **Protocol** |
| `mcp-router` | Desktop management app | **Manager** |
| `mcp-proxy` | Aggregation proxy | **Networking** |

## 2. Deep Code Intelligence (Indexing & LSP)
Tools for understanding and navigating codebases.

| Repo | Description | Function |
|------|-------------|----------|
| `bloop` | Semantic code search engine | **Search** |
| `ast-grep` | Structural code search and rewrite | **AST** |
| `tree-sitter` | Incremental parsing library | **Parsing** |
| `scip` | Precise code intelligence protocol | **Indexing** |
| `sourcerer-mcp` | Semantic code search (AST + Vectors) | **MCP** |

## 3. Secure Execution (Sandboxing)
Environments for running untrusted code safely.

| Repo | Description | Runtime |
|------|-------------|---------|
| `e2b-code-interpreter` | Cloud-based sandboxing | **Cloud** |
| `cohere-terrarium` | Secure execution environment | **Container** |
| `dagger` | Programmable CI/CD engine | **Container** |
| `open-interpreter` | Local code execution | **Local** |
| `mcp-server-code-execution-mode` | Rootless sandbox | **MCP** |

## 4. Capability Providers (MCP Servers)
These provide the "Hands" for the browser extension and local agents.

| Repo | Description | Function |
|------|-------------|----------|
| `chrome-devtools-mcp` | Read/Control Browser Console | **Browser** |
| `playwright-mcp` | Web Scraping & Control | **Browser** |
| `mcp-server-deep-research` | Multi-step research | **Research** |
| `gmail-mcp` | Email access (future) | **Productivity** |
| `filesystem-mcp` | Local file access | **System** |

## 5. Reference Architectures (Competitors & Inspiration)
We study these to achieve feature parity.

| Repo | Description | Category |
|------|-------------|----------|
| `claude-code` | Anthropic's CLI | **Commercial** |
| `aider` | Git-native coding agent | **Open Source** |
| `codebuff` | Multi-agent coding CLI | **Open Source** |
| `open-hands` | Autonomous SWE agent | **Open Source** |
| `grok-cli` | xAI's CLI tool | **Commercial** |
| `gemini-cli` | Google's CLI tool | **Commercial** |

## 6. Memory & Context
Long-term storage for the browser extension and agents.

| Repo | Description |
|------|-------------|
| `supermemory` | Bookmark & Knowledge manager |
| `mem0` | User profile & preference memory |
| `chroma-mcp` | Vector storage for scraped pages |

---

**Note:** This list is dynamically generated from `.gitmodules` and categorized to support the SuperAI vision.
