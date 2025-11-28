## Code style & conventions
- Bash scripts (`scripts/*.sh`) run with `#!/usr/bin/env bash` plus `set -euo pipefail`, liberal functions, colorized `printf`, and expect macOS utilities (Homebrew, Word, open command). Use lowercase snake_case functions and guard paths via `SCRIPT_DIR`/`PROJECT_ROOT`.
- Node utilities (e.g., `watch-md.js`, `scripts/lib/llm-helper.js`, `ui-server/`) stick to CommonJS (`require`, `module.exports`), `const` + arrow functions, async/await promises, and human-friendly console output with emoji icons.
- JSON/Markdown docs form the primary configuration; keep instructions user-facing and emoji-friendly.
- No TypeScript/build tooling present—plain JS only. Stick to spaces (2) in JS/JSON and keep shell indents at 4 spaces inside functions for readability.
- Emphasis on user-facing clarity: prefer descriptive variable names and log lines that explain actions in plain English.