/**
 * Freehold content script entry point.
 *
 * Mounts the React UI inside a closed shadow DOM. Crann connection is handled
 * entirely by createCrannHooks (in ui/hooks.ts) — there is no separate
 * connectStore call here. Visibility is controlled by the React app reading
 * the `active` state via hooks and applying styles to the shadow container.
 *
 * This follows the Lensor pattern: the injected script creates the shadow DOM
 * and immediately renders React into it. React controls everything from there.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import { App } from '../ui/App';
import { panelStyles } from './panel-styles';

const CONTAINER_ID = '__freehold__';

const HOST_STYLES: Partial<CSSStyleDeclaration> = {
  position: 'fixed',
  top: '0',
  right: '0',
  width: '100%',
  height: '100vh',
  zIndex: '2147483647',
  display: 'block',
  overflow: 'hidden',
  pointerEvents: 'none',
  visibility: 'hidden',
};

function initializeReact() {
  const existing = document.getElementById(CONTAINER_ID);
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = CONTAINER_ID;
  Object.assign(host.style, HOST_STYLES);
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'closed' });

  const style = document.createElement('style');
  style.textContent = panelStyles;
  shadowRoot.appendChild(style);

  const uiRoot = document.createElement('div');
  uiRoot.style.height = '100%';
  shadowRoot.appendChild(uiRoot);

  const root = createRoot(uiRoot);
  root.render(React.createElement(App, { shadowContainer: host }));
}

initializeReact();
