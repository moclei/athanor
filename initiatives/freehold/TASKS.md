# Freehold — Tasks

## Phase 1: Scaffold + Risk Spikes

**Session scope:** Set up the workspace from the `shadow-crann` recipe, install deps, define data types, and validate the two highest-risk paths before any production code depends on them. ~7 files created/modified.

- [x] Create `workspace/freehold/` directory structure (content-script/, service-worker/, ui/components/)
- [x] Copy block files from `shadow-crann` recipe: shadow-dom-mount → content-script/, crann config template → config.ts, crann service-worker template → service-worker/index.ts, crann hooks template → ui/hooks.ts
- [x] Create `package.json` with all dependencies (react, react-dom, crann, @dnd-kit/core, @dnd-kit/sortable, nanoid; dev: typescript, vite, @vitejs/plugin-react, @types/chrome, @types/react, @types/react-dom)
- [x] Create `tsconfig.json` extending root config
- [x] Create `vite.config.ts` (content script + React bundle, IIFE) and `vite.config.scripts.ts` (service worker, ES module + manifest copy)
- [x] Create `manifest.json` with all permissions (scripting, activeTab, storage, unlimitedStorage, downloads, downloads.ui, host: `<all_urls>`), no `content_scripts`, no `default_popup`
- [x] Create `types.ts` — `ProjectData`, `Capture`, `TaxonomyNode`, `SelectionRect` interfaces
- [x] Spike: OffscreenCanvas cropping in service worker — write a minimal test that does `captureVisibleTab` → `fetch(dataUrl)` → `createImageBitmap` → `OffscreenCanvas.drawImage` → `convertToBlob` → data URL conversion → `chrome.downloads.download()`. Verify the full pipeline works. Document the result in PLAN.md (confirm or note fallback to `chrome.offscreen` API).
- [x] Spike: File drop in shadow DOM — add a minimal drop zone inside the shadow root, verify native `dragenter`/`dragover`/`drop` events fire correctly on an element inside a closed shadow DOM. Document result in PLAN.md.
- [x] Verify: `npm install` succeeds, `npm run build` produces `dist/` with `background.js`, `content-script/index.js`, and `manifest.json`
- [x] 🔄 Handoff

# --- handoff point ---

## Phase 2: Crann Config + Service Worker Core

**Session scope:** Define the full Crann state schema, implement the capture pipeline and downloads writer in the service worker, wire the hub. ~5 files.

- [x] Create `config.ts` — full Crann config with `active` (Scope.Agent), `activeProjectId` (Persist.Local), `projects` (Persist.Local), and all 10 RPC action stubs (createProject, selectProject, deleteProject, captureRegion, dropFile, updateCapture, addTaxonomyNode, renameTaxonomyNode, deleteTaxonomyNode, moveTaxonomyNode)
- [ ] Create `service-worker/capture.ts` — `captureVisibleTab()` + OffscreenCanvas cropping + `blobToDataUrl()` conversion (based on spike result from Phase 1)
- [ ] Create `service-worker/downloads.ts` — `writeScreenshot(projectSlug, filename, dataUrl)` and `writeProjectJson(projectSlug, projectData)` using `chrome.downloads.download()` with `conflictAction: 'overwrite'`; filename slug generation helper (`slugify` and `buildCaptureFilename`)
- [ ] Wire `service-worker/index.ts` — `createStore(config)`, `chrome.action.onClicked` handler (inject content script or toggle active), implement all RPC action handlers (createProject, selectProject, deleteProject, captureRegion, dropFile, updateCapture), subscribe to project changes for Downloads write-through
- [ ] Update `ui/hooks.ts` — confirm exports match the new config shape
- [ ] Verify: build succeeds, service worker loads without errors in `chrome://extensions`
- [ ] 🔄 Handoff

# --- handoff point ---

## Phase 3: UI Shell + Capture Flow

**Session scope:** Build the main React UI — app shell, project selector, capture view with screenshot + file drop, region selection overlay. ~8 files, highest file count but components are moderate complexity.

- [ ] Wire `content-script/index.ts` — `connectStore(config)`, `initializeShadowMount(<App />)`, subscribe to `active` for show/hide, inject panel stylesheet into shadow root
- [ ] Create panel stylesheet — CSS for panel positioning (fixed, top-right, 380px wide), tabs, capture cards, form controls; injected as `<style>` in shadow root
- [ ] Create `ui/App.tsx` — root component: `useCrannReady` gate, tab switcher (Capture / Taxonomy), project selector in header, close button, first-run "Create your first project" form
- [ ] Create `ui/components/ProjectSelector.tsx` — dropdown of existing projects + "New Project" option; calls `createProject` / `selectProject` actions
- [ ] Create `ui/components/CaptureView.tsx` — "Take Screenshot" button (triggers `isSelecting` state), file drop zone area, capture list; conditionally renders `RegionSelectionOverlay`
- [ ] Create `ui/components/RegionSelectionOverlay.tsx` — full-viewport overlay, semi-transparent background, crosshair cursor, click-drag rectangle with visual cutout, captures `devicePixelRatio`, fires `captureRegion(rect)` on mouseup, dismisses
- [ ] Create `ui/components/CaptureList.tsx` — scrollable list of captures (most recent first) from active project's `captures` array
- [ ] Create `ui/components/CaptureCard.tsx` — single capture: filename, URL path, notes text field (auto-saves on blur/debounce via `updateCapture`), placeholder for category picker (wired in Phase 4)
- [ ] Create `ui/components/FileDropZone.tsx` — accepts dragged image files, reads as data URL via `FileReader`, calls `dropFile(dataUrl, originalName)` action
- [ ] Verify: extension loads, icon click shows panel, "Take Screenshot" triggers overlay, capture appears in list
- [ ] 🔄 Handoff

# --- handoff point ---

## Phase 4: Taxonomy Editor + Category Picker

**Session scope:** Build the taxonomy tree editor with drag-and-drop and the category picker for capture cards. Highest UI complexity phase. ~5 files.

- [ ] Create `ui/taxonomy-defaults.ts` — default starter taxonomy (property management domain, 10 groups with children)
- [ ] Create `ui/components/TaxonomyView.tsx` — taxonomy tab: "Add Group" button, renders `TaxonomyTree`
- [ ] Create `ui/components/TaxonomyTree.tsx` — recursive tree renderer with `@dnd-kit/core` + `@dnd-kit/sortable` for drag-and-drop reorder and reparent; inline rename on double-click; delete with confirmation; context menu (⋮) for actions; calls `addTaxonomyNode`, `renameTaxonomyNode`, `deleteTaxonomyNode`, `moveTaxonomyNode` actions
- [ ] Create `ui/components/CategoryPicker.tsx` — flat `<select>` with `<optgroup>` per top-level taxonomy node, entries formatted as child labels; calls `updateCapture({ taxonomyNodeId })` on change; "Uncategorized" option
- [ ] Wire `CategoryPicker` into `CaptureCard.tsx` — replace placeholder with working picker
- [ ] Wire taxonomy RPC action handlers in service-worker if not already complete (addTaxonomyNode, renameTaxonomyNode, deleteTaxonomyNode, moveTaxonomyNode)
- [ ] Verify: taxonomy tab shows tree, nodes can be added/renamed/deleted/reordered, captures can be categorized via picker, category assignments persist
- [ ] 🔄 Handoff

# --- handoff point ---

## Phase 5: Integration, Polish, Build Verification

**Session scope:** Wire remaining integration points, polish the UI, verify the complete build works end-to-end. Editing existing files, minimal new files.

- [ ] Wire Downloads write-through subscription — service worker subscribes to `projects` state changes, writes updated `project.json` for the active project on every mutation
- [ ] Wire auto-save debounce for notes field — `updateCapture` fires on blur or after ~500ms debounce while typing
- [ ] Wire `createProject` to apply default starter taxonomy and write initial `project.json` + empty `screenshots/` directory to Downloads
- [ ] First-run experience — when no projects exist, show "Create your first project" form (name + domain) instead of capture/taxonomy tabs
- [ ] Panel CSS polish — consistent spacing, scrollable capture list, tab active states, hover effects, close button styling
- [ ] Suppress download bubble — call `chrome.downloads.setUiOptions({ enabled: false })` in service worker startup (requires `downloads.ui` permission)
- [ ] Full build and manual test: `npm run build`, load unpacked from `dist/`, verify complete flow (create project → take screenshot → categorize → edit notes → check Downloads folder output)
- [ ] 🔄 Handoff

## Deferred

- Resizable/draggable panel — fixed position is sufficient for v1
- Screenshot previews in capture cards — adds state size and complexity; filename reference is sufficient
- "Load from folder" import feature — would use File System Access API; recovery path if extension is uninstalled
- ZIP export — the Downloads folder structure IS the portable artifact
- `popup-ui/vanilla` alternative — React is the only supported UI framework in Athanor
