# Super AI Plugin (AIOS)

A comprehensive "Super AI Plugin" and Meta-Orchestrator that integrates various AI tools and environments into a unified operating system.

## Overview

This project serves as a central nervous system for your AI workflow, wrapping environments like VSCode, Chrome, and CLI tools (Claude Code, Gemini CLI) with a unified layer for:
- **Context Management**: Persistent memory and context injection.
- **Hook System**: Event-driven architecture for tool usage, permissions, and notifications.
- **Agent Orchestration**: Managing autonomous agents and sub-agents.
- **MCP Management**: Dynamic configuration and routing for Model Context Protocol servers.

## Architecture

The project is structured as a monorepo using `pnpm workspaces`:

- **`packages/core`**: The brain of the operation. A Node.js service (Fastify + Socket.io) that:
    - Manages Agents, Skills, Hooks, Prompts, and Context.
    - Exposes an API and WebSocket interface.
    - Runs and monitors MCP servers.
- **`packages/ui`**: A React + Vite dashboard for visualizing and controlling the system.
- **`mcp-servers/`**: Directory for local MCP servers (e.g., `test-server`).
- **`agents/`, `skills/`, `hooks/`, `prompts/`**: Configuration directories watched by the Core Service.

## Getting Started

### Prerequisites
- Node.js (v18+)
- pnpm

### Installation

```bash
pnpm install
```

### Running the Dashboard

To start both the Core Service and the UI Dashboard:

```bash
pnpm start
```

- **UI**: http://localhost:5173
- **Core API**: http://localhost:3000

## Features

- **Dashboard**: Real-time view of active Agents, Skills, Hooks, and Logs.
- **MCP Manager**: Start/Stop MCP servers directly from the UI.
- **Code Mode**: Execute code snippets in a sandboxed environment.
- **Client Integrations**: Configure clients (VSCode, etc.) to connect to the Hub.

## Roadmap

See [ROADMAP.md](ROADMAP.md) for the detailed development plan.
