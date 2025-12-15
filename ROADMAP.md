# Super AI Plugin Roadmap & Implementation Plan

This document compiles the design decisions, planned features, and submodule integration strategies discussed throughout the project's inception. It serves as the master plan for developing the "Super AI Plugin".

## 1. Core Infrastructure (The "Hub")
**Status:** In Progress (Skeleton Built)
**Reference:** `submodules/metamcp`

*   **Objective:** Build a robust Node.js/TypeScript service (`packages/core`) that acts as the central nervous system.
*   **Planned Features:**
    *   [x] **Server Skeleton:** Fastify + Socket.io (Done).
    *   [x] **Manager Pattern:** `HookManager`, `AgentManager`, `McpManager`, `HookExecutor` (Done).
    *   [ ] **Router/Aggregator Logic:**
        *   Implement intelligent routing of tool calls to downstream MCP servers (Reference: `metamcp`, `magg`).
        *   Implement "Progressive Disclosure" (Lazy Loading) to keep context light (Reference: `lazy-mcp`, `Switchboard`).
    *   [ ] **Traffic Inspection ("Mcpshark"):**
        *   Build a UI to inspect MCP traffic in real-time (Reference: `mcpshark`, `metamcp` inspector).
        *   Implement persistent logging to `pgvector` database.

## 2. Universal Client Integration
**Status:** Planned
**Reference:** `submodules/mcpenetes`

*   **Objective:** Automatically configure the user's environment to use the Hub.
*   **Planned Features:**
    *   [ ] **Client Detection:** Port logic from `mcpenetes` to auto-detect installed tools (VSCode, Cursor, Claude Desktop, etc.).
    *   [ ] **Config Injection:** Automatically edit `mcp-servers.json` files to insert the Super AI Plugin as the upstream server.
    *   [ ] **Conflict Resolution:** Handle existing configurations gracefully.

## 3. Integrated Memory System
**Status:** Planned
**Reference:** `submodules/claude-mem`

*   **Objective:** Provide a shared, persistent memory across all clients.
*   **Planned Features:**
    *   [ ] **Library Integration:** Adapt `claude-mem` core logic into `packages/core/src/lib/memory`.
    *   [ ] **Hook Bridging:**
        *   `SessionStart`: Inject "Memory Index".
        *   `PostToolUse`: Capture observations to vector DB.
        *   `SessionEnd`: Generate summaries.
    *   [ ] **Tool Exposure:** Expose `mem-search` as a standard MCP tool via the Hub.

## 4. Code Mode & Sandboxing
**Status:** Planned
**Reference:** `references/pctx`, `references/mcp-server-code-execution-mode`

*   **Objective:** Allow the LLM to execute scripts to chain tools efficiently (98% token reduction).
*   **Planned Features:**
    *   [ ] **`run_code` Tool:** Implement a tool that accepts TS/Python code.
    *   [ ] **Sandbox Engine:** Integrate `isolated-vm` (Node.js) or Docker (Python) to run the code safely.
    *   [ ] **Tool Bridge:** Inject a client into the sandbox so the script can call other MCP tools.
    *   [ ] **TOON Support:** Implement Token-Oriented Object Notation for compressed outputs.

## 5. Autonomous Agents & UI
**Status:** Research Needed
**Reference:** `references/mux`, `references/smolagents`

*   **Objective:** Provide an interface for long-running, autonomous tasks.
*   **Planned Features:**
    *   [ ] **Agent Loop:** Implement an autonomous loop (Plan -> Act -> Observe) using `smolagents` or `mux` logic.
    *   [ ] **UI Integration:** Embed the Agent control interface into the `packages/ui` dashboard.
    *   [ ] **Subagent Delegation:** Allow the main agent to spin up sub-agents for specific tasks.

## 6. Browser Connectivity
**Status:** Research Needed
**Reference:** `references/MCP-SuperAssistant`

*   **Objective:** Connect the Hub to the Web Browser.
*   **Planned Features:**
    *   [ ] **Browser Extension:** Build/Adapt the extension to communicate with the Hub via WebSocket.
    *   [ ] **Context Injection:** Allow the Hub to read/write browser content.

## 7. Multi-CLI Orchestration
**Status:** Research Needed
**Reference:** `references/emdash`, `references/claude-squad`

*   **Objective:** Coordinate multiple CLI tools.
*   **Planned Features:**
    *   [ ] **CLI Wrappers:** Create adapters to drive Claude Code, Gemini CLI, etc.
    *   [ ] **Orchestrator:** Manage sessions across multiple CLIs simultaneously.

## 8. Ecosystem Extensions
**Status:** Planned
*   **Voice Coding:** Integrate `voicemode`.
*   **Data Sources:** Integrate `notebooklm-mcp`.
*   **Registry:** Integrate `mcpm.sh` for dynamic tool installation.
*   **Skills:** Convert `superpowers` repository into platform-agnostic skills.
