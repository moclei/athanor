# Foundation Initiative

## Intent
Establish Athanor's foundational structure: the repo layout, the first set of composable building blocks drawn from existing projects (Lensor, Crann), and a working first draft of `docs/AI.md`. Validate the model by assembling one real, loadable extension from the blocks.

## Goals
- Repo structure matches the agreed layout (`blocks/`, `docs/`, `workspace/`, `.context/`, `recipes/`, `initiatives/`)
- `docs/AI.md` exists and contains enough context for an AI to assemble a basic extension without additional guidance
- Core blocks implemented: iframe-mount content script, basic service worker, typed messaging layer, minimal React UI
- One recipe exists: `minimal-react`
- One working proof-of-concept extension assembled in `workspace/hello-world/` that loads in Chrome and completes a round-trip message cycle

## Scope

**In:**
- Repo scaffolding and configuration (tsconfig, gitignore, root package.json)
- `docs/AI.md` first draft (already written — review and refine during implementation)
- `docs/BLOCKS.md` stub — catalog with one entry per block as they're created
- Core blocks: `content-script/iframe-mount`, `service-worker/basic`, `messaging/typed-messages`, `popup-ui/react`
- `blocks/manifest/templates/base/` — base manifest.json template
- `recipes/minimal-react/` — assembled wiring notes for the most common pattern
- `workspace/hello-world/` — proof-of-concept extension assembled from the above

**Out:**
- Shadow DOM content script variant
- Crann state-sync blocks (`service-worker/with-crann`, `messaging/crann-sync`)
- `popup-ui/vanilla` block
- CLI or any programmatic tooling
- `docs/DECISIONS.md` (deferred — write after PoC reveals what needs defending)
- Public documentation, README polish
- Any extension other than `hello-world`

## Constraints
- No access to the Capital One Cauldron codebase — all blocks written fresh or adapted from Lensor and Crann source
- Every block must be self-contained — no cross-block imports within the library
- MV3 only, TypeScript only throughout
- The `hello-world` extension must load as an unpacked extension in Chrome without errors
