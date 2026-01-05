# Changelog

All notable changes to this project will be documented in this file.

## [1.1.1] - 2026-01-05

### Fixed
-   **Critical Git Repair:** Restored ~70 broken submodules in `external/` directory that were missing from `.gitmodules` or had detached configurations.
-   **Windows Compatibility:** Converted specific repositories with colon-containing filenames (`opencode-plugin-template`, `opencode-background`, `opencode-skillful`) to embedded repositories to prevent filesystem errors on Windows.
-   **Dashboard:** Updated `scripts/generate_dashboard.py` to correctly identify and report status of both registered submodules and embedded repositories.

### Added
-   `docs/SUBMODULE_DASHBOARD.md`: Automated dashboard tracking submodule versions and status.

## [1.1.0] - Previous

### Added
-   Initial monorepo structure (Core, UI).
-   Core Service with Fastify & Socket.io.
-   Managers for Agents, Skills, Hooks, Prompts.
-   MCP Server management (stdio).
-   Documentation (ROADMAP, STRUCTURE, AGENTS).
