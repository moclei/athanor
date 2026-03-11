# Foundation — Plan

## Approach

Stand up the repo structure first. Then review and refine `docs/AI.md` as the primary design artifact — it forces precision about each block's interface before any code is written. Implement blocks in dependency order: typed messaging types first (everything depends on them), then content script mount, then service worker, then React UI. Assemble into `workspace/hello-world/` and verify it loads.

The PoC extension makes one API call to a free public API (e.g. `https://dog.ceo/api/breeds/image/random`) when the user clicks a button in the UI. This is enough to exercise the full message round-trip without any auth complexity.

---

## Technical Notes

### Repo Layout
```
athanor/
├── blocks/
│   ├── content-script/
│   │   └── iframe-mount/
│   │       ├── BLOCK.md
│   │       └── index.ts
│   ├── service-worker/
│   │   └── basic/
│   │       ├── BLOCK.md
│   │       └── index.ts
│   ├── messaging/
│   │   └── typed-messages/
│   │       ├── BLOCK.md
│   │       ├── types.ts
│   │       └── index.ts
│   ├── popup-ui/
│   │   └── react/
│   │       ├── BLOCK.md
│   │       ├── App.tsx
│   │       └── index.tsx
│   └── manifest/
│       └── templates/
│           └── base/
│               ├── BLOCK.md
│               └── manifest.json
├── docs/
│   ├── AI.md
│   └── BLOCKS.md
├── recipes/
│   └── minimal-react/
│       └── README.md
├── workspace/          ← gitignored
│   └── hello-world/
├── .context/
│   ├── PROJECT.md
│   ├── WORKFLOW.md
│   └── AGENTS.md
├── initiatives/
│   └── foundation/
├── .gitignore
├── package.json        ← root, workspaces if needed
├── tsconfig.json       ← base config, extended by blocks
└── README.md
```

### Block Interface Contract
Each block directory is self-contained and contains:
- `BLOCK.md` — purpose, exports, expected inputs, integration notes, manifest requirements
- `index.ts` (or `types.ts`) — the entry point or type definitions
- No runtime dependencies on other blocks
- A `tsconfig.json` or reference to root tsconfig

### Typed Messaging Layer
All messages are a discriminated union. The `typed-messages` block defines the base types and wrappers. Extensions extend the union for their own message types.

```ts
// blocks/messaging/typed-messages/types.ts
export type ExtensionMessage =
  | { type: 'FETCH_DATA'; payload: { url: string } }
  | { type: 'DATA_RESPONSE'; payload: { data: unknown } }
  | { type: 'ERROR'; payload: { message: string } }

// Wrapper types for send/receive
export type MessageSender = (msg: ExtensionMessage) => void
export type MessageHandler = (msg: ExtensionMessage) => void | Promise<void>
```

The `index.ts` exports typed `sendMessage` and `onMessage` wrappers over the raw Chrome APIs.

### Iframe Mount Strategy
The content script:
1. Creates an `<iframe>` element on `DOMContentLoaded` (or on icon click via `chrome.runtime.onMessage`)
2. Sets `src` to `chrome-extension://__MSG_@@extension_id__/ui/index.html` or uses `srcdoc`
3. Positions it fixed, top-right, 300×600px, high z-index
4. The iframe document loads the React UI, which communicates back via `window.parent.postMessage` or directly via `chrome.runtime.sendMessage`

Decision: UI inside iframe uses `chrome.runtime.sendMessage` directly (extension context is available inside iframes served from the extension origin). This avoids postMessage complexity.

### Service Worker
The basic service worker:
1. Registers `chrome.runtime.onMessage` listener
2. Routes on `message.type` using the typed union
3. Performs `fetch()` for `FETCH_DATA` messages
4. Returns response via `sendResponse` callback or `chrome.tabs.sendMessage`

Note: `sendResponse` must be called synchronously or the message channel closes — use `return true` in the listener to keep it open for async responses.

### React UI Block
Minimal React app:
- `index.tsx` — mounts `<App />` to `#root`
- `App.tsx` — single component with a button; on click, calls `chrome.runtime.sendMessage`
- Built with Vite, output to `dist/`
- Styled inline or with CSS modules — no Tailwind in blocks (consumer adds their own)

### hello-world PoC
Assembles: `iframe-mount` + `basic` service worker + `typed-messages` + `react` UI.
API target: `https://dog.ceo/api/breeds/image/random` — no auth, returns `{ message: <image-url>, status: "success" }`.
Flow: button click → `FETCH_DATA` message → service worker fetches → `DATA_RESPONSE` → UI displays image.

---

## Rejected Approaches
<!-- append-only -->
- Default popup approach — rejected on principle; does not represent the full challenge of extension UI

## Open Questions
<!-- resolved -->

## Resolved Decisions
- **Build ownership:** Root handles builds. Blocks are primitives to be copied into workspace extensions — no per-block build infrastructure. Workspace extensions get their own `package.json` and build config.
- **Build tool:** Vite. Better DX, good MV3 extension plugin ecosystem (`@crxjs/vite-plugin`), aligns with existing familiarity.
- **Workspace structure:** Each extension fully standalone. Matches the "copy blocks in, self-contained" philosophy in AI.md. No shared workspace infrastructure.
