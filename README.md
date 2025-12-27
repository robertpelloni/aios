# Super AI Plugin

A multi-platform AI plugin skeleton acting as a monorepo for orchestrating tools, agents, and hooks across various interfaces (VSCode, Chrome, CLI, etc.).

## Structure

This is a TypeScript monorepo managed with `pnpm workspaces`.

- `packages/core`: The central brain/service. Node.js + Fastify + Socket.io.
- `packages/ui`: The dashboard frontend. React + Vite + Tailwind CSS.
- `packages/types`: Shared TypeScript definitions.
- `packages/adapters`: Adapters for external tools (e.g., Claude, Gemini).
- `submodules/metamcp`: Integrated MetaMCP functionality.

## Prerequisites

- Node.js (v18+)
- pnpm

## getting Started

1.  **Install dependencies:**
    ```bash
    pnpm install
    ```

2.  **Start the development environment:**
    ```bash
    pnpm start:all
    ```
    This will build the UI and start the Core Service.

3.  **Access the Dashboard:**
    Open `http://localhost:3000` (or the port logged by the core service).

## Configuration

- **Agents:** Add JSON definitions in `agents/`.
- **Skills:** Add Markdown skill definitions in `skills/`.
- **Hooks:** Configure event hooks in `hooks/hooks.json`.
- **MCP Servers:** Add directories in `mcp-servers/` or configure `.mcp.json`.
- **Prompts:** Add prompt templates in `prompts/`.

## Development

- **Core:** `pnpm --filter @super-ai/core dev`
- **UI:** `pnpm --filter @super-ai/ui dev`
