# AIOS Project Structure & Agent Adapter Architecture

## 1. Project Overview
AIOS (AI Operating System) is a modular, agent-centric platform designed to orchestrate LLM-based agents, tools, and workflows. It serves as a central hub where agents can be registered, executed, and coordinated to perform complex tasks ranging from code generation to data analysis.

The system is built as a monorepo with a strong emphasis on extensibility, allowing for:
- **Local Agents:** JSON-based agents defined within the core package.
- **External Agents:** Markdown-based agents (OpenCode format) imported from external repositories.
- **Tools (MCP):** A Model Context Protocol (MCP) implementation for standardized tool usage.
- **Memory & Context:** A sophisticated memory management system for persistent sessions and context retrieval.

## 2. Directory Structure

### `packages/` - Core System Components
*   **`core/`**: The brain of AIOS.
    *   `src/managers/`: Handles lifecycle of agents, memory, skills, and tools.
        *   **`AgentManager.ts`**: Discovers, loads, and watches agent files.
        *   `MemoryManager.ts`: Manages vector database and session history.
        *   `McpManager.ts`: Manages MCP server connections.
    *   `src/adapters/`: **[NEW]** Contains logic for parsing different agent file formats.
        *   **`AgentAdapter.ts`**: Interface for agent parsers.
        *   **`OpenCodeAdapter.ts`**: Parser for `open-agents` (YAML+XML) format.
    *   `src/agents/`: Runtime execution logic for agents.
*   **`ui/`**: Next.js-based frontend for monitoring and interaction.
*   **`cli/`**: Command-line interface for interacting with the AIOS hub.
*   **`types/`**: Shared TypeScript definitions.

### `external/` - External Integrations
*   **`agents_repos/`**: Submodules containing third-party agent definitions.
    *   **`open-agents/`**: A library of high-quality, specialized agents (e.g., `OpenCoder`, `DataAnalyst`) defined in the OpenCode standard.

### `docs/` - Documentation
*   `guides/`: User and developer guides.
*   `sessions/`: Logs of development sessions.

## 3. Agent Adapter Architecture
To support a diverse ecosystem of agents, AIOS uses an **Adapter Pattern** within the `AgentManager`. This allows the system to treat agents from different sources and formats as first-class citizens.

### How it Works
1.  **Watcher**: `AgentManager` watches multiple paths:
    *   `packages/core/agents/*.json` (Local)
    *   `AGENTS.md` (Local)
    *   `external/agents_repos/open-agents/.opencode/agent/**/*.md` (External)
2.  **Detection**: When a file changes, the manager identifies the format based on location and extension.
3.  **Parsing**:
    *   **JSON**: Parsed directly.
    *   **OpenCode (Markdown)**: Passed to `OpenCodeAdapter`.
4.  **OpenCodeAdapter**:
    *   Extracts metadata (ID, Name, Description) from **YAML Frontmatter**.
    *   Parses **XML Sections** (e.g., `<context>`, `<workflow>`, `<critical_rules>`) and compiles them into a single, structured `instructions` block for the LLM.
5.  **Registration**: The parsed agent is normalized into an `AgentDefinition` and registered in the `AgentRegistry`.

### Key Benefits
*   **Zero-Config Integration**: External agents are automatically discovered.
*   **Rich Semantics**: Supports the advanced context and rule definitions found in the OpenCode standard.
*   **Extensibility**: New formats can be supported by adding a new Adapter class.

## 4. Usage
*   **Adding a Local Agent**: Create a `.json` file in `packages/core/agents/`.
*   **Adding an External Agent**: Place an OpenCode-formatted `.md` file in the watched external directory.
*   **Verifying Agents**: Use the UI or CLI (`aios list-agents`) to see loaded agents.
