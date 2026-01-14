# aios Roadmap: The Ultimate SuperAI

## Phase 13: Local AI Tool Governance (Completed)
- [x] **Tool Spreadsheet:** Dashboard inventory of local tools (Docker, Redis, etc.).
- [x] **Status Detection:** Auto-discovery of installed CLI tools.
- [x] **Process Monitor:** Watchdog for background services.
- [x] **Hardware Stats:** Real-time resource monitoring.

## Phase 14: Deep Code Intelligence (The Foundation)
**Goal:** Establish the robust indexing and execution layer required for high-fidelity coding.

### Robust Indexing
- [ ] **Vector Integration:** Enhance `RepoMapService` to use vector embeddings for semantic search (RAG).
- [ ] **Tree-sitter Deep Dive:** Upgrade symbol extraction to support full call graphs and type hierarchies.
- [ ] **Graph Service:** Finalize `RepoGraphService` to visualize import/export dependencies.

### Secure Execution
- [ ] **Sandboxing:** Finalize `SandboxService` for secure Docker/WASM code execution.
- [ ] **Auto-Test Runner:** Automatically detect and run relevant tests for modified files.

## Phase 15: The SuperAI Harness (Feature Parity)
**Goal:** Match and exceed the capabilities of Amp, Auggie, Claude Code, Codebuff, and OpenCode.

### Core Engine
- [ ] **Unified TUI/WebUI:** Ensure 100% feature parity between terminal and web interfaces.
- [ ] **Mobile Remote Control:** Responsive mobile UI for monitoring and intervening in agent sessions.
- [ ] **Shell Integration:** Deep shell history integration and context awareness (Warp-style).

### Advanced Coding Features
- [ ] **Multi-File Context:** "Add to Context" logic similar to Aider/Claude Code.
- [ ] **In-Chat Commands:** Slash commands for git operations, diff reviews, and undo steps.
- [ ] **Symbol Pinning:** UI to manually prioritize specific code symbols.
- [ ] **Auto-Dev Loops:** "Fix until Pass" modes for tests and linters.

## Phase 16: The SuperAI Browser Extension
**Goal:** Bridge local context into web-based AI models (ChatGPT, Gemini, Claude.ai).

### Functionality Injection
- [ ] **MCP Injection:** Expose local MCP tools (FS, Git, Terminal) to web chats via browser extension.
- [ ] **Context Export:** One-click export of web chats into AIOS long-term memory.
- [ ] **Memory Recording:** Background recording of browsing research into the Vector Store.

### Browser Capabilities (via MCP)
- [ ] **Page Scraping:** Turn current page content into markdown context.
- [ ] **Console Reader:** Stream browser console logs to the AIOS debugger.
- [ ] **History & Email:** Secure access to history and GMail via authenticated MCP servers.

## Phase 17: Universal MCP & Orchestration
- [ ] **Traffic Inspector:** Real-time JSON-RPC inspection (Completed in Core).
- [ ] **Dynamic Disclosure:** Hide tools until needed to save context.
- [ ] **Semantic Reranking:** Optimize tool descriptions for model consumption.
- [ ] **Proxy System:** Bridge remote/local servers.

## Phase 18: Multi-Agent Squads
- [ ] **Consensus Protocol:** Multi-model debate engine.
- [ ] **Git Worktree Squads:** Parallel coding agents in isolated branches.
- [ ] **Local-Remote Bridge:** Sync projects between local machine and cloud instances.
