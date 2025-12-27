# Roadmap

## Phase 1: Foundation (Completed)
- [x] Monorepo Structure (pnpm workspaces)
- [x] Core Service (Fastify + Socket.io)
- [x] UI Shell (React + Vite)
- [x] Basic Managers (Agents, Skills, Hooks, Prompts)
- [x] MCP Server Management (Local stdio)

## Phase 2: Enhancement (Current)
- [ ] **Documentation & Standards**
    - [ ] Universal LLM Instructions (`docs/agents/UNIVERSAL_INSTRUCTIONS.md`)
    - [ ] Project Structure Documentation (`docs/project/STRUCTURE.md`)
    - [ ] Versioning System (`VERSION`, `CHANGELOG.md`, sync scripts)
- [ ] **Dashboard Improvements**
    - [ ] Submodule Status & Versioning
    - [ ] System Health Check
- [ ] **Extended Capabilities**
    - [ ] recursive prompt loading (Done)
    - [ ] Persistent Mock Server (Done)

## Phase 3: Multi-Platform & Clients
- [ ] **CLI Wrapper:** Orchestrate other CLI tools (Claude, Gemini).
- [ ] **VSCode Extension:** Connect to Core Service.
- [ ] **Chrome Extension:** Connect to Core Service.

## Phase 4: Advanced Features
- [ ] **Multi-CLI Orchestration:** Pipe output from one CLI to another.
- [ ] **Context Injection:** Inject context into browser/IDE.
- [ ] **RAG:** Document library and vector search.
- [ ] **"Toon" Format:** JSON -> Toon translation.
