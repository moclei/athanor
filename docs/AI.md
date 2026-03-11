# Athanor — AI Assembly Guide

This document is the primary reference for any AI agent assembling a browser extension using Athanor's building blocks. Read this before touching any code. Follow the constraints without exception.

---

## What Athanor Is

Athanor is a library of composable, self-contained browser extension primitives. Each block is a complete, working implementation of one part of a browser extension. Your job as an assembling agent is to:

1. Read the user's requirements
2. Select the appropriate block for each component
3. Wire the blocks together into a working extension in `workspace/<extension-name>/`
4. Populate the manifest and any configuration

You do not scaffold from scratch. You do not invent patterns. You select blocks and wire them.

---

## Hard Constraints

These are non-negotiable. Do not deviate.

- **MV3 only.** Never use Manifest V2 patterns.
- **TypeScript only.** No plain JavaScript blocks.
- **No default popup.** The extension UI is always mounted by the content script, either via iframe or Shadow DOM. The `default_popup` key must not appear in the manifest.
- **All network requests go through the service worker.** The content script never fetches directly.
- **All messages are typed.** Use the typed messaging block. Never pass untyped objects through `chrome.runtime.sendMessage`.
- **No shared runtime state between blocks** unless the Crann state-sync block is explicitly included. (Crann blocks are not yet implemented — deferred to a later phase.)

---

## Block Catalog

Each block lives at `blocks/<category>/<variant>/`. Every block contains:
- `BLOCK.md` — what it does, what it exports, what it expects, how to integrate it
- `index.ts` — the entry point
- Any supporting files the block needs

**Always read `BLOCK.md` before using a block.**

### Content Script

| Variant | Path | Use when |
|---|---|---|
| `iframe-mount` | `blocks/content-script/iframe-mount/` | You need a persistent, styled UI injected into the page |
| `shadow-dom-mount` | `blocks/content-script/shadow-dom-mount/` | You need style encapsulation without a separate browsing context — **not yet implemented; deferred** |

### Service Worker

| Variant | Path | Use when |
|---|---|---|
| `basic` | `blocks/service-worker/basic/` | Standard fetch handling, no persistent state |
| `with-crann` | `blocks/service-worker/with-crann/` | State needs to be synced between service worker and content script — **not yet implemented; deferred** |

### Messaging

| Variant | Path | Use when |
|---|---|---|
| `typed-messages` | `blocks/messaging/typed-messages/` | Always — this is required in all extensions |
| `crann-sync` | `blocks/messaging/crann-sync/` | In addition to typed-messages, when using Crann for state — **not yet implemented; deferred** |

### UI (Popup Window)

| Variant | Path | Use when |
|---|---|---|
| `react` | `blocks/popup-ui/react/` | React-based UI mounted inside the content script container |
| `vanilla` | `blocks/popup-ui/vanilla/` | No framework, plain TypeScript DOM manipulation — **not yet implemented; deferred** |

### Manifest Templates

| Variant | Path | Use when |
|---|---|---|
| `base` | `blocks/manifest/templates/base/` | Starting point for all extensions; fill in name, permissions, content script paths |

---

## Message Flow

This is the canonical message flow for all extensions built with Athanor.

When the UI is mounted inside an iframe served from the extension origin (the standard `iframe-mount` pattern), the iframe document has extension context and can use `chrome.runtime.sendMessage` directly — no postMessage relay through the content script is needed:

```
User interaction (UI inside extension-origin iframe)
    ↓  chrome.runtime.sendMessage({ type: 'ACTION', payload: ... })
Service Worker
    ↓  fetch() — all external requests happen here
    ↓  chrome.tabs.sendMessage({ type: 'RESPONSE', payload: ... })
Content Script
    ↓  forwards to iframe via window.postMessage  (or UI polls via onMessage)
UI updates
```

If you use `shadow-dom-mount` (deferred — not yet available), the UI does not have its own browsing context and cannot call `chrome.runtime.sendMessage` directly. In that case all messages must be relayed through the content script. Do not apply this relay pattern to the iframe case — it adds unnecessary complexity.

---

## Typed Message Contract

All messages use a discriminated union defined in `blocks/messaging/typed-messages/types.ts`. When you copy this block into a workspace extension, the `types.ts` in the workspace copy is yours to extend. Add new message variants there — do not bypass the union, and do not modify the library original.

```ts
// Example shape — see the actual block for the full definition
type ExtensionMessage =
  | { type: 'FETCH_DATA'; payload: { url: string } }
  | { type: 'DATA_RESPONSE'; payload: { data: unknown } }
  | { type: 'ERROR'; payload: { message: string } }
```

Use the `sendMessage<T>()` and `onMessage<T>()` wrappers from the messaging block, not the raw Chrome APIs.

---

## Assembly Process

When a user asks you to build an extension, follow these steps:

### 1. Clarify before starting
- What does the extension do?
- Does it need a UI? (Almost always yes — use content script mount)
- Does it need to make network requests? (If yes — service worker required)
- Does it need persistent or synced state? (If yes — consider Crann blocks)
- What framework for the UI? (React or vanilla)

### 2. Select blocks
Map the requirements to blocks from the catalog above. Document your selections.

### 3. Create the workspace directory

The canonical layout for a full-featured extension:

```
workspace/<extension-name>/
├── manifest.json           ← copied from blocks/manifest/templates/base/manifest.json, then filled in
├── content-script/         ← copied from your chosen content-script block
│   └── index.ts
├── service-worker/         ← copied from your chosen service-worker block
│   └── index.ts
├── ui/                     ← copied from your chosen popup-ui block
│   ├── index.tsx
│   └── App.tsx
├── messaging/              ← copied from blocks/messaging/typed-messages/
│   ├── types.ts
│   └── index.ts
├── tsconfig.json           ← extend the root tsconfig: {"extends": "../../tsconfig.json", "include": ["**/*.ts","**/*.tsx"]}
└── vite.config.ts          ← build config (see the popup-ui block's BLOCK.md for the required Vite setup)
```

### 4. Copy blocks in

Copy the full directory of each selected block into the workspace at the paths shown above. Use your file system — for example:

```
cp -r blocks/content-script/iframe-mount/. workspace/<extension-name>/content-script/
cp -r blocks/service-worker/basic/. workspace/<extension-name>/service-worker/
cp -r blocks/messaging/typed-messages/. workspace/<extension-name>/messaging/
cp -r blocks/popup-ui/react/. workspace/<extension-name>/ui/
cp blocks/manifest/templates/base/manifest.json workspace/<extension-name>/manifest.json
```

**Do not reference blocks by path from the library — copy them in.** The extension must be self-contained. The `BLOCK.md` files do not need to be copied.

### 5. Wire the blocks

After copying, update import paths within the workspace files so they resolve correctly:

- In `content-script/index.ts`: import message types from `../messaging/types`
- In `service-worker/index.ts`: import message types and helpers from `../messaging/index`
- In `ui/App.tsx` (or equivalent): import message types from `../messaging/types`
- Register `onMessage` handlers in `service-worker/index.ts`
- Call `sendMessage` from the UI entry point (or content script, depending on mount type — see Message Flow section)
- Confirm the content script mounts the UI iframe by pointing `src` at the correct extension URL (see the content-script block's `BLOCK.md`)

### 6. Populate manifest.json

The copied `manifest.json` contains placeholder values. Fill in every field marked with a comment. Required fields:

- `name`, `version`, `description`
- `manifest_version: 3`
- `permissions` — add only what's needed (e.g. `"storage"`, `"tabs"`)
- `host_permissions` — add only the origins your service worker needs to fetch from
- `content_scripts` — set `"js"` to point to your built content script entry (e.g. `"content-script/index.js"`)
- `background.service_worker` — point to your built service worker entry (e.g. `"service-worker/index.js"`)
- `web_accessible_resources` — include the UI HTML file so the content script can load it in the iframe
- **Do not add `action.default_popup`**

### 7. Verify the wiring

Before declaring done, trace the message flow end-to-end and confirm each step is reachable in the code:

1. The content script's `DOMContentLoaded` (or `chrome.runtime.onMessage` toggle handler) creates the iframe and sets its `src` to a `web_accessible_resources` URL
2. The UI sends a typed `ExtensionMessage` via `chrome.runtime.sendMessage`
3. The service worker's `onMessage` listener matches on `message.type` and handles it
4. The service worker calls `sendResponse` (or `chrome.tabs.sendMessage`) with a typed response
5. The UI receives the response and updates the DOM

If any step is missing or the types don't align across the three entry points (content script, service worker, UI), fix it before loading the extension.

---

## Recipes

Recipes are pre-assembled combinations for common patterns. Start here if the extension fits a known shape.

| Recipe | Path | Description |
|---|---|---|
| `minimal-react` | `recipes/minimal-react/` | iframe mount + basic service worker + typed messages + React UI |

If a recipe exists for your use case, use it as your starting point instead of assembling from scratch.

---

## Graduation

When an extension in `workspace/` is ready to become its own project:
1. `cd workspace/<extension-name>`
2. `git init && git add . && git commit -m "init: graduate from Athanor"`
3. Create a new repo and push
4. Remove or archive the workspace directory

The library and the extension are now fully decoupled.

---

## What Not To Do

- Do not add `default_popup` to the manifest
- Do not fetch from the content script or UI — only the service worker fetches
- Do not use untyped messages
- Do not invent new architectural patterns — use the blocks
- Do not modify blocks in place in the library — copy them to workspace first
- Do not use MV2 APIs (`background.scripts`, persistent background pages, etc.)
