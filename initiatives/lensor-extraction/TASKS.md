# Lensor Extraction — Tasks

---

## Phase 1: Analysis Document

**Session scope:** Read Lensor and Crann source; write the analysis doc. ~30–40 min of reading, one file to write.

### Batch 1.1

- [x] Read `../lensor/.context/PROJECT.md` — architecture overview, directory structure, tech stack
- [x] Read `../lensor/src/ui/index.tsx` — Shadow DOM injection pattern
- [x] Read `../lensor/src/service-workers/service-worker.ts` — Crann service worker hub
- [x] Read `../lensor/src/ui/state-config.ts` — Crann `createConfig()` usage
- [x] Read `../lensor/src/ui/hooks/useLensorState.ts` — Crann React hooks
- [x] Read `../lensor/src/lib/inactivity-alarm.ts` — Chrome Alarms pattern
- [x] Read `../lensor/src/settings/` directory (all files) — settings page structure
- [x] Read `../crann/.context/PROJECT.md` — Crann architecture and API
- [x] Write `athanor/.context/LENSOR_ANALYSIS.md` covering:
  - Architecture overview of Lensor (three-context model)
  - How Crann's hub-and-spokes maps to each context
  - What is reusable (patterns) vs Lensor-specific (pixel inspection, WebGL fisheye, tabCapture)
  - Block-by-block source mapping: which Lensor file(s) each future block draws from
  - Crann API summary: `createConfig`, `createStore`, `connectStore`, `createCrannHooks`, `Scope.Agent`/`Scope.Shared`, RPC actions

### Commit
```
feat(context): add Lensor/Crann architecture analysis
```

### Handoff Prompt
> Phase 1 of the `lensor-extraction` initiative is complete. `athanor/.context/LENSOR_ANALYSIS.md` has been written.
>
> **Next: Phase 2** — implement `blocks/state/crann/`.
>
> Before starting, read:
> - `athanor/initiatives/lensor-extraction/PLAN.md` for full technical notes on this block
> - `athanor/.context/LENSOR_ANALYSIS.md` for the source mapping
> - `../crann/.context/PROJECT.md` for Crann API reference
> - `../lensor/src/ui/state-config.ts` and `../lensor/src/ui/hooks/useLensorState.ts` for real usage examples
> - One existing BLOCK.md (e.g. `athanor/blocks/service-worker/basic/BLOCK.md`) for format reference
>
> See `TASKS.md Phase 2` for the task checklist.

---

## Phase 2: Crann State Block

**Session scope:** One new block directory with 4 files. Moderate complexity — BLOCK.md needs depth.

### Batch 2.1

- [x] Read `../crann/.context/PROJECT.md` (if not already in context)
- [x] Read `../lensor/src/ui/state-config.ts`
- [x] Read `../lensor/src/ui/hooks/useLensorState.ts`
- [x] Read one existing BLOCK.md for format reference (e.g. `athanor/blocks/service-worker/basic/BLOCK.md`)
- [x] Create `blocks/state/crann/BLOCK.md` covering:
  - What Crann is and when to use it (vs `messaging/typed-messages`)
  - The hub-and-spokes model diagram
  - `Scope.Agent` vs `Scope.Shared` with examples
  - RPC actions — what they are, how they're called, where they execute
  - `connectStore` for non-React contexts
  - `createCrannHooks` for React contexts
  - npm deps: `crann` + `crann/react` sub-path
  - All three files in this block and their roles
  - Manifest requirements: none specific to Crann (permissions depend on what your actions do)
- [x] Create `blocks/state/crann/config.ts` — annotated `createConfig()` template with:
  - Example state items with `Scope.Agent` and without (shared)
  - Example RPC action stub with comment explaining what goes in the handler
  - `// TODO:` markers on every consumer-specific value
- [x] Create `blocks/state/crann/service-worker.ts` — annotated `createStore()` template with:
  - `createStore(config)` call
  - `store.subscribe(['key'], ...)` example showing the key-filter array and how to read `agentInfo.location.tabId`
  - `store.getAgents({ context: 'contentscript', tabId })` — use string literal (not `PorterContext` enum, which is not exported from `crann`)
  - `store.getAgentState(agentId)` and `store.setState({ key: value }, agentId)` for per-agent reads/writes
  - `chrome.action.onClicked` handler that looks up the agent for the clicked tab and toggles state (or injects)
  - `chrome.scripting.executeScript` content script injection stub
  - `// TODO:` markers throughout
- [x] Create `blocks/state/crann/hooks.ts` — annotated `createCrannHooks()` template with:
  - Import from `crann/react`
  - `createCrannHooks(config)` call
  - Named exports for `useCrannState`, `useCrannActions`, `useCrannReady`, `useAgent`, `CrannProvider`
  - Comment explaining how to consume these in React components
- [x] Run `tsc --noEmit` from athanor root — fix any TS errors in new files

### Commit
```
feat(blocks): add state/crann block
```

### Handoff Prompt
> Phase 2 of the `lensor-extraction` initiative is complete. `blocks/state/crann/` has been created (BLOCK.md, config.ts, service-worker.ts, hooks.ts).
>
> **Next: Phase 3** — implement `blocks/content-script/shadow-dom-mount/` and `blocks/service-worker/with-alarms/`.
>
> Before starting, read:
> - `athanor/initiatives/lensor-extraction/PLAN.md` for technical notes on both blocks
> - `../lensor/src/ui/index.tsx` for the Shadow DOM pattern
> - `../lensor/src/lib/inactivity-alarm.ts` for the alarms pattern
> - `athanor/blocks/content-script/iframe-mount/BLOCK.md` for format reference (same category)
>
> See `TASKS.md Phase 3` for the task checklist.

---

## Phase 3: Shadow DOM Mount + Alarms Blocks

**Session scope:** Two compact blocks. Shadow DOM mount is the more involved one; alarms is straightforward.

### Batch 3.1

**Shadow DOM Mount:**
- [x] Read `../lensor/src/ui/index.tsx`
- [x] Read `athanor/blocks/content-script/iframe-mount/BLOCK.md` and `index.ts` for format reference
- [x] Create `blocks/content-script/shadow-dom-mount/BLOCK.md` covering:
  - What Shadow DOM provides vs iframe (style isolation without separate browsing context)
  - When to use shadow-dom vs iframe (trade-offs: no extension context in shadow DOM — must use content script's `chrome.runtime.sendMessage` or Crann)
  - `initializeShadowMount(component, options)` API and returned handle
  - The closed shadow root and why
  - Visibility via CSS `visibility`, not DOM removal
  - `StyleSheetManager` usage for styled-components (optional)
  - Manifest requirements: same as `iframe-mount` minus `web_accessible_resources` for UI HTML
  - Cross-reference `blocks/state/crann/` for state management inside shadow DOM
- [x] Create `blocks/content-script/shadow-dom-mount/index.ts` implementing:
  - `ShadowMountHandle` interface (`show`, `hide`, `destroy`)
  - `initializeShadowMount(component, options?)` function
  - Idempotent container creation (remove if existing, create fresh)
  - `attachShadow({ mode: 'closed' })`
  - Fixed full-viewport host positioning
  - React `createRoot` inside shadow root
  - Optional `styleTarget` div for styled-components

**Alarms:**
- [x] Read `../lensor/src/lib/inactivity-alarm.ts`
- [x] Create `blocks/service-worker/with-alarms/BLOCK.md` covering:
  - Use case: inactivity timeout for extensions that capture screen or run persistently
  - `getTimeoutMinutes` callback pattern (why it's a callback, not a constant)
  - The 30s throttle in `resetInactivityTimer` and why
  - How to wire `chrome.alarms.onAlarm.addListener` in the service worker
  - Manifest requirement: `"alarms"` permission
  - Example wiring with `state/crann`'s subscribe
- [x] Create `blocks/service-worker/with-alarms/index.ts` implementing:
  - `INACTIVITY_ALARM_PREFIX` constant
  - In-memory throttle map (`Record<number, number>`)
  - `createInactivityAlarm(tabId, getTimeoutMinutes)` — clears + recreates alarm; no-op if timeout is ≤ 0
  - `clearInactivityAlarm(tabId)` — clears alarm
  - `resetInactivityTimer(tabId, getTimeoutMinutes)` — throttled reset
- [x] Run `tsc --noEmit` from athanor root — fix any TS errors

### Commit
```
feat(blocks): add content-script/shadow-dom-mount and service-worker/with-alarms
```

### Handoff Prompt
> Phase 3 of the `lensor-extraction` initiative is complete. `blocks/content-script/shadow-dom-mount/` and `blocks/service-worker/with-alarms/` have been created.
>
> **Next: Phase 4** — implement `blocks/settings-page/react/`.
>
> Before starting, read:
> - `athanor/initiatives/lensor-extraction/PLAN.md` for technical notes on this block
> - `../lensor/src/settings/` directory in full (index.tsx, SettingsApp.tsx, useSettings.ts, savedColors.ts, types.ts, settings.html)
> - `athanor/blocks/popup-ui/react/BLOCK.md` for format reference (another UI block)
>
> Note: the settings page scaffold should be generic (no Lensor-specific fields), with TODO comment anchors for consumers to fill in their own settings.
>
> See `TASKS.md Phase 4` for the task checklist.

---

## Phase 4: Settings Page Block

**Session scope:** One block with 5 files, all relatively compact. The `useStorage` hook and scaffold are the main deliverables.

### Batch 4.1

- [x] Read `../lensor/src/settings/` directory (all files)
- [x] Read `athanor/blocks/popup-ui/react/BLOCK.md` for format reference
- [x] Create `blocks/settings-page/react/BLOCK.md` covering:
  - Settings page vs popup: full tab opened via `chrome.tabs.create`
  - `chrome.storage.sync` vs Crann (settings page typically doesn't need Crann — sync storage is simpler)
  - The `useStorage` hook and how to extend it for typed settings
  - Separate Vite entry point requirement (show what to add to `vite.config.ts`)
  - No `web_accessible_resources` entry needed — the settings page is opened as a tab via `chrome.tabs.create`, not injected into a web page
  - How to open the settings page from the extension (from service worker or Crann action)
- [x] Create `blocks/settings-page/react/settings.html` — minimal HTML; `<div id="root">`, script tag pointing to `settings.js`
- [x] Create `blocks/settings-page/react/index.tsx` — mounts `<SettingsApp />` to `#root`
- [x] Create `blocks/settings-page/react/useStorage.ts` — typed `chrome.storage.sync` hook:
  - `useStorage<T>(key: string, defaultValue: T): [T, (value: T) => void]`
  - Reads on mount, listens for external changes, writes on setter call
- [x] Create `blocks/settings-page/react/SettingsApp.tsx` — minimal scaffold:
  - Simple layout with `// TODO: add your settings fields here` anchors
  - No Lensor-specific UI
- [x] Run `tsc --noEmit` from athanor root — fix any TS errors

### Commit
```
feat(blocks): add settings-page/react block
```

### Handoff Prompt
> Phase 4 of the `lensor-extraction` initiative is complete. `blocks/settings-page/react/` has been created.
>
> **Next: Phase 5** — update `docs/AI.md` and `docs/BLOCKS.md`, and write `recipes/shadow-crann/README.md`.
>
> Before starting, read:
> - `athanor/docs/AI.md` — understand current structure before editing
> - `athanor/docs/BLOCKS.md` — current block catalog
> - `athanor/recipes/minimal-react/README.md` — quality bar and format for the new recipe
> - All four new BLOCK.md files to ensure the docs accurately describe them
>
> See `TASKS.md Phase 5` for the task checklist.

---

## Phase 5: Docs + Recipe

**Session scope:** Two file updates + one new recipe. Read-heavy at the start; writing is moderate.

### Batch 5.1

- [x] Read `athanor/docs/AI.md`
- [x] Read `athanor/docs/BLOCKS.md`
- [x] Read `athanor/recipes/minimal-react/README.md` for format reference
- [x] Read all four new BLOCK.md files to cross-check accuracy

**Update `docs/AI.md`:**
- [x] Add new **State** catalog section with `state/crann` entry (when to use: when state must sync across service worker and content scripts)
- [x] Update Content Script table: remove "not yet implemented; deferred" from `shadow-dom-mount` row
- [x] Update Service Worker table: add `with-alarms` row; remove the deferred `with-crann` row (superseded by `state/crann`)
- [x] Update Messaging table: remove the deferred `crann-sync` row (superseded by `state/crann`)
- [x] Add new **Settings Page** catalog section with `settings-page/react` entry
- [x] Update Hard Constraints section: remove the parenthetical "(Crann blocks are not yet implemented — deferred to a later phase.)" from the shared state constraint
- [x] Update Message Flow section: replace the placeholder note about shadow-dom relay with accurate description (shadow DOM UI does not have extension context; must use content script's `chrome.runtime.sendMessage` or Crann agent)
- [x] Update "What Not To Do" if needed

**Update `docs/BLOCKS.md`:**
- [x] Add entries for: `state/crann`, `content-script/shadow-dom-mount`, `service-worker/with-alarms`, `settings-page/react`

**Write `recipes/shadow-crann/README.md`:**
- [x] Block selection table (which blocks, why each)
- [x] Directory layout after copying all blocks in
- [x] Step-by-step wiring:
  1. Define `config.ts` using `state/crann/config.ts` as template
  2. Wire `service-worker.ts` using `state/crann/service-worker.ts` as template
  3. Wire `content-script/index.ts` using `shadow-dom-mount`
  4. Create `ui/hooks.ts` from `state/crann/hooks.ts` template
  5. Consume hooks in `ui/App.tsx`
  6. (Optional) Add `with-alarms` inactivity timeout
  7. (Optional) Add `settings-page/react`
  8. Populate `manifest.json` fields for this stack
- [x] Message flow diagram for shadow-dom + Crann (Crann replaces the chrome.runtime relay)

### Commit
```
feat(docs): update AI.md, BLOCKS.md for lensor-extraction blocks; add shadow-crann recipe
```

### Close initiative
- [x] Tag `v0.2.0-lensor-extraction` on the commit
- [x] Mark all tasks in this file as complete
- [ ] (Optional) Generate a summary of what was built for the project CHANGELOG or `.context/`

---

## Deferred

- Workspace PoC demonstrating shadow-dom + Crann — deferred to a future initiative; the recipe is the reference
- `popup-ui/vanilla` block — still deferred
- `ui/draggable` hook — Lensor's `useDraggable.ts` is a candidate; deferred (not a core architectural pattern)
- `ui/page-observer` hook — Lensor's `usePageObserver.ts`; deferred
- WebGL / fisheye block — highly Lensor-specific; not extracted
