import { createStore } from 'crann';
import { config } from '../config.sw';

const IS_DEV = false;

const store = createStore(config, { debug: IS_DEV });

async function handleActionClick(tab: chrome.tabs.Tab) {
  if (!tab.id) return;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const agents = store.getAgents({ context: 'contentscript' as any, tabId: tab.id });
  const [agent] = agents;

  if (agent !== undefined) {
    const agentState = store.getAgentState(agent.id);
    const isActive = agentState.active;
    await store.setState({ active: !isActive }, agent.id);
  } else {
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const agents = store.getAgents({ context: 'contentscript' as any, tabId });
    if (agents.length === 0) return;
    const agent = agents[0]!;
    const agentState = store.getAgentState(agent.id);
    if (!agentState.active) {
      store.setState({ active: true }, agent.id);
    }
  }
});

chrome.action.onClicked.addListener(handleActionClick);
