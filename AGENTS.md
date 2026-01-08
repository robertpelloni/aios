# PROJECT KNOWLEDGE BASE

**Generated:** 2026-01-08
**Context:** Monorepo (pnpm) | Node.js v18+ | Fastify | Next.js | TypeScript
**Version:** 0.3.0

## OVERVIEW
The Super AI Plugin is a "Meta-Orchestrator" for the Model Context Protocol (MCP). It acts as a universal hub connecting tools, agents, and local servers to LLM clients (Claude Desktop, VSCode). Core stack: Fastify backend (`packages/core`), Next.js dashboard (`packages/ui`), and a CLI (`packages/cli`).

## STRUCTURE
```
.
├── packages/
│   ├── core/         # Backend: Fastify, Managers, Agent Executor
│   ├── ui/           # Frontend: Next.js (Custom server), Dashboard
│   ├── cli/          # Command line interface
│   ├── adapters/     # Wrappers for external CLIs (claude, gemini)
│   ├── types/        # Shared TypeScript definitions
│   └── vscode/       # VSCode Extension source
├── agents/           # JSON definitions for AI agents
├── skills/           # Markdown-defined capabilities
├── docs/             # Documentation (Consolidated)
└── submodules/       # External dependencies (metamcp, mcpenetes)
```

## CRITICAL RESOURCES
*   **`SUBMODULES.md`**: Dashboard of all 70+ integrated submodules and their status.
*   **`ROADMAP.md`**: Current strategic goals and timeline.
*   **`CHANGELOG.md`**: History of project changes.
*   **`CLAUDE.md`**: Legacy context instructions (superseded by this file but kept for reference).

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Agent Logic** | `packages/core/src/agents/` | AgentExecutor, LoopManager |
| **API Endpoints** | `packages/core/src/routes/` | Fastify routes |
| **Dashboard UI** | `packages/ui/src/app/` | Next.js App Router |
| **CLI Commands** | `packages/cli/src/commands/` | `start`, `status`, `run` |
| **MCP Servers** | `mcp-servers/` | Managed local servers |
| **Skills** | `skills/` | Markdown-based skill definitions |
| **Docs** | `docs/` | See `STRUCTURE.md`, `VISION.md` |

## CONVENTIONS
- **Monorepo**: Uses `pnpm` workspaces. Build all with `pnpm run start:all`.
- **Backend**: Fastify for high-performance async I/O. Socket.io for real-time.
- **Frontend**: Next.js (App Router). *Note*: Uses custom `server.js` (not standard `next start`).
- **Memory**: `supermemory` tool for persistent context. Scopes: `project` vs `user`.
- **Agents**: Defined in JSON schema (`agents/`). Follow `AgentDefinition`.

## ANTI-PATTERNS (THIS PROJECT)
- **Security**: NEVER commit API keys, `.env`, or session tokens.
- **Simulation**: DO NOT simulate actions. Actually call the tools.
- **Types**: DO NOT use `any`. Use `unknown` and narrow types.
- **Commits**: DO NOT revert changes unless explicitly requested.
- **Docs**: DO NOT use unicode bullets or `\n` in DOCX generation.
- **Deprecated**: Avoid `opencode-workflows` (use keystone) and GPT-5.0 models.

## COMMANDS
```bash
# Development
pnpm install            # Install dependencies
pnpm run start:all      # Build & Start everything (Core + UI)
pnpm --filter @aios/core dev  # Start Core only
pnpm --filter @aios/ui dev    # Start UI only

# Build
pnpm run build          # Build all packages
```

## NOTES
- **Mixed Lockfiles**: Project contains both `pnpm-lock.yaml` and `package-lock.json`. Use `pnpm`.
- **UI Server**: `packages/ui` uses a custom `server.js`. Do not try to run with standard `next dev`.
- **Submodules**: Always check `SUBMODULES.md` before assuming a submodule's state.
