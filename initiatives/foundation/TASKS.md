# Foundation — Tasks

## Phase 1: Repo Scaffolding
- [x] Initialise git repo; create top-level directories if they don't exist (`blocks/`, `docs/`, `workspace/`, `.context/`, `recipes/`, `initiatives/`)
- [x] Write `.gitignore` — include `workspace/`, `node_modules/`, `dist/`, `.DS_Store`
- [x] Write root `package.json` — name, version, private; placeholder scripts; no dependencies yet
- [x] Write root `tsconfig.json` — strict mode, ES2022 target, bundler module resolution
- [x] Write `README.md` — one paragraph on what Athanor is, pointer to `docs/AI.md`, note that `workspace/` is gitignored

# --- handoff point ---

## Phase 2: AI.md Review Pass
- [x] Read `docs/AI.md` with fresh eyes; verify every block referenced in the catalog actually maps to a block that will exist after Phase 3
- [x] Verify the Assembly Process section is unambiguous — could a capable AI follow it without this codebase open?
- [x] Add any clarifications surfaced during review; note anything deferred to later phases

## Phase 3: Messaging Block
- [x] Create `blocks/messaging/typed-messages/` — `BLOCK.md`, `types.ts`, `index.ts`
- [x] Implement discriminated union type for `ExtensionMessage` with `FETCH_DATA`, `DATA_RESPONSE`, `ERROR` variants
- [x] Implement typed `sendMessage(msg: ExtensionMessage): Promise<void>` wrapper
- [x] Implement typed `onMessage(handler: MessageHandler): void` wrapper (handles `return true` for async)
- [x] Add `BLOCK.md` — exports, integration notes, manifest requirements (none for this block)

# --- handoff point ---

## Phase 4: Content Script Block
- [x] Create `blocks/content-script/iframe-mount/` — `BLOCK.md`, `index.ts`
- [x] Implement iframe creation, positioning (fixed, top-right, 300×600px, z-index 2147483647), and injection
- [x] Implement toggle behaviour — clicking the extension icon opens/closes the iframe
- [x] Add listener for `chrome.runtime.onMessage` to handle toggle command from background
- [x] Add `BLOCK.md` — exports, integration notes, required manifest fields (`content_scripts`, `action` without `default_popup`)

## Phase 5: Service Worker Block
- [x] Create `blocks/service-worker/basic/` — `BLOCK.md`, `index.ts`
- [x] Implement `chrome.runtime.onMessage` listener routing on `ExtensionMessage.type`
- [x] Implement `FETCH_DATA` handler — fetch URL from payload, return `DATA_RESPONSE` or `ERROR`
- [x] Handle `return true` correctly for async `sendResponse`
- [x] Add `BLOCK.md` — exports, integration notes, required manifest fields (`background.service_worker`)

# --- handoff point ---

## Phase 6: React UI Block
- [x] Create `blocks/popup-ui/react/` — `BLOCK.md`, `App.tsx`, `index.tsx`, `vite.config.ts`
- [x] Implement minimal `App.tsx` — button triggers `chrome.runtime.sendMessage({ type: 'FETCH_DATA', payload: { url: '' } })`, displays response
- [x] Implement `index.tsx` — mounts `<App />` to `#root`
- [x] Configure Vite build to output a single `index.html` + bundled JS suitable for loading inside an iframe
- [x] Add `BLOCK.md` — exports, integration notes, build instructions, required manifest fields (`web_accessible_resources`)

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
- `blocks/content-script/shadow-dom-mount/` — listed in AI.md catalog but not in scope for foundation; marked in catalog as "not yet implemented; deferred"
- `blocks/service-worker/with-crann/` — Crann state-sync variant; same status
- `blocks/messaging/crann-sync/` — Crann messaging layer; same status
- `blocks/popup-ui/vanilla/` — vanilla TS UI variant; same status
- Message Flow diagram for shadow-dom relay pattern — needs a real implementation before it can be written precisely; placeholder note added to AI.md
