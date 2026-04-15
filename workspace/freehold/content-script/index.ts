/**
 * Freehold content script entry point.
 *
 * Connects to the Crann store, mounts the React UI inside a closed shadow DOM,
 * and subscribes to `active` state to show/hide the panel.
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';
import { connectStore } from 'crann';
import { config } from '../config';
import { App } from '../ui/App';
import { panelStyles } from './panel-styles';

// ---------------------------------------------------------------------------
// Shadow DOM mount utility
// ---------------------------------------------------------------------------

export interface ShadowMountHandle {
  show(): void;
  hide(): void;
  destroy(): void;
  shadowRoot: ShadowRoot;
}

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
  visibility: 'visible',
};

function applyStyles(
  el: HTMLElement,
  styles: Partial<CSSStyleDeclaration>,
): void {
  Object.assign(el.style, styles);
}

export function initializeShadowMount(
  component: React.ReactNode,
  options?: { containerId?: string; stylesheet?: string },
): ShadowMountHandle {
  const containerId = options?.containerId ?? '__freehold-shadow-root__';

  const existing = document.getElementById(containerId);
  if (existing) existing.remove();

  const host = document.createElement('div');
  host.id = containerId;
  applyStyles(host, HOST_STYLES);
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'closed' });

  if (options?.stylesheet) {
    const style = document.createElement('style');
    style.textContent = options.stylesheet;
    shadowRoot.appendChild(style);
  }

  const uiRoot = document.createElement('div');
  uiRoot.style.height = '100%';
  shadowRoot.appendChild(uiRoot);

  const root: Root = createRoot(uiRoot);
  root.render(component as React.ReactElement);

  return {
    show(): void {
      host.style.visibility = 'visible';
    },
    hide(): void {
      host.style.visibility = 'hidden';
    },
    destroy(): void {
      root.unmount();
      host.remove();
    },
    shadowRoot,
  };
}

// ---------------------------------------------------------------------------
// Crann agent wiring
// ---------------------------------------------------------------------------

const agent = connectStore(config);

agent.onReady(() => {
  const handle = initializeShadowMount(
    React.createElement(App),
    { containerId: '__freehold__', stylesheet: panelStyles },
  );

  // Start hidden — the service worker sets `active: true` after injection
  handle.hide();

  agent.subscribe(['active'], (changes) => {
    if (changes.active === true) {
      handle.show();
    } else if (changes.active === false) {
      handle.hide();
    }
  });
});
