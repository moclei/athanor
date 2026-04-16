# Freehold — Context

A Chrome MV3 extension for structured competitive audits of SaaS products. Sidebar panel injected via content script into a shadow DOM. Users create audit projects, capture screenshots, organize captures under a taxonomy tree, and annotate them.

Data persists via `chrome.storage.local` (Crann's `Persist.Local`). Screenshots save to Downloads via `chrome.downloads`.

---

## Architecture

**State management**: Crann v2 (see `blocks/state/crann/BLOCK.md`) — hub-and-spokes model. Service worker runs the store (hub), content script connects as an agent (spoke). Actions are RPC: content script sends action name + args over a port, service worker executes the handler and returns the result.

**Two Vite builds** (run via `npm run build`):

| Config | Target | Format | Output |
|--------|--------|--------|--------|
| `vite.config.ts` | Content script | IIFE | `dist/content-script/index.js` |
| `vite.config.scripts.ts` | Service worker | ES module | `dist/background.js` |

Load the unpacked extension from `dist/` in Chrome.

### Dual config pattern

The Crann config is split into two files because action handlers use service-worker-only APIs (`chrome.tabs.captureVisibleTab`, `chrome.downloads`, etc.) that cannot be bundled into the content script:

- **`config.ts`** — State schema + no-op action stubs. Imported by the content script (`ui/hooks.ts`). The content script agent never executes handlers — it only needs action names and parameter types for the typed RPC proxy.
- **`config.sw.ts`** — Same state schema, real action handler implementations with static imports of SW-only modules. Imported only by `service-worker/index.ts`.

**If you add or change an action, update both files** — stubs in `config.ts`, implementation in `config.sw.ts`.

---

## File layout

```
workspace/freehold/
├── manifest.json
├── types.ts                        # ProjectData, Capture, TaxonomyNode, SelectionRect
├── config.ts                       # Crann config — state schema + action stubs (content script)
├── config.sw.ts                    # Crann config — real action handlers (service worker)
├── content-script/
│   ├── index.ts                    # Entry point: creates shadow DOM, renders React App
│   └── panel-styles.ts             # All CSS as a template literal injected into shadow root
├── service-worker/
│   ├── index.ts                    # createStore, action click handler, initialized handshake
│   ├── capture.ts                  # captureAndCrop (chrome.tabs.captureVisibleTab + OffscreenCanvas)
│   └── downloads.ts                # writeScreenshot, buildCaptureFilename (chrome.downloads)
├── ui/
│   ├── App.tsx                     # Root component: tabs, selection mode, visibility control
│   ├── hooks.ts                    # createCrannHooks(config) → useCrannState, useCrannActions, etc.
│   ├── ShadowContainerContext.ts   # React context for the shadow DOM host element
│   ├── taxonomy-defaults.ts        # buildDefaultTaxonomy() — default taxonomy tree for new projects
│   └── components/
│       ├── CaptureView.tsx          # FileDropZone + CaptureList
│       ├── CaptureList.tsx          # Renders list of CaptureCard components
│       ├── CaptureCard.tsx          # Single capture: filename, URL, category picker, notes
│       ├── CategoryPicker.tsx       # Taxonomy node selector dropdown for a capture
│       ├── FileDropZone.tsx         # Drag-and-drop image import
│       ├── RegionSelectionOverlay.tsx # Full-viewport crosshair region selection
│       ├── ProjectSelector.tsx      # Project switcher dropdown in the header
│       ├── TaxonomyView.tsx         # Taxonomy tab: add group, expand/collapse all
│       └── TaxonomyTree.tsx         # Recursive sortable tree (DnD, rename, delete, move)
├── vite.config.ts
├── vite.config.scripts.ts
└── package.json
```

---

## Key patterns

**UI visibility**: Controlled by Crann `active` state. `App.tsx` sets `shadowContainer.style.visibility` based on `active`. A `uiActivated` state latch (set once on first Crann ready, never reset) prevents the React tree from unmounting during brief reconnections caused by MV3 service worker wake cycles.

**Initialized handshake**: On first content script injection, `App.tsx` sets `initialized=true` in Crann state. The service worker subscribes to this and sets `active=true` to show the panel.

**Screenshot flow**: "Take Screenshot" button (fixed toolbar in `App.tsx`) → `.fh-panel` unmounts → `RegionSelectionOverlay` renders at the App level (outside the panel, inside the shadow DOM) → user drags region → `captureRegion` RPC → panel reappears. Escape cancels and restores the panel.

**Taxonomy**: Groups default to collapsed. Expand/Collapse All uses a generation counter prop. Tree nodes support rename (double-click), delete, add child, move-to, and drag-and-drop reorder via `@dnd-kit`.

**Styles**: All CSS is in `content-script/panel-styles.ts` as a single template literal injected into the shadow root. No CSS modules or external stylesheets.

---

## Reference

- Crann docs: `blocks/state/crann/BLOCK.md`
- Shadow-Crann recipe: `recipes/shadow-crann/README.md`
- Lensor (working reference extension): `/Users/marcocleirigh/Workspace/lensor/src/`
