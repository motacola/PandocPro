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

## Current Status & Testing Notes (Milestones 2–3)

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

---

## WYSIWYG Editor Integration Plan (Upcoming)

### Editor Choice
| Option | Pros | Cons | Status |
| --- | --- | --- | --- |
| **TipTap (ProseMirror)** | True WYSIWYG feel, toolbar support, Markdown extensions available, React-friendly | Heavier dependency, requires serialization to Markdown | ✅ Recommended |
| Monaco | Familiar to developers, built-in Markdown support, easy diffing | Still shows Markdown syntax (not WYSIWYG), keyboard-heavy | ❌ |
| SimpleMDE / Milkdown | Lightweight, Markdown-first | Less extensible, limited toolbar options | ❌ |

### Architecture
1. **Editor component** (`renderer/components/EditorPane.tsx`)
   - Wrap TipTap with Markdown extension for round-trip editing.
   - Toolbar buttons for bold/italic/headings/lists/table/undo-redo.
   - Command palette / keyboard shortcuts for power users.
2. **Preview pane**
   - Split view: editor on left, preview on right.
   - Preview renders Markdown to HTML (client-side) using `marked` or `markdown-it` with Pandoc-friendly styles.
   - Toggle to show/hide preview.
3. **File synchronization**
   - Load `.md` via IPC (`fs.readFile` from main process).
   - Auto-save on interval / blur / explicit save button.
   - Expose “Save & Export” action to trigger conversion once user saves.
4. **State management**
   - Keep current document + dirty flag in renderer state.
   - Show toast/notification when file saved, exported, or watch mode syncs.
5. **Error handling**
   - Detect Pandoc failures or file write errors and surface them inline.

### Implementation Tasks
1. Add IPC handlers (`file:read`, `file:write`) that restrict access to the `docs/` directory.
2. Install TipTap packages (`@tiptap/react`, `@tiptap/starter-kit`, Markdown extension).
3. Build `EditorPane` component with toolbar + preview toggle.
4. Add document picker route/state linking selection → editor.
5. Hook up save/export buttons (call existing conversion IPC).
6. Auto-save (debounced) and dirty state indicator.
7. QA: ensure large docs perform acceptably; fall back to text mode if needed.

---

## Milestone 4: Action Controls & Activity Log Enhancements

1. **Action Tray**
   - Replace three separate buttons with a segmented control (Convert to Markdown / Export to Word / Auto Sync).
   - Add tooltips explaining what each mode does in plain English.
   - Show estimated runtime + last successful run timestamp pulled from `logs/history.log`.
2. **History Sidebar**
   - IPC handler to read the last N entries from `logs/history.log`.
   - Renderer panel listing recent conversions with status badges and “open file” shortcuts.
3. **Improved Activity Log**
   - Persist logs per request; allow user to expand/collapse past runs.
   - Add “Copy output” button and auto-scroll toggle.
4. **Status Indicators**
   - Show top-level banner when a conversion is running (with spinner + cancel).
   - Display success/failure toast when `conversion:exit` arrives.
5. **Testing/Docs**
   - Document how to run the GUI tests (`npm run gui:dev`, `gui:build`).
   - Add smoke test instructions for verifying history/log panels.

---

## Milestone 6: Settings & Telemetry

### Goals
- Mirror key parts of `scripts/setup.sh` inside the GUI so users can confirm dependencies without opening Terminal.
- Let users switch the `docs/` root if they keep files elsewhere.
- Surface telemetry (Pandoc version, Node version, CLI history counts) and emit desktop notifications on long runs.

### IPC & Storage
1. `system:info` (invoke)
   - Returns `{ pandocVersion?: string; nodeVersion: string; docsPath: string }`.
   - Pandoc version retrieved via `pandoc -v`; if missing, note that it needs installation.
2. `settings:updateDocsPath`
   - Accepts a directory, validates it exists, saves to `~/.config/pandocpro/settings.json`.
   - `docs:list` should reference this custom path.
3. `settings:get`
   - Loads persisted settings (docs path, notifications enabled, auto-save interval, etc.).
4. Optional: `notify:send`
   - Wrapper for macOS notifications so renderer can trigger them without direct `Notification` API.

### Renderer Tasks
1. **Settings View**
   - Tabbed layout or side panel with sections: *Environment*, *Folders*, *Notifications*.
   - Environment: show Pandoc status (installed? version), Node version, CLI availability.
   - Folders: show current docs path, allow selecting a different directory (via `dialog.showOpenDialog` on main process).
   - Notifications: enable/disable desktop notifications for conversions/watch events.
2. **Telemetry Counters**
   - Small cards showing # of conversions in last 7 days, # of watch sessions, last error message.
   - Leverage existing `logs/history.log` to compute counts.
3. **Automatic Checks**
   - When GUI launches, show a checklist: Pandoc installed? Node installed? Watch dependencies ready?
   - Link out to QuickStart docs or run `scripts/setup.sh` as fallback instructions.

### Implementation Steps
1. Add settings/telemetry IPC handlers in `gui/electron/main` (system info, docs path persistence, notifications).
2. Create a Settings component in the renderer with summary cards and configuration controls.
3. Wire docs-path changes back to the existing doc discovery and TipTap loader.
4. Persist configuration to `~/.config/pandocpro/settings.json`.
5. Update README to explain how to open the Settings pane and what each checklist item means.

---

## Milestone 7: Packaging & Release Automation

### Goals
- Provide a repeatable way to generate signed/notarized macOS builds (and future Windows/Linux installers).
- Keep GUI + CLI versions aligned via CI, with artifacts attached to GitHub releases.

### Tasks
1. **Build Scripts**
   - Add `npm run gui:package` wrapping `electron-builder --mac dmg zip`.
   - Provide `.env` template for Apple Developer ID credentials (optional).
2. **Code Signing / Notarization**
   - Detect when signing certs are available; otherwise skip with helpful warning (already partially output by electron-builder).
   - Document how to set `CSC_IDENTITY_AUTO_DISCOVERY=false` and provide `CSC_NAME`/`APPLE_ID`/`APPLE_ID_PASSWORD`.
3. **Continuous Integration**
   - GitHub Actions workflow that runs `npm ci`, `npm run gui:build`, uploads DMG/ZIP as release artifacts.
   - Cache `node_modules` / `gui/node_modules` to keep build times reasonable.
4. **Version Management**
   - Update `package.json` scripts to bump both CLI and GUI versions together (`npm version` hooks).
   - Optionally add `scripts/release.sh` to tag and run the build pipeline locally.
5. **Documentation**
   - README section describing how to run `npm run gui:package`, where artifacts end up, and how to distribute them.
   - Add troubleshooting tips for code signing failures.
