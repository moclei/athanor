/**
 * block: content-script/iframe-mount
 *
 * Injects a fixed-position iframe into the host page and wires toggle
 * behaviour to the extension icon via a TOGGLE_UI message from the service
 * worker.  Self-executing — no init() call needed; import (or include) this
 * file as the content script entry point.
 *
 * No imports from other blocks.  @types/chrome must be available in the
 * consuming project's devDependencies.
 */

// ---------------------------------------------------------------------------
// Local types
// ---------------------------------------------------------------------------

/** Message sent by the service worker when the extension icon is clicked. */
type ToggleMessage = { type: 'TOGGLE_UI' };

// ---------------------------------------------------------------------------
// Iframe creation
// ---------------------------------------------------------------------------

function createIframe(): HTMLIFrameElement {
  const iframe = document.createElement('iframe');

  iframe.src = chrome.runtime.getURL('ui/index.html');

  // Positioning — fixed, top-right corner, always on top.
  iframe.style.cssText = [
    'position: fixed',
    'top: 0',
    'right: 0',
    'width: 300px',
    'height: 600px',
    'z-index: 2147483647',
    'border: none',
    'background: transparent',
  ].join('; ');

  iframe.id = '__athanor-iframe__';

  return iframe;
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let iframe: HTMLIFrameElement | null = null;
let visible = false;

// ---------------------------------------------------------------------------
// Toggle
// ---------------------------------------------------------------------------

function show(): void {
  if (!iframe) {
    iframe = createIframe();
    document.body.appendChild(iframe);
  }
  iframe.style.display = 'block';
  visible = true;
}

function hide(): void {
  if (iframe) {
    iframe.style.display = 'none';
  }
  visible = false;
}

function toggle(): void {
  if (visible) {
    hide();
  } else {
    show();
  }
}

// ---------------------------------------------------------------------------
// Message listener — handles TOGGLE_UI from the service worker
// ---------------------------------------------------------------------------

chrome.runtime.onMessage.addListener(
  (message: unknown): void => {
    if (
      message !== null &&
      typeof message === 'object' &&
      (message as ToggleMessage).type === 'TOGGLE_UI'
    ) {
      toggle();
    }
  }
);

// ---------------------------------------------------------------------------
// Boot — create the iframe on first load so it is ready when the user clicks
// the extension icon.  It starts hidden; the first TOGGLE_UI makes it visible.
// ---------------------------------------------------------------------------

function boot(): void {
  iframe = createIframe();
  iframe.style.display = 'none';
  document.body.appendChild(iframe);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
