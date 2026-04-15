# Block: settings-page/react

## Purpose

A full-tab settings page scaffold for Chrome MV3 extensions. Provides a React component tree mounted in a dedicated browser tab — not a popup, not an options panel, a real page opened via `chrome.tabs.create`. Includes a typed `useStorage` hook that reads and writes to `chrome.storage.sync`, with live updates across all open extension contexts.

The scaffold is intentionally minimal: layout structure, a loading state, and `// TODO` anchors where the consumer adds their own settings fields.

---

## Settings Page vs Popup

| Aspect | Popup (`popup.html`) | Settings page (`settings.html`) |
|---|---|---|
| Opened by | Clicking the extension icon | `chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') })` |
| Lifetime | Closes when focus leaves | Stays open until user closes the tab |
| Layout | Fixed small dimensions (up to ~800×600) | Full browser tab — any layout works |
| Chrome APIs | Available (extension context) | Available (extension context) |
| `web_accessible_resources` | Not needed | **Not needed** — see note below |

**`web_accessible_resources` is not required.** Extension pages opened as tabs via `chrome.tabs.create` are already accessible within the extension context. `web_accessible_resources` is only required for resources injected into third-party web pages (e.g. the iframe in `iframe-mount`). Lensor's manifest confirms this — `settings.html` is not listed there.

---

## File List

| File | Description |
|---|---|
| `settings.html` | HTML entry point. Minimal shell: `<div id="root">` and a script tag pointing to the Vite-built `settings.js`. |
| `index.tsx` | React entry point. Mounts `<SettingsApp />` to `#root`. |
| `useStorage.ts` | Typed `chrome.storage.sync` hook. Reads on mount, updates on external changes, writes on setter call. |
| `SettingsApp.tsx` | Minimal settings page scaffold. Simple header + section layout with TODO anchors. No Lensor-specific UI. |

---

## `useStorage` Hook

```ts
export function useStorage<T>(key: string, defaultValue: T): [T, (value: T) => void]
```

**Behaviour:**
- On mount: reads from `chrome.storage.sync`; falls back to `defaultValue` if the key is not set.
- On external change: `chrome.storage.onChanged` listener updates the React state. This means if a different context (e.g. the service worker, or another settings tab) writes to the key, the component re-renders with the new value automatically.
- On setter call: writes synchronously to local React state and calls `chrome.storage.sync.set`. No debounce — suitable for on-blur or explicit save patterns. Add your own debounce if wiring directly to onChange inputs.

**Extending for typed settings:**

Define your settings type in a separate file and wrap `useStorage` with a typed helper:

```ts
// types.ts
export interface MySettings {
  theme: 'light' | 'dark';
  notificationsEnabled: boolean;
}

export const DEFAULT_SETTINGS: MySettings = {
  theme: 'dark',
  notificationsEnabled: true,
};

export const SETTINGS_KEY = 'myExtensionSettings';
```

```ts
// useSettings.ts
import { useStorage } from './useStorage';
import { MySettings, DEFAULT_SETTINGS, SETTINGS_KEY } from './types';

export function useSettings(): [MySettings, (value: MySettings) => void] {
  return useStorage<MySettings>(SETTINGS_KEY, DEFAULT_SETTINGS);
}
```

Then in a component:

```tsx
const [settings, setSettings] = useSettings();

// Update a single field:
setSettings({ ...settings, theme: 'light' });
```

---

## `chrome.storage.sync` vs Crann

For settings pages, `chrome.storage.sync` is almost always simpler than Crann:

- Settings are written infrequently (on user interaction), so real-time state sync is not needed.
- `chrome.storage.sync` persists across browser restarts and syncs across devices (within Chrome's quota).
- Crann is appropriate when you need **live state shared across service worker + content scripts** — not for durable user preferences.

Use Crann (from `blocks/state/crann`) only if you need the settings page to react in real time to live extension state (e.g. show whether the content script is currently active). For reading or writing user preferences, `chrome.storage.sync` is sufficient.

---

## Vite Entry Point

The settings page requires its own Vite entry point. In the workspace extension's `vite.config.ts`, add `settings/settings.html` as a second input:

```ts
// vite.config.ts (workspace extension)
import { resolve } from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        // Existing entries:
        popup: resolve(__dirname, 'popup.html'),
        // Add settings page:
        settings: resolve(__dirname, 'settings/settings.html'),
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: 'chunks/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]',
      },
    },
  },
});
```

This produces `dist/settings.js` (and associated assets) alongside the popup output. The `settings.html` file references `settings.js` with a plain `<script src="settings.js">` tag — Vite resolves the module name to the entry name from `rollupOptions.input`.

---

## Opening the Settings Page

### From the service worker

```ts
// service-worker.ts
chrome.action.onClicked.addListener(() => {
  chrome.tabs.create({
    url: chrome.runtime.getURL('settings/settings.html'),
  });
});
```

### From a Crann action (service-worker side)

```ts
// config.ts — define the action
actions: {
  openSettings: async () => {
    await chrome.tabs.create({
      url: chrome.runtime.getURL('settings/settings.html'),
    });
  },
},
```

```ts
// Any client (content script, popup)
agent.actions.openSettings();
```

### From a popup component

```tsx
<button onClick={() => chrome.tabs.create({ url: chrome.runtime.getURL('settings/settings.html') })}>
  Open Settings
</button>
```

---

## Manifest Fields

No special manifest entries are required for the settings page. The settings page is not listed under `options_page`, `options_ui`, or `web_accessible_resources` — it is opened as a plain extension tab.

If you want the settings page to be reachable via the context menu "Extension options" entry, you can optionally add:

```json
{
  "options_ui": {
    "page": "settings/settings.html",
    "open_in_tab": true
  }
}
```

This is optional. Omitting it has no effect on `chrome.tabs.create` — the page opens either way.

---

## Required npm Dependencies

```json
{
  "dependencies": {
    "react": "^18.x",
    "react-dom": "^18.x"
  },
  "devDependencies": {
    "@types/chrome": "^0.x",
    "@types/react": "^18.x",
    "@types/react-dom": "^18.x",
    "vite": "^5.x",
    "@vitejs/plugin-react": "^4.x"
  }
}
```

These are workspace-level dependencies — add them to the workspace extension's `package.json`, not this block's directory.
