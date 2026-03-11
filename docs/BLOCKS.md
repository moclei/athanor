# Block Catalog

This file is a concise reference for every implemented block in the Athanor library. Each entry summarises what the block does, what it exports, and what manifest fields it requires.

Use this alongside `docs/AI.md`. `AI.md` describes the assembly process, the message flow, and the hard constraints — read it first. This file answers "what does this specific block give me and what do I need to add to the manifest to use it?"

For full integration details, copy instructions, and code examples, follow the link to the block's own `BLOCK.md`.

---

## `blocks/messaging/typed-messages/`

**Purpose:** Defines a discriminated union (`ExtensionMessage`) covering `FETCH_DATA`, `DATA_RESPONSE`, and `ERROR`, and exports typed wrappers over `chrome.runtime.sendMessage` and `chrome.runtime.onMessage.addListener` so that no raw Chrome messaging API is called with untyped objects.

**Exports:** `ExtensionMessage` (type), `MessageSender` (type alias), `MessageHandler` (type alias), `sendMessage(msg): Promise<unknown>` (from `index.ts`), `onMessage(handler): void` (from `index.ts`). `index.ts` re-exports the types for convenience.

**Manifest requirements:** None. `chrome.runtime.sendMessage` and `chrome.runtime.onMessage` are available to all extension contexts without additional permissions.

→ [BLOCK.md](../blocks/messaging/typed-messages/BLOCK.md)

---

## `blocks/content-script/iframe-mount/`

**Purpose:** Injects a fixed-position `<iframe>` (300 × 600 px, top-right corner, z-index 2147483647) into every matched page. The iframe loads `ui/index.html` from the extension origin, giving the UI full `chrome.runtime` access. Listens for a `TOGGLE_UI` message from the service worker to show or hide the panel.

**Exports:** Self-executing — no exports. Including the compiled file as a content script entry point is sufficient; the block boots itself on `DOMContentLoaded`.

**Manifest requirements:**
- `content_scripts` — register the compiled `content-script/index.js` on the target URL patterns
- `action` without `default_popup` — required for the service worker to receive `chrome.action.onClicked`
- `web_accessible_resources` — list `ui/*` so the iframe can load `ui/index.html` from the extension origin

→ [BLOCK.md](../blocks/content-script/iframe-mount/BLOCK.md)

---

## `blocks/service-worker/basic/`

**Purpose:** Background service worker that handles two responsibilities: forwarding `chrome.action.onClicked` to the active tab's content script as a `TOGGLE_UI` message, and responding to `FETCH_DATA` messages from the UI by performing a `fetch()` and returning `DATA_RESPONSE` or `ERROR`. Correctly returns `true` from the raw listener to keep the message channel open for async `sendResponse`.

**Exports:** Self-executing — no exports. Registering the compiled output as `background.service_worker` in the manifest activates it.

**Manifest requirements:**
- `background.service_worker` pointing to the compiled output, with `"type": "module"`
- `action` without `default_popup`
- `permissions: ["tabs"]` (or `"activeTab"`) for `chrome.tabs.sendMessage`
- `host_permissions` listing the origins the service worker may fetch from

→ [BLOCK.md](../blocks/service-worker/basic/BLOCK.md)

---

## `blocks/popup-ui/react/`

**Purpose:** Minimal React UI (built with Vite) designed to run inside an extension-origin iframe. Provides a button that sends a typed `FETCH_DATA` message to the service worker and renders the response — as an `<img>` if the payload contains an image URL, or as formatted JSON otherwise. `App.tsx` contains a `DEFAULT_URL` constant to set the fetch target.

**Exports:** `App` (React component, from `App.tsx`). `index.tsx` is the Vite HTML entry point and mounts `<App />` — it is not imported directly. The block also ships a standalone `vite.config.ts` for testing the block in isolation; workspace extensions provide their own build config.

**Manifest requirements:**
- `web_accessible_resources` — list `ui/*` so the content script can load the built `ui/index.html` in the iframe

→ [BLOCK.md](../blocks/popup-ui/react/BLOCK.md)

---

## `blocks/manifest/templates/base/`

**Purpose:** A ready-to-copy `manifest.json` template pre-wired for the full standard block stack (`iframe-mount` + `basic` service worker + `typed-messages` + React UI). Every field that requires customisation is present with a clearly labelled placeholder value and a comment in `BLOCK.md` explaining what to set.

**Exports:** Not a code module — no exports. Copy `manifest.json` to the workspace extension root and fill in the placeholder values.

**Manifest requirements:** This block *is* the manifest template. See `BLOCK.md` for a field-by-field reference and the Common Permission Patterns section for additions required by non-standard features.

→ [BLOCK.md](../blocks/manifest/templates/base/BLOCK.md)
