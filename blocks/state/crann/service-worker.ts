import { createStore } from 'crann';
import { config } from './config';

// Enable debug logging in development builds only.
// TODO: wire this to your build system (e.g. process.env.NODE_ENV === 'development').
const IS_DEV = false;

/**
 * The Crann store is the state hub — the single source of truth.
 * All content script agents (spokes) connect to this hub and sync through it.
 *
 * Must be created at module level so it persists for the lifetime of the service worker.
 */
const store = createStore(config, { debug: IS_DEV });

// ---------------------------------------------------------------------------
// Action-button click handler
// ---------------------------------------------------------------------------
// When the user clicks the extension icon, look up the agent for that tab and
// toggle its `active` state. If no agent is connected yet, inject the content
// script so it can connect.

async function handleActionClick(tab: chrome.tabs.Tab) {
  if (!tab.id) return;

  // PorterContext is an internal crann enum not re-exported from the package.
  // At runtime 'contentscript' matches PorterContext.ContentScript exactly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agents = store.getAgents({ context: 'contentscript' as any, tabId: tab.id });
  const [agent] = agents;

  if (agent !== undefined) {
    const agentState = store.getAgentState(agent.id);
    // TODO: replace 'active' with your per-tab toggle key if you renamed it.
    const isActive = agentState.active;
    await store.setState({ active: !isActive }, agent.id);
  } else {
    // No agent connected on this tab — inject the content script first.
    await injectContentScript(tab.id);
  }
}

// ---------------------------------------------------------------------------
// Content script injection
// ---------------------------------------------------------------------------

async function injectContentScript(tabId: number) {
  // TODO: replace 'content-script/index.js' with the built output path of
  // your content script as declared in vite.config.ts / webpack config.
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content-script/index.js'],
  });
}

// ---------------------------------------------------------------------------
// State subscriptions
// ---------------------------------------------------------------------------
// store.subscribe(keyFilter, callback) fires only when one of the listed keys
// changes. Omit the filter array to subscribe to all state changes.
//
// agentInfo?.location?.tabId is defined for Scope.Agent changes and undefined
// for Scope.Shared changes (no specific tab owns the change).

// TODO: replace 'active' with the key(s) you want to react to.
store.subscribe(['active'], (state, changes, agentInfo) => {
  const tabId = agentInfo?.location?.tabId;
  if (tabId === undefined) return; // Scope.Shared change — no tab context

  if (changes.active === true) {
    // TODO: handle activation (e.g. start an inactivity alarm, update badge).
  } else if (changes.active === false) {
    // TODO: handle deactivation (e.g. clear alarm, reset badge).
  }
});

// TODO: add more subscriptions as needed.
// Example: react to a shared counter change.
// store.subscribe(['globalCount'], (state, changes) => {
//   console.log('globalCount is now', changes.globalCount);
// });

// ---------------------------------------------------------------------------
// Per-agent state reads and writes (reference examples)
// ---------------------------------------------------------------------------
// These are not active code — they show the store API for use in your handlers.

// Read state for a specific agent:
//   const agentState = store.getAgentState(agentId);
//   const isActive = agentState.active;

// Write state for a specific agent (Scope.Agent):
//   await store.setState({ active: false }, agentId);

// Write shared state (Scope.Shared) — agentId omitted:
//   await store.setState({ globalCount: 5 });

// Look up all content script agents connected from a specific tab:
//   const agents = store.getAgents({ context: 'contentscript', tabId });

// ---------------------------------------------------------------------------
// Wire listeners
// ---------------------------------------------------------------------------

chrome.action.onClicked.addListener(handleActionClick);
