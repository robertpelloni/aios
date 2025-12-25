# Super AI Plugin Roadmap & Implementation Status

## 🌟 Vision
A "Super AI Plugin" acting as a Meta-Orchestrator (Hub) for the Model Context Protocol (MCP). It wraps the environment (VSCode, Chrome, CLI) and provides "glue" services (Context, Memory, Hooks, Routing) to enhance any AI tool.

---

## ✅ Phase 1: The Core Foundation (v1.3 Completed)
**Status:** Implemented & Merged.

### Core Architecture
- [x] **Monorepo Structure:** `pnpm` workspaces (`core`, `ui`, `cli`, `vscode`, `browser`).
- [x] **Core Service:** Node.js + Fastify + Socket.io Hub.
- [x] **Hub Server:** Aggregates tools from Local MCPs, Remote MetaMCP, and Internal Skills.
- [x] **Protocol Support:** SSE (Claude), Stdio (CLI), Socket.io (Dashboard).

### Feature Set
- [x] **Agent Executor:** Autonomous ReAct loop (`AGENTS.md`).
- [x] **Memory Manager:** Native persistence (`memory.json`) + Fuzzy Search (`Fuse.js`).
- [x] **Document Ingestion:** PDF/Text chunking from `documents/` (v1.3).
- [x] **Profile Manager:** Switch configs via `profiles/` (v1.3).
- [x] **Handoff Manager:** Session save/resume via `handoffs/` (v1.3).
- [x] **Scheduler:** CRON-based task execution (`scheduler.json`).
- [x] **Secrets:** `.secrets.json` management.
- [x] **Traffic Inspector:** "Mcpshark" UI (Log/Replay).
- [x] **Code Mode:** Sandboxed execution (`vm` fallback, `isolated-vm` supported).
- [x] **TOON Format:** JSON->TOON conversion tool.

### Clients & Integrations
- [x] **Web Dashboard:** React UI for all managers.
- [x] **CLI Tool:** `super-ai` skeleton.
- [x] **VSCode Extension:** Skeleton connection.
- [x] **Browser Extension:** Skeleton connection.
- [x] **Mcpenetes:** Logic integrated into `ClientManager` for auto-config.
- [x] **MetaMCP:** Connector for Docker-based backend.

---

## 🚧 Phase 2: Active Intelligence (Current Focus)

### 1. Browser Integration (Priority)
- [ ] **Context Injection:** Allow Agents to read the active browser tab.
- [ ] **Navigation:** Allow Agents to control the browser (`open_url`).
- [ ] **Selection:** Capture user selection from browser context menu.

### 2. Model Gateway
- [x] **Basic:** OpenAI/Ollama support in `ModelGateway.ts`.
- [ ] **Advanced:** Anthropic SDK integration, Rate Limiting, Cost Tracking.

### 3. Submodule "Deep" Integrations
- [ ] **Claude-Mem:** Re-attempt stdio integration or port logic to TypeScript.
- [ ] **Jules App:** Embed UI or link deep integration.
- [ ] **Skill Porter:** Auto-convert imported skills to native format.

### 4. Semantic Search Upgrade
- [ ] **Vector DB:** Upgrade from `Fuse.js` to `pgvector` (via MetaMCP) or local `lancedb`.

---

## 📂 Submodule Inventory & Status
| Repo | Role | Status |
| :--- | :--- | :--- |
| `metamcp` | Hub Architecture | Reference Used / Connector Implemented |
| `mcpenetes` | Client Config | Logic Ported to `ClientManager` |
| `claude-mem` | Memory | Submodule Added (Integration Pending) |
| `jules-app` | UI | Submodule Added (Placeholder Page) |
| `prompt-eng-tutorial`| Prompts | Reference for Prompt Improver |
| `superpowers` | Skills | Reference for `skills/` |
