# AIOS: The Universal AI Operating System

A unified operating system for PC-based local AI tools. Manage everything from tool installation to autonomous multi-agent orchestration in a single, high-fidelity dashboard.

![AIOS Dashboard](https://via.placeholder.com/1200x600?text=AIOS+Dashboard+Preview)

## 🚀 Key Features

### 🛠️ Ultimate Tool Dashboard
- **Inventory Management:** Track installation status of local AI tools (Aider, Docker, Redis, Bun).
- **One-Click Setup:** Automatically detect missing tools and generate install commands.
- **Process Guardian:** Long-running service that monitors and restarts crashed background processes.
- **Hardware Stats:** Real-time CPU, VRAM, RAM, and Disk usage monitoring.

### 🧠 The "SuperAI" Coding Harness
- **Architect Mode:** Two-model orchestration (Reasoning vs. Editing) for complex refactors.
- **Visual Repo Map:** Interactive graph of your codebase's dependencies and symbols.
- **Auto-Verification:** Zero-trust loop where every AI edit is verified by LSP diagnostics and tests.
- **Diff Streaming:** Real-time visualization of code modifications.

### 🔌 Universal MCP Control Plane
- **Traffic Inspector:** Real-time monitoring of all Model Context Protocol (MCP) traffic.
- **Universal Directory:** Discover and auto-install servers from the global ecosystem.
- **Dynamic Routing:** Smart routing of prompts to the right tool based on semantic relevance.
- **Proxy System:** Bridge remote MCP servers to local clients seamlessly.

### 🤖 Multi-Agent Orchestration
- **Agent Squads:** specialized subagents for file picking, code review, and security auditing.
- **Consensus Protocol:** Multi-model debate engine for verifying high-stakes decisions.
- **Local-Remote Bridge:** Sync projects between local PCs and remote cloud environments.

## 📦 Installation

```bash
# Clone the repository
git clone https://github.com/OhMyOpenCode/aios.git
cd aios

# Install dependencies (pnpm is required)
pnpm install

# Start the full stack (Core Service + UI Dashboard)
pnpm run start:all
```

## 🏗️ Project Structure

AIOS is a monorepo containing:

- **`packages/core`**: The Node.js/Fastify backend service that manages agents and tools.
- **`packages/ui`**: The Next.js dashboard for visual management.
- **`packages/cli`**: The command-line interface for headless operation.
- **`agents/`**: JSON definitions for autonomous agents.
- **`skills/`**: Universal skill library.

## 📚 Documentation

- [Vision & Philosophy](docs/VISION.md)
- [Roadmap](ROADMAP.md)
- [Submodule Ecosystem](SUBMODULES.md)
- [Architecture](docs/project/STRUCTURE.md)

## 🤝 Contributing

We welcome contributions! Please see `CONTRIBUTING.md` for details on how to get started.

## 📄 License

MIT
