# Submodule Dashboard

**Generated:** 2026-01-11
**Status:** Deep Initialization & Audit Complete + MCP Reorganization
**Project Version:** 0.4.1
**Total Submodules:** 301

This dashboard tracks the status and relevance of external submodules integrated into the Super AI Plugin ecosystem.

---

## 🔌 MCP Ecosystem Structure

The MCP (Model Context Protocol) submodules have been reorganized by **actual functionality** based on deep research of each repository.

### mcp-frameworks/ (5 repos)
SDKs, toolkits, and orchestration frameworks for building MCP solutions.

| Repo | Description | Stars |
|------|-------------|-------|
| `mcp-use` | Complete SDK toolkit for MCP development | - |
| `Super-MCP` | MCP aggregator with security policy & OAuth | - |
| `lazy-mcp` | Lazy-loading proxy framework for context optimization | - |
| `Polymcp` | Full-stack MCP platform (builds servers, clients, proxies) | 83 |
| `pal-mcp-server` | Multi-model orchestrator (50+ models, 15+ tools, CLI bridge) | - |

### mcp-hubs/ (3 repos)
Web dashboards and management UIs for MCP ecosystems.

| Repo | Description |
|------|-------------|
| `mcphub` | Web dashboard + HTTP proxy, PostgreSQL, smart routing |
| `metamcp` | Namespace aggregator + OIDC/SSO, middleware |
| `pluggedin-mcp` | Proxy + knowledge hub (RAG v2, Memory pillars) |

### mcp-dev-tools/ (5 repos)
Development, debugging, and management tools.

| Repo | Description | Stars |
|------|-------------|-------|
| `inspector` | Desktop IDE/debugger for MCP, OAuth debugger | - |
| `mcp-gearbox` | Electron GUI for managing MCP servers | - |
| `mcp-gearbox-cli` | CLI companion for mcp-gearbox | - |
| `mcp-gearbox-js` | JS library for mcp-gearbox | - |
| `mcp-router` | Desktop app for MCP server management | 1537 |

### mcp-routers/ (4 repos)
Proxies and routing solutions for MCP traffic.

| Repo | Description | Stars |
|------|-------------|-------|
| `mcp-proxy` | Pure aggregation proxy, multi-protocol (Go) | 615 |
| `mcpproxy` | Smart RAG proxy with semantic search (Python) | 35 |
| `mcpproxy-go` | Production proxy with security quarantine, OAuth, Docker | 107 |
| `meta-mcp-proxy` | RAG proxy + JS function exposure | 9 |

### mcp-servers/ (16 repos)
Actual MCP server implementations organized by function.

#### ai/ (6 repos) - AI Model Servers
| Repo | Description |
|------|-------------|
| `ultra-mcp` | Exposes OpenAI/Gemini/Azure/Grok models |
| `gemini-mcp-tool` | Google Gemini integration |
| `mcp-server-gemini` | Alternative Gemini server |
| `mcp-server-deep-research` | Deep research capabilities |
| `mcp-zen` | NPX wrapper for multi-model access |
| `notebooklm-mcp` | NotebookLM integration |

#### browser/ (3 repos) - Browser Automation
| Repo | Description |
|------|-------------|
| `chrome-devtools-mcp` | Chrome DevTools integration |
| `computer-control-mcp` | Computer control via browser |
| `playwright-mcp` | Playwright browser automation |

#### code/ (1 repo) - Code Execution
| Repo | Description |
|------|-------------|
| `mcp-server-code-execution-mode` | Zero-context discovery (95% token reduction), rootless sandbox |

#### memory/ (4 repos) - Memory & Context
| Repo | Description |
|------|-------------|
| `chroma-mcp` | ChromaDB vector store integration |
| `mcp-context-forge` | IBM enterprise context gateway |
| `mcp-mem0` | Mem0 memory integration |
| `mem0-mcp` | Alternative Mem0 server |

#### search/ (2 repos) - Search Tools
| Repo | Description |
|------|-------------|
| `mcp-everything-search` | Platform-native file search (Everything/mdfind/locate) |
| `sourcerer-mcp` | Semantic code search (AST + vector embeddings) |

#### media/ (1 repo) - Media Processing
| Repo | Description |
|------|-------------|
| `youtube-video-summarizer-mcp` | YouTube caption/metadata extraction |

#### oversight/ (1 repo) - Meta/Oversight
| Repo | Description |
|------|-------------|
| `vibe-check-mcp-server` | Research-backed CPI oversight (27%→54% success rate) |

#### orchestration/ (1 repo) - Workflow Servers
| Repo | Description |
|------|-------------|
| `mcp-tool-chainer` | Sequential tool execution workflows |

#### misc/ (2 repos) - Miscellaneous
| Repo | Description |
|------|-------------|
| `mcp-easy-installer` | MCP server with easy installation |
| `mcp-toolz` | Context persistence + multi-AI feedback |

### Related Non-MCP Directories

| Directory | Contents |
|-----------|----------|
| `cli-tools/mcpm.sh` | CLI manager for MCP (not a hub/server) |
| `agent-tools/mux` | Agentic workspace manager (NOT MCP - moved out) |
| `research/MCP-Zero` | Academic MCP prototype (not production) |

---

## 🔝 Top 20 Relevant Submodules

| Path | Version | Status | Relevance | Purpose |
|------|---------|--------|-----------|---------|
| `submodules/opencode-autopilot` | `0.4.0` | ✅ Synced | **Critical** | AI session orchestration server (Current Workspace) |
| `external/opencode-core` | `latest` | ✅ Synced | **High** | Core AI coding agent for implementation |
| `mcp-hubs/metamcp` | `v2.4.21` | ✅ Synced | **High** | Docker-based MCP backend |
| `submodules/mcpenetes` | `v1.0.3` | ✅ Synced | **High** | MCP client auto-configuration tool |
| `submodules/mcp-shark` | `1.5.9` | ✅ Synced | **High** | MCP traffic monitoring and replay |
| `submodules/agent-client-protocol` | `v0.10.5` | ✅ Synced | **High** | MCP protocol specification and types |
| `submodules/mcp-hub` | `v4.2.1` | ✅ Synced | **High** | Central hub for MCP connections |
| `mcp-dev-tools/mcp-router` | `v0.6.1` | ✅ Synced | **High** | Desktop MCP server management |
| `submodules/mcp-manager` | `main` | ✅ Synced | **High** | MCP server management interface |
| `submodules/Agent-MCP` | `v4.20.0` | ✅ Synced | **High** | MCP server implementation for agents |
| `OmniParser` | `v.2.0.1` | ✅ Synced | **Medium** | Screen parsing and UI element detection |
| `submodules/DesktopCommanderMCP` | `v0.2.7` | ✅ Synced | **Medium** | Desktop command execution via MCP |
| `submodules/Windows-MCP` | `v0.5.4` | ✅ Synced | **Medium** | Windows-specific tool integration |
| `submodules/claude-code` | `v2.0.74` | ✅ Synced | **Medium** | Claude coding assistant engine |
| `submodules/copilot-cli` | `v0.0.373` | ✅ Synced | **Medium** | GitHub Copilot CLI integration |
| `submodules/gemini-bridge` | `v1.2.0` | ✅ Synced | **Medium** | Google Gemini AI integration layer |
| `submodules/plandex` | `v2.2.1` | ✅ Synced | **Medium** | AI-powered coding and planning |
| `submodules/software-agent-sdk` | `1.0.0` | ✅ Synced | **Medium** | SDK for building autonomous agents |
| `external/opencode-sdk-js` | `v0.1.0` | ✅ Synced | **Medium** | JS SDK for OpenCode integration |
| `submodules/mcp-launcher` | `main` | ✅ Synced | **Medium** | Automated MCP server launcher |

---

## 📦 Full Inventory

> *Total: 301 submodules. For the full list, refer to `.gitmodules`.*

| Path | Status |
|------|--------|
| `external/auth/*` | ✅ Ready |
| `external/config_repos/*` | ✅ Ready |
| `external/plugins/*` | ✅ Ready |
| `external/research/*` | ✅ Ready |
| `external/skills_repos/*` | ✅ Ready |
| `mcp-frameworks/*` | ✅ Reorganized |
| `mcp-hubs/*` | ✅ Reorganized |
| `mcp-dev-tools/*` | ✅ NEW |
| `mcp-routers/*` | ✅ NEW (was mcp-proxies) |
| `mcp-servers/*` | ✅ Reorganized |
| `cli-tools/*` | ✅ Reorganized |
| `agent-tools/*` | ✅ NEW |
| `research/*` | ✅ Reorganized |

---

## ⚠️ Known Issues
- **`external/plugins/opencode-skillful`**: Removed due to Windows path incompatibility.

---

## 📋 Recent Changes (2026-01-11)

### MCP Reorganization
Reorganized 41 MCP submodules based on **actual functionality** (not superficial naming):

**Moves:**
- `mcp-frameworks/MCP-Zero` → `research/` (academic prototype)
- `mcp-frameworks/ultra-mcp` → `mcp-servers/ai/` (exposes AI models)
- `mcp-proxies/Polymcp` → `mcp-frameworks/` (full-stack toolkit)
- `mcp-proxies/mux` → `agent-tools/` (NOT MCP!)
- `mcp-proxies/mcp-router` → `mcp-dev-tools/` (GUI manager)
- `mcp-tools/inspector` → `mcp-dev-tools/` (IDE/debugger)
- `mcp-tools/mcp-gearbox*` → `mcp-dev-tools/` (GUI tools)
- `mcp-tools/mcp-use` → `mcp-frameworks/` (SDK)
- `mcp-tools/mcp-tool-chainer` → `mcp-servers/orchestration/`
- `mcp-tools/mcp-toolz` → `mcp-servers/misc/`
- `mcp-hubs/mcpm.sh` → `cli-tools/` (CLI manager)
- `mcp-hubs/mcp-easy-installer` → `mcp-servers/misc/`
- `mcp-servers/misc/pal-mcp-server` → `mcp-frameworks/` (orchestrator)
- `mcp-servers/misc/vibe-check-mcp-server` → `mcp-servers/oversight/`
- `mcp-servers/search/youtube-video-summarizer-mcp` → `mcp-servers/media/`

**Renamed:**
- `mcp-proxies/` → `mcp-routers/`

**New Categories:**
- `mcp-dev-tools/` - Development and debugging tools
- `mcp-servers/media/` - Media processing servers
- `mcp-servers/oversight/` - Meta/oversight tools
- `mcp-servers/orchestration/` - Workflow servers
- `agent-tools/` - Non-MCP agent tools
