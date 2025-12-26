# Changelog

## [1.2.0] - 2024-05-24

### 🚀 New Features
*   **Docker Sandbox:** `run_code` now supports executing Python scripts in secure, ephemeral Docker containers (via `DockerService`).
*   **Self-Healing Tools:** If a tool call fails, the Hub automatically analyzes the error and schema, attempts to fix the arguments, and retries the call.
*   **Vector Persistence:** Semantic memory (vectors) are now saved to disk (`vectors.json`).

### 🛠 Improvements
*   **Usage Tracking:** Added cost/token estimation to the Dashboard.
*   **Memory:** Upgraded `MemoryManager` to use hybrid search (Vector + Fuzzy).
