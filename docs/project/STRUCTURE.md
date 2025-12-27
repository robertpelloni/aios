# Project Structure

This project is a TypeScript monorepo managed by `pnpm`.

## Root Directories

-   `packages/`: Contains the source code for the application components.
-   `agents/`: JSON definitions for AI agents.
-   `skills/`: Markdown files defining skills/tools.
-   `hooks/`: Configuration for event hooks (`hooks.json`).
-   `mcp-servers/`: Directory for local MCP servers.
-   `prompts/`: Library of prompt templates.
-   `context/`: Context files/data.
-   `submodules/`: External dependencies (e.g., `metamcp`).
-   `docs/`: Project documentation.

## Packages

### `packages/core`
The central nervous system of the Super AI Plugin.
-   **Runtime:** Node.js
-   **Framework:** Fastify
-   **Communication:** Socket.io
-   **Role:** Manages state, handles MCP connections, executes hooks, and serves the API.

### `packages/ui`
The dashboard interface.
-   **Runtime:** Browser
-   **Framework:** React + Vite
-   **Role:** Visualizes state, allows control of MCP servers, displays logs.

### `packages/types`
Shared TypeScript type definitions used across packages to ensure type safety.

## Configuration

-   `pnpm-workspace.yaml`: Defines the workspace structure.
-   `package.json`: Root dependencies and scripts.
-   `.gitignore`: Global git ignore rules.
