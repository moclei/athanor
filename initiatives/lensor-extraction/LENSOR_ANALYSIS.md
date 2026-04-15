# Lensor/Crann Architecture Analysis

> Canonical reference for the `lensor-extraction` initiative. Written after reading Lensor and Crann source in full. All Athanor blocks derived from this initiative should be grounded here.

---

## 1. Three-Context Model

Lensor operates across three independent JavaScript execution contexts:

```
┌───────────────────────────┬────────────────────────────┬──────────────────────────┐
│      Service Worker        │      Content Script         │      Settings Page        │
│      (background)          │    (injected per-tab)       │   (opened as a tab)       │
├───────────────────────────┼────────────────────────────┼──────────────────────────┤
│ • createStore(config)      │ • connectStore(config)      │ • Standalone React app    │
│ • State hub                │ • Shadow DOM host           │ • chrome.storage.sync     │
│ • RPC action handlers      │ • React app (lens UI)       │ • useSettings() hook      │
│ • Chrome Alarms            │ • createCrannHooks(config)  │ • No Crann dependency     │
│ • chrome.scripting.inject  │                             │                           │
└───────────────────────────┴────────────────────────────┴──────────────────────────┘
         ↕ Crann state sync via chrome.runtime ports ↕
```

**Key insight**: The settings page is entirely independent of Crann. It reads/writes `chrome.storage.sync` directly. Only the service worker and content scripts use Crann.

---

## 2. Crann Hub-and-Spokes Pattern

### API Surface (Crann v2)

| Function | Import | Context | Purpose |
|---|---|---|---|
| `createConfig(schema)` | `crann` | Shared config file | Define state schema + actions |
| `createStore(config)` | `crann` | Service worker only | Create the state hub |
| `connectStore(config)` | `crann` | Non-React clients | Connect an agent (content script, popup) |
| `createCrannHooks(config)` | `crann/react` | React components | Create typed React hooks |
| `Scope.Agent` | `crann` | config.ts | Per-tab/per-agent state |
| `Scope.Shared` | `crann` | config.ts | Global state across all tabs |
| `Persist.Local` | `crann` | config.ts | Persist to chrome.storage.local |
| `Persist.Session` | `crann` | config.ts | Persist to chrome.storage.session |

### Config file is the binding contract

All three sides import the same config object. The hub (`createStore`) and all spokes (`connectStore` / `createCrannHooks`) must receive the same config instance to be type-safe and synchronized.

```
config.ts  ──imports──▶  service-worker.ts  (createStore)
           ──imports──▶  content-script UI  (createCrannHooks)
           ──imports──▶  any non-React UI   (connectStore)
```

This is why `blocks/state/crann/` is a single block with template files for all three sides — they cannot be split.

### Scope types

- **`Scope.Agent`** — state is scoped per agent (one per content-script instance, i.e., one per tab). Each tab has its own copy. Examples in Lensor: `active`, `hoveredColor`, `lensePosition`, `zoom`, `showGrid`, `showFisheye`, `isCapturing`.
- **`Scope.Shared`** — state is global, shared across all connected agents. Example in Lensor: `captureCount`.
- **Default** (no `scope` key) — `Scope.Shared` in Crann v2.

### RPC Actions

Defined in `config.ts` under the `actions` key. Handlers execute **in the service worker context** regardless of which client calls them. Typed end-to-end via TypeScript inference.

```typescript
actions: {
  captureTab: {
    handler: async (ctx) => {
      // ctx.agentLocation.tabId — the tab that called the action
      // ctx.state — current state snapshot
      return dataUrl; // return value is typed
    }
  }
}
```

Client invocation (from any context):
```typescript
const agent = connectStore(config);
await agent.ready();
const dataUrl = await agent.actions.captureTab();
```

Or in React:
```typescript
const { captureTab } = useCrannActions();
const dataUrl = await captureTab();
```

Lensor's three actions: `captureTab` (calls `chrome.tabs.captureVisibleTab`), `openSettings` (calls `chrome.tabs.create`), `resetInactivityTimer` (throttled alarm reset).

### Store (service worker) API

```typescript
const store = createStore(config, { debug: isDev });

// Filtered subscription — callback fires only when listed keys change
store.subscribe(['active'], (state, changes, agentInfo) => {
  const tabId = agentInfo?.location?.tabId; // undefined for Scope.Shared changes
  if (changes.active === true) { /* ... */ }
});

// Look up connected agents for a tab
// Use string literal 'contentscript' — PorterContext enum is NOT exported from crann
// (Lensor imports it from 'porter-source', a separate internal package)
const agents = store.getAgents({ context: 'contentscript', tabId });

// Read per-agent state
const agentState = store.getAgentState(agents[0].id);

// Write per-agent state
await store.setState({ active: false }, agents[0].id);
```

**Critical note**: Lensor's `service-worker.ts` imports `PorterContext` from `'porter-source'` (a separate package that Crann bundles internally). This enum is **not** exported from the `crann` package itself. Athanor blocks must use the string literal `'contentscript'` instead.

### Agent (client) API

```typescript
const agent = connectStore(config);

// Callback style
agent.onReady(() => {
  agent.setState({ key: value });
  agent.subscribe((changes) => { /* reactive */ });
});

// Promise style
await agent.ready();
const state = agent.getState();
await agent.actions.actionName(args);
```

### React hooks

```typescript
// hooks.ts — one-line wrapper
export const { useCrannState, useCrannActions, useCrannReady, useAgent, CrannProvider }
  = createCrannHooks(config, { debug: isDev });

// In components:
const isReady = useCrannReady();              // connection status
const [zoom, setZoom] = useCrannState('zoom'); // [value, setter] tuple
const count = useCrannState(s => s.captureCount); // selector pattern
const { captureTab } = useCrannActions();     // stable action refs
```

`CrannProvider` is optional in Crann v2 for typical usage — hooks work without it.

---

## 3. Shadow DOM Injection Pattern

**Source**: `lensor/src/ui/index.tsx`

### Mounting sequence

1. Check for existing container by ID → remove if found (idempotent)
2. Create `<div id="lensor-shadow-container">` → `document.body.appendChild()`
3. Apply host styles inline (fixed, full-viewport, highest z-index, pointer-events: none)
4. `container.attachShadow({ mode: 'closed' })` → returns shadow root
5. Inside shadow root: create a `<div>` for styled-components (`StyleSheetManager target`), a `<style>` for fonts, a `<div>` for the React root
6. `createRoot(uiRoot).render(...)` — React renders inside shadow DOM

### Host element styles

```javascript
{
  position: 'fixed',
  top: '0',
  right: '0',
  width: '100%',
  height: '100vh',
  zIndex: '2147483647',     // highest possible
  pointerEvents: 'none',    // pass-through; child elements opt-in with pointer-events: auto
  display: 'block',
  overflow: 'hidden',
  visibility: 'visible'     // toggled to 'hidden' when inactive
}
```

### Visibility management

Lensor **never removes the host div from the DOM**. Visibility is toggled via `visibility: hidden/visible` on the host element. This preserves React component state (MediaStream, positions, etc.) across show/hide cycles.

The `LensorApp` component watches the `active` Crann state key and calls `setStylesOnElement(shadowContainer, ...)` in a `useEffect` to apply/remove the `invisible` style override.

### styled-components integration

The shadow root is opaque to the document's stylesheets. `StyleSheetManager target={styleSlot}` (where `styleSlot` is a `<div>` inside the shadow root) redirects styled-components' injected `<style>` tags into the shadow DOM, so they apply correctly.

### Extension context inside shadow DOM

The shadow DOM content runs in the content script context — it **does** have access to `chrome.runtime.sendMessage` and Crann's `connectStore`/hooks. This is unlike iframes, which have a separate origin. The content script passes the Crann agent connection implicitly through `createCrannHooks` (which connects inside the same JS context).

---

## 4. Chrome Alarms Inactivity Pattern

**Source**: `lensor/src/lib/inactivity-alarm.ts`

### Design

Alarm names use a tab-scoped prefix: `'inactivity-{tabId}'`. The service worker creates an alarm when the extension activates (`active: true`) and clears it on deactivation.

```typescript
export const INACTIVITY_ALARM_PREFIX = 'inactivity-';

// Create: clear existing, then recreate (ensures fresh countdown)
await chrome.alarms.clear(alarmName);
await chrome.alarms.create(alarmName, { delayInMinutes: timeoutMinutes });

// Handler in service worker:
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(INACTIVITY_ALARM_PREFIX)) return;
  const tabId = parseInt(alarm.name.replace(INACTIVITY_ALARM_PREFIX, ''), 10);
  // ... set active: false for that tab's agent
});
```

### Throttle

`resetInactivityTimer` uses an in-memory `Record<number, number>` (`lastAlarmResetTime`) to track the last reset timestamp per tab. If called within 30 seconds of the last reset, it returns early without touching the Alarms API. This prevents performance degradation when the UI calls reset on frequent events (scroll, drag).

### Lensor's coupling to storage

Lensor's `createInactivityAlarm` reads `inactivityTimeoutMinutes` directly from `chrome.storage.sync`. This couples the alarms module to the settings schema.

**Athanor decoupling**: The `blocks/service-worker/with-alarms/` block will accept a `getTimeoutMinutes: () => Promise<number>` callback instead, letting the consumer provide the value from any source (hardcoded constant, settings hook, etc.).

---

## 5. Settings Page Pattern

**Source**: `lensor/src/settings/`

### Opening mechanism

```typescript
// From any context (content script, service worker, Crann action):
chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
```

**No `web_accessible_resources` entry needed.** Extension pages opened via `chrome.tabs.create` are part of the extension origin and are always accessible without it. `web_accessible_resources` is only for resources injected into web pages (e.g., the iframe in `iframe-mount`). Lensor's manifest confirms this omission.

### HTML entry point

Minimal HTML with `<div id="root">` and `<script src="index.js">` (the built output). The script tag points to the **bundled** output, not the source `.tsx`.

### useSettings hook pattern

Lensor's `useSettings` wraps a single `chrome.storage.sync` object key (`'lensorSettings'`) containing the full settings object. The pattern:

1. Load on mount with `chrome.storage.sync.get`
2. Listen for external changes via `chrome.storage.onChanged` (real-time sync when settings page is open while the lens is active)
3. Write with `chrome.storage.sync.set({ [key]: newValue })`
4. Merge with `DEFAULT_SETTINGS` to handle new keys added in extension updates

**Athanor block simplification**: `useStorage<T>(key, defaultValue)` will be a generic single-key wrapper returning `[value, setValue]` — the simplest interface. Consumers can compose more complex hooks on top of it.

### Build requirement

The settings page is a **separate Vite entry point**. In `vite.config.ts`:

```typescript
build: {
  rollupOptions: {
    input: {
      main: 'index.html',           // popup or existing entry
      settings: 'settings/settings.html'  // settings page
    }
  }
}
```

---

## 6. Block-by-Block Source Mapping

| Athanor Block | Primary Source File(s) | Notes |
|---|---|---|
| `blocks/state/crann/config.ts` | `lensor/src/ui/state-config.ts` | Template; strip Lensor-specific state items |
| `blocks/state/crann/service-worker.ts` | `lensor/src/service-workers/service-worker.ts` | Template; strip alarm and injection specifics |
| `blocks/state/crann/hooks.ts` | `lensor/src/ui/hooks/useLensorState.ts` | 3 lines in source; elaborate in BLOCK.md |
| `blocks/content-script/shadow-dom-mount/index.ts` | `lensor/src/ui/index.tsx` | Extract `initializeReact` → `initializeShadowMount`; generalize |
| `blocks/service-worker/with-alarms/index.ts` | `lensor/src/lib/inactivity-alarm.ts` | Decouple from storage via callback |
| `blocks/settings-page/react/useStorage.ts` | `lensor/src/settings/useSettings.ts` | Generalize to single-key generic hook |
| `blocks/settings-page/react/SettingsApp.tsx` | `lensor/src/settings/SettingsApp.tsx` | Strip all Lensor-specific fields; scaffold only |
| `blocks/settings-page/react/index.tsx` | `lensor/src/settings/index.tsx` | Identical pattern |
| `blocks/settings-page/react/settings.html` | `lensor/src/settings/settings.html` | Strip Lensor branding/styles |

---

## 7. What Is Reusable vs Lensor-Specific

### Reusable (extracted to Athanor blocks)

| Pattern | Block |
|---|---|
| Crann hub-and-spokes state sync | `blocks/state/crann/` |
| Shadow DOM injection + React mount | `blocks/content-script/shadow-dom-mount/` |
| Chrome Alarms inactivity timeout | `blocks/service-worker/with-alarms/` |
| Extension settings page scaffold | `blocks/settings-page/react/` |

### Lensor-specific (not extracted)

- **`tabCapture` + `MediaStream`** — pixel inspection requires `tabCapture` permission; specific to Lensor's use case
- **Canvas rendering / zoom logic** — `useLenseCanvasUpdate`, `useCanvasLifecycle` — application-specific
- **Color detection** — `useColorDetection`, palette generation — domain logic
- **WebGL fisheye** — `fisheyegl.ts`, GLSL shaders — aesthetic feature
- **Drag behavior** — `useDraggable` — deferred as a potential future block
- **Page observer** — `usePageObserver` — deferred as a potential future block
- **`LensPreview`** (settings page) — WebGL preview panel — Lensor-specific

---

## 8. Crann API Summary

### `createConfig(schema)`

```typescript
import { createConfig, Scope, Persist } from 'crann';

const config = createConfig({
  name: 'myExtension',                    // required; used as storage namespace
  myKey: { default: false },              // Scope.Shared by default
  perTabKey: { default: 0, scope: Scope.Agent },
  persisted: { default: [], persist: Persist.Local },
  actions: {
    doThing: {
      handler: async (ctx, arg: string) => {
        // ctx.agentLocation.tabId — calling tab
        // ctx.state — current state
        return result;
      }
    }
  }
});
```

### `createStore(config)` — Service Worker

```typescript
import { createStore } from 'crann';
const store = createStore(config, { debug: false });

store.subscribe(['key1', 'key2'], (state, changes, agentInfo) => {
  agentInfo?.location?.tabId   // tab that caused the change
  changes.key1                 // new value
});

store.getAgents({ context: 'contentscript', tabId })  // → AgentInfo[]
store.getAgentState(agentId)                           // → state snapshot
await store.setState({ key: value }, agentId)          // per-agent write
```

### `connectStore(config)` — Non-React Clients

```typescript
import { connectStore } from 'crann';
const agent = connectStore(config, { debug: false });

agent.onReady(() => { /* safe to use agent here */ });
await agent.ready();           // promise equivalent
agent.getState()               // current state
await agent.setState({ key: value })
agent.subscribe((changes) => { /* reactive */ })
await agent.actions.actionName(args)
```

### `createCrannHooks(config)` — React

```typescript
import { createCrannHooks } from 'crann/react';

export const { useCrannState, useCrannActions, useCrannReady, useAgent, CrannProvider }
  = createCrannHooks(config, { debug: false });
```

Hook signatures:
- `useCrannReady(): boolean` — true when agent connected
- `useCrannState('key'): [value, setter]` — key tuple form
- `useCrannState(s => s.key): value` — selector form (no setter)
- `useCrannActions(): { actionName: (...args) => Promise<result> }` — stable refs
- `useAgent(): Agent` — raw agent access
- `CrannProvider` — optional React context provider; not required in v2 for typical usage

### npm packages

```
crann          ^2.0.x    — createConfig, createStore, connectStore, Scope, Persist
crann/react              — createCrannHooks (sub-path export, same package)
```

---

## 9. Manifest Requirements by Block

| Block | Required Permissions | `web_accessible_resources` |
|---|---|---|
| `state/crann` | None specific to Crann; depends on what actions do | No |
| `content-script/shadow-dom-mount` | `activeTab` or `scripting` to inject | No |
| `service-worker/with-alarms` | `alarms` | No |
| `settings-page/react` | `storage` | No (page opened via `chrome.tabs.create`) |
