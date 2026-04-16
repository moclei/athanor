import { createStore } from 'crann';
import { config } from '../config.sw';

const IS_DEV = false;

console.log('[Freehold:SW] Service worker starting');
const store = createStore(config, { debug: IS_DEV });

store.subscribe(['active'], (_state, changes, agentInfo) => {
  const tabId = agentInfo?.location?.tabId;
  console.log('[Freehold:SW] active changed to', changes.active, 'for tab', tabId);
});

async function handleActionClick(tab: chrome.tabs.Tab) {
  if (!tab.id) return;
  console.log('[Freehold:SW] Action click on tab', tab.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agents = store.getAgents({ context: 'contentscript' as any, tabId: tab.id });
  const [agent] = agents;

  if (agent !== undefined) {
    const agentState = store.getAgentState(agent.id);
    const isActive = agentState.active;
    console.log('[Freehold:SW] Toggling active:', isActive, '->', !isActive);
    await store.setState({ active: !isActive }, agent.id);
  } else {
    console.log('[Freehold:SW] No agent found, injecting content script');
    await injectContentScript(tab.id);
  }
}

async function injectContentScript(tabId: number) {
  await chrome.scripting.executeScript({
    target: { tabId },
    files: ['content-script/index.js'],
  });
}

// When the React UI signals it is connected (initialized = true),
// auto-activate the panel. This handles the first-click flow:
// icon click → inject → React mounts → sets initialized → we set active.
store.subscribe(['initialized'], (_state, changes, agentInfo) => {
  const tabId = agentInfo?.location?.tabId;
  if (tabId === undefined) return;

  if (changes.initialized === true) {
    console.log('[Freehold:SW] initialized=true from tab', tabId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agents = store.getAgents({ context: 'contentscript' as any, tabId });
    if (agents.length === 0) return;
    const agent = agents[0]!;
    const agentState = store.getAgentState(agent.id);
    if (!agentState.active) {
      console.log('[Freehold:SW] Setting active=true for agent', agent.id);
      store.setState({ active: true }, agent.id);
    } else {
      console.log('[Freehold:SW] Agent already active, skipping');
    }
  }
});

chrome.action.onClicked.addListener(handleActionClick);
