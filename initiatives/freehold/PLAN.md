# Freehold — Plan

## Approach

Assemble from the `shadow-crann` recipe. Copy the three block templates (config, service-worker, hooks) plus the shadow-dom-mount block, then build the custom layer on top: capture pipeline, downloads writer, and the React UI.

Phase 1 spikes the two highest-risk items (OffscreenCanvas cropping path, file drop in shadow DOM) before any production code depends on them. Remaining phases follow dependency order: types and Crann config → service worker logic → UI shell and capture flow → taxonomy editor → integration polish.

The research document (`docs/freehold/freehold-research.md`) is the authoritative architecture reference. The original spec (`docs/freehold/SPEC.md`) is context only — the "Decisions Made" table in the research doc lists all deviations.

## Resolved Open Issues

**1. Filename generation** — `{NNN}-{slug}.png`. Counter: `String(captures.length + 1).padStart(3, '0')`. Slug: walk the taxonomy tree from root to the assigned node, kebab-case each label, join with `-`. Uncategorized captures use `uncategorized`. Example: capture #3 assigned to "Leasing > Lease Templates" → `003-leasing-lease-templates.png`. When a capture is recategorized, the filename does NOT change — the original filename is permanent. The category is metadata in `project.json`, not encoded in the filename after initial creation.

**2. Blob URL lifecycle** — `URL.createObjectURL()` is NOT available in service workers. Use data URLs instead. Path: `OffscreenCanvas.convertToBlob()` → `blob.arrayBuffer()` → base64 encode → `data:image/png;base64,...` → pass to `chrome.downloads.download({ url: dataUrl })`. This avoids any Blob URL lifecycle issues entirely.

**3. CSS strategy** — Single `<style>` element injected into the shadow root at mount time. Components use class names defined in this stylesheet. Inline styles only for truly dynamic values (overlay position, selection rect). No CSS-in-JS library — keeps the bundle small and avoids a dependency.

**4. Panel dimensions** — Fixed position, top-right corner. Default 380px wide, `calc(100vh - 32px)` tall with 16px margin. Not resizable or draggable in v1. The shadow-dom-mount host element is full-viewport; the panel is a positioned child within it. During region selection, the panel hides and the overlay takes over the full viewport.

**5. Category picker** — Flat `<select>` dropdown with entries formatted as "Group > Node" (e.g., "Leasing > Lease Templates"). `<optgroup>` elements separate the top-level groups. One click to categorize. Tree-select is overkill for taxonomy depths of 2 levels.

**6. Content script injection** — Confirmed: on-demand via `chrome.scripting.executeScript` in the `chrome.action.onClicked` handler. No declarative `content_scripts` array in the manifest. This avoids loading React + Crann on pages where the extension isn't active.

## Technical Notes

### Data URL conversion in service worker

```ts
async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return `data:${blob.type};base64,${btoa(binary)}`;
}
```

### Downloads write-through

Every Crann state mutation that changes `projects[activeProjectId]` triggers a subscription in the service worker that serializes the active project's data and writes it to `~/Downloads/freehold/{project-slug}/project.json` via `chrome.downloads.download()` with `conflictAction: 'overwrite'`. This is a convenience copy — the authoritative state is in Crann's `Persist.Local`.

### Region selection ↔ panel coordination

The `RegionSelectionOverlay` is conditionally rendered when `isSelecting` is true (local React state in `CaptureView`). When it renders, the panel hides. When the user completes the selection, the overlay fires `captureRegion(rect)` and dismisses. The panel reappears and the new capture appears in the list via Crann state update. `devicePixelRatio` is captured from the content script context and sent with the rect to ensure correct cropping on Retina displays.

### Taxonomy node ID stability

Captures reference taxonomy nodes by `id` (nanoid). Renaming, moving, or reordering nodes does not orphan captures. Deleting a node sets `taxonomyNodeId: null` on any captures referencing it — they become "uncategorized".

## Rejected Approaches

- Blob URLs for downloads — `URL.createObjectURL()` unavailable in service workers
- CSS-in-JS (styled-components) — adds a dependency and bundle size for a personal tool; shadow DOM already provides isolation
- Resizable/draggable panel — complexity not justified for v1 of a personal tool
- Tree-select category picker — over-engineered for 2-level taxonomy depth
- Separate taxonomy page — inline tab is simpler and keeps context; no `chrome.tabs.create` needed

## Open Questions

_None at initiative start._
