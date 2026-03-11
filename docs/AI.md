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
- **No shared runtime state between blocks** unless the Crann state-sync block is explicitly included.

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
| `shadow-dom-mount` | `blocks/content-script/shadow-dom-mount/` | You need style encapsulation without a separate browsing context |

### Service Worker

| Variant | Path | Use when |
|---|---|---|
| `basic` | `blocks/service-worker/basic/` | Standard fetch handling, no persistent state |
| `with-crann` | `blocks/service-worker/with-crann/` | State needs to be synced between service worker and content script |

### Messaging

| Variant | Path | Use when |
|---|---|---|
| `typed-messages` | `blocks/messaging/typed-messages/` | Always — this is required in all extensions |
| `crann-sync` | `blocks/messaging/crann-sync/` | In addition to typed-messages, when using Crann for state |

### UI (Popup Window)

| Variant | Path | Use when |
|---|---|---|
| `react` | `blocks/popup-ui/react/` | React-based UI mounted inside the content script container |
| `vanilla` | `blocks/popup-ui/vanilla/` | No framework, plain TypeScript DOM manipulation |

### Manifest Templates

| Variant | Path | Use when |
|---|---|---|
| `base` | `blocks/manifest/templates/base/` | Starting point for all extensions; fill in name, permissions, content script paths |

---

## Message Flow

This is the canonical message flow for all extensions built with Athanor:

```
User interaction (UI in iframe/shadow-dom)
    ↓  chrome.runtime.sendMessage({ type: 'ACTION', payload: ... })
Content Script
    ↓  chrome.runtime.sendMessage (forwards or initiates)
Service Worker
    ↓  fetch() — all external requests happen here
    ↓  chrome.tabs.sendMessage({ type: 'RESPONSE', payload: ... })
Content Script
    ↓  updates UI
```

The UI layer never talks to the service worker directly. All messages pass through the content script.

---

## Typed Message Contract

All messages use a discriminated union defined in `blocks/messaging/typed-messages/types.ts`. When adding new message types for a specific extension, extend this union — do not bypass it.

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
```
workspace/<extension-name>/
├── manifest.json
├── content-script/     ← from selected block
├── service-worker/     ← from selected block
├── ui/                 ← from selected popup-ui block
├── messaging/          ← always include typed-messages
└── tsconfig.json
```

### 4. Copy blocks in
Copy the selected block directories into the workspace. **Do not reference blocks by path from the library — copy them in.** The extension must be self-contained.

### 5. Wire the blocks
- Import message types into both content script and service worker
- Register `onMessage` handlers in the service worker
- Call `sendMessage` from the content script
- Mount the UI from the content script entry point
- Fill in `manifest.json` from the base template

### 6. Populate manifest.json
Required fields from the base template:
- `name`, `version`, `description`
- `manifest_version: 3`
- `permissions` — add only what's needed
- `content_scripts` — point to your content script entry
- `background.service_worker` — point to your service worker entry
- **Do not add `action.default_popup`**

### 7. Verify the wiring
Before declaring done, trace the message flow end-to-end and confirm:
- Content script mounts the UI correctly
- A user action in the UI triggers a typed message
- The service worker receives and handles it
- The response flows back to the UI

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
