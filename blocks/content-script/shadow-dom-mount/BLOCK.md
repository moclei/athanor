# Block: content-script/shadow-dom-mount

## Purpose

Mounts a React application inside a Shadow DOM attached to a host element on the page. The host element is appended to `document.body` and covers the full viewport at the highest `z-index`. Visibility is toggled via `visibility: hidden/visible` — the host is **never removed from the DOM**, which preserves React state between hide/show cycles.

Use this block when your content script needs to render a full-overlay React UI that is visually isolated from the host page's CSS but still lives in the same content-script execution context.

---

## Shadow DOM vs iframe

| | Shadow DOM | iframe |
|---|---|---|
| Style isolation | Yes (host page styles do not leak in) | Yes (separate document) |
| Extension context | Shares content-script context | Full extension context (`chrome.runtime` etc.) |
| State management | Must use Crann or `chrome.runtime.sendMessage` from content script | Direct `chrome.runtime.sendMessage` from UI |
| Complexity | Lower | Higher (postMessage relay or separate entry point) |

**When to prefer shadow-dom-mount:** your UI is tightly coupled to page state (e.g. a pixel inspector, annotation tool, overlay) and you want to use Crann for state sync.

**When to prefer iframe-mount:** your UI is self-contained and needs full, direct access to `chrome.runtime` APIs without going through the content script.

---

## Exports

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

### `initializeShadowMount(component, options?)`

Creates the host element, attaches a closed Shadow DOM, mounts the React tree, and returns a handle for controlling visibility and lifecycle.

- **`component`** — any `React.ReactNode`. Typically your `<App />` (or `<CrannProvider><App /></CrannProvider>` if you need the context explicitly, though Crann v2 does not require a provider for typical usage).
- **`options.containerId`** — ID for the host `<div>`. Defaults to `'__athanor-shadow-root__'`. Idempotent: if an element with this ID already exists, it is removed before a new one is created.

### Returned handle

| Method | Effect |
|---|---|
| `show()` | Sets `visibility: visible` on the host element |
| `hide()` | Sets `visibility: hidden` on the host element — React tree stays mounted |
| `destroy()` | Unmounts the React root and removes the host element from the DOM |

---

## Visibility strategy

The host element remains in the DOM at all times. Only its `visibility` CSS property changes. This is intentional: removing the element from the DOM would unmount the React tree and destroy all component state. With `visibility: hidden`, React state is preserved across hide/show cycles.

---

## styled-components integration

Styled-components injects `<style>` tags into `document.head` by default. These styles do not reach inside a Shadow DOM. To fix this, pass a `StyleSheetManager` around your component with its `target` set to a `<div>` inside the shadow root.

`initializeShadowMount` creates a `styleSlot` div inside the shadow root for this purpose. Access it via the `styleTarget` prop your component receives, or use the handle returned by the function.

Example:

```tsx
import { StyleSheetManager } from 'styled-components';

initializeShadowMount(
  <StyleSheetManager target={styleSlotElement}>
    <App />
  </StyleSheetManager>
);
```

In practice, Lensor passes `styleSlot` directly at call-site. The block itself does not import styled-components — it is an optional consumer concern.

---

## Integration with `state/crann`

The shadow-mounted React app runs in the content script context. Crann hooks (`useCrannState`, `useCrannActions`, etc.) work directly inside the mounted component tree — no `CrannProvider` wrapper is required in Crann v2 for typical usage.

```ts
// content-script/index.ts
import { initializeShadowMount } from './shadow-dom-mount';
import App from '../ui/App';

const handle = initializeShadowMount(<App />);

// Later, toggle visibility in response to a Crann state change or message:
handle.show();
handle.hide();
```

See the `shadow-crann` recipe for a complete end-to-end wiring example.

---

## Required manifest fields

### `content_scripts`

```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content-script/index.js"]
  }
]
```

### `action`

```json
"action": {
  "default_title": "Toggle UI"
}
```

### `web_accessible_resources`

**Not required** for the shadow DOM host. Unlike `iframe-mount`, the shadow DOM UI does not load a resource from the extension origin into a web page — it injects DOM nodes directly. No `web_accessible_resources` entry is needed for this block.

### `permissions`

No additional permissions are required by this block alone. If you use Crann inside the mounted app, see `blocks/state/crann/BLOCK.md` for service worker permissions.
