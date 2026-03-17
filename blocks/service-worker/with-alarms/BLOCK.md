# Block: service-worker/with-alarms

## Purpose

Manages Chrome Alarms for an inactivity timeout feature. When the extension activates for a tab, call `createInactivityAlarm` to set a timer. The alarm fires after a configurable number of minutes of inactivity. User activity calls `resetInactivityTimer` to extend the timer. When the extension deactivates, call `clearInactivityAlarm`.

Typical use case: a screen-capture or overlay extension that should auto-deactivate when the user stops interacting with it.

---

## Exports

```ts
export const INACTIVITY_ALARM_PREFIX: string

export async function createInactivityAlarm(
  tabId: number,
  getTimeoutMinutes: () => Promise<number>
): Promise<void>

export async function clearInactivityAlarm(tabId: number): Promise<void>

export async function resetInactivityTimer(
  tabId: number,
  getTimeoutMinutes: () => Promise<number>
): Promise<void>
```

### `INACTIVITY_ALARM_PREFIX`

The string prefix used for alarm names: `'inactivity-'`. Alarm names are `${INACTIVITY_ALARM_PREFIX}${tabId}`. Use this constant in `chrome.alarms.onAlarm.addListener` to identify alarms from this block.

### `createInactivityAlarm(tabId, getTimeoutMinutes)`

Clears any existing alarm for the tab, then creates a new one with the duration returned by `getTimeoutMinutes()`. No-op if `getTimeoutMinutes()` resolves to `0` or a negative value (disabled).

### `clearInactivityAlarm(tabId)`

Clears the alarm for the tab. Call when the extension deactivates for a tab.

### `resetInactivityTimer(tabId, getTimeoutMinutes)`

Throttled: skips the reset if called within 30 seconds of the last reset for the same tab. Otherwise delegates to `createInactivityAlarm`. Call this on user activity events (mouse moves, keystrokes, etc.) forwarded from the content script.

---

## `getTimeoutMinutes` callback pattern

The block accepts a `getTimeoutMinutes: () => Promise<number>` callback rather than reading from `chrome.storage.sync` directly. This keeps the block decoupled from any particular settings schema.

Consumer examples:

```ts
// Hardcoded — simple
const getTimeout = async () => 5;

// From chrome.storage.sync
const getTimeout = async () => {
  const result = await chrome.storage.sync.get(['settings']);
  return result.settings?.inactivityTimeoutMinutes ?? 5;
};

// From a Crann state snapshot (service worker context)
const getTimeout = async () => {
  const state = store.getState(); // store from createStore(config)
  return state.inactivityTimeoutMinutes ?? 5;
};
```

---

## 30-second throttle

`resetInactivityTimer` maintains an in-memory `Record<number, number>` (tabId → last reset timestamp in ms). If called again within 30 000 ms of the previous call for the same tab, it returns immediately without touching the Chrome Alarms API. This prevents high-frequency activity events (e.g. mousemove) from hammering the alarms API.

---

## Wiring in the service worker

```ts
// service-worker/index.ts
import {
  INACTIVITY_ALARM_PREFIX,
  createInactivityAlarm,
  clearInactivityAlarm,
  resetInactivityTimer,
} from './with-alarms';

// 1. Start the alarm when the extension activates for a tab
store.subscribe(['active'], async (state, _changes, agentInfo) => {
  const tabId = agentInfo?.location?.tabId;
  if (!tabId) return;

  if (state.active) {
    await createInactivityAlarm(tabId, getTimeoutMinutes);
  } else {
    await clearInactivityAlarm(tabId);
  }
});

// 2. Handle alarm expiry — deactivate the extension
chrome.alarms.onAlarm.addListener(async (alarm) => {
  if (!alarm.name.startsWith(INACTIVITY_ALARM_PREFIX)) return;
  const tabId = parseInt(alarm.name.replace(INACTIVITY_ALARM_PREFIX, ''), 10);
  if (isNaN(tabId)) return;

  // Deactivate by setting agent state (adjust key names to your config)
  const agents = store.getAgents({ context: 'contentscript', tabId });
  for (const agentId of agents) {
    store.setState({ active: false }, agentId);
  }
});

// 3. Reset timer on user activity forwarded from the content script
//    (wire via a Crann action or a chrome.runtime.onMessage handler)
async function handleUserActivity(tabId: number) {
  await resetInactivityTimer(tabId, getTimeoutMinutes);
}
```

---

## Integration with `state/crann`

The most natural wiring is via a Crann RPC action defined in `config.ts`:

```ts
// config.ts
actions: {
  resetInactivityTimer: {
    handler: async (ctx) => {
      const tabId = ctx.agentLocation?.tabId;
      if (tabId !== undefined) {
        await resetInactivityTimer(tabId, getTimeoutMinutes);
      }
    },
  },
},
```

Content script calls `agent.actions.resetInactivityTimer()` on user activity — no `chrome.runtime.sendMessage` boilerplate required.

---

## Required manifest fields

```json
"permissions": ["alarms"]
```

No other permissions are required by this block alone.
