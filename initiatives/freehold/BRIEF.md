# Freehold

## Intent

Build a Chrome MV3 extension for conducting structured competitive audits of web-based SaaS products. The user manually walks through competitor sites, captures annotated screenshots with region selection, and organizes them into a hierarchical taxonomy. The output is a folder on disk (`~/Downloads/freehold/{project}/`) containing organized screenshots and a JSON manifest — a portable dataset for feature parity analysis.

Solo-use tool. Fully local. No backend. Built using Athanor's `shadow-crann` recipe.

## Goals

- Minimal-friction capture: screenshot a region, auto-save immediately, categorize and annotate inline
- Taxonomy-driven organization: hierarchical feature tree that the user builds incrementally as the audit progresses
- Portable output: `project.json` + organized screenshots in the Downloads folder, usable without the extension
- Zero explicit save actions: every mutation persists immediately via Crann + Downloads write-through

## Scope

**In:**
- `workspace/freehold/` — a complete, buildable extension assembled from Athanor blocks
- Shadow DOM panel UI (React) with capture and taxonomy tabs
- Region selection overlay for screenshot capture
- File drop fallback for external screenshots
- `captureVisibleTab` + `OffscreenCanvas` cropping in the service worker
- `chrome.downloads.download()` write-through for screenshots and `project.json`
- Project CRUD (create, select, delete)
- Taxonomy tree editor with drag-and-drop (`@dnd-kit`)
- Inline capture editing (category picker, notes) with auto-save

**Out:**
- ZIP export (the Downloads folder IS the output)
- Screenshot previews in the UI (screenshots are referenced by filename only)
- Resizable/draggable panel (fixed position for v1)
- Multi-user or cloud sync
- Publishing to Chrome Web Store
- Settings page (all configuration is inline)

## Constraints

- Start from the `shadow-crann` recipe — do not assemble from scratch
- Crann-only communication — no `messaging/typed-messages`, no `chrome.runtime.sendMessage`
- On-demand content script injection via `chrome.scripting.executeScript` — no declarative `content_scripts`
- `<all_urls>` host permission required for `captureVisibleTab` from UI button context
- Research document (`docs/freehold/freehold-research.md`) takes precedence over the original spec where they differ
