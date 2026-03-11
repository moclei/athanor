# Block: messaging/typed-messages

## Purpose

Provides a typed message-passing layer for Chrome MV3 extensions. Defines a discriminated union (`ExtensionMessage`) that covers the three core message variants needed for a fetch round-trip, and exports typed wrappers around `chrome.runtime.sendMessage` and `chrome.runtime.onMessage.addListener`. All messages in an Athanor extension must flow through this block — never pass untyped objects through the raw Chrome APIs.

---

## Exports

### Types (`types.ts`)

| Export | Signature | Description |
|---|---|---|
| `ExtensionMessage` | `type ExtensionMessage = \| { type: 'FETCH_DATA'; payload: { url: string } } \| { type: 'DATA_RESPONSE'; payload: { data: unknown } } \| { type: 'ERROR'; payload: { message: string } }` | Discriminated union of all valid extension messages. Extend this in your workspace copy — do not modify the library original. |
| `MessageSender` | `(msg: ExtensionMessage) => void` | Type alias for a fire-and-forget send function. Useful when declaring callback props or injecting send as a dependency. |
| `MessageHandler` | `(msg: ExtensionMessage) => void \| Promise<void>` | Type alias for a message handler. The handler may be sync or async — `onMessage` handles the `return true` requirement automatically. |

### Functions (`index.ts`)

| Export | Signature | Description |
|---|---|---|
| `sendMessage` | `(msg: ExtensionMessage): Promise<unknown>` | Wraps `chrome.runtime.sendMessage`. Sends a typed message to the service worker and returns a Promise that resolves with the service worker's response. Call from the UI or content script. |
| `onMessage` | `(handler: MessageHandler): void` | Wraps `chrome.runtime.onMessage.addListener`. Registers a typed handler. If the handler returns a Promise, the wrapper automatically returns `true` from the raw listener to keep the channel open for the async response. Call from the service worker. |

`index.ts` also re-exports `ExtensionMessage`, `MessageSender`, and `MessageHandler` from `types.ts` for convenience — consumers only need to import from `index.ts` unless they want types only.

---

## Extending the Message Union

When you copy this block into a workspace extension (`workspace/<name>/messaging/`), the `types.ts` in your workspace copy is yours to modify. Add new variants to the union there:

```ts
// workspace/<name>/messaging/types.ts
export type ExtensionMessage =
  | { type: 'FETCH_DATA'; payload: { url: string } }
  | { type: 'DATA_RESPONSE'; payload: { data: unknown } }
  | { type: 'ERROR'; payload: { message: string } }
  | { type: 'MY_CUSTOM_ACTION'; payload: { value: string } }  // your addition
```

The `sendMessage` and `onMessage` wrappers in `index.ts` automatically pick up the extended union because they import `ExtensionMessage` from the local `./types`. No changes to `index.ts` are needed.

Do not import from the library original (`blocks/messaging/typed-messages/`) at runtime — copy the block in and work from the workspace copy.

---

## Integration Notes

### Wiring with the service worker

In `service-worker/index.ts`, import `onMessage` and register your handler:

```ts
import { onMessage } from '../messaging/index'

onMessage(async (msg) => {
  if (msg.type === 'FETCH_DATA') {
    try {
      const response = await fetch(msg.payload.url)
      const data = await response.json()
      return { type: 'DATA_RESPONSE', payload: { data } }
    } catch (err) {
      return { type: 'ERROR', payload: { message: String(err) } }
    }
  }
})
```

Note: `onMessage` passes the handler's return value to `sendResponse`. To send a response back to the caller, return it from the handler (as shown above). The wrapper calls `sendResponse` with whatever the Promise resolves to.

### Wiring with the UI

In the UI (e.g. `ui/App.tsx`), import `sendMessage` and call it on user interaction:

```ts
import { sendMessage } from '../messaging/index'
import type { ExtensionMessage } from '../messaging/types'

async function fetchData(url: string) {
  const response = await sendMessage({ type: 'FETCH_DATA', payload: { url } })
  // response is typed as `unknown` — narrow it before use
  const msg = response as ExtensionMessage
  if (msg.type === 'DATA_RESPONSE') {
    // handle msg.payload.data
  }
}
```

The UI must run inside an extension-origin iframe to have access to `chrome.runtime.sendMessage`. This is the standard pattern when using the `content-script/iframe-mount` block.

---

## Manifest Requirements

None. This block uses only `chrome.runtime.sendMessage` and `chrome.runtime.onMessage`, which are available to all extension contexts without additional permissions. No manifest entries are required for this block.
