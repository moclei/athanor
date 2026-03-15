# Block: state/crann

## Purpose

Provides cross-context state synchronization for Chrome MV3 extensions using [Crann](https://github.com/your-org/crann) v2.

Crann replaces the conventional `chrome.runtime.sendMessage` relay pattern with a **hub-and-spokes** model: the service worker holds the authoritative state hub; content scripts and UI contexts connect as agents. All sides stay in sync automatically via `chrome.runtime` ports.

Use this block when state must be shared between the service worker and one or more content scripts or popups — for example, an on/off toggle that the service worker controls and a content script UI reflects in real time.

---

## When to use `state/crann` vs `messaging/typed-messages`

| Scenario | Recommendation |
|---|---|
| State must live in the service worker and be readable in content scripts | `state/crann` |
| State is per-tab and must survive the service worker going idle | `state/crann` (Persist options) |
| One-off request/response messages with no shared state | `messaging/typed-messages` |
| Content script only sends events, service worker only receives them | `messaging/typed-messages` |

If your extension has both patterns, you can use both blocks together. Crann handles state; typed-messages handles imperative events.

---

## Hub-and-Spokes Model

```
config.ts  ──imports──▶  service-worker.ts   createStore(config)   ← hub
           ──imports──▶  content-script UI   createCrannHooks(config) ← spoke (React)
           ──imports──▶  any non-React UI    connectStore(config)  ← spoke (plain JS)
```

The `config.ts` file is the **binding contract**. All three sides must import the same config object. This is why this block ships three template files instead of one — they cannot be split into separate blocks.

---

## Files in this block

| File | Context | Role |
|---|---|---|
| `config.ts` | Shared import | Define state schema and RPC actions |
| `service-worker.ts` | Service worker | Create the state hub; subscribe to changes; handle icon click |
| `hooks.ts` | React UI (content script / popup) | Export typed React hooks from `crann/react` |

For a non-React content script, call `connectStore(config)` directly instead of using `hooks.ts`.

---

## npm dependencies

```
crann        ^2.0.x    createConfig, createStore, connectStore, Scope, Persist
crann/react            createCrannHooks (sub-path export, same package)
```

Install as a `devDependency` if your extension bundles everything at build time (the package is bundled into each context's output file, not loaded at runtime from node_modules).

---

## Scope.Agent vs Scope.Shared

```typescript
import { createConfig, Scope } from 'crann';

const config = createConfig({
  name: 'myExtension',

  // Scope.Agent — each tab has its own independent copy
  active: { default: false, scope: Scope.Agent },

  // Scope.Shared — one value shared across all connected agents
  globalCount: { default: 0 },  // Scope.Shared is the default
});
```

**`Scope.Agent`**: Use for anything that varies between tabs — whether the UI is visible, cursor position, per-tab selections. Each content script instance has its own copy; writing to one tab does not affect another.

**`Scope.Shared`**: Use for global counters, preferences, or flags that apply across all tabs. One value, one source of truth.

---

## RPC Actions

Actions are defined in `config.ts` and always execute in the service worker, regardless of which context calls them. They are typed end-to-end.

```typescript
// Define in config.ts:
actions: {
  openSettings: {
    handler: async (ctx) => {
      // ctx.agentLocation.tabId — the tab that invoked the action
      // ctx.state               — current state snapshot
      chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') });
    },
  },
}

// Call from a React component (hooks.ts):
const { openSettings } = useCrannActions();
await openSettings();

// Call from a non-React content script:
const agent = connectStore(config);
await agent.ready();
await agent.actions.openSettings();
```

Actions are the right tool for operations that must run in the service worker: tab capture, storage writes, alarm management, tab creation.

---

## `connectStore` for non-React contexts

Use `connectStore` in content scripts or popups that are not React apps:

```typescript
import { connectStore } from 'crann';
import { config } from './config';

const agent = connectStore(config);

// Callback style — safe to call immediately:
agent.onReady(() => {
  const state = agent.getState();
  agent.setState({ active: true });
  agent.subscribe((changes) => {
    if ('active' in changes) { /* react to change */ }
  });
});

// Promise style:
await agent.ready();
```

`agent.onReady` / `agent.ready()` both wait for the port connection to the service worker hub to be established. Never call `getState()` or `setState()` before the agent is ready.

---

## Service worker store API

```typescript
import { createStore } from 'crann';

const store = createStore(config, { debug: false });

// Subscribe to specific keys only — fires only when those keys change.
// For Scope.Agent changes, agentInfo?.location?.tabId is the tab that changed.
// For Scope.Shared changes, agentInfo is undefined.
store.subscribe(['active'], (state, changes, agentInfo) => {
  const tabId = agentInfo?.location?.tabId;
  if (tabId === undefined) return; // shared change, no tab context
});

// Look up connected content script agents for a tab.
// Use the string literal 'contentscript' — PorterContext is not exported from crann.
const agents = store.getAgents({ context: 'contentscript', tabId });

// Read per-agent state:
const agentState = store.getAgentState(agents[0].id);

// Write per-agent state (Scope.Agent):
await store.setState({ active: false }, agents[0].id);

// Write shared state (Scope.Shared) — no agentId:
await store.setState({ globalCount: 5 });
```

The key-filter array on `store.subscribe(['key1', 'key2'], ...)` is a performance optimisation — the callback is skipped entirely when unrelated keys change. Use it whenever you only care about a subset of state.

---

## Manifest requirements

Crann itself requires no manifest permissions. The permissions you need depend on what your RPC action handlers do:

| Handler operation | Permission required |
|---|---|
| `chrome.tabs.captureVisibleTab` | `tabCapture` |
| `chrome.tabs.create` | `tabs` |
| `chrome.scripting.executeScript` | `scripting` + `activeTab` or host permissions |
| `chrome.alarms.*` | `alarms` |

Background service worker registration (required by all MV3 extensions):

```json
"background": {
  "service_worker": "service-worker/index.js",
  "type": "module"
}
```

No `web_accessible_resources` entry is needed for Crann.

---

## Integration with other blocks

| Block | Integration |
|---|---|
| `content-script/shadow-dom-mount` | Mount the React app inside shadow DOM; use `hooks.ts` inside the mounted component tree. `CrannProvider` is optional — hooks connect without it. |
| `service-worker/with-alarms` | Call `createInactivityAlarm` / `clearInactivityAlarm` inside a `store.subscribe(['active'], ...)` handler. |
| `settings-page/react` | Settings pages typically do not need Crann — `chrome.storage.sync` is simpler for settings. Use a Crann action (`openSettings`) to open the settings tab from any context. |
