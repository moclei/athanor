# Block: popup-ui/react

## Purpose

A minimal React UI for Chrome MV3 extensions. Provides a single-component popup that, on button click, sends a `FETCH_DATA` message to the extension's service worker and displays the response. The UI is designed to be mounted inside an iframe served from the extension's origin — the iframe context has full access to `chrome.runtime.sendMessage`.

Built with Vite. Output is a standard HTML + JS bundle at `dist/`, which the workspace extension copies into its own `dist/ui/` directory.

---

## File List

| File | Description |
|---|---|
| `index.tsx` | React entry point. Mounts `<App />` to `#root`. |
| `App.tsx` | Main UI component. Button triggers `FETCH_DATA`; displays image or JSON response. Inlines the message type — no runtime dependency on the messaging block. |
| `index.html` | Vite HTML entry point. References `index.tsx` as a module script. This file is the Vite input; the built version is what gets served by the extension. |
| `vite.config.ts` | Vite build configuration. Outputs to `dist/`, uses `@vitejs/plugin-react`, sets `base: './'` for extension-origin compatibility. |
| `package.json` | Dependency manifest. Lists `react`, `react-dom`, and dev dependencies. No build scripts — those live in the workspace extension's `package.json`. |

---

## Build Instructions

### 1. Install dependencies

From the workspace extension directory (or this block directory for standalone testing):

```sh
npm install
```

Dependencies required: `react`, `react-dom`, `vite`, `@vitejs/plugin-react`, `@types/react`, `@types/react-dom`.

Also install `@types/chrome` in the workspace extension — it is not listed here because it is a workspace-level concern.

### 2. Build

Add the following script to the workspace extension's `package.json`:

```json
{
  "scripts": {
    "build:ui": "vite build --config ui/vite.config.ts"
  }
}
```

Then run:

```sh
npm run build:ui
```

Or, when building from this block directory directly:

```sh
npx vite build
```

### 3. Copy output to workspace dist

The Vite build outputs to `dist/` relative to the config location. In the workspace extension, the output should land at `dist/ui/`. Either configure `outDir: 'dist/ui'` in the workspace Vite config, or copy manually:

```sh
cp -r dist/* workspace/<extension-name>/dist/ui/
```

The content script then loads `dist/ui/index.html` via `chrome.runtime.getURL('ui/index.html')`.

---

## Integration Notes

### Iframe src convention

The content script creates the iframe and sets its `src` to the extension-origin URL of the built UI:

```ts
iframe.src = chrome.runtime.getURL('ui/index.html')
```

This requires `dist/ui/index.html` (and all assets it references) to be listed in `web_accessible_resources` in the manifest. See the **Required Manifest Fields** section below.

### Customising the API URL

`App.tsx` contains a constant at the top of the file:

```ts
const DEFAULT_URL = 'https://dog.ceo/api/breeds/image/random'
```

Change this to your target API URL when copying the block into a workspace extension. The URL is sent as the `payload.url` in the `FETCH_DATA` message — the service worker performs the actual fetch.

For more flexibility, the `App` component can be extended to accept a `url` prop, or to render a text input for the user to supply the URL at runtime.

### Message types

`App.tsx` inlines the discriminated union type rather than importing from the messaging block. This keeps the block self-contained. When copying to a workspace extension, you can replace the inline type with an import from your workspace's messaging module if you prefer:

```ts
// Replace the inline type in App.tsx with:
import type { ExtensionMessage } from '../messaging/types'
```

### Response rendering

`App.tsx` automatically detects whether the response payload contains an image URL (by file extension) and renders an `<img>` element if so. Any other response falls back to a formatted JSON display. The dog API PoC returns `{ message: <image-url>, status: "success" }` and will render as an image.

### Styling

All styles are inline `React.CSSProperties` objects. There is no Tailwind dependency and no external CSS file. The consuming extension adds its own styles on top — or replaces them entirely.

---

## Required Manifest Fields

The built UI output must be listed as a web-accessible resource so the content script can load it in an iframe:

```json
{
  "web_accessible_resources": [
    {
      "resources": ["ui/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

`ui/*` covers `ui/index.html` and all assets Vite places in `ui/assets/`. If you change the output path convention, update `resources` to match.

No additional permissions are required. The `chrome.runtime.sendMessage` call in `App.tsx` is available to all extension contexts without extra permissions.
