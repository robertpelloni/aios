# CORE KNOWLEDGE BASE

**Context:** Node.js | Fastify | Socket.io | Managers | Agent Executor

## OVERVIEW
The "Brain" of the system. Manages MCP connections, agent execution loops, persistent memory, and the Fastify API server. It uses a Manager pattern to handle lifecycle events for different subsystems.

## STRUCTURE
```
src/
├── agents/           # AgentExecutor (ReAct) and LoopManager
├── gateway/          # ModelGateway (LLM abstraction)
├── managers/         # Lifecycle managers (Agent, Document, Memory, etc.)
├── routes/           # Fastify API routes (REST + SSE)
├── services/         # Core services (VectorStore, Health, Traffic)
├── skills/           # Skill loading and registry
├── tools/            # Tool definitions (Pipeline, PromptImprover)
└── index.ts          # Entry point
```

## WHERE TO LOOK
| Task | Location | Notes |
|------|----------|-------|
| **Agent Logic** | `src/agents/AgentExecutor.ts` | The core ReAct loop implementation |
| **LLM Calls** | `src/gateway/ModelGateway.ts` | Centralized LLM interface |
| **State Mgmt** | `src/managers/*Manager.ts` | Stateful subsystems (e.g., `MemoryManager`) |
| **API Handling** | `src/routes/` | HTTP endpoints and SSE streams |

## CONVENTIONS
- **Managers**: All major subsystems must be implemented as a `Manager` class.
- **Async/Await**: Heavy use of async I/O. strictly typed promises.
- **Events**: Uses internal event emitter for cross-manager communication.

## ANTI-PATTERNS
- **Raw Sockets**: Do not handle raw Socket.io events in routes; use the `SocketManager`.
- **Global State**: Avoid global variables; use Manager instances injected or singleton patterns carefully.
- **Blocking Code**: NEVER block the event loop; use `Worker` threads for CPU tasks if needed.
