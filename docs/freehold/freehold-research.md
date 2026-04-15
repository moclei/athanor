# Freehold — Research & Architecture Analysis

Research session output. To be used as the basis for creating initiative documents (BRIEF.md, PLAN.md, TASKS.md) in a subsequent planner session.

Source spec: `docs/freehold/SPEC.md`

---

## What Freehold Is

A Chrome MV3 extension for conducting structured competitive audits of web-based SaaS products. The user manually walks through competitor products, captures annotated screenshots, and organizes them into a taxonomy. The output is a folder on disk containing a JSON manifest and organized screenshot files — a structured dataset for feature parity analysis.

Solo-use tool. Fully local. No backend.

---

## Decisions Made (Spec Overrides)

These deviate from the original SPEC.md and are the product of this research session.

| Topic | SPEC.md said | Decision | Rationale |
|---|---|---|---|
| **Framework** | Vanilla DOM | **React** | Athanor provides only React UI blocks. Taxonomy tree editor and hierarchical picker are complex enough to justify React. |
| **UI mount** | `default_popup` | **Shadow DOM (content script)** | AI.md hard constraint: no `default_popup`. Shadow DOM + Crann gives single-agent-per-tab simplicity. |
| **Communication** | Implicit `chrome.runtime.sendMessage` | **Crann only** | All cross-context communication via Crann state sync and RPC actions. No `sendMessage`/`onMessage`. `messaging/typed-messages` block is not used. |
| **Storage** | `chrome.storage.local` (manual) | **Crann `Persist.Local`** | Crann's built-in persistence handles save/load automatically. Downloads folder is a write-through mirror. |
| **Screenshot storage** | Written to Downloads, read back for export | **Write-only to Downloads** | Extension cannot read from Downloads. Crann persistent state is the runtime source of truth. Downloads folder is the portable artifact. |
| **Export** | ZIP export via JSZip | **No export** | The Downloads project folder IS the output. No export step needed. |
| **Sessions** | Session CRUD with archive | **Projects** | Renamed and simplified. Each project = a named folder in Downloads with its taxonomy, captures, and screenshots. No archiving — folders persist as-is. |
| **Taxonomy manager** | Separate `taxonomy.html` page | **Tab within the extension panel** | Taxonomy editing is a view within the shadow DOM UI (e.g., "Capture" and "Taxonomy" tabs), not a separate browser tab. |
| **Build tooling** | `vite-plugin-web-extension` | **Athanor dual-config Vite** | Follow the `shadow-crann` recipe's prescribed build pattern. |
| **Screenshot previews** | Preview in popup after capture | **No previews** | Screenshots are written to disk and referenced by filename. No image data stored in extension state or displayed in UI. |
| **Save behavior** | Explicit "Capture" / save button | **Auto-save** | Every action (screenshot taken, category assigned, note edited, taxonomy changed) persists immediately via Crann + Downloads write. No save button, no unsaved draft state. |

---

## Architecture

### Recipe Base

Start from the **`shadow-crann`** recipe. This provides:
- Shadow DOM content script mount (React inside closed shadow root)
- Crann state sync (service worker hub + content script agent)
- Vite dual-config build pattern

The `minimal-react` recipe is not used (it targets iframe-mount + typed-messages).

### Block Selection

| Block | Used | Notes |
|---|---|---|
| `content-script/shadow-dom-mount` | Yes | React UI host. Full-viewport shadow root, visibility toggle. |
| `state/crann` | Yes | State hub (service worker) + agent (content script). Config, hooks, service-worker template files. |
| `manifest/templates/base` | Yes | Starting point for manifest.json. Needs significant permission changes. |
| `service-worker/basic` | **No** | Crann's service-worker template replaces this entirely. |
| `service-worker/with-alarms` | **No** | No inactivity timeout feature. |
| `messaging/typed-messages` | **No** | Crann replaces all message passing. |
| `content-script/iframe-mount` | **No** | Shadow DOM chosen over iframe for Crann compatibility. |
| `popup-ui/react` | **No** | Custom React UI needed; the PoC fetch-button app is not a useful starting point. |
| `settings-page/react` | **No** | Taxonomy editing is inline. `useStorage` hook pattern is not needed — Crann handles persistence. |

### Blocks NOT Provided (Custom Code Needed)

| Component | Description | Complexity |
|---|---|---|
| **Region selection overlay** | Full-viewport semi-transparent overlay, crosshair cursor, click-drag rectangle selection with visual cutout effect. Pure React component with local state. | Medium |
| **Capture card (inline editing)** | Inline taxonomy picker and notes field per capture. Auto-saves on every change via Crann RPC. | Low-Medium |
| **Taxonomy tree editor** | Nested tree view with add/rename/delete/reorder/reparent. Drag-and-drop via `@dnd-kit`. | High |
| **Project management UI** | Create/select/delete projects. Simple list view. | Low |
| **Screenshot capture + crop** | `captureVisibleTab()` + `OffscreenCanvas` cropping in service worker. | Medium |
| **Downloads writer** | Writes screenshots and JSON files to `~/Downloads/freehold/{project}/` via `chrome.downloads.download()`. | Low |
| **File drop handler** | Accept dropped image files in the UI, read as data URL, pass to service worker for saving. | Low |

### Component Diagram

```
┌─────────────────────────────────────────────────────┐
│  Service Worker (Crann Hub)                         │
│                                                     │
│  createStore(config)                                │
│  ├── State (Persist.Local):                         │
│  │   projects (map of all project data),            │
│  │   activeProjectId                                │
│  ├── RPC Actions:                                   │
│  │   createProject, selectProject, deleteProject,   │
│  │   captureRegion, updateCapture, dropFile,          │
│  │   addTaxonomyNode, renameTaxonomyNode,           │
│  │   deleteTaxonomyNode, moveTaxonomyNode           │
│  ├── Subscriptions:                                 │
│  │   on taxonomy/captures change → write JSON       │
│  │   to Downloads folder                            │
│  └── chrome.action.onClicked → toggle active state  │
│                                                     │
│  captureVisibleTab() + OffscreenCanvas cropping      │
│  chrome.downloads.download() for file output        │
└─────────────┬───────────────────────────────────────┘
              │  Crann ports (automatic)
              │
┌─────────────▼───────────────────────────────────────┐
│  Content Script (Crann Agent)                       │
│                                                     │
│  connectStore(config) → agent                       │
│  initializeShadowMount(<App />)                     │
│  ├── show/hide based on `active` state              │
│                                                     │
│  React Component Tree (inside Shadow DOM):          │
│  ├── App                                            │
│  │   ├── ProjectSelector (create/select project)    │
│  │   ├── CaptureView (main tab)                     │
│  │   │   ├── FileDropZone                           │
│  │   │   └── CaptureList → CaptureCard (inline      │
│  │   │       taxonomy picker + notes, auto-save)    │
│  │   ├── TaxonomyView (taxonomy tab)                │
│  │   │   └── TaxonomyTree (drag-and-drop editor)    │
│  │   └── RegionSelectionOverlay (conditionally       │
│  │       rendered, full-viewport, pointer-events)   │
│  │                                                  │
│  │   All components use:                            │
│  │   useCrannState() for reading state              │
│  │   useCrannActions() for calling RPC actions      │
│  └── useCrannReady() gates rendering                │
└─────────────────────────────────────────────────────┘
```

---

## Data Model

### ProjectData

```typescript
interface ProjectData {
  id: string;           // nanoid
  name: string;         // e.g. "Buildium Audit — April 2025"
  domain: string;       // e.g. "www.buildium.com"
  createdAt: string;    // ISO 8601
  taxonomy: TaxonomyNode[];
  captures: Capture[];
}
```

All project data is stored in a single Crann field: `projects: Record<string, ProjectData>`. The active project is identified by `activeProjectId`.

### Capture

```typescript
interface Capture {
  id: string;           // nanoid
  timestamp: string;    // ISO 8601
  url: string;          // full URL at capture time (path matters)
  pageTitle: string;
  taxonomyNodeId: string | null;
  notes: string;
  filename: string;     // e.g. "003-leasing-lease-templates.png"
}
```

### Taxonomy

```typescript
interface TaxonomyNode {
  id: string;           // nanoid, stable across renames
  label: string;
  children: TaxonomyNode[];
}

type Taxonomy = TaxonomyNode[];
```

Captures reference taxonomy nodes by `id`. Renaming or reorganizing the taxonomy does not orphan captures — they resolve the current label at render time.

---

## Crann Config Design

### State Fields

```typescript
const config = createConfig({
  name: 'freehold',

  // --- Per-tab (Scope.Agent) ---
  active: {
    default: false,
    scope: Scope.Agent,
  },

  // --- Global, persisted by Crann ---
  activeProjectId: {
    default: null as string | null,
    persist: Persist.Local,
  },
  projects: {
    default: {} as Record<string, ProjectData>,
    persist: Persist.Local,
  },

  actions: { /* see RPC Actions below */ },
});
```

All project data (taxonomy, captures) is nested inside the `projects` map, keyed by project ID. Crann's `Persist.Local` handles save/load automatically. No separate `taxonomy` or `captures` fields — the UI reads the active project's data via `projects[activeProjectId]`.

**Why this works at this scale:** Each capture is ~200 bytes of metadata (no image data in state). A project with 100 captures + 50 taxonomy nodes is ~25KB. Even with 5+ projects, the total is well under 1MB. Crann port sync and `chrome.storage.local` writes handle this without issue.

### RPC Actions

All execute in the service worker. All are callable from the React UI via `useCrannActions()`.

| Action | Args | Returns | Side Effects |
|---|---|---|---|
| `createProject` | `name: string, domain: string` | `{ id: string }` | Adds new `ProjectData` to `projects` map with default taxonomy, sets `activeProjectId`, writes initial `project.json` to Downloads |
| `selectProject` | `id: string` | `void` | Sets `activeProjectId`. All data is already in the `projects` map — no loading needed. |
| `deleteProject` | `id: string` | `void` | Removes from `projects` map. Does not delete Downloads folder (user can do that manually). |
| `captureRegion` | `rect: SelectionRect` | `void` | Calls `captureVisibleTab()`, crops via `OffscreenCanvas`, writes PNG to Downloads, creates Capture entry (URL + title from `chrome.tabs.get(ctx.agentLocation.tabId)`, uncategorized, empty notes), appends to active project's `captures`, writes updated `project.json` to Downloads |
| `dropFile` | `dataUrl: string, originalName: string` | `void` | Writes image to Downloads, creates Capture entry (URL + title from tab), appends to active project's `captures`, writes updated `project.json` to Downloads |
| `updateCapture` | `id: string, fields: Partial<Capture>` | `void` | Updates fields on an existing capture in the active project. Writes updated `project.json` to Downloads. Called on every field edit (auto-save). |
| `addTaxonomyNode` | `parentId: string \| null, label: string` | `{ id: string }` | Inserts node into active project's taxonomy. Writes updated `project.json`. |
| `renameTaxonomyNode` | `id: string, label: string` | `void` | Updates label. Writes updated `project.json`. |
| `deleteTaxonomyNode` | `id: string` | `void` | Removes node (captures referencing it become uncategorized). Writes updated `project.json`. |
| `moveTaxonomyNode` | `id: string, newParentId: string \| null, position: number` | `void` | Reparents/reorders. Writes updated `project.json`. |

Note: `saveCapture` is removed. Captures are created automatically by `captureRegion` / `dropFile` and then edited in-place via `updateCapture`. There is no explicit save step.

### Auto-Save Behavior

Every user action persists immediately:
- **Taking a screenshot** → `captureRegion` creates the capture entry with URL, page title, timestamp, and filename. Category is null and notes are empty.
- **Dropping a file** → `dropFile` does the same.
- **Assigning a category** → `updateCapture` fires on selection change. The capture list item shows a taxonomy picker; changing it calls `updateCapture({ taxonomyNodeId })` immediately.
- **Editing notes** → `updateCapture` fires on blur or after a short debounce (~500ms) while typing. No save button.
- **Editing taxonomy** → Each add/rename/delete/move is its own RPC action that persists immediately.

The UI never has an "unsaved" state. Every mutation flows through a Crann RPC action, which:
1. Updates the `projects` map in Crann state — triggers UI re-render and auto-persists to `chrome.storage.local` via `Persist.Local`
2. Writes updated `project.json` to the Downloads folder via `chrome.downloads.download()`

### What is NOT in Crann State

The capture flow (overlay visibility, selection rectangle coordinates, current mouse position) is entirely **local React state** in the `RegionSelectionOverlay` component. Crann is only involved when the service worker needs to act (capture tab, write file) or when data needs to persist (projects, taxonomy, captures).

---

## Capture Flow (Detailed)

### Primary: Region Selection

```
1. User clicks "Take Screenshot" button in CaptureView
   → React: local state `isSelecting = true`
   → RegionSelectionOverlay renders (full-viewport, pointer-events: auto)

2. Overlay: semi-transparent dark background, crosshair cursor
   → User clicks and drags
   → Selection rectangle tracks mouse (box-shadow cutout effect)
   → All local React state (startPos, currentPos)

3. User releases mouse
   → React: local state captures final rect + window.devicePixelRatio
   → Overlay dismisses (isSelecting = false)
   → React calls: await captureRegion(rect)

4. Service worker (captureRegion handler):
   → chrome.tabs.captureVisibleTab(null, { format: 'png' })
   → fetch(dataUrl) → blob → createImageBitmap(blob)
   → new OffscreenCanvas(rect.w * dpr, rect.h * dpr)
   → ctx.drawImage(bitmap, rect.x * dpr, rect.y * dpr, ...)
   → canvas.convertToBlob({ type: 'image/png' })
   → Generate filename: "{NNN}-uncategorized.png"
   → chrome.downloads.download({ url: blobUrl, filename: path })
   → Create Capture entry: { id, timestamp, url, pageTitle,
       taxonomyNodeId: null, notes: '', filename }
   → Append to active project's captures in `projects` map
   → Crann auto-persists to chrome.storage.local
   → Write updated project.json to Downloads

5. UI auto-updates (Crann state change)
   → New capture appears at top of CaptureList
   → User can immediately assign a category (inline taxonomy picker)
   → User can add notes (inline text field)
   → Each edit calls updateCapture() → auto-persists
```

### Fallback: File Drop

```
1. User drags image file from Desktop/Finder into drop zone in CaptureView
   → React: reads file as data URL via FileReader API
   → React calls: await dropFile(dataUrl, originalName)

2. Service worker (dropFile handler):
   → Converts data URL to blob
   → Writes to Downloads/freehold/{project}/screenshots/
   → Creates Capture entry (uncategorized, empty notes)
   → Appends to `captures` state, writes updated project.json

3. UI auto-updates — same inline editing as region capture
```

---

## Downloads Folder Structure

```
~/Downloads/
  freehold/
    buildium-audit/
      project.json          # Full project state (see schema below)
      screenshots/
        001-property-setup-unit-config.png
        002-leasing-applications-form.png
        ...
    resman-audit/
      project.json
      screenshots/
        ...
```

### project.json Schema

```json
{
  "id": "abc123",
  "name": "Buildium Audit — April 2025",
  "domain": "www.buildium.com",
  "createdAt": "2025-04-15T10:30:00Z",
  "taxonomy": [
    {
      "id": "node1",
      "label": "Property & Unit Management",
      "children": [
        { "id": "node2", "label": "Property Setup", "children": [] },
        { "id": "node3", "label": "Unit Configuration", "children": [] }
      ]
    }
  ],
  "captures": [
    {
      "id": "cap1",
      "timestamp": "2025-04-15T11:02:33Z",
      "url": "https://www.buildium.com/leases/create",
      "pageTitle": "Create Lease — Buildium",
      "taxonomyNodeId": "node7",
      "notes": "Three-step wizard. Step 1 is tenant selection.",
      "filename": "001-leasing-lease-creation.png"
    }
  ]
}
```

This file is overwritten on every state change via `chrome.downloads.download()` with `conflictAction: 'overwrite'`. It is the human-readable, portable artifact.

---

## Permissions

```json
{
  "permissions": [
    "scripting",
    "activeTab",
    "storage",
    "unlimitedStorage",
    "downloads",
    "downloads.ui"
  ],
  "host_permissions": [
    "<all_urls>"
  ]
}
```

| Permission | Why |
|---|---|
| `scripting` | `chrome.scripting.executeScript` — inject content script on action click |
| `activeTab` | Grants tab access on icon click (for initial content script injection) |
| `storage` | `chrome.storage.local` — Crann persistence layer |
| `unlimitedStorage` | Removes 5MB quota on `chrome.storage.local` |
| `downloads` | `chrome.downloads.download()` — write screenshots and JSON to disk |
| `downloads.ui` | `chrome.downloads.setUiOptions()` — suppress download bubble |
| `<all_urls>` (host) | Required for `captureVisibleTab()` when triggered from UI button (not action icon click). `activeTab` alone is insufficient — it only grants access during the action icon gesture, which has expired by the time the user clicks "Take Screenshot" in the panel. |

### Permissions NOT needed

- `alarms` — no inactivity timeout
- `tabs` — not needed when using `scripting` + `activeTab`; taxonomy page is inline, no `chrome.tabs.create` for settings

---

## Manifest Shape

```json
{
  "manifest_version": 3,
  "name": "Freehold",
  "version": "0.0.1",
  "description": "Structured competitive audit capture for SaaS products.",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "action": {
    "default_title": "Freehold"
  },
  "permissions": [
    "scripting", "activeTab", "storage",
    "unlimitedStorage", "downloads", "downloads.ui"
  ],
  "host_permissions": ["<all_urls>"]
}
```

Notes:
- No `default_popup` (AI.md hard constraint)
- No `web_accessible_resources` (shadow DOM does not load external resources)
- No `options_ui` (taxonomy editing is inline)
- **No declarative `content_scripts`** — the content script is injected on-demand via `chrome.scripting.executeScript` when the user clicks the action icon (see R6). This avoids loading React + Crann on every page load.

---

## UI Structure (Shadow DOM Panel)

```
┌──────────────────────────────────────────┐
│  Freehold           [Project ▾] [✕]     │
├───────────┬──────────────────────────────┤
│ Capture   │  Taxonomy                    │
├───────────┴──────────────────────────────┤
│                                          │
│  CAPTURE TAB:                            │
│  ┌────────────────────────────────────┐  │
│  │  [ 📸 Take Screenshot ]            │  │
│  │  [ 📂 Drop file here  ]            │  │
│  ├────────────────────────────────────┤  │
│  │  12 captures · www.buildium.com    │  │
│  ├────────────────────────────────────┤  │
│  │  013-leasing-lease-templates.png   │  │
│  │  /leases/create                    │  │
│  │  [Leasing ▾] [Lease Templates ▾]  │  │
│  │  [Three-step wizard, step 1 is  ]  │  │
│  │  [tenant selection.             ]  │  │
│  ├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  │
│  │  012-leasing-applications.png      │  │
│  │  /applications                     │  │
│  │  [Leasing ▾] [Online Apps ▾]      │  │
│  │  [                               ] │  │
│  ├╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌╌┤  │
│  │  011-tenant-profiles.png           │  │
│  │  ...                               │  │
│  └────────────────────────────────────┘  │
│                                          │
│  TAXONOMY TAB:                           │
│  ┌────────────────────────────────────┐  │
│  │  [+ Add Group]                     │  │
│  │                                    │  │
│  │  ▼ Property & Unit Management      │  │
│  │    ├ Property Setup           [⋮]  │  │
│  │    ├ Unit Configuration       [⋮]  │  │
│  │    └ Photos & Media           [⋮]  │  │
│  │  ▼ Leasing                         │  │
│  │    ├ Listings & Vacancy       [⋮]  │  │
│  │    ├ Leads & Prospects        [⋮]  │  │
│  │    └ ...                           │  │
│  └────────────────────────────────────┘  │
│                                          │
└──────────────────────────────────────────┘
```

The capture tab shows actions at top, then a scrollable list of captures (most recent first). Each capture is an inline-editable card: taxonomy picker and notes field auto-save on change. No explicit save button anywhere.

The panel is positioned fixed, top-right, within the shadow DOM host element. Dimensions are adjustable (default ~350px wide, ~500px tall). The rest of the viewport is `pointer-events: none` — page interaction passes through.

During region selection, the panel is hidden (local React state) and a full-viewport overlay with `pointer-events: auto` takes over. When the selection completes, the overlay dismisses and the panel re-appears automatically — the user sees the new capture appear in the list as soon as the RPC action completes.

**First-run experience**: If no projects exist, the panel shows a "Create your first project" form (name + domain) instead of the capture/taxonomy tabs. Once a project is created, the tabs appear.

---

## Third-Party Dependencies

| Package | Purpose | Used By |
|---|---|---|
| `react` | UI framework | Content script (shadow DOM) |
| `react-dom` | React DOM renderer | Content script |
| `crann` | State sync + RPC | Service worker + content script |
| `@dnd-kit/core` | Drag-and-drop primitives | Taxonomy tree editor |
| `@dnd-kit/sortable` | Sortable lists/trees | Taxonomy tree editor |
| `nanoid` | ID generation | Service worker (project, capture, taxonomy node IDs) |

Dev dependencies: `typescript`, `vite`, `@vitejs/plugin-react`, `@types/chrome`, `@types/react`, `@types/react-dom`.

No `jszip` (no export feature). No `styled-components` (inline styles or CSS modules within shadow DOM).

---

## Risks and Mitigations

### R1: `captureVisibleTab` + `<all_urls>` is a broad permission

**Risk**: `<all_urls>` in `host_permissions` is a powerful permission. If this were published to the Chrome Web Store, it would trigger a more intensive review.

**Mitigation**: This is a personal tool, not a published extension. If publishing becomes a goal, consider narrowing `host_permissions` to specific SaaS domains or using the `tabCapture` permission instead.

### R2: `OffscreenCanvas` + `createImageBitmap` in service worker

**Risk**: While `OffscreenCanvas` is supported in Chrome service workers, the combination of `fetch(dataUrl)` → `createImageBitmap` → `drawImage` → `convertToBlob` is a specific path that should be validated early.

**Mitigation**: The first implementation task should include a spike that validates this path end-to-end. If it fails, the fallback is the `chrome.offscreen` API (create a temporary document with full DOM canvas access).

### R3: `chrome.downloads.download()` with `conflictAction: 'overwrite'` for JSON updates

**Risk**: Overwriting `project.json` on every state change means a crash mid-write could corrupt the file. Also, `chrome.downloads.download()` with a data URL writes the full content every time — no partial updates.

**Mitigation**: For a personal tool with small JSON files (<1MB), this is acceptable. The authoritative state lives in Crann's `Persist.Local` (chrome.storage.local), which is transactional. The Downloads file is a convenience copy. If it corrupts, the extension's internal state is unaffected.

### R4: Drag-and-drop in Shadow DOM

**Risk**: Native drag-and-drop events (`dragenter`, `dragover`, `drop`) may behave differently inside a closed Shadow DOM. `@dnd-kit` uses pointer events rather than native drag-and-drop, which should work, but the file drop zone uses native drag-and-drop.

**Mitigation**: Test file drop early. If native drop events don't propagate into the shadow root, the drop zone may need to be attached to the shadow root's inner container explicitly, or we may need to listen at the host element level and forward events.

### R5: Loss of internal state on extension uninstall

**Risk**: If the extension is uninstalled, `chrome.storage.local` is wiped. All project metadata is lost. The Downloads folder survives but the extension cannot re-import from it.

**Mitigation**: Acceptable for a personal tool. The Downloads folder is the portable artifact. A future enhancement could add a "Load from folder" feature using the File System Access API (requires user gesture per session).

### R6: Content script injected on ALL pages

**Risk**: The content script (with React + Crann) is injected on every page matching `<all_urls>`. This adds overhead to every page load even when the extension isn't being used.

**Mitigation**: The `shadow-crann` recipe uses `chrome.scripting.executeScript` for on-demand injection (only when the user clicks the action icon), rather than declarative `content_scripts` in the manifest. This means the content script is NOT loaded on every page — only when the user activates it. The manifest `content_scripts` array should be empty or removed, and the service worker handles injection via `chrome.action.onClicked`. This is the pattern from the Crann service-worker template.

### R7: devicePixelRatio mismatch in screenshot cropping

**Risk**: `captureVisibleTab` captures at the display's native resolution (e.g., 2x on Retina). Selection coordinates from the overlay are in CSS pixels. If `devicePixelRatio` is not accounted for, the crop will be offset and wrong size.

**Mitigation**: The `captureRegion` RPC action receives `devicePixelRatio` from the content script alongside the rect. The service worker multiplies coordinates by this value before cropping.

---

## Default Starter Taxonomy

Hardcoded in the extension, applied when creating a new project. Users edit from there.

```typescript
const DEFAULT_TAXONOMY: TaxonomyNode[] = [
  {
    id: nanoid(), label: 'Property & Unit Management',
    children: [
      { id: nanoid(), label: 'Property Setup', children: [] },
      { id: nanoid(), label: 'Unit Configuration', children: [] },
      { id: nanoid(), label: 'Unit Groups / Building Hierarchy', children: [] },
      { id: nanoid(), label: 'Photos & Media', children: [] },
      { id: nanoid(), label: 'Utility / Meter Tracking', children: [] },
    ],
  },
  {
    id: nanoid(), label: 'Leasing',
    children: [
      { id: nanoid(), label: 'Listings & Vacancy', children: [] },
      { id: nanoid(), label: 'Leads & Prospects', children: [] },
      { id: nanoid(), label: 'Online Applications', children: [] },
      { id: nanoid(), label: 'Tenant Screening', children: [] },
      { id: nanoid(), label: 'Lease Creation & Templates', children: [] },
      { id: nanoid(), label: 'E-Signature', children: [] },
      { id: nanoid(), label: 'Lease Renewals', children: [] },
      { id: nanoid(), label: 'Move-In / Move-Out', children: [] },
      { id: nanoid(), label: 'Lease Document Storage', children: [] },
    ],
  },
  {
    id: nanoid(), label: 'Tenant Management',
    children: [
      { id: nanoid(), label: 'Tenant Profiles', children: [] },
      { id: nanoid(), label: 'Tenant Portal', children: [] },
      { id: nanoid(), label: 'Communications', children: [] },
      { id: nanoid(), label: 'Notices', children: [] },
    ],
  },
  {
    id: nanoid(), label: 'Rent & Payments',
    children: [
      { id: nanoid(), label: 'Rent Roll', children: [] },
      { id: nanoid(), label: 'Online Collection', children: [] },
      { id: nanoid(), label: 'Late Fees', children: [] },
      { id: nanoid(), label: 'Security Deposits', children: [] },
      { id: nanoid(), label: 'Owner Disbursements', children: [] },
    ],
  },
  {
    id: nanoid(), label: 'Accounting',
    children: [
      { id: nanoid(), label: 'Chart of Accounts', children: [] },
      { id: nanoid(), label: 'General Ledger', children: [] },
      { id: nanoid(), label: 'Bank Reconciliation', children: [] },
      { id: nanoid(), label: 'Accounts Payable', children: [] },
      { id: nanoid(), label: 'Owner Statements', children: [] },
      { id: nanoid(), label: 'Tax Forms', children: [] },
      { id: nanoid(), label: 'Accounting Export', children: [] },
    ],
  },
  {
    id: nanoid(), label: 'Maintenance',
    children: [
      { id: nanoid(), label: 'Work Orders', children: [] },
      { id: nanoid(), label: 'Tenant Requests', children: [] },
      { id: nanoid(), label: 'Vendor Management', children: [] },
      { id: nanoid(), label: 'Preventive Maintenance', children: [] },
      { id: nanoid(), label: 'Inspections', children: [] },
    ],
  },
  {
    id: nanoid(), label: 'Reporting & Analytics',
    children: [
      { id: nanoid(), label: 'Occupancy / Vacancy', children: [] },
      { id: nanoid(), label: 'Income & Expense', children: [] },
      { id: nanoid(), label: 'Delinquency', children: [] },
      { id: nanoid(), label: 'Custom Reports', children: [] },
      { id: nanoid(), label: 'Dashboard / KPIs', children: [] },
    ],
  },
  {
    id: nanoid(), label: 'Owner Portal',
    children: [
      { id: nanoid(), label: 'Owner Profiles', children: [] },
      { id: nanoid(), label: 'Owner Portal Access', children: [] },
      { id: nanoid(), label: 'Statements Delivery', children: [] },
    ],
  },
  {
    id: nanoid(), label: 'Settings & Administration',
    children: [
      { id: nanoid(), label: 'User Roles & Permissions', children: [] },
      { id: nanoid(), label: 'Integrations', children: [] },
      { id: nanoid(), label: 'Audit Log', children: [] },
    ],
  },
  {
    id: nanoid(), label: 'Platform & UX',
    children: [
      { id: nanoid(), label: 'Onboarding', children: [] },
      { id: nanoid(), label: 'Mobile Experience', children: [] },
      { id: nanoid(), label: 'Bulk Actions', children: [] },
      { id: nanoid(), label: 'Import Tools', children: [] },
      { id: nanoid(), label: 'API Access', children: [] },
    ],
  },
];
```

---

## Recipe Evaluation

### `shadow-crann` recipe — primary starting point

**Usable as-is:**
- Shadow DOM mount pattern (content-script/index.ts wiring)
- Crann config structure (config.ts template)
- Crann service-worker hub setup (service-worker/index.ts)
- Crann React hooks setup (hooks.ts)
- Vite dual-config build pattern
- Manifest structure (no popup, no WAR)

**Needs modification:**
- `config.ts` — replace template state/actions with Freehold's schema
- `service-worker/index.ts` — replace template subscriptions with capture/downloads logic
- `content-script/index.ts` — replace template wiring with Freehold's app mount
- `vite.config.ts` — no settings page entry point (taxonomy is inline)
- `package.json` — add `@dnd-kit/*`, `nanoid`

**Recipe gaps (not covered):**
- The entire React UI (all components are custom)
- OffscreenCanvas cropping logic
- Downloads folder writer
- File drop handling

### `minimal-react` recipe — not used

Does not apply. It targets iframe-mount + typed-messages, both of which are excluded by our architectural decisions.

---

## Workspace Layout (Projected)

```
workspace/freehold/
├── manifest.json
├── config.ts                     # Crann state schema + RPC actions
├── types.ts                      # Project, Capture, TaxonomyNode interfaces
├── content-script/
│   └── index.ts                  # Shadow mount + Crann agent wiring
├── service-worker/
│   ├── index.ts                  # Crann hub + action click handler
│   ├── capture.ts                # captureVisibleTab + OffscreenCanvas crop
│   └── downloads.ts              # chrome.downloads writer utilities
├── ui/
│   ├── hooks.ts                  # Crann React hooks
│   ├── App.tsx                   # Root: tabs, project selector
│   ├── components/
│   │   ├── ProjectSelector.tsx
│   │   ├── CaptureView.tsx       # Main capture tab
│   │   ├── CaptureCard.tsx       # Single capture: inline taxonomy picker + notes (auto-save)
│   │   ├── CaptureList.tsx       # Scrollable list of captures (most recent first)
│   │   ├── FileDropZone.tsx
│   │   ├── TaxonomyView.tsx      # Taxonomy editing tab
│   │   ├── TaxonomyTree.tsx      # Drag-and-drop tree (uses @dnd-kit)
│   │   └── RegionSelectionOverlay.tsx
│   └── taxonomy-defaults.ts      # Default starter taxonomy
├── tsconfig.json
├── vite.config.ts                # Content script + React build
├── vite.config.scripts.ts        # Service worker build + manifest copy
└── package.json
```

---

## Open Issues for Initiative Planning

These are not blockers — they are items the Planner should address when creating BRIEF.md and PLAN.md.

1. **Filename generation strategy**: The spec suggests `{NNN}-{taxonomy-slug}.png`. The counter (`NNN`) needs to be per-project and persist across sessions. This is straightforward — derive from `captures.length + 1` — but the slug generation from taxonomy node labels (kebab-case, potentially nested: `leasing-lease-templates`) needs a clear rule.

2. **Blob URL lifecycle in service worker**: `URL.createObjectURL()` in a service worker — verify this works for `chrome.downloads.download()`. If not, use data URLs (base64) instead. This affects the `captureRegion` and `dropFile` action implementations.

3. **CSS strategy inside shadow DOM**: Inline styles (as the blocks use), CSS-in-JS, or a stylesheet injected into the shadow root. For a tool with moderate UI complexity (tree editor, form controls, tabs), a strategy should be decided before implementation begins.

4. **Panel positioning and sizing**: The spec shows a fixed panel. Should it be resizable? Draggable? The shadow-dom-mount block defaults to full-viewport — the panel is a positioned child within it. Default dimensions and position should be defined.

5. **Category picker component design**: Hierarchical dropdown (nested menus) vs tree-select vs two-level dropdown (group + node). This affects both the capture form and the UX of categorizing screenshots quickly.

6. **Content script injection strategy**: Per R6, should use `chrome.scripting.executeScript` on action click rather than declarative `content_scripts`. This is the pattern from the Crann service-worker template. The Planner should confirm this approach.

---

## Summary

Freehold maps onto the `shadow-crann` recipe with significant custom UI work. The core plumbing (Crann state sync, shadow DOM mount, Vite build) is provided by Athanor blocks. The custom work is:

1. **OffscreenCanvas capture pipeline** (service worker)
2. **Downloads folder writer** (service worker)
3. **Region selection overlay** (React component)
4. **Taxonomy tree editor with drag-and-drop** (React component, highest complexity)
5. **Capture list with inline editing and hierarchical category picker** (React component)
6. **Project management UI** (React component, lowest complexity)

The highest-risk items to spike early are the `OffscreenCanvas` cropping path and file drop behavior inside shadow DOM.
