# AIOS Submodule Ecosystem

**Generated:** 2026-01-14
**Status:** Deep Categorization & Analysis
**Total Submodules:** 301

This dashboard categorizes the extensive library of submodules integrated into the AIOS ecosystem. These submodules serve as core infrastructure, capability providers, reference implementations, or direct functional components for the **SuperAI** system.

## 1. Core Infrastructure & MCP Control Plane
*The backbone of the AIOS runtime, managing connections, traffic, and orchestration.*

| Path | Repo | Role |
|------|------|------|
| `opencode-core` | [opencode-core](https://github.com/sst/opencode) | **Core Logic** |
| `submodules/opencode-autopilot` | [opencode-autopilot](https://github.com/robertpelloni/opencode-autopilot-council) | **Orchestration** |
| `submodules/agent-client-protocol` | [agent-client-protocol](https://github.com/agentclientprotocol/agent-client-protocol) | **Protocol** |
| `mcp-hubs/metamcp` | [metamcp](https://github.com/robertpelloni/metamcp) | **Hub/Docker** |
| `mcp-hubs/mcphub` | [mcphub](https://github.com/samanhappy/mcphub) | **Hub** |
| `submodules/mcp-manager` | [mcp-manager](https://github.com/timetime-software/mcp-manager) | **Manager** |
| `submodules/mcp-router` | [mcp-router](https://github.com/mcp-router/mcp-router) | **Routing** |
| `submodules/mcp-shark` | [mcp-shark](https://github.com/mcp-shark/mcp-shark) | **Traffic Inspection** |
| `submodules/mcp-reticle` | [mcp-reticle](https://github.com/LabTerminal/mcp-reticle) | **Traffic Inspection** |
| `mcp-routers/mcp-proxy` | [mcp-proxy](https://github.com/TBXark/mcp-proxy) | **Proxy** |
| `mcp-routers/mcpproxy` | [mcpproxy](https://github.com/Dumbris/mcpproxy) | **Proxy** |
| `mcp-routers/mcpproxy-go` | [mcpproxy-go](https://github.com/smart-mcp-proxy/mcpproxy-go) | **Proxy (Go)** |
| `mcp-routers/meta-mcp-proxy` | [meta-mcp-proxy](https://github.com/nullplatform/meta-mcp-proxy) | **Proxy** |
| `submodules/mcpc` | [mcpc](https://github.com/apify/mcpc) | **Client SDK** |
| `submodules/mcpenetes` | [mcpenetes](https://github.com/robertpelloni/mcpenetes) | **K8s Config** |

## 2. Memory, RAG, & Context
*Long-term storage, semantic search, and document parsing.*

| Path | Repo | Functionality |
|------|------|---------------|
| `memory/systems/supermemory` | [supermemory](https://github.com/supermemoryai/supermemory) | **Knowledge Base** |
| `memory/systems/mem0` | [mem0](https://github.com/mem0ai/mem0) | **User Profile/Memory** |
| `memory/systems/zep` | [zep](https://github.com/getzep/zep) | **Long-term Chat Memory** |
| `memory/systems/langmem` | [langmem](https://github.com/langchain-ai/langmem) | **LangChain Memory** |
| `memory/systems/MemoryOS` | [MemoryOS](https://github.com/BAI-LAB/MemoryOS) | **OS-level Memory** |
| `RAG/parsing/docling` | [docling](https://github.com/DS4SD/docling) | **Document Parsing** |
| `RAG/systems/chroma` | [chroma](https://github.com/chroma-core/chroma) | **Vector DB** |
| `RAG/systems/qdrant` | [qdrant](https://github.com/qdrant/qdrant) | **Vector DB** |
| `RAG/systems/weaviate` | [weaviate](https://github.com/weaviate/weaviate) | **Vector DB** |
| `RAG/systems/milvus` | [milvus](https://github.com/milvus-io/milvus) | **Vector DB** |
| `RAG/systems/haystack` | [haystack](https://github.com/deepset-ai/haystack) | **RAG Pipeline** |
| `RAG/systems/orama` | [orama](https://github.com/oramasearch/orama) | **Full-text/Vector Search** |
| `mcp-servers/memory/chroma-mcp` | [chroma-mcp](https://github.com/chroma-core/chroma-mcp) | **MCP Vector Store** |
| `mcp-servers/memory/mcp-mem0` | [mcp-mem0](https://github.com/coleam00/mcp-mem0) | **MCP Memory** |
| `mcp-servers/memory/mcp-context-forge` | [mcp-context-forge](https://github.com/IBM/mcp-context-forge) | **Context Builder** |
| `mcp-servers/memory/vibememo` | [vibememo](https://github.com/vibeforge1111/vibememo) | **Vibe-based Memory** |

## 3. CLI, TUI, & Harnesses (Competitors & Reference)
*Tools we aim to match or supersede in functionality.*

| Path | Repo | Key Features |
|------|------|--------------|
| `submodules/claude-code` | [claude-code](https://github.com/anthropics/claude-code) | **TUI, Reasoning** |
| `cli-tools/aider` | [aider](https://github.com/aider-ai/aider) | **Diff Editing, Git** |
| `cli-harnesses/code` | [code](https://github.com/just-every/code) | **Universal CLI** |
| `cli-harnesses/crush` | [crush](https://github.com/charmbracelet/crush) | **TUI Primitives** |
| `cli-harnesses/qwen-code` | [qwen-code](https://github.com/QwenLM/qwen-code) | **Code Assistant** |
| `superai-cli/clis/CodeNomad` | [CodeNomad](https://github.com/NeuralNomadsAI/CodeNomad) | **Autonomous Dev** |
| `superai-cli/clis-refs/gemini-cli` | [gemini-cli](https://github.com/google-gemini/gemini-cli) | **Google CLI** |
| `superai-cli/clis-refs/goose` | [goose](https://github.com/block/goose) | **Developer Agent** |
| `superai-cli/clis-refs/grok-cli` | [grok-cli](https://github.com/superagent-ai/grok-cli) | **xAI CLI** |
| `submodules/copilot-cli` | [copilot-cli](https://github.com/github/copilot-cli) | **GitHub CLI** |
| `submodules/plandex` | [plandex](https://github.com/plandex-ai/plandex) | **Planning Engine** |
| `submodules/quotio` | [quotio](https://github.com/nguyenphutrong/quotio) | **Coding Agent** |
| `submodules/claudex` | [claudex](https://github.com/Mng-dev-ai/claudex) | **Claude Extension** |

## 4. Agents & Frameworks
*Engines for autonomous behavior and subagent squads.*

| Path | Repo | Type |
|------|------|------|
| `superai-cli/agents/openhands` | [OpenHands](https://github.com/All-Hands-AI/OpenHands) | **SWE Agent** |
| `superai-cli/agents/crewai` | [crewAI](https://github.com/crewAIInc/crewAI) | **Squads** |
| `superai-cli/agents/langgraph` | [langgraph](https://github.com/langchain-ai/langgraph) | **State Machines** |
| `agents/refs/autogen` | [autogen](https://github.com/microsoft/autogen) | **Multi-Agent** |
| `agents/refs/agent-zero` | [agent-zero](https://github.com/agent0ai/agent-zero) | **Generalist** |
| `agents/refs/smolagents` | [smolagents](https://github.com/huggingface/smolagents) | **Lightweight** |
| `agents/refs/pydantic-ai` | [pydantic-ai](https://github.com/pydantic/pydantic-ai) | **Type-Safe** |
| `submodules/software-agent-sdk` | [software-agent-sdk](https://github.com/OpenHands/software-agent-sdk) | **SDK** |
| `frameworks/CopilotKit` | [CopilotKit](https://github.com/CopilotKit/CopilotKit) | **App Integration** |
| `agents/orchestration/vibeship-spawner` | [vibeship-spawner](https://github.com/vibeforge1111/vibeship-spawner) | **Agent Spawner** |

## 5. Browser & Computer Use
*Capabilities for interacting with the web and desktop.*

| Path | Repo | Function |
|------|------|----------|
| `browser-use/playwright` | [playwright](https://github.com/microsoft/playwright) | **Automation** |
| `browser-use/stagehand` | [stagehand](https://github.com/browserbase/stagehand) | **AI Browser** |
| `mcp-servers/browser/playwright-mcp` | [playwright-mcp](https://github.com/microsoft/playwright-mcp) | **MCP Browser** |
| `mcp-servers/browser/chrome-devtools-mcp` | [chrome-devtools](https://github.com/ChromeDevTools/chrome-devtools-mcp) | **DevTools** |
| `computer-use/desktop/cua` | [cua](https://github.com/trycua/cua) | **Desktop Control** |
| `OmniParser` | [OmniParser](https://github.com/microsoft/OmniParser) | **Screen Parsing** |
| `submodules/browser-use` | [browser-use](https://github.com/browser-use/browser-use) | **Agentic Browser** |

## 6. Code Execution & Sandboxing
*Safe environments for running agent-generated code.*

| Path | Repo | Type |
|------|------|------|
| `code-sandbox/tools/e2b-code-interpreter` | [e2b](https://github.com/e2b-dev/code-interpreter) | **Cloud Sandbox** |
| `code-sandbox/tools/open-interpreter` | [open-interpreter](https://github.com/OpenInterpreter/open-interpreter) | **Local Interpreter** |
| `code-sandbox/runtimes/dagger` | [dagger](https://github.com/dagger/dagger) | **Container Pipeline** |
| `mcp-servers/code/mcp-server-code-execution-mode` | [code-exec-mode](https://github.com/elusznik/mcp-server-code-execution-mode) | **MCP Sandbox** |

## 7. Deep Code Intelligence (LSP & Indexing)
*Tools for parsing, understanding, and navigating codebases.*

| Path | Repo | Function |
|------|------|----------|
| `code-indexing/ast/tree-sitter` | [tree-sitter](https://github.com/tree-sitter/tree-sitter) | **Parsing** |
| `code-indexing/ast/ast-grep` | [ast-grep](https://github.com/ast-grep/ast-grep) | **Search/Rewrite** |
| `code-indexing/tools/bloop` | [bloop](https://github.com/BloopAI/bloop) | **Semantic Search** |
| `mcp-servers/search/sourcerer-mcp` | [sourcerer-mcp](https://github.com/st3v3nmw/sourcerer-mcp) | **Code RAG** |

## 8. Specialized MCP Servers (Financial, Search, etc.)
*Domain-specific tools.*

| Path | Repo | Domain |
|------|------|--------|
| `mcp-servers/search/mcp-everything-search` | [everything-search](https://github.com/mamertofabian/mcp-everything-search) | **Local Search** |
| `search/mcp-servers/web-search-mcp` | [web-search-mcp](https://github.com/mrkrsl/web-search-mcp) | **Web Search** |
| `mcp-servers/ai/mcp-server-deep-research` | [deep-research](https://github.com/reading-plus-ai/mcp-server-deep-research) | **Research** |
| `financial/trading/trade-agent-mcp` | [trade-agent](https://github.com/Trade-Agent/trade-agent-mcp) | **Trading** |
| `financial/crypto/coingecko-mcp` | [coingecko](https://github.com/coingecko/coingecko-typescript) | **Crypto Data** |
| `submodules/PowerTrader_AI` | [PowerTrader](https://github.com/robertpelloni/PowerTrader_AI) | **Trading Bot** |

---

## Directory Structure Explanation

*   **`packages/`**: The monorepo's core code (Core Service, UI, CLI, Types).
*   **`submodules/`**: Critical infrastructure forks or references integrated directly.
*   **`mcp-servers/`**: A curated collection of MCP servers, organized by domain (ai, browser, memory, search).
*   **`mcp-hubs/`**: implementations of MCP hubs/registries.
*   **`mcp-routers/`**: Proxies and routers for MCP traffic.
*   **`mcp-frameworks/`**: Frameworks for building MCP servers.
*   **`agents/`**: AI agent frameworks and reference implementations.
*   **`memory/`**: Memory systems and knowledge graph implementations.
*   **`RAG/`**: Retrieval Augmented Generation systems and parsers.
*   **`code-indexing/`**: AST parsers and code search tools.
*   **`code-sandbox/`**: Execution environments.
*   **`computer-use/`**: Tools for AI operating desktops/browsers.
*   **`superai-cli/`**: Our implementation reference and tools for the SuperAI harness.
*   **`financial/`**: Fintech-specific MCPs and agents.
*   **`references/`**: Documentation, architecture specs, and prompt libraries.
*   **`web-ui/`**: External web UI references.
