# Recipe: shadow-crann

## What this recipe produces

A Chrome MV3 extension that injects a full-viewport React UI into every web page via a closed Shadow DOM. Clicking the extension icon toggles the overlay. State — whether the UI is active, any per-tab data, any global counters — is kept in sync between the service worker and the content script using Crann's hub-and-spokes model. Optionally: an inactivity alarm auto-deactivates the overlay after a configurable idle period, and a settings page lets the user configure extension preferences.

This recipe covers the architecture used by Lensor and is the right starting point when your extension needs real-time state synchronisation across contexts and a visually isolated overlay UI.

---

## Blocks used

| Block | Path | Why |
|---|---|---|
| `content-script/shadow-dom-mount` | `blocks/content-script/shadow-dom-mount/` | Injects the React UI inside a closed Shadow DOM on the page — style-isolated, same execution context as the content script |
| `state/crann` | `blocks/state/crann/` | Keeps state in sync between the service worker hub and the content script agent; handles icon click, per-tab activation, and RPC actions |
| `service-worker/with-alarms` | `blocks/service-worker/with-alarms/` | (Optional) Auto-deactivates the extension after a configurable period of user inactivity |
| `settings-page/react` | `blocks/settings-page/react/` | (Optional) Full-tab settings page backed by `chrome.storage.sync` |
| `manifest/templates/base` | `blocks/manifest/templates/base/` | MV3 manifest starting point — fill in name, permissions, and paths |

> **Note:** `messaging/typed-messages` is not listed here because Crann replaces the conventional `chrome.runtime.sendMessage` relay for state and RPC. If your extension also has one-off imperative messages that do not involve shared state, add `messaging/typed-messages` alongside Crann.

---

## Workspace layout

```
workspace/<extension-name>/
├── manifest.json
├── config.ts                     ← state schema + RPC actions (from state/crann/config.ts)
├── content-script/
│   └── index.ts                  ← shadow-dom-mount + Crann agent wiring
├── service-worker/
│   └── index.ts                  ← Crann hub + optional with-alarms wiring
├── ui/
│   ├── hooks.ts                  ← Crann React hooks (from state/crann/hooks.ts)
│   └── App.tsx                   ← main React component (consumes hooks)
├── settings/                     ← (optional) settings-page/react block
│   ├── settings.html
│   ├── index.tsx
│   ├── useStorage.ts
│   └── SettingsApp.tsx
├── tsconfig.json
├── vite.config.ts
├── vite.config.scripts.ts
└── package.json
```

After `vite build` (both configs), the output lands in `dist/`:

```
dist/
├── manifest.json
├── background.js                 ← compiled service worker
├── content-script/
│   └── index.js
└── ui/
    ├── index.html                ← (not used by shadow-dom pattern — no separate HTML entry)
    └── assets/
```

> Unlike `minimal-react`, this recipe does not use a separate `ui/index.html` because the shadow DOM UI is bundled into the content script entry, not loaded as a separate iframe page.

---

## Step-by-step assembly

### Step 1 — Create the workspace directory and copy blocks in

```sh
mkdir -p workspace/<extension-name>
cd workspace/<extension-name>

# Copy blocks (from the repo root)
cp blocks/state/crann/config.ts config.ts
cp blocks/state/crann/service-worker.ts service-worker/index.ts
cp blocks/state/crann/hooks.ts ui/hooks.ts
cp -r blocks/content-script/shadow-dom-mount/. content-script/
cp blocks/manifest/templates/base/manifest.json manifest.json

# Optional blocks:
cp -r blocks/service-worker/with-alarms/. service-worker/with-alarms/
cp -r blocks/settings-page/react/. settings/
```

Do not copy the `BLOCK.md` files — they are library documentation, not runtime files.

Create `ui/App.tsx` manually (Step 6 below).

---

### Step 2 — Set up `package.json` and install dependencies

```json
{
  "name": "<extension-name>",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "vite build && vite build --config vite.config.scripts.ts"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.268",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
    "crann": "^2.0.0",
    "typescript": "^5.5.0",
    "vite": "^5.4.0"
  },
  "dependencies": {
    "react": "^18.3.0",
    "react-dom": "^18.3.0"
  }
}
```

Then install:

```sh
npm install
```

---

### Step 3 — Set up `tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "outDir": "dist"
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

---

### Step 4 — Set up `vite.config.ts` and `vite.config.scripts.ts`

The UI bundle (React components bundled into the content script entry) and the service worker require separate Vite configs.

**`vite.config.ts`** — bundles the content script (which includes the shadow-mounted React app):

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        'content-script/index': 'content-script/index.ts',
      },
      output: {
        entryFileNames: '[name].js',
        format: 'iife',
        name: 'contentScript',
      },
    },
  },
})
```

**`vite.config.scripts.ts`** — builds the service worker (ES module) and copies the manifest:

```ts
import { defineConfig } from 'vite'
import { copyFileSync } from 'fs'
import { resolve } from 'path'

const copyManifest = {
  name: 'copy-manifest',
  closeBundle() {
    copyFileSync(
      resolve(__dirname, 'manifest.json'),
      resolve(__dirname, 'dist/manifest.json'),
    )
  },
}

export default defineConfig({
  plugins: [copyManifest],
  build: {
    outDir: 'dist',
    emptyOutDir: false,
    rollupOptions: {
      input: {
        background: 'service-worker/index.ts',
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',
      },
    },
  },
})
```

If you include the optional `settings-page/react` block, add it as an input to `vite.config.ts` (alongside `content-script/index`):

```ts
rollupOptions: {
  input: {
    'content-script/index': 'content-script/index.ts',
    settings: 'settings/settings.html',
  },
  // ...
}
```

---

### Step 5 — Define `config.ts`

`config.ts` is the binding contract shared by all three contexts. Start from the template you copied and fill in your state schema and RPC actions:

```ts
import { createConfig, Scope } from 'crann';

export const config = createConfig({
  name: 'myExtension',                           // TODO: replace with your extension name

  // Per-tab state — each content script instance has its own copy
  active: { default: false, scope: Scope.Agent },

  // Global state — one value shared across all tabs
  captureCount: { default: 0 },

  actions: {
    // Opens the settings page — runs in the service worker
    openSettings: {
      handler: async () => {
        await chrome.tabs.create({
          url: chrome.runtime.getURL('settings/settings.html'),
        });
      },
    },

    // Called by the content script on user activity to reset the inactivity timer
    resetInactivityTimer: {
      handler: async (ctx) => {
        const tabId = ctx.agentLocation?.tabId;
        if (tabId !== undefined) {
          // Import and call resetInactivityTimer from with-alarms here
        }
      },
    },
  },
});
```

Key decisions:
- Use `scope: Scope.Agent` for anything that varies between tabs (UI visibility, cursor state, selections).
- Omit `scope` (or use `Scope.Shared`) for global state that applies across all tabs.
- Define all service-worker operations (tab creation, scripting, alarms) as RPC actions so clients call them without `chrome.runtime.sendMessage` boilerplate.

---

### Step 6 — Wire `service-worker/index.ts`

```ts
import { createStore } from 'crann';
import { config } from '../config';
import {
  INACTIVITY_ALARM_PREFIX,
  createInactivityAlarm,
  clearInactivityAlarm,
  resetInactivityTimer as resetTimer,
} from './with-alarms';                          // remove if not using with-alarms

const store = createStore(config);

const getTimeoutMinutes = async () => 5;        // TODO: replace with your timeout source

// Toggle the extension on icon click — inject content script if no agent is connected
chrome.action.onClicked.addListener(async (tab) => {
  if (!tab.id) return;
  const tabId = tab.id;

  const agents = store.getAgents({ context: 'contentscript', tabId });

  if (agents.length === 0) {
    // No content script connected — inject it
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ['content-script/index.js'],      // TODO: match your built output path
    });
    return;
  }

  // Toggle active state for this tab's agent
  const agentState = store.getAgentState(agents[0].id);
  await store.setState({ active: !agentState?.active }, agents[0].id);
});

// React to active state changes — start or stop the inactivity alarm
store.subscribe(['active'], async (state, _changes, agentInfo) => {
  const tabId = agentInfo?.location?.tabId;
  if (!tabId) return;

  if (state.active) {
    await createInactivityAlarm(tabId, getTimeoutMinutes);  // remove if not using with-alarms
  } else {
    await clearInactivityAlarm(tabId);                      // remove if not using with-alarms
  }
});

// Handle alarm expiry — deactivate the extension for the affected tab
chrome.alarms.onAlarm.addListener(async (alarm) => {       // remove if not using with-alarms
  if (!alarm.name.startsWith(INACTIVITY_ALARM_PREFIX)) return;
  const tabId = parseInt(alarm.name.replace(INACTIVITY_ALARM_PREFIX, ''), 10);
  if (isNaN(tabId)) return;

  const agents = store.getAgents({ context: 'contentscript', tabId });
  for (const agent of agents) {
    await store.setState({ active: false }, agent.id);
  }
});
```

The `resetInactivityTimer` RPC action in `config.ts` should import and call `resetTimer` from `./with-alarms`. Wire it there so clients can call `agent.actions.resetInactivityTimer()` directly.

---

### Step 7 — Wire `content-script/index.ts`

```ts
import { connectStore } from 'crann';
import { config } from '../config';
import { initializeShadowMount } from './shadow-dom-mount';
import App from '../ui/App';
import React from 'react';

const agent = connectStore(config);

let handle: ReturnType<typeof initializeShadowMount> | null = null;

agent.onReady(() => {
  // Mount the shadow DOM UI immediately
  handle = initializeShadowMount(<App />, { containerId: '__my-extension__' });

  // Sync visibility with Crann active state
  agent.subscribe((changes) => {
    if ('active' in changes) {
      if (changes.active) {
        handle?.show();
      } else {
        handle?.hide();
      }
    }
  });

  // Reflect initial state
  const state = agent.getState();
  if (state.active) {
    handle.show();
  } else {
    handle.hide();
  }
});
```

The shadow-mounted React app runs in the content script context, so Crann hooks work directly inside the component tree — no `CrannProvider` is needed for typical usage in Crann v2.

---

### Step 8 — Create `ui/hooks.ts`

`hooks.ts` exports the typed Crann hooks for use inside the React component tree. Start from the template you copied:

```ts
import { createCrannHooks } from 'crann/react';
import { config } from '../config';

export const {
  useCrannState,
  useCrannActions,
  useCrannReady,
  useAgent,
  CrannProvider,
} = createCrannHooks(config);
```

Import these hooks in `App.tsx` and any child components. Do not call `createCrannHooks` more than once — export from this single file and import everywhere.

---

### Step 9 — Consume hooks in `ui/App.tsx`

```tsx
import React from 'react';
import { useCrannState, useCrannActions, useCrannReady } from './hooks';

export default function App() {
  const isReady = useCrannReady();
  const state = useCrannState();
  const actions = useCrannActions();

  if (!isReady) return null;

  return (
    <div style={{ pointerEvents: 'auto', padding: 16 }}>
      {/* TODO: add your UI here */}
      <p>Active: {state.active ? 'yes' : 'no'}</p>
      <button onClick={() => actions.openSettings()}>Settings</button>
    </div>
  );
}
```

Because the component tree is inside a Shadow DOM, the host element's CSS (`pointer-events: none; overflow: hidden`) prevents page interaction. Add `pointer-events: auto` to the inner container you want to be interactive.

---

### Step 10 — Populate `manifest.json`

Start from the copied template and fill in the fields for this stack:

| Field | What to set |
|---|---|
| `name` | Your extension's display name |
| `description` | One to two sentences |
| `version` | `"0.0.1"` for development |
| `background.service_worker` | `"background.js"` |
| `content_scripts[0].js` | `["content-script/index.js"]` |
| `content_scripts[0].matches` | The URL patterns your extension operates on |
| `permissions` | `["scripting", "activeTab"]` at minimum; add `"alarms"` if using `with-alarms`; add `"tabs"` if opening settings via `chrome.tabs.create`; add `"storage"` if using settings page |
| `host_permissions` | Only the origins your service worker needs to fetch from; omit if the extension does not make network requests |
| `web_accessible_resources` | **Not needed** for this stack — shadow DOM injects DOM nodes directly; settings page is opened as a tab |
| `action` | `{ "default_title": "Toggle UI" }` — no `default_popup` |

Example for the minimal shadow-crann stack (no network requests, no settings page):

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "0.0.1",
  "description": "Shadow DOM overlay with Crann state sync.",
  "background": {
    "service_worker": "background.js",
    "type": "module"
  },
  "content_scripts": [
    {
      "matches": ["<all_urls>"],
      "js": ["content-script/index.js"],
      "run_at": "document_idle"
    }
  ],
  "action": {
    "default_title": "Toggle UI"
  },
  "permissions": ["scripting", "activeTab"]
}
```

With optional blocks added:

```json
{
  "permissions": ["scripting", "activeTab", "alarms", "tabs", "storage"]
}
```

---

## Message flow

Unlike `minimal-react`, this stack has no manual `chrome.runtime.sendMessage` relay. Crann handles all cross-context communication via `chrome.runtime` ports opened automatically between the service worker hub and each content script agent.

```
User interaction (React component inside shadow DOM)
    ↓  useCrannActions().someAction()          — RPC call through Crann port
Service Worker
    ↓  action handler runs (service-worker/index.ts)
    ↓  store.setState({ key: value }, agentId) — state written to hub
    ↓  Crann broadcasts change to all agents
Content Script + React UI
    ↓  useCrannState() re-renders with new value
```

For state reads/writes (not RPC actions):

```
React UI
    ↓  useCrannState()                         — subscribes to hub via port
Service Worker hub (createStore)
    ↓  store.subscribe(['key'], ...)            — fires on change
    ↓  any side effects (alarms, fetch, etc.)
```

The shadow DOM UI never calls `chrome.runtime.sendMessage` directly. All communication flows through the Crann port connection established by `connectStore(config)` in the content script.

---

## Verification checklist

- [ ] Navigating to a matched page produces no errors in the page's console
- [ ] Clicking the extension icon injects the content script (first click) and shows the overlay; subsequent clicks toggle `active` state
- [ ] The React UI reflects the current Crann state (`useCrannState()` returns expected values)
- [ ] Crann RPC actions (e.g. `openSettings`) execute in the service worker and take effect
- [ ] (If using `with-alarms`) The extension deactivates automatically after the inactivity timeout
- [ ] (If using `settings-page/react`) The settings page opens in a new tab; `useStorage` values persist across browser restarts
- [ ] The manifest has no `default_popup` field and no `web_accessible_resources` entry for this stack
- [ ] The service worker console (from `chrome://extensions` → "Inspect views: service worker") shows no uncaught errors
