# aios Roadmap
# include "CORE_INSTRUCTIONS.md"

## Phase 1: Foundation (Completed)
- [x] Monorepo Structure (pnpm workspaces)
- [x] Core Service (Fastify + Socket.io)
- [x] UI Shell (React + Vite)
- [x] Basic Managers (Agents, Skills, Hooks, Prompts)
- [x] MCP Server Management (Local stdio)

## Phase 2: Enhancement (Completed)
- [x] **Documentation & Standards**
    - [x] Universal LLM Instructions (`docs/agents/UNIVERSAL_INSTRUCTIONS.md`)
    - [x] Project Structure Documentation (`docs/project/STRUCTURE.md`)
    - [x] Versioning System (`VERSION`, `CHANGELOG.md`, sync scripts)
- [x] **Dashboard Improvements**
    - [x] Submodule Status & Versioning
    - [x] System Health Check
- [x] **Extended Capabilities**
    - [x] recursive prompt loading (Done)
    - [x] Persistent Mock Server (Done)

## Phase 3: Multi-Platform & Clients (Completed)
- [x] **CLI Wrapper:** Orchestrate other CLI tools (Claude, Gemini).
- [x] **VSCode Extension:** Connect to Core Service.
- [x] **Chrome Extension:** Connect to Core Service.

## Phase 4: Advanced Features (Completed)
- [x] **Multi-CLI Orchestration:** Pipe output from one CLI to another (PipelineTool).
- [x] **Context Injection:** Inject context into browser/IDE.
- [x] **RAG:** Document library and vector search (VectorStore + MemoryManager).
- [x] **"Toon" Format:** JSON -> Toon translation.
- [x] **Agent Execution:** ReAct loop via AgentExecutor and ModelGateway.

## Phase 5: Intelligence & Autonomy (Completed)
- [x] **Memory Consolidation:** Summarize logs into long-term memory.
- [x] **Autonomous Loops:** Agents that can self-schedule and recurse indefinitely (LoopManager).
- [x] **Deep Research:** Dedicated agent for multi-step web research.
- [x] **Auth & Security:** Secure Socket.io and API endpoints.

## Phase 6: Economy & Autonomy (Completed)
- [x] **Bobcoin Integration:** Submodule added and Economy Manager implemented (Mock).
- [x] **Universal Instructions:** Centralized agent instructions and development protocol.
- [x] **Infrastructure Simulation:** Node Manager (Tor, Torrent, Storage) implemented.
- [x] **Miner CLI:** `super-ai mine` command for simulating physical activity.
- [x] **Ralph Loop Maintenance:** Periodic synchronization of all submodules (v1.2.1).
- [x] **Physical Mining:** Integrate real hardware signals (Serial/GPIO) for "Proof of Dance".
- [ ] **Wallet Connect:** Real wallet integration.

## Phase 7: Maintenance & Stability (Completed)
- [x] **Deep Initialization:** Submodule synchronization and cleanup.
- [x] **Documentation Consolidaton:** `AGENTS.md` and `SUBMODULES.md`.
- [x] **Versioning Standard:** Unified `VERSION` file and changelog tracking.
- [x] **CI/CD Pipelines:** Automated testing and build verification.
- [x] **Type Safety:** Strict TypeScript configuration across all packages.

## Phase 8: Ecosystem Expansion (In Progress)
### Completed
- [x] **Directory Reorganization:** Created specialized directories (RAG, memory, code-indexing, computer-use, code-sandbox, search, financial, skills, superai-cli)
- [x] **RAG Systems:** Added 9 RAG submodules (langchain, haystack, chroma, qdrant, weaviate, milvus, orama, instructor, docling)
- [x] **Code Indexing:** Added 4 code-indexing tools (aider, bloop, ast-grep, tree-sitter)
- [x] **Computer Use:** Added 4 browser automation tools (playwright, stagehand, algonius-browser, chrome-devtools-mcp)
- [x] **Agent Frameworks:** Added 4 agent frameworks (autogen, crewai, smolagents, openhands)
- [x] **Sandboxing:** Added 4 code execution tools (open-interpreter, e2b, cohere-terrarium, dagger)
- [x] **Documentation:** Created RESOURCES.md for all new directories

### Pending
- [ ] **Wallet Connect:** Real wallet integration (viem dependency exists)
- [ ] **Physical Mining:** Integrate serialport for hardware-based Proof-of-Dance
- [ ] **Multi-CLI Swiss Army Knife:** Full orchestration of Claude/Gemini/OpenCode CLIs
- [ ] **Advanced MCP Features:**
    - [ ] Lazy loading of MCP tools
    - [ ] Tool chaining across MCPs
    - [ ] Dynamic registry updates
- [ ] **Agent Improvements:**
    - [ ] Agent auto-reflection and self-improvement
    - [ ] A2A (Agent-to-Agent) protocol support
    - [ ] Repo map AST summarization (aider-style)
- [ ] **Memory System:**
    - [ ] Memory deduplication
    - [ ] Memory backfill from session logs
- [ ] **UI Enhancements:**
    - [ ] EcosystemList sync status badge
    - [ ] Real-time submodule health indicators

### Known Implementation Gaps
- CouncilManager health check (packages/core line 181)
- PythonExecutor Docker execution (line 20)
- ClientManager CLI integration (line 121)
- McpRouter naming conflicts (line 235)

## Phase 9: Production Readiness (Planned)
- [ ] **Performance Optimization:** Connection pooling, caching, lazy loading
- [ ] **Security Hardening:** API key rotation, audit logging, rate limiting
- [ ] **Horizontal Scaling:** Load balancing, session affinity, distributed state
- [ ] **Monitoring:** OpenTelemetry integration, dashboards, alerting
- [ ] **Documentation:** API reference, deployment guides, contributor docs
