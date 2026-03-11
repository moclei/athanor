/**
 * Basic service worker for a Chrome MV3 extension.
 *
 * This file is a self-contained pattern template. Copy it into your workspace
 * extension (`workspace/<name>/service-worker/index.ts`) and wire it with your
 * local copy of the `messaging/typed-messages` block.
 *
 * No imports from other blocks. @types/chrome must be available as a
 * devDependency in the consuming project.
 *
 * -----------------------------------------------------------------------
 * HOW TO WIRE WITH typed-messages
 * -----------------------------------------------------------------------
 * After copying both blocks into your workspace, update the imports here:
 *
 *   import type { ExtensionMessage } from '../messaging/types'
 *
 * Then replace the inline type below with that import. The handler logic
 * does not change.
 * -----------------------------------------------------------------------
 */

// -----------------------------------------------------------------------
// Inline type definition — replace with an import from your workspace copy
// of blocks/messaging/typed-messages/types.ts once you have wired the blocks.
//
// Extend this union in your workspace copy to add your own message variants.
// -----------------------------------------------------------------------
type ExtensionMessage =
  | { type: 'FETCH_DATA'; payload: { url: string } }
  | { type: 'DATA_RESPONSE'; payload: { data: unknown } }
  | { type: 'ERROR'; payload: { message: string } }

// -----------------------------------------------------------------------
// chrome.action.onClicked → TOGGLE_UI forwarding
//
// When the user clicks the extension icon, forward the event to the active
// tab's content script as a TOGGLE_UI message. The content-script/iframe-mount
// block listens for this message and shows/hides the injected iframe.
//
// Required manifest entries:
//   "action": { "default_title": "Toggle UI" }   — no default_popup
//   "permissions": ["activeTab"]
// -----------------------------------------------------------------------
chrome.action.onClicked.addListener((tab) => {
  if (tab.id !== undefined) {
    chrome.tabs.sendMessage(tab.id, { type: 'TOGGLE_UI' })
  }
})

// -----------------------------------------------------------------------
// chrome.runtime.onMessage — typed message routing
//
// Routes incoming messages by their `type` field. The listener returns
// `true` whenever it needs to call `sendResponse` asynchronously (i.e.
// after an `await`). Returning `true` keeps the message channel open;
// failing to do so causes the channel to close before `sendResponse` is
// called, and the caller receives `undefined`.
//
// Pattern rules:
//   - Synchronous handler with no response  → return nothing (undefined)
//   - Async handler that calls sendResponse → return true *before* awaiting
// -----------------------------------------------------------------------
chrome.runtime.onMessage.addListener(
  (
    message: unknown,
    _sender: chrome.runtime.MessageSender,
    sendResponse: (response?: unknown) => void
  ): boolean | undefined => {
    // Guard: ignore messages that are not part of our typed union.
    if (
      typeof message !== 'object' ||
      message === null ||
      typeof (message as Record<string, unknown>).type !== 'string'
    ) {
      return undefined
    }

    const msg = message as ExtensionMessage

    if (msg.type === 'FETCH_DATA') {
      // Return true immediately to keep the channel open, then resolve async.
      handleFetchData(msg.payload.url)
        .then(sendResponse)
        .catch((err: unknown) => {
          const errorMessage = err instanceof Error ? err.message : String(err)
          sendResponse({ type: 'ERROR', payload: { message: errorMessage } })
        })
      return true // keep channel open for async sendResponse
    }

    // Unhandled message types — no response, close channel immediately.
    return undefined
  }
)

// -----------------------------------------------------------------------
// Handler: FETCH_DATA
//
// Fetches the URL from the message payload and returns a DATA_RESPONSE on
// success, or an ERROR on failure. Errors include network failures and
// non-2xx HTTP status codes.
// -----------------------------------------------------------------------
async function handleFetchData(
  url: string
): Promise<ExtensionMessage> {
  const response = await fetch(url)
  if (!response.ok) {
    return {
      type: 'ERROR',
      payload: { message: `HTTP ${response.status}: ${response.statusText}` },
    }
  }
  const data: unknown = await response.json()
  return { type: 'DATA_RESPONSE', payload: { data } }
}
