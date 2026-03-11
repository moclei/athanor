# Athanor

Athanor is a library of composable building blocks for Chrome MV3 extensions. Each block is a self-contained TypeScript module — a content script, service worker, messaging layer, or UI component — designed to be copied into a workspace extension and wired together using a recipe. There are no cross-block runtime dependencies; blocks are primitives, not a framework. The goal is to make assembling a working, production-quality Chrome extension from scratch a fast and well-understood process, whether you are a human developer or an AI agent following assembly instructions.

For AI agents: see `docs/AI.md` for the full assembly guide, block catalog, and integration notes.

> **Note:** The `workspace/` directory is gitignored. Extensions assembled and developed locally live there and are never committed to this repository.
