import { createStore } from 'crann';
import { config } from '../config';

/**
 * Freehold service worker — Crann store hub.
 * Copied from block: state/crann/service-worker — customized for Freehold.
 */

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

store.subscribe(['projects'], async (state) => {
  const activeId = state.activeProjectId;
  if (!activeId) return;
  const project = state.projects[activeId];
  if (!project) return;

  const { slugify, writeProjectJson } = await import('./downloads');
  await writeProjectJson(slugify(project.name), project);
});

store.subscribe(['active'], (_state, changes, agentInfo) => {
  const tabId = agentInfo?.location?.tabId;
  if (tabId === undefined) return;

  if (changes.active === true) {
    // Extension activated on this tab
  } else if (changes.active === false) {
    // Extension deactivated on this tab
  }
});

chrome.downloads.setUiOptions({ enabled: false });

chrome.action.onClicked.addListener(handleActionClick);
