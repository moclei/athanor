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

## `blocks/state/crann/`

**Purpose:** Provides cross-context state synchronisation for Chrome MV3 extensions using [Crann](https://github.com/your-org/crann) v2. Replaces the conventional `chrome.runtime.sendMessage` relay pattern with a hub-and-spokes model: the service worker holds the authoritative state hub; content scripts and UI contexts connect as typed agents. All sides stay in sync automatically via `chrome.runtime` ports.

**Exports:** Three template files to copy into your workspace — not an importable library module. `config.ts` defines the state schema and RPC actions via `createConfig()`. `service-worker.ts` creates the hub via `createStore(config)`. `hooks.ts` exports `useCrannState`, `useCrannActions`, `useCrannReady`, `useAgent`, and `CrannProvider` from `createCrannHooks(config)` for React UIs. For non-React contexts, use `connectStore(config)` directly.

**npm dependencies:** `crann ^2.0.x` (includes `crann/react` sub-path export).

**Manifest requirements:** None required by Crann itself. Permissions depend on what your RPC action handlers do (e.g. `"scripting"`, `"tabs"`, `"alarms"` if actions use those APIs).

→ [BLOCK.md](../blocks/state/crann/BLOCK.md)

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

## `blocks/content-script/shadow-dom-mount/`

**Purpose:** Mounts a React application inside a closed Shadow DOM attached to a host element appended to `document.body`. The host covers the full viewport at `z-index: 2147483647`. Visibility toggles via CSS `visibility: hidden/visible` — the React tree is never unmounted, preserving all component state between hide/show cycles.

**Exports:** `ShadowMountHandle` (interface with `show()`, `hide()`, `destroy()`) and `initializeShadowMount(component, options?)` (from `index.ts`). Idempotent — removes any existing host element with the same `containerId` before creating a new one.

**Manifest requirements:**
- `content_scripts` — register the compiled content script entry
- `action` without `default_popup`
- **No `web_accessible_resources` entry needed** — unlike `iframe-mount`, the shadow DOM UI injects DOM nodes directly and does not load a resource from the extension origin into the page

→ [BLOCK.md](../blocks/content-script/shadow-dom-mount/BLOCK.md)

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

## `blocks/service-worker/with-alarms/`

**Purpose:** Manages Chrome Alarms for an inactivity timeout feature. When the extension activates for a tab, call `createInactivityAlarm` to start the timer. User activity calls `resetInactivityTimer` (throttled to one reset per 30 seconds per tab) to extend the timer. When the extension deactivates, call `clearInactivityAlarm`. The alarm name is `${INACTIVITY_ALARM_PREFIX}${tabId}` — use the exported constant in `chrome.alarms.onAlarm.addListener` to filter alarms from this block.

**Exports:** `INACTIVITY_ALARM_PREFIX` (string constant), `createInactivityAlarm(tabId, getTimeoutMinutes)`, `clearInactivityAlarm(tabId)`, `resetInactivityTimer(tabId, getTimeoutMinutes)` (all from `index.ts`). The `getTimeoutMinutes: () => Promise<number>` callback is injected by the consumer — can be a hardcoded constant, a `chrome.storage.sync` read, or a Crann state read.

**Manifest requirements:**
- `permissions: ["alarms"]`

→ [BLOCK.md](../blocks/service-worker/with-alarms/BLOCK.md)

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

---

## `blocks/settings-page/react/`

**Purpose:** A full-tab settings page scaffold for Chrome MV3 extensions. The page is opened via `chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') })` — not a popup or `options_ui`. Includes a typed `useStorage<T>(key, defaultValue)` hook backed by `chrome.storage.sync` (reads on mount, subscribes to external changes, writes on setter call) and a minimal `SettingsApp.tsx` scaffold with TODO anchors for the consumer's settings fields.

**Exports:** `useStorage<T>` (from `useStorage.ts`), `SettingsApp` (React component, from `SettingsApp.tsx`). `index.tsx` is the Vite entry point and is not imported directly.

**Manifest requirements:**
- A separate Vite entry point for `settings/settings.html` in the workspace `vite.config.ts`
- **No `web_accessible_resources` entry needed** — extension pages opened as tabs via `chrome.tabs.create` are accessible within the extension context without it
- Optionally `"options_ui": { "page": "settings/settings.html", "open_in_tab": true }` to expose the page via the "Extension options" context menu entry

→ [BLOCK.md](../blocks/settings-page/react/BLOCK.md)
