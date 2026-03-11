# Foundation — Tasks

## Phase 1: Repo Scaffolding
- [x] Initialise git repo; create top-level directories if they don't exist (`blocks/`, `docs/`, `workspace/`, `.context/`, `recipes/`, `initiatives/`)
- [x] Write `.gitignore` — include `workspace/`, `node_modules/`, `dist/`, `.DS_Store`
- [x] Write root `package.json` — name, version, private; placeholder scripts; no dependencies yet
- [x] Write root `tsconfig.json` — strict mode, ES2022 target, bundler module resolution
- [x] Write `README.md` — one paragraph on what Athanor is, pointer to `docs/AI.md`, note that `workspace/` is gitignored

# --- handoff point ---

## Phase 2: AI.md Review Pass
- [ ] Read `docs/AI.md` with fresh eyes; verify every block referenced in the catalog actually maps to a block that will exist after Phase 3
- [ ] Verify the Assembly Process section is unambiguous — could a capable AI follow it without this codebase open?
- [ ] Add any clarifications surfaced during review; note anything deferred to later phases

## Phase 3: Messaging Block
- [ ] Create `blocks/messaging/typed-messages/` — `BLOCK.md`, `types.ts`, `index.ts`
- [ ] Implement discriminated union type for `ExtensionMessage` with `FETCH_DATA`, `DATA_RESPONSE`, `ERROR` variants
- [ ] Implement typed `sendMessage(msg: ExtensionMessage): Promise<void>` wrapper
- [ ] Implement typed `onMessage(handler: MessageHandler): void` wrapper (handles `return true` for async)
- [ ] Add `BLOCK.md` — exports, integration notes, manifest requirements (none for this block)

# --- handoff point ---

## Phase 4: Content Script Block
- [ ] Create `blocks/content-script/iframe-mount/` — `BLOCK.md`, `index.ts`
- [ ] Implement iframe creation, positioning (fixed, top-right, 300×600px, z-index 2147483647), and injection
- [ ] Implement toggle behaviour — clicking the extension icon opens/closes the iframe
- [ ] Add listener for `chrome.runtime.onMessage` to handle toggle command from background
- [ ] Add `BLOCK.md` — exports, integration notes, required manifest fields (`content_scripts`, `action` without `default_popup`)

## Phase 5: Service Worker Block
- [ ] Create `blocks/service-worker/basic/` — `BLOCK.md`, `index.ts`
- [ ] Implement `chrome.runtime.onMessage` listener routing on `ExtensionMessage.type`
- [ ] Implement `FETCH_DATA` handler — fetch URL from payload, return `DATA_RESPONSE` or `ERROR`
- [ ] Handle `return true` correctly for async `sendResponse`
- [ ] Add `BLOCK.md` — exports, integration notes, required manifest fields (`background.service_worker`)

# --- handoff point ---

## Phase 6: React UI Block
- [ ] Create `blocks/popup-ui/react/` — `BLOCK.md`, `App.tsx`, `index.tsx`, `vite.config.ts`
- [ ] Implement minimal `App.tsx` — button triggers `chrome.runtime.sendMessage({ type: 'FETCH_DATA', payload: { url: '' } })`, displays response
- [ ] Implement `index.tsx` — mounts `<App />` to `#root`
- [ ] Configure Vite build to output a single `index.html` + bundled JS suitable for loading inside an iframe
- [ ] Add `BLOCK.md` — exports, integration notes, build instructions, required manifest fields (`web_accessible_resources`)

## Phase 7: Manifest Template
- [ ] Create `blocks/manifest/templates/base/` — `BLOCK.md`, `manifest.json`
- [ ] `manifest.json` includes all required MV3 fields with placeholder values and inline comments marking what to fill in
- [ ] `BLOCK.md` documents every field, why it's there, and what to add for common permission patterns

# --- handoff point ---

## Phase 8: Recipe and BLOCKS.md
- [ ] Write `recipes/minimal-react/README.md` — step-by-step wiring guide for iframe-mount + basic SW + typed-messages + react UI
- [ ] Write `docs/BLOCKS.md` — one entry per block: path, purpose, one-line description, link to BLOCK.md

## Phase 9: hello-world PoC
- [ ] Create `workspace/hello-world/` — copy in selected blocks
- [ ] Wire up: content script mounts iframe → UI button sends `FETCH_DATA` → SW fetches dog API → `DATA_RESPONSE` → UI displays image
- [ ] Fill in `manifest.json` from base template
- [ ] Load as unpacked extension in Chrome; verify no console errors
- [ ] Verify full round-trip: icon click → iframe opens → button click → image appears
- [ ] Commit all library work (not workspace — it's gitignored); tag `v0.1.0-foundation`

## Deferred
