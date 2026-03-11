/**
 * Typed messaging wrappers for Chrome extension message passing.
 *
 * Both `sendMessage` and `onMessage` are typed against `ExtensionMessage`.
 * When you copy this block into a workspace extension, import from the
 * local `./types` — the workspace copy of types.ts is yours to extend.
 *
 * Requires: @types/chrome (dev dependency — not bundled at runtime)
 */

import type { ExtensionMessage, MessageHandler } from './types'

export type { ExtensionMessage, MessageSender, MessageHandler } from './types'

/**
 * Send a typed message to the extension service worker.
 *
 * Wraps `chrome.runtime.sendMessage`. The service worker must have an
 * `onMessage` listener registered (use `onMessage` below or the raw API).
 *
 * Returns the response value from the service worker's `sendResponse` call,
 * or `undefined` if the handler does not call `sendResponse`.
 *
 * Call from: UI inside an extension-origin iframe, or content script.
 */
export function sendMessage(msg: ExtensionMessage): Promise<unknown> {
  return chrome.runtime.sendMessage(msg)
}

/**
 * Register a typed message handler on the service worker (or any extension
 * context that listens for messages).
 *
 * Wraps `chrome.runtime.onMessage.addListener`. If the provided handler
 * returns a Promise, this wrapper automatically returns `true` from the
 * raw listener to keep the message channel open until the Promise resolves,
 * then calls `sendResponse` with the resolved value.
 *
 * If the handler is synchronous and returns `void`, the message channel is
 * closed immediately (no response is sent).
 *
 * Call from: service worker (`background/index.ts`).
 */
export function onMessage(handler: MessageHandler): void {
  chrome.runtime.onMessage.addListener(
    (
      message: unknown,
      _sender: chrome.runtime.MessageSender,
      sendResponse: (response?: unknown) => void
    ): boolean | undefined => {
      // Narrow to ExtensionMessage — if the message does not have a string
      // `type` field it is not ours and we ignore it (return undefined so
      // Chrome knows we are not handling this message).
      if (
        typeof message !== 'object' ||
        message === null ||
        typeof (message as Record<string, unknown>).type !== 'string'
      ) {
        return undefined
      }

      const typedMessage = message as ExtensionMessage
      const result = handler(typedMessage)

      if (result instanceof Promise) {
        // Keep the message channel open and resolve when the handler finishes.
        result.then(sendResponse).catch((err: unknown) => {
          const errorMessage =
            err instanceof Error ? err.message : String(err)
          sendResponse({ type: 'ERROR', payload: { message: errorMessage } })
        })
        return true // Signal to Chrome that sendResponse will be called async
      }

      // Synchronous handler — channel closes immediately, no response sent.
      return undefined
    }
  )
}
