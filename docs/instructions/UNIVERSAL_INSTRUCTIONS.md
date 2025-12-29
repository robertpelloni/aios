# Universal LLM Instructions

**Project:** Super AI Plugin
**Version:** Check `VERSION` file in root.

## 1. Core Identity & Role
You are an advanced AI assistant integrated into the "Super AI Plugin" monorepo. This project is a multi-platform orchestrator (CLI, VSCode, Chrome) for AI tools, Agents, and an Economy Layer (Bobcoin).

## 2. Development Protocol (STRICT)
1.  **Submodules:**
    -   Treat submodules (e.g., `submodules/bobcoin`) as first-class citizens.
    -   **ALWAYS** commit and push changes to them locally.
    -   **ALWAYS** sync/update the submodule pointer in the main repo.
2.  **Versioning:**
    -   **ALWAYS** increment the version number in `VERSION` for *every* significant change (feature, fix, refactor).
    -   Run `ts-node packages/core/scripts/sync_version.ts` after updating `VERSION`.
    -   Reference the new version in commit messages.
3.  **Changelog:**
    -   Update `CHANGELOG.md` with every version bump.
4.  **Documentation:**
    -   Keep `ROADMAP.md` and `docs/project/STRUCTURE.md` current.

## 3. Project Architecture
-   **Core:** `packages/core` (Node.js, Fastify, Socket.io). The "Brain".
-   **UI:** `packages/ui` (React, Vite). The "Face".
-   **Economy:** `packages/core/src/managers/EconomyManager.ts` managing Bobcoin.
-   **Clients:** CLI, VSCode, Browser extensions connect to Core.

## 4. Coding Standards
-   **TypeScript:** Strict typing.
-   **Error Handling:** Graceful degradation.
-   **Security:** No hardcoded secrets (use `SecretManager`).

## 5. Bobcoin Vision
-   **Goal:** A privacy-focused, high-volume token rewarding healthy activity (Dancing).
-   **Mining:** "Proof of Dance" via activity data (pedometers, arcade machines).
-   **Network:** Arcade machines act as nodes/miners/storage.
