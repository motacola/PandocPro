## Task completion checklist
- No automated tests or linters exist; validate changes by running the workflow you touched (e.g., `./scripts/menu.sh`, `./scripts/docx-sync.sh ...`, or `npm run watch`/`npm run ui`).
- For shell edits, execute the relevant script with sample DOCX/MD files inside `docs/` and check `logs/history.log`/`backups/` updates.
- For watcher/UI changes, run `npm run watch` or `npm run ui` and confirm console output is clean.
- Re-run `./scripts/setup.sh` or `./scripts/setup-alias.sh` only if setup logic changed to ensure prompts still work.
- Document user-facing impacts in README/QUICKSTART when adding new menu options so non-technical users stay informed.