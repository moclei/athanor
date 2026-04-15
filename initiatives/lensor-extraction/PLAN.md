# Lensor Extraction — Plan

## Approach

Start by writing the analysis document. Reading both Lensor and Crann source with fresh eyes — before writing any block — ensures nothing is guessed and that the block interfaces are grounded in how the real library actually works. The analysis doc then serves as the authoritative reference for every subsequent phase.

Implement blocks in dependency order: `state/crann` first (the most architecturally novel pattern), then `shadow-dom-mount` (independent of Crann but cross-references it), then `with-alarms` (standalone), then `settings-page` (standalone). Docs and recipe last, once all blocks are in place.

---

## Key Architecture: Crann Hub-and-Spokes

Crann's state sync model has **one hub, many spokes**. All pieces share a single `config.ts`:

```
config.ts              ← define state schema with createConfig()
    ↓
Service Worker:        createStore(config)         ← the hub; runs in background
Content Script/UI:     connectStore(config)         ← non-React client
React UI:              createCrannHooks(config)     ← from 'crann/react'
```

**Critical:** these three pieces cannot be split into separate Athanor blocks. The config is the binding contract. `createStore` makes no sense without clients; clients make no sense without a hub. Therefore `blocks/state/crann/` is ONE block that provides template files for all three sides.

### Scope.Agent vs Scope.Shared

- `Scope.Agent` — per-tab state; scoped to one content script instance. In Lensor: `active`, `hoveredColor`, `lensePosition`.
- `Scope.Shared` — global across all tabs. In Lensor: `captureCount`.

Default (no `scope` key) is `Scope.Shared` in Crann v2.

### RPC Actions

Actions are defined in `config.ts` and execute **in the service worker** context, callable from any client via `agent.actions.actionName()`. Typed end-to-end. Lensor uses this for `captureTab`, `openSettings`, `resetInactivityTimer`.

### React Hooks

`createCrannHooks(config)` returns `{ useCrannState, useCrannActions, useCrannReady, useAgent, CrannProvider }`. Export these from a `hooks.ts` file in the workspace and import them into React components. No need for `CrannProvider` wrapper (optional in v2) unless you need the context explicitly.

---

## Block Technical Notes

### `blocks/state/crann/`

Three template files with annotations:

**`config.ts`** — `createConfig()` template. Annotate each state item explaining `scope`, `default`, `persist` options. Show the `actions` key with a stub RPC handler.

**`service-worker.ts`** — `createStore(config)` + `store.subscribe()` template. Show:
- How to read `agentInfo.location.tabId` from the subscribe callback (needed for per-tab operations)
- The key-filter array on `store.subscribe(['key'], ...)` — only fires when those keys change
- `store.getAgents({ context: 'contentscript', tabId })` to look up connected agents for a tab (note: use the string `'contentscript'` directly — `PorterContext` is not exported from `crann`)
- `store.getAgentState(agentId)` to read per-agent state
- `store.setState({ key: value }, agentId)` to write state for a specific agent
- A `chrome.action.onClicked` handler that uses the above to toggle `active` or inject the content script
- `chrome.scripting.executeScript` content script injection stub

**`hooks.ts`** — `createCrannHooks(config)` template. One line in Lensor's `useLensorState.ts`; elaborate in BLOCK.md.

BLOCK.md must explain:
- npm deps: `crann` (`^2.0.x`) + `crann/react` sub-path export
- When to use `connectStore` vs `createCrannHooks` (non-React vs React contexts)
- The `agent.onReady()` / `agent.ready()` pattern for non-React clients
- How actions differ from state (state syncs; actions are RPC calls to the SW)
- `store.getAgents()`, `store.getAgentState()`, and per-agent `store.setState()` for service worker side access
- The key-filter array on `store.subscribe()` for performance

### `blocks/content-script/shadow-dom-mount/`

Source: `../lensor/src/ui/index.tsx`

Implementation:
- Host `<div>` appended to `document.body`; `attachShadow({ mode: 'closed' })`
- Host styles: `position: fixed; top: 0; right: 0; width: 100%; height: 100vh; z-index: 2147483647; pointer-events: none; display: block; overflow: hidden`
- Idempotent: check for existing container by ID, remove before re-creating
- Visibility: toggle `visibility: hidden/visible` on the host — never remove from DOM (preserves React state)
- `StyleSheetManager target={shadowRoot}` slot for styled-components consumers (document a `styleTarget` option that defaults to undefined, consumer sets to the shadow root div)
- React root mounts inside a `<div>` appended to the shadow root

Export shape:
```ts
export interface ShadowMountHandle {
  show(): void;
  hide(): void;
  destroy(): void;
}
export function initializeShadowMount(
  component: React.ReactNode,
  options?: { containerId?: string }
): ShadowMountHandle
```

BLOCK.md note: if using with `state/crann`, pass `<CrannProvider>` as the component wrapper, or simply use `createCrannHooks` directly inside the mounted React app (no provider needed in Crann v2 for typical usage).

### `blocks/service-worker/with-alarms/`

Source: `../lensor/src/lib/inactivity-alarm.ts`

Key design decision vs Lensor: decouple from `chrome.storage.sync` key. Lensor reads `settings.inactivityTimeoutMinutes` from its own storage key. The block accepts a `getTimeoutMinutes: () => Promise<number>` callback — consumer provides it (could be a hardcoded constant, could read from settings).

Throttle: in-memory `Record<number, number>` tracking last reset time per tab. `resetInactivityTimer` skips if called within 30 seconds of the last reset.

Export shape:
```ts
export const INACTIVITY_ALARM_PREFIX = 'inactivity-';
export async function createInactivityAlarm(
  tabId: number,
  getTimeoutMinutes: () => Promise<number>
): Promise<void>
export async function clearInactivityAlarm(tabId: number): Promise<void>
export async function resetInactivityTimer(
  tabId: number,
  getTimeoutMinutes: () => Promise<number>
): Promise<void>
```

BLOCK.md shows how to wire `chrome.alarms.onAlarm.addListener` in the service worker. Manifest requirement: `"alarms"` permission.

### `blocks/settings-page/react/`

Source: `../lensor/src/settings/`

This block is a scaffold — it provides the structural shell, not Lensor-specific settings UI. The consumer fills in their own settings fields.

Files:
- `settings.html` — minimal HTML; links to `settings.js` (built output)
- `index.tsx` — mounts `<SettingsApp />` to `#root`
- `useStorage.ts` — typed `chrome.storage.sync` wrapper:
  ```ts
  export function useStorage<T>(key: string, defaultValue: T): [T, (value: T) => void]
  ```
- `SettingsApp.tsx` — minimal tabbed scaffold with TODO comment anchors for consumer to fill in

BLOCK.md clarifications:
- Settings pages are opened via `chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') })` — not via `options_page`/`options_ui` in manifest
- **No `web_accessible_resources` entry needed** — extension pages opened as tabs via `chrome.tabs.create` are accessible within the extension context without it. `web_accessible_resources` is only required for resources injected into web pages (e.g. the iframe in `iframe-mount`). Lensor's manifest confirms this.
- Separate Vite entry point required — show the vite.config addition

---

## Recipe: `shadow-crann`

The full Lensor-style stack. Walk through:
1. Block selection rationale
2. Directory layout after copying all blocks
3. `config.ts` — define your state schema
4. `service-worker.ts` — wire `createStore`, subscribe to state changes, handle icon click
5. `content-script/index.ts` — inject shadow DOM, mount React app
6. `ui/hooks.ts` — export Crann hooks
7. `ui/App.tsx` — consume hooks in React
8. (Optional) `service-worker/with-alarms` wiring
9. (Optional) `settings-page/react` wiring
10. `manifest.json` fields for this stack

---

## Rejected Approaches

- Splitting Crann into `messaging/crann-sync` + `service-worker/with-crann` — rejected because you cannot have one without the other; the shared config is the binding contract
- Workspace PoC — not needed; the `minimal-react` PoC in foundation already validated the copy-and-wire model; the recipe covers the Lensor-style pattern

## Open Questions

_None at initiative start._

## Resolved Decisions

- **`blocks/state/crann/` not `blocks/messaging/crann-sync/`** — Crann replaces the messaging layer entirely; it belongs in a new `state/` category, not under `messaging/`
- **`getTimeoutMinutes` callback over direct storage read** — keeps `with-alarms` decoupled from `settings-page`; consumer can hardcode or read from any source
