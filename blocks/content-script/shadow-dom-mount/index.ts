/**
 * block: content-script/shadow-dom-mount
 *
 * Mounts a React application inside a closed Shadow DOM attached to a host
 * <div> appended to document.body.  The host covers the full viewport and
 * toggles visibility via CSS — it is never removed from the DOM so React
 * state is preserved across hide/show cycles.
 *
 * Dependencies: react, react-dom  (@types/chrome in devDependencies)
 */

import React from 'react';
import { createRoot, Root } from 'react-dom/client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ShadowMountHandle {
  /** Make the overlay visible. */
  show(): void;
  /** Hide the overlay — React tree stays mounted, state is preserved. */
  hide(): void;
  /** Unmount the React root and remove the host element from the DOM. */
  destroy(): void;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DEFAULT_CONTAINER_ID = '__athanor-shadow-root__';

/** Fixed full-viewport host styles applied once at creation. */
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function applyStyles(
  el: HTMLElement,
  styles: Partial<CSSStyleDeclaration>
): void {
  Object.assign(el.style, styles);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Create a Shadow DOM host, mount a React component tree inside it, and
 * return a handle for controlling visibility and lifecycle.
 *
 * @param component - React node to render (e.g. <App /> or <CrannProvider><App /></CrannProvider>)
 * @param options.containerId - ID for the host <div>. Idempotent: any
 *   existing element with this ID is removed before a new one is created.
 */
export function initializeShadowMount(
  component: React.ReactNode,
  options?: { containerId?: string }
): ShadowMountHandle {
  const containerId = options?.containerId ?? DEFAULT_CONTAINER_ID;

  // Idempotent: remove any pre-existing container from a previous injection.
  const existing = document.getElementById(containerId);
  if (existing) {
    existing.remove();
  }

  // Create and append the host element.
  const host = document.createElement('div');
  host.id = containerId;
  applyStyles(host, HOST_STYLES);
  document.body.appendChild(host);

  // Attach a closed Shadow DOM — prevents host-page JS from traversing in.
  const shadowRoot = host.attachShadow({ mode: 'closed' });

  // Optional style slot for styled-components StyleSheetManager.
  const styleSlot = document.createElement('div');
  shadowRoot.appendChild(styleSlot);

  // React mount target.
  const uiRoot = document.createElement('div');
  uiRoot.style.height = '100%';
  shadowRoot.appendChild(uiRoot);

  // Mount the React tree.
  const root: Root = createRoot(uiRoot);
  root.render(component as React.ReactElement);

  // ---------------------------------------------------------------------------
  // Handle implementation
  // ---------------------------------------------------------------------------

  return {
    show(): void {
      host.style.visibility = 'visible';
    },

    hide(): void {
      // Never remove from DOM — preserves React state.
      host.style.visibility = 'hidden';
    },

    destroy(): void {
      root.unmount();
      host.remove();
    },
  };
}
