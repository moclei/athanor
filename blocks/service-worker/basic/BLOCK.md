# Block: service-worker/basic

## Purpose

Provides the background service worker for a Chrome MV3 extension. Handles two responsibilities:

1. **Action click → toggle UI** — listens for `chrome.action.onClicked` and forwards it to the active tab's content script as a `TOGGLE_UI` message. The `content-script/iframe-mount` block receives this and shows or hides the injected iframe.

2. **FETCH_DATA message handling** — listens for `FETCH_DATA` messages from the UI or content script, performs a `fetch()` against the requested URL, and replies with `DATA_RESPONSE` on success or `ERROR` on failure.

---

## Exports

This block is **self-executing**. There is no exported `init()` function. The file registers all listeners at the module level — including the file in the manifest's `background.service_worker` entry is sufficient to activate it.

No symbols are exported from `index.ts`. The file is a side-effect-only module.

---

## How the toggle wiring works

```
User clicks extension icon
    ↓  chrome.action.onClicked fires in the service worker
    ↓  service worker calls chrome.tabs.sendMessage(tabId, { type: 'TOGGLE_UI' })
Content script (iframe-mount block) receives { type: 'TOGGLE_UI' }
    ↓  shows or hides the <iframe>
```

`TOGGLE_UI` is kept outside the `ExtensionMessage` union — it is a UI-lifecycle message, not a data-flow message. It is sent directly as a plain object so no message type extension is needed.

---

## FETCH_DATA message flow

```
UI calls chrome.runtime.sendMessage({ type: 'FETCH_DATA', payload: { url } })
    ↓  service worker receives the message
    ↓  calls fetch(url)
    ↓  on success: sendResponse({ type: 'DATA_RESPONSE', payload: { data } })
    ↓  on failure: sendResponse({ type: 'ERROR', payload: { message } })
UI receives the response via the Promise returned by sendMessage
```

### `return true` — keeping the channel open

Chrome closes the message channel as soon as the raw `onMessage` listener returns. For async handlers that call `sendResponse` after an `await`, the listener must return `true` *synchronously* before any `await` to keep the channel open. Failing to do so causes the caller to receive `undefined` even if `sendResponse` is eventually called.

`index.ts` returns `true` for `FETCH_DATA` immediately before delegating to the async helper, which is the correct pattern.

---

## Wiring with typed-messages

Since blocks cannot import each other, `index.ts` defines the `ExtensionMessage` type inline. Once you have copied both blocks into your workspace, replace the inline type with an import:

```ts
// Replace the inline type definition in service-worker/index.ts with:
import type { ExtensionMessage } from '../messaging/types'
```

The handler logic does not change — only the type source moves. This also means any extensions you add to the union in `messaging/types.ts` are automatically picked up by the service worker.

### Copying into a workspace extension

```
cp -r blocks/service-worker/basic/. workspace/<name>/service-worker/
cp -r blocks/messaging/typed-messages/. workspace/<name>/messaging/
```

Then update the import at the top of `service-worker/index.ts` as shown above.

---

## Required manifest fields

### `background`

```json
"background": {
  "service_worker": "service-worker/index.js",
  "type": "module"
}
```

`service_worker` must point to the **built** output of `service-worker/index.ts`, not the source file. `"type": "module"` is required for ES module syntax.

### `action` (no `default_popup`)

Declare the action so the icon appears in the toolbar. Do **not** set `default_popup` — the UI is rendered in an iframe managed by the content script:

```json
"action": {
  "default_title": "Toggle UI"
}
```

### `permissions`

The service worker uses `chrome.tabs.sendMessage` to forward the action click to the content script. This requires the `"tabs"` permission (or `"activeTab"` — either grants the necessary access):

```json
"permissions": ["tabs"]
```

`"activeTab"` is the minimum required if you only need the tab the user just interacted with. Use `"tabs"` if you need broader tab access elsewhere.

---

## Integration summary

| Block | Role |
|---|---|
| `service-worker/basic` | Background logic — fetches data, forwards toggle |
| `content-script/iframe-mount` | Receives `TOGGLE_UI`, manages the iframe |
| `messaging/typed-messages` | Shared message type definitions |

Wire order: copy `typed-messages` and `service-worker/basic` into your workspace, update the import in `service-worker/index.ts`, add the manifest entries above, and build.
