# Block: content-script/iframe-mount

## Purpose

Injects a fixed-position `<iframe>` into every page matched by the content script declaration and wires a toggle to the extension icon. When the user clicks the extension icon the service worker sends a `TOGGLE_UI` message to the active tab's content script; the content script shows or hides the iframe in response.

The iframe loads `ui/index.html` from the extension origin, giving the UI full access to `chrome.runtime.sendMessage` without any postMessage relay. The content script's only messaging responsibility is handling the toggle command — all data messages flow directly between the UI and the service worker.

---

## Exports

This block is **self-executing**. There is no exported `init()` function. Including the file (via the `content_scripts` manifest entry, or via an import in a content script entry point) is sufficient — the block boots itself on `DOMContentLoaded` (or immediately if the DOM is already ready) and registers the `chrome.runtime.onMessage` listener.

No symbols are exported from `index.ts`. The file is a side-effect-only module.

---

## How the toggle works

```
User clicks extension icon
    ↓  chrome.action.onClicked fires in the service worker
    ↓  service worker calls chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_UI' })
Content script receives { type: 'TOGGLE_UI' }
    ↓  shows or hides the <iframe>
```

The service worker must implement `chrome.action.onClicked` and forward the event as a `TOGGLE_UI` message. Example (place in `service-worker/index.ts`):

```ts
chrome.action.onClicked.addListener((tab) => {
  if (tab.id !== undefined) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_UI' });
  }
});
```

`TOGGLE_UI` is intentionally kept outside the `ExtensionMessage` union from `blocks/messaging/typed-messages/` — it is a UI-lifecycle concern, not a data-flow message. If you want to add it to your workspace's union you may do so freely.

---

## ui/index.html path convention

The iframe `src` is set to `chrome.runtime.getURL('ui/index.html')`. This means the built UI must be placed at `ui/index.html` relative to the extension root in the final unpacked/bundled extension directory.

When using the `popup-ui/react` block, configure Vite to output its HTML entry to `ui/index.html`. Example Vite config excerpt:

```ts
// vite.config.ts
build: {
  rollupOptions: {
    input: { ui: 'ui/index.html' },
    output: { dir: 'dist' }
  }
}
```

The resource must also be declared in `web_accessible_resources` (see below).

---

## Integration notes

### No cross-block imports

`index.ts` has no imports from other blocks. `@types/chrome` must be available as a `devDependency` in the consuming project, but no runtime packages are required.

### Copying into a workspace extension

```
cp -r blocks/content-script/iframe-mount/. workspace/<name>/content-script/
```

The block is copied as-is. No post-copy modifications are needed unless you want to change the iframe dimensions or starting position.

### Iframe dimensions

Defaults: `300px` wide, `600px` tall, fixed to the top-right corner, `z-index: 2147483647`. Edit the `style.cssText` in `createIframe()` in your workspace copy to adjust.

---

## Required manifest fields

### `content_scripts`

Register the content script on the pages where the UI should be available:

```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content-script/index.js"]
  }
]
```

`js` must point to the **built** output of `content-script/index.ts`, not the source file.

### `action` (no `default_popup`)

Declare the action so the icon appears in the toolbar. Do **not** set `default_popup` — the popup is handled by the iframe:

```json
"action": {
  "default_title": "Toggle UI"
}
```

### `web_accessible_resources`

The iframe loads `ui/index.html` from the extension origin. The resource must be declared accessible:

```json
"web_accessible_resources": [
  {
    "resources": ["ui/index.html", "ui/*"],
    "matches": ["<all_urls>"]
  }
]
```

### `permissions`

No additional permissions are required by this block. The service worker that forwards the action click needs `"tabs"` permission (for `chrome.tabs.sendMessage`), but that is the service worker's responsibility to declare.
