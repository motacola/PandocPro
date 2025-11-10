# PandocPro GUI Foundation Plan

This document outlines how we’ll turn the existing CLI-driven workflow into a desktop application that non-technical users can run without touching the terminal.

---

## 1. Goals & Constraints

| Goal | Details |
| --- | --- |
| Zero-terminal onboarding | Drag-and-drop `.docx`, click to convert/export, toggle watch mode |
| Reuse conversion logic | Keep `scripts/docx-sync.sh` and `watch-md.js` as the single source of truth |
| Cross-platform focus | Prioritize macOS (existing user base) but avoid platform lock-in |
| Fast iteration | Keep stack close to existing Node.js tooling to minimize context switching |

---

## 2. Stack Decision: **Electron + Vite (React)**

| Option | Pros | Cons | Verdict |
| --- | --- | --- | --- |
| **Electron + Vite** | Full Node API access (easy to spawn `docx-sync.sh`), mature packaging, large ecosystem | Heavier runtime | ✅ Chosen |
| Tauri | Tiny footprint, Rust backend | Requires Rust toolchain, more work to bridge Bash scripts | ❌ |
| Neutralino / Wails | Lightweight | Smaller ecosystem, less documentation | ❌ |

**Project layout**
```
docx-md-sync/
├── gui/
│   ├── package.json          # Electron + Vite workspace
│   ├── src/
│   │   ├── main/             # Electron main process
│   │   ├── preload/          # secure IPC bridge
│   │   └── renderer/         # React UI
│   └── scripts/              # build/start helpers
├── scripts/
│   └── docx-sync.sh          # existing conversion engine (unchanged)
```

---

## 3. High-Level Architecture

1. **Conversion Service (Node adapter)**
   - `gui/src/main/services/conversion.ts`
   - Spawns `scripts/docx-sync.sh` via `child_process.spawn`
   - Streams stdout/stderr back to renderer through IPC
   - API surface:
     ```ts
     convertToMarkdown(docxPath: string): Promise<void>
     convertToDocx(mdPath: string): Promise<void>
     autoSync(docxPath: string, mdPath: string): Promise<void>
     startWatch(docxPath: string, mdPath: string): WatchSession
     ```

2. **File Discovery**
   - Scan `docs/` recursively (reuse logic from `menu.sh`)
   - Expose via preload bridge so renderer can show a file list

3. **Renderer (React)**
   - Tabs/panels:
     - **Documents list** – filter/search `.docx`
     - **Actions panel** – Convert → Markdown, Export → Word, Auto Sync, Watch toggle
     - **Activity log** – stream CLI output + history entries
     - **Settings** – choose docs directory, default editor, notifications

4. **Packaging**
   - `electron-builder` config for macOS `.dmg`
   - Bundle CLI scripts + Node runtime; keep Pandoc external for now (detect & prompt)

---

## 4. Implementation Breakdown

| Milestone | Tasks | Notes |
| --- | --- | --- |
| **M1: Project Scaffolding** | `npm create electron-vite` inside `gui/`, configure TypeScript & ESLint, add root-level `npm run gui:dev/build` scripts | Ensures isolation from main CLI |
| **M2: IPC + Conversion API** | Implement conversion service, IPC channels (`conversion:start`, `conversion:output`, `conversion:complete`, `conversion:error`), unit-test spawn wrapper | Must handle concurrent runs + cancellation |
| **M3: File discovery + selection UI** | Add preload method `docs:list`, renderer list with search/sort, remember last selection in `~/.config/pandocpro/gui.json` | Reuse `find docs -iname '*.docx'` logic |
| **M4: Action buttons + status log** | Build React components for Convert / Export / Auto Sync; stream logs; show success/error banners; reuse history from `logs/history.log` if available | Provides parity with menu options 1–3 |
| **M5: Watch mode toggle** | Integrate existing `watch-md.js` by spawning via Node, expose start/stop controls, show “watching …” badge and last sync timestamp | Ensure cleanup on window close |
| **M6: Settings & telemetry** | Detect pandoc/node versions, show dependency checklist, optional macOS notifications, path picker for `docs/` | UI equivalents of `scripts/setup.sh` |
| **M7: Packaging** | `electron-builder` config, notarization placeholders, CI script to produce `.dmg` + zipped app bundle | Keep CLI + GUI install paths in sync |

### IPC Contract (Milestone 2)

| Channel | Direction | Payload | Description |
| --- | --- | --- | --- |
| `conversion:start` | Renderer → Main | `{ mode: 'to-md' \| 'to-docx' \| 'auto'; docxPath: string; mdPath: string; requestId: string }` | Request a conversion. Main process validates paths and spawns `scripts/docx-sync.sh`. A unique `requestId` lets the renderer correlate responses. |
| `conversion:stdout` | Main → Renderer | `{ requestId: string; chunk: string }` | Streamed standard output from the Bash script for live log updates. |
| `conversion:stderr` | Main → Renderer | `{ requestId: string; chunk: string }` | Streamed standard error output (warnings/errors). |
| `conversion:exit` | Main → Renderer | `{ requestId: string; code: number }` | Emitted when the child process exits; `code === 0` indicates success. |
| `conversion:error` | Main → Renderer | `{ requestId: string; message: string }` | Raised if spawning fails (missing script, permissions, etc.). |
| `watch:start` | Renderer → Main | `{ docxPath: string; mdPath: string; requestId: string }` | Launch `watch-md.js` with env overrides; returns same stdout/stderr events plus a `watch:status` heartbeat. |
| `watch:stop` | Renderer → Main | `{ requestId: string }` | Terminates the watcher process. |
| `docs:list` | Renderer ⇄ Main (invoke) | *(none)* → `{ files: { docx: string; md: string }[] }` | Provides UI with the discovered document pairs (reusing menu discovery logic). |

All renderer calls go through `window.pandocPro` (exposed in preload) to avoid direct `ipcRenderer` usage in React components.

---

## 5. Dependencies & Open Questions

| Item | Status |
| --- | --- |
| Pandoc bundling? | For first release, prompt user to install via Homebrew; revisit bundling later |
| Node runtime? | Electron already ships Node, so no extra embedding required |
| Docs directory override? | Add setting to point anywhere, but default to project `docs/` |
| Future WYSIWYG editor? | Reserve renderer space for Monaco/TipTap integration (Phase 2b) |

---

## 6. Next Steps

1. Initialize `gui/` workspace with Electron + Vite scaffolding.
2. Create conversion service + IPC contract, wire to existing Bash scripts.
3. Build minimal renderer with file picker + convert/export buttons to reach feature parity with menu options 1–2.
4. Iterate towards watch mode, settings, and packaging.

Once the GUI MVP works, we can layer in richer UX (drag-and-drop, WYSIWYG editor, onboarding wizard) using the same foundation.

---

## Current Status & Testing Notes (Milestone 2)

- ✅ Electron workspace scaffolded under `gui/`
- ✅ IPC contract implemented (`conversion:start/stdout/stderr/exit/error`, `docs:list`)
- ✅ Preload now exposes `window.pandocPro` helpers for the renderer
- ✅ React preview screen lists `.docx` files, triggers conversions, and streams logs

### Try it locally

```bash
npm run gui:dev   # Launch Electron + Vite in dev mode
```

1. Ensure `docs/` contains at least one `.docx`.
2. Pick it from the dropdown, click **Convert to Markdown** or **Export to Word**.
3. Watch stdout/stderr stream into the “Activity” panel.

Package the preview build with:

```bash
npm run gui:build   # Produces DMG/ZIP artifacts in gui/release/
```
