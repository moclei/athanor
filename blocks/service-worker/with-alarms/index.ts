/**
 * block: service-worker/with-alarms
 *
 * Chrome Alarms helper for inactivity timeout.  Provides functions to
 * create, clear, and throttle-reset a per-tab inactivity alarm.
 *
 * The timeout duration is supplied by the consumer via a `getTimeoutMinutes`
 * callback — this block has no dependency on any settings schema or storage
 * key.
 *
 * No imports from other blocks.  @types/chrome must be available in the
 * consuming project's devDependencies.
 */

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Prefix used for all alarm names managed by this block. */
export const INACTIVITY_ALARM_PREFIX = 'inactivity-';

/** Minimum time between resets for the same tab (ms). */
const ALARM_RESET_COOLDOWN_MS = 30_000; // 30 seconds

// ---------------------------------------------------------------------------
// In-memory throttle state
// ---------------------------------------------------------------------------

/** Tracks the last reset timestamp (ms) per tabId. */
const lastResetTime: Record<number, number> = {};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function alarmName(tabId: number): string {
  return `${INACTIVITY_ALARM_PREFIX}${tabId}`;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create (or recreate) the inactivity alarm for a tab.
 *
 * Clears any existing alarm for the tab first, then creates a new one with
 * the duration returned by `getTimeoutMinutes()`.  No-op if the resolved
 * value is ≤ 0 (feature disabled).
 */
export async function createInactivityAlarm(
  tabId: number,
  getTimeoutMinutes: () => Promise<number>
): Promise<void> {
  const timeoutMinutes = await getTimeoutMinutes();

  if (timeoutMinutes <= 0) {
    return;
  }

  const name = alarmName(tabId);
  await chrome.alarms.clear(name);
  await chrome.alarms.create(name, { delayInMinutes: timeoutMinutes });
}

/**
 * Clear the inactivity alarm for a tab.
 *
 * Call when the extension deactivates for a tab.
 */
export async function clearInactivityAlarm(tabId: number): Promise<void> {
  await chrome.alarms.clear(alarmName(tabId));
}

/**
 * Reset the inactivity timer for a tab, with throttling.
 *
 * Skips the reset if called within 30 seconds of the last reset for the
 * same tab — prevents high-frequency activity events (mousemove, keydown)
 * from hammering the Chrome Alarms API.
 *
 * Call this on user activity events forwarded from the content script
 * (via a Crann action or chrome.runtime.onMessage).
 */
export async function resetInactivityTimer(
  tabId: number,
  getTimeoutMinutes: () => Promise<number>
): Promise<void> {
  const now = Date.now();
  const last = lastResetTime[tabId] ?? 0;

  if (now - last < ALARM_RESET_COOLDOWN_MS) {
    return;
  }

  lastResetTime[tabId] = now;
  await createInactivityAlarm(tabId, getTimeoutMinutes);
}
