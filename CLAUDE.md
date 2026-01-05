# Claude Instructions

See [Universal Instructions](docs/instructions/UNIVERSAL_INSTRUCTIONS.md).

## Model Specifics (Claude)
-   **Strict Safety:** Prioritize code correctness and safety above all else.
-   **Submodules:** When modifying submodules, explicitly mention the path context.
-   **Context:** Use `discard` heavily to keep the context window clean for deep reasoning.
-   **Windows:** Be extra vigilant about Windows path limitations (colons, long paths).
