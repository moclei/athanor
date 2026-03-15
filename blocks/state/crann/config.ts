import { createConfig, Scope, Persist } from 'crann';

/**
 * Crann state configuration — the binding contract shared by ALL three contexts:
 *   - service-worker.ts    (createStore)
 *   - content script / UI  (connectStore or createCrannHooks)
 *
 * Every consumer-specific value is marked with // TODO:.
 * Add, rename, or remove state keys and actions to match your extension.
 *
 * Scope types:
 *   Scope.Agent  — per-tab state; each content script instance has its own copy.
 *                  Use for anything that varies between tabs (e.g. active, position).
 *   Scope.Shared — global state across all connected agents.
 *                  Use for counters, user preferences that apply everywhere.
 *   (default)    — Scope.Shared when the scope key is omitted.
 *
 * Persist options (optional — state is in-memory only by default):
 *   Persist.Local   — survives service worker restarts (chrome.storage.local)
 *   Persist.Session — survives page reloads within a browser session (chrome.storage.session)
 */
export const config = createConfig({
  // TODO: replace 'myExtension' with your extension's unique name.
  // This is used as the storage namespace — it must be stable across versions.
  name: 'myExtension',

  // --- Per-tab state (Scope.Agent) ---

  // TODO: rename / remove. Example: whether the extension UI is visible on this tab.
  active: {
    default: false,
    scope: Scope.Agent,
  },

  // TODO: add more per-tab keys here.
  // Example: a counter local to each tab.
  // tabCount: {
  //   default: 0,
  //   scope: Scope.Agent,
  // },

  // --- Shared state (Scope.Shared, or omit scope key) ---

  // TODO: rename / remove. Example: a global counter incremented across all tabs.
  globalCount: {
    default: 0,
    // scope: Scope.Shared is the default; omitting is equivalent
  },

  // TODO: example of persisted shared state — survives service worker restart.
  // savedItems: {
  //   default: [] as string[],
  //   persist: Persist.Local,
  // },

  // --- RPC Actions ---
  // Actions are defined here but execute in the service worker context.
  // They are callable from any client:
  //   agent.actions.doThing(arg)          // non-React
  //   const { doThing } = useCrannActions() // React
  //
  // ctx.agentLocation.tabId — the tab that called the action
  // ctx.state               — current state snapshot at call time
  // Return value is typed end-to-end.

  actions: {
    // TODO: rename / remove / add actions as needed.
    // Example: open a settings page tab.
    openSettings: {
      handler: async (_ctx) => {
        // TODO: replace 'settings/settings.html' with your settings page path.
        chrome.tabs.create({
          url: chrome.runtime.getURL('settings/settings.html'),
        });
      },
    },

    // TODO: add more actions here.
    // Example: an action that receives an argument and returns a value.
    // doThing: {
    //   handler: async (ctx, arg: string): Promise<string> => {
    //     const tabId = ctx.agentLocation.tabId;
    //     return `done: ${arg} on tab ${tabId}`;
    //   },
    // },
  },
});

export type Config = typeof config;
