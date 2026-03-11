# Recipe: minimal-react

## What this recipe produces

A Chrome MV3 extension that injects a fixed-position React UI into every web page via an iframe. Clicking the extension icon shows or hides the panel. Inside the panel, a button sends a typed `FETCH_DATA` message to the background service worker, which performs the actual network request and returns a typed `DATA_RESPONSE`. The UI renders the result — either as an image (detected by file extension) or as formatted JSON. This recipe covers the full message round-trip with no auth complexity and is the canonical starting point for all Athanor-based extensions.

---

## Blocks used

| Block | Path | Description |
|---|---|---|
| `content-script/iframe-mount` | `blocks/content-script/iframe-mount/` | Injects a fixed-position iframe into every matched page; receives `TOGGLE_UI` from the service worker to show/hide it |
| `service-worker/basic` | `blocks/service-worker/basic/` | Handles `chrome.action.onClicked` (forwards `TOGGLE_UI` to the content script) and `FETCH_DATA` messages (performs fetch, returns `DATA_RESPONSE` or `ERROR`) |
| `messaging/typed-messages` | `blocks/messaging/typed-messages/` | Discriminated union type (`ExtensionMessage`) and typed wrappers over `chrome.runtime.sendMessage` / `onMessage` |
| `popup-ui/react` | `blocks/popup-ui/react/` | Minimal React app: button triggers `FETCH_DATA`, renders the response |
| `manifest/templates/base` | `blocks/manifest/templates/base/` | MV3 manifest template pre-wired for the full block stack |

---

## Workspace layout

```
workspace/<extension-name>/
├── manifest.json
├── content-script/
│   └── index.ts                  ← iframe-mount block (self-executing)
├── service-worker/
│   └── index.ts                  ← basic SW block (self-executing)
├── messaging/
│   ├── types.ts                  ← extend ExtensionMessage here
│   └── index.ts                  ← sendMessage / onMessage wrappers
├── ui/
│   ├── index.html                ← Vite HTML entry
│   ├── index.tsx                 ← React entry point
│   └── App.tsx                   ← main component
├── tsconfig.json
├── vite.config.ts
└── package.json
```

After `vite build`, the output lands in `dist/`:

```
dist/
├── background.js                 ← compiled service worker
├── content-script/
│   └── index.js                  ← compiled content script
└── ui/
    ├── index.html                ← compiled React UI (loaded by iframe)
    └── assets/
        └── index.js
```

The manifest references paths inside `dist/`.

---

## Step-by-step assembly

### Step 1 — Create the workspace directory and copy blocks in

```sh
mkdir -p workspace/<extension-name>
cd workspace/<extension-name>

# Copy blocks (from the repo root)
cp -r ../../blocks/content-script/iframe-mount/. content-script/
cp -r ../../blocks/service-worker/basic/. service-worker/
cp -r ../../blocks/messaging/typed-messages/. messaging/
cp -r ../../blocks/popup-ui/react/. ui/
cp ../../blocks/manifest/templates/base/manifest.json manifest.json
```

Do not copy the `BLOCK.md` files — they are library documentation, not runtime files.

After copying, the directory should look like the workspace layout shown above (before `vite.config.ts` and `tsconfig.json` are created in the next steps).

---

### Step 2 — Set up `package.json` and install dependencies

Create `workspace/<extension-name>/package.json`:

```json
{
  "name": "<extension-name>",
  "version": "0.0.1",
  "private": true,
  "scripts": {
    "build": "vite build"
  },
  "devDependencies": {
    "@types/chrome": "^0.0.268",
    "@types/react": "^18.3.0",
    "@types/react-dom": "^18.3.0",
    "@vitejs/plugin-react": "^4.3.0",
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

Create `workspace/<extension-name>/tsconfig.json`. This extends the root config (which enables strict mode, ES2022, and bundler module resolution) and adds the workspace source:

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

If you prefer a standalone config (e.g. the extension is not inside the Athanor repo), use this instead:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "lib": ["ES2022", "DOM"],
    "strict": true,
    "jsx": "react-jsx",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist"
  },
  "include": ["**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules", "dist"]
}
```

---

### Step 4 — Set up `vite.config.ts`

The workspace build has two separate Vite entry points:

- **Content script** (`content-script/index.ts`) — compiled as an IIFE, output to `dist/content-script/index.js`
- **Service worker** (`service-worker/index.ts`) — compiled as an ES module, output to `dist/background.js`
- **UI** (`ui/index.html`) — standard Vite HTML build, output to `dist/ui/`

The content script and service worker are compiled separately from the UI because they have different module format requirements. One practical approach is two sequential Vite configs invoked in order. Create `workspace/<extension-name>/vite.config.ts`:

```ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// This config handles the React UI only.
// The content script and service worker are compiled by a separate
// vite.config.scripts.ts — run both configs in sequence during build.
export default defineConfig({
  plugins: [react()],
  build: {
    outDir: 'dist/ui',
    rollupOptions: {
      input: 'ui/index.html',
    },
    assetsInlineLimit: 0,
  },
  base: './',
})
```

Create `workspace/<extension-name>/vite.config.scripts.ts` for the content script and service worker:

```ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    outDir: 'dist',
    emptyOutDir: false,            // do not wipe the ui/ output from the first build
    rollupOptions: {
      input: {
        'content-script/index': 'content-script/index.ts',
        background: 'service-worker/index.ts',
      },
      output: {
        entryFileNames: '[name].js',
        format: 'es',              // ES module — required for MV3 service workers
      },
    },
  },
})
```

Update the `build` script in `package.json` to run both configs:

```json
{
  "scripts": {
    "build": "vite build && vite build --config vite.config.scripts.ts"
  }
}
```

After `npm run build`, the `dist/` directory will contain:
- `dist/ui/index.html` and `dist/ui/assets/index.js` — the React UI
- `dist/content-script/index.js` — the content script
- `dist/background.js` — the service worker

---

### Step 5 — Wire the import paths

The blocks are self-contained in the library but require cross-block imports once assembled in a workspace. Make the following changes in the workspace copies:

**`service-worker/index.ts`** — replace the inline type definition with an import:

```ts
// Remove the inline type block near the top:
// type ExtensionMessage = ...

// Add this import instead:
import type { ExtensionMessage } from '../messaging/types'
```

The rest of `service-worker/index.ts` does not need changes.

**`ui/App.tsx`** — optionally replace the inline type with an import for consistency:

```ts
// Remove the inline type block near the top:
// type ExtensionMessage = ...

// Add this import instead:
import type { ExtensionMessage } from '../messaging/types'
```

`App.tsx` will still work with the inline type if you leave it — this step is optional but recommended if you plan to extend the message union.

The content script (`content-script/index.ts`) has no cross-block imports — leave it as-is.

---

### Step 6 — Customise `types.ts` — extend `ExtensionMessage` if needed

Open `workspace/<extension-name>/messaging/types.ts`. The base union covers the three message types needed for the basic fetch round-trip:

```ts
export type ExtensionMessage =
  | { type: 'FETCH_DATA'; payload: { url: string } }
  | { type: 'DATA_RESPONSE'; payload: { data: unknown } }
  | { type: 'ERROR'; payload: { message: string } }
```

If your extension needs additional message types, add them to this union here — do not modify the library original at `blocks/messaging/typed-messages/types.ts`. The `sendMessage` and `onMessage` wrappers in `messaging/index.ts` automatically pick up the extended union because they import `ExtensionMessage` from the local `./types`.

---

### Step 7 — Set the API URL in `App.tsx`

Open `workspace/<extension-name>/ui/App.tsx`. Near the top of the file, update the `DEFAULT_URL` constant:

```ts
const DEFAULT_URL = 'https://your-api.example.com/endpoint'
```

The default is set to the Dog CEO random image API (`https://dog.ceo/api/breeds/image/random`) for the PoC — change it to your target API. The URL is sent as the `payload.url` in the `FETCH_DATA` message; the service worker performs the actual fetch.

---

### Step 8 — Fill in `manifest.json`

Open `workspace/<extension-name>/manifest.json`. The template includes all required fields — fill in the placeholders:

| Field | What to set |
|---|---|
| `name` | Your extension's display name (max 45 characters) |
| `description` | One to two sentences about what the extension does (max 132 characters) |
| `version` | Start at `"0.0.1"` for development |
| `icons` | Place PNG files at `icons/icon16.png`, `icons/icon48.png`, `icons/icon128.png` and keep the paths as-is, or update if you use different filenames |
| `action.default_title` | Tooltip text shown on hover over the toolbar icon |
| `background.service_worker` | Set to `"background.js"` to match the compiled output from Step 4 |
| `content_scripts[0].js` | Set to `["content-script/index.js"]` to match the compiled output from Step 4 |
| `content_scripts[0].matches` | Restrict to the domains your extension needs (e.g. `["https://*.github.com/*"]`). `<all_urls>` works for development but must be narrowed before publishing. |
| `host_permissions` | Set to the specific origin your service worker fetches from (e.g. `["https://your-api.example.com/*"]`). Do not publish with `<all_urls>`. |
| `web_accessible_resources[0].resources` | Keep `["ui/*"]` — this covers `dist/ui/index.html` and all Vite assets |

The completed manifest for the PoC (Dog API) looks like this:

```json
{
  "manifest_version": 3,
  "name": "My Extension",
  "version": "0.0.1",
  "description": "Fetches a random dog image.",
  "icons": {
    "16":  "icons/icon16.png",
    "48":  "icons/icon48.png",
    "128": "icons/icon128.png"
  },
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
    "default_title": "Toggle UI",
    "default_icon": {
      "16":  "icons/icon16.png",
      "48":  "icons/icon48.png",
      "128": "icons/icon128.png"
    }
  },
  "permissions": ["tabs", "activeTab"],
  "host_permissions": ["https://dog.ceo/*"],
  "web_accessible_resources": [
    {
      "resources": ["ui/*"],
      "matches": ["<all_urls>"]
    }
  ]
}
```

Note: `"storage"` is removed here since the PoC does not persist any data. Keep it if you plan to use `chrome.storage`.

---

### Step 9 — Build and load

Build the extension:

```sh
npm run build
```

This runs both Vite configs in sequence and populates `dist/`.

Load the extension in Chrome:
1. Open `chrome://extensions`
2. Enable "Developer mode" (toggle in the top-right)
3. Click "Load unpacked"
4. Select the `dist/` directory inside your workspace extension

The extension icon appears in the Chrome toolbar.

---

## Verification checklist

Trace the message flow end-to-end before declaring the extension done:

- [ ] Navigating to a matched page produces no errors in the page's console (content script loaded cleanly)
- [ ] Clicking the extension icon causes the iframe panel to appear (service worker forwarded `TOGGLE_UI`; content script received it)
- [ ] Clicking the extension icon a second time hides the panel (toggle working)
- [ ] Clicking "Fetch Data" inside the panel shows a loading state, then a result or error (UI sends `FETCH_DATA`; service worker responds)
- [ ] The service worker console (accessible from `chrome://extensions` → "Inspect views: service worker") shows no uncaught errors
- [ ] All three message types in the `ExtensionMessage` union are handled by at least one `if (msg.type === ...)` branch in `service-worker/index.ts`
- [ ] The manifest has no `default_popup` field
- [ ] `host_permissions` does not use `<all_urls>` (or you have a documented justification for development use)
