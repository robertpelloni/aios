# aios Design Document
# include "CORE_INSTRUCTIONS.md"

## Vision
The **aios** is a **Universal AI Operating System**. It is a persistent, omni-present layer that orchestrates your entire development lifecycle.

The core philosophy is **"Completeness via Aggregation"**.
In a fragmented AI ecosystem, we solve fragmentation by aggregating best-in-class tools (aider, mem0, claude-code) into a single orchestration layer.

## The "Game Engine" Philosophy
We act like a **Game Engine** (Unity/Unreal) for AI:
- **Abstraction Layers**: Abstract interfaces for Memory, Agent, and Tool.
- **Adapters**: Thin wrappers around submodules.
- **Switchability**: Hot-swap components (e.g., swap `mem0` for `cognee`).

## Core Architecture: The Universal Server
A **Hub/Proxy/Router** architecture:
1. **The Core Server (Hub)**: Standalone process, Docker, or Extension Host.
2. **Plugin System**: "Everything is a Plugin" (Interface, LLM Providers, Agent SDKs).
3. **The Bridge**: Routing between **Remote Realm** (Jules) and **Local Realm** (Council).

## Feature Design
1. **Code Mode**: `run_code` tool for script-based execution in sandboxes.
2. **Semantic Tool Search**: Indexing tool descriptions with embeddings in `pgvector`.
3. **Integrated Memory**: `claude-mem` integration for unified context.
4. **Progressive Disclosure**: Lazy loading tools to save context (100k -> 2k tokens).

## Tech Stack
- **Backend**: Node.js + Fastify (v5) + Socket.io + TRPC.
- **Frontend**: Next.js (App Router).
- **Submodules**: Extensive use of `metamcp`, `mcpenetes`, `claude-mem`.
