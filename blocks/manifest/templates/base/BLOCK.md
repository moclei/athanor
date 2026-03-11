# Block: manifest/templates/base

## Purpose

A copy-in `manifest.json` template for Chrome MV3 extensions built from the Athanor block stack. Covers all fields required by the full block combination: `content-script/iframe-mount` + `service-worker/basic` + `messaging/typed-messages` + `popup-ui/react`.

Copy this file to your workspace extension root, rename it `manifest.json`, and fill in the placeholder values. No fields should need to be added for the standard stack — but see the **Common Permission Patterns** section for additions required by non-standard features.

---

## Field Reference

### `manifest_version`

```json
"manifest_version": 3
```

Required by Chrome. Must be `3`. MV2 is deprecated and will stop working in Chrome in 2025. All Athanor blocks target MV3 only.

---

### `name`

```json
"name": "YOUR_EXTENSION_NAME"
```

Displayed in the Chrome extensions list, the toolbar tooltip, and the Chrome Web Store. Replace with your extension's name. Maximum 45 characters.

---

### `version`

```json
"version": "0.0.1"
```

Chrome extension version string. Must follow the `MAJOR.MINOR.PATCH` format (or shorter: `1.0`). Increment when publishing updates to the Chrome Web Store. Start at `0.0.1` during development — Chrome does not enforce a minimum version number for local unpacked extensions.

---

### `description`

```json
"description": "YOUR_EXTENSION_DESCRIPTION"
```

Shown in the Chrome extensions list and the Web Store. Replace with a one-to-two sentence description of what your extension does. Maximum 132 characters.

---

### `icons`

```json
"icons": {
  "16":  "icons/icon16.png",
  "48":  "icons/icon48.png",
  "128": "icons/icon128.png"
}
```

Extension icon used in the extensions management page and the Chrome Web Store. Paths are relative to the extension root. Create an `icons/` directory in your workspace extension and place PNG files there. Minimum required sizes: `16`, `48`, `128`. All three sizes are recommended.

**What to change:** Replace with your actual icon files. You can use any image format Chrome supports (PNG is the most reliable), but keep the path convention (`icons/iconNNN.png`) for clarity.

---

### `background`

```json
"background": {
  "service_worker": "service-worker/index.js",
  "type": "module"
}
```

Registers the background service worker. Required by `service-worker/basic`.

- `service_worker`: Path to the **compiled** JS output of `service-worker/index.ts`. The path is relative to the extension root. If your build outputs to `dist/`, this becomes `dist/service-worker/index.js` — adjust to match your build output structure.
- `type: "module"`: Required when the service worker uses ES module syntax (`import`/`export`). The `service-worker/basic` block uses module syntax, so this field must be present.

**What to change:** Update the path if your build tool places the output elsewhere.

---

### `content_scripts`

```json
"content_scripts": [
  {
    "matches": ["<all_urls>"],
    "js": ["content-script/index.js"],
    "run_at": "document_idle"
  }
]
```

Injects the content script into matching pages. Required by `content-script/iframe-mount`.

- `matches`: URL patterns the content script runs on. `<all_urls>` is the most permissive — restrict this to the actual domains your extension needs to operate on (see note below).
- `js`: Path to the **compiled** JS output of `content-script/index.ts`. Adjust if your build output path differs.
- `run_at`: When to inject the script. `document_idle` (the default) is correct for `iframe-mount` — it waits until the DOM is ready.

**What to change:** Restrict `matches` to only the domains your extension needs. For example: `["https://*.github.com/*"]`. Update `js` to match your build output path.

---

### `action`

```json
"action": {
  "default_title": "Toggle UI",
  "default_icon": {
    "16":  "icons/icon16.png",
    "48":  "icons/icon48.png",
    "128": "icons/icon128.png"
  }
}
```

Declares the extension's toolbar button. Required by both `service-worker/basic` (which listens for `chrome.action.onClicked`) and `content-script/iframe-mount` (which receives the resulting toggle message).

**No `default_popup` field.** The UI is rendered inside an iframe injected by the content script, not in a Chrome popup. Setting `default_popup` would intercept icon clicks before the service worker's `chrome.action.onClicked` listener fires — do not add it.

- `default_title`: Tooltip text shown on hover. Change to something descriptive for your extension.
- `default_icon`: Toolbar icon. Can reference the same `icons/` files as the top-level `icons` field.

**What to change:** Update `default_title`. Optionally use a different icon set for the toolbar vs. the extensions page.

---

### `permissions`

```json
"permissions": ["storage", "tabs", "activeTab"]
```

Declares the Chrome APIs your extension needs access to.

- `"storage"`: Access to `chrome.storage.local` and `chrome.storage.sync`. Included as a common starting point — remove if your extension does not persist any data.
- `"tabs"`: Required by `service-worker/basic` to call `chrome.tabs.sendMessage` (forwarding the icon click to the content script as a `TOGGLE_UI` message). Required if you call any `chrome.tabs.*` API that needs tab metadata.
- `"activeTab"`: Grants temporary access to the tab the user is currently interacting with. An alternative to `"tabs"` for narrowly scoped tab operations — but the `service-worker/basic` block uses `chrome.tabs.sendMessage`, which works with `"tabs"` (or `"activeTab"` when the action was just clicked). Both are included here; remove `"tabs"` if you only need `"activeTab"`.

See **Common Permission Patterns** below for what to add for other Chrome APIs.

---

### `host_permissions`

```json
"host_permissions": ["<all_urls>"]
```

Declares the URLs your extension's service worker may `fetch()`. Required when `service-worker/basic` performs outbound HTTP requests on behalf of the UI.

**`<all_urls>` is a placeholder.** It grants access to all URLs, which Chrome flags in the Web Store review process and exposes a broad attack surface. Replace it with the specific origins your extension actually needs to fetch from:

```json
"host_permissions": ["https://api.example.com/*"]
```

If your extension fetches from multiple origins, list each one:

```json
"host_permissions": [
  "https://api.example.com/*",
  "https://cdn.example.com/*"
]
```

For the `hello-world` PoC that fetches from `https://dog.ceo/api/breeds/image/random`, the correct value is:

```json
"host_permissions": ["https://dog.ceo/*"]
```

---

### `web_accessible_resources`

```json
"web_accessible_resources": [
  {
    "resources": ["ui/*"],
    "matches": ["<all_urls>"]
  }
]
```

Declares which bundled extension files can be loaded from web pages. Required by `content-script/iframe-mount`, which loads `ui/index.html` in an `<iframe>` on the host page.

- `resources: ["ui/*"]`: Makes all files under `ui/` (including `ui/index.html` and all Vite-generated assets under `ui/assets/`) accessible from external origins. This is the output path convention used by `popup-ui/react`.
- `matches: ["<all_urls>"]`: Specifies which origins can access these resources. This should match your `content_scripts` `matches` — there is no benefit to making `ui/*` accessible from origins the content script does not run on.

**What to change:**
- If your UI build output goes somewhere other than `ui/`, update `resources` to match (e.g. `["popup/*"]`).
- If you restrict `content_scripts` matches to specific domains, restrict `matches` here to the same set.
- If you add other extension resources that need to be iframe-loadable (e.g. a second HTML page), add them to `resources`.

---

## Common Permission Patterns

Add these `permissions` entries as needed. Remove any that your extension does not use — Chrome Web Store reviewers scrutinise unnecessary permissions.

### `"storage"`

```json
"permissions": ["storage"]
```

Enables `chrome.storage.local` (device-local, not synced) and `chrome.storage.sync` (synced across the user's Chrome profile). Already included in the base template. Remove if not used.

### `"identity"`

```json
"permissions": ["identity"]
```

Enables `chrome.identity.getAuthToken` for OAuth 2.0 flows and `chrome.identity.launchWebAuthFlow` for other OAuth providers. Required if your extension authenticates users via Google or a third-party OAuth service.

### `"tabs"` vs `"activeTab"`

`"tabs"` grants broad access to tab metadata (URL, title, etc.) across all tabs at all times. The `service-worker/basic` block uses `chrome.tabs.sendMessage`, which works with either `"tabs"` or `"activeTab"` (when the call follows an action click). Prefer `"activeTab"` if the only tab access is in response to a user-initiated action click; it requires less justification in Web Store review.

### `"scripting"`

```json
"permissions": ["scripting"]
```

Enables `chrome.scripting.executeScript` and `chrome.scripting.insertCSS` for dynamically injecting scripts or styles into tabs. Not used by any Athanor block currently, but required if you add dynamic injection beyond the declared `content_scripts`.

### `"notifications"`

```json
"permissions": ["notifications"]
```

Enables `chrome.notifications.create` for system-level desktop notifications. Add if your extension needs to surface alerts outside the iframe UI.

### `"contextMenus"`

```json
"permissions": ["contextMenus"]
```

Enables `chrome.contextMenus.create` for adding items to the browser right-click menu. Add if your extension needs right-click functionality.

### `"alarms"`

```json
"permissions": ["alarms"]
```

Enables `chrome.alarms.create` for scheduling periodic background work. Required for any polling or scheduled tasks in the service worker.

---

## Notes on `host_permissions`

`host_permissions` is separate from `permissions` in MV3. It controls which URLs the service worker (and content scripts, for cross-origin XHR) can access. The template uses `<all_urls>` as a starting point — this **must** be restricted before publishing:

1. Identify every origin your service worker's `fetch()` calls might reach.
2. Replace `<all_urls>` with the minimal set of URL patterns covering those origins.
3. Use path specificity where possible: `https://api.example.com/v2/*` instead of `https://api.example.com/*`.

Chrome Web Store reviewers flag broad `host_permissions` as a significant risk signal. Extensions with `<all_urls>` require manual review and a detailed justification.

---

## Notes on `web_accessible_resources`

`web_accessible_resources` in MV3 controls which extension-bundled files can be embedded by external pages (e.g. via `<img>`, `<script>`, or `<iframe>` on a host page). Each entry requires a `matches` list alongside the `resources` list.

The `ui/*` pattern covers the compiled React bundle output from `popup-ui/react`. It is scoped here to `<all_urls>` to match the content script injection scope.

**Security implication:** Resources listed here can be fingerprinted by any page matching `matches` — the page can detect whether the extension is installed by attempting to load a resource and checking whether it succeeds. Keep `matches` as narrow as your `content_scripts` `matches` to minimise fingerprinting exposure.

To add more resources (e.g. a secondary HTML page, a shared CSS file, or a wasm binary):

```json
"web_accessible_resources": [
  {
    "resources": ["ui/*", "shared/icons/*"],
    "matches": ["<all_urls>"]
  }
]
```

Or use separate entries to apply different `matches` rules to different resources:

```json
"web_accessible_resources": [
  {
    "resources": ["ui/*"],
    "matches": ["https://*.example.com/*"]
  },
  {
    "resources": ["shared/vendor.js"],
    "matches": ["https://trusted.example.com/*"]
  }
]
```
