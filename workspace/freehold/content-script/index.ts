/**
 * Shadow DOM mount for Freehold.
 * Copied from block: content-script/shadow-dom-mount
 *
 * Mounts a React application inside a closed Shadow DOM attached to a host
 * <div> appended to document.body. The host covers the full viewport and
 * toggles visibility via CSS — it is never removed from the DOM so React
 * state is preserved across hide/show cycles.
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';

export interface ShadowMountHandle {
  show(): void;
  hide(): void;
  destroy(): void;
}

const DEFAULT_CONTAINER_ID = '__freehold-shadow-root__';

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

function applyStyles(el: HTMLElement, styles: Partial<CSSStyleDeclaration>): void {
  Object.assign(el.style, styles);
}

export function initializeShadowMount(
  component: React.ReactNode,
  options?: { containerId?: string }
): ShadowMountHandle {
  const containerId = options?.containerId ?? DEFAULT_CONTAINER_ID;

  const existing = document.getElementById(containerId);
  if (existing) {
    existing.remove();
  }

  const host = document.createElement('div');
  host.id = containerId;
  applyStyles(host, HOST_STYLES);
  document.body.appendChild(host);

  const shadowRoot = host.attachShadow({ mode: 'closed' });

  const styleSlot = document.createElement('div');
  shadowRoot.appendChild(styleSlot);

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
  };
}
