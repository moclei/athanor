/**
 * Discriminated union of all messages that can be sent between the UI,
 * content script, and service worker. When you copy this block into a
 * workspace extension, extend this union in your local copy of this file —
 * do not modify the library original.
 *
 * @example
 * // In your workspace's messaging/types.ts, add new variants:
 * export type ExtensionMessage =
 *   | { type: 'FETCH_DATA'; payload: { url: string } }
 *   | { type: 'DATA_RESPONSE'; payload: { data: unknown } }
 *   | { type: 'ERROR'; payload: { message: string } }
 *   | { type: 'MY_ACTION'; payload: { value: string } }  // your addition
 */
export type ExtensionMessage =
  | { type: 'FETCH_DATA'; payload: { url: string } }
  | { type: 'DATA_RESPONSE'; payload: { data: unknown } }
  | { type: 'ERROR'; payload: { message: string } }

/**
 * A function that sends an ExtensionMessage (fire-and-forget variant).
 * Prefer the typed `sendMessage` wrapper from `index.ts` over this type directly.
 */
export type MessageSender = (msg: ExtensionMessage) => void

/**
 * A handler that receives an ExtensionMessage.
 * May be synchronous or asynchronous — the `onMessage` wrapper handles
 * the `return true` requirement for async handlers automatically.
 */
export type MessageHandler = (msg: ExtensionMessage) => void | Promise<void>
