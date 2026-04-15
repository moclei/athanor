# Audit Capture Extension — SPEC

## Overview

A Manifest V3 Chrome extension for conducting structured competitive audits of web-based SaaS products. Built for solo use during manual walkthroughs. Produces an organized, tagged library of screenshots alongside a machine-readable manifest and an editable feature taxonomy — together forming a structured dataset for feature parity analysis.

---

## Goals

- Minimize friction during capture so attention stays on the product being audited
- Capture metadata (category, notes) at the moment of observation, not reconstructed later
- Build the feature taxonomy incrementally as the audit progresses
- Produce a portable, structured output (JSON manifest + organized screenshots) that can feed a comparison spreadsheet or AI-assisted analysis
- No backend, no cloud sync — fully local

---

## Non-Goals

- Full DOM/HTML capture (SingleFile-style) — not needed; screenshot + metadata is sufficient
- Automated navigation or scraping
- Multi-user collaboration
- Any integration with iLandlord itself (this is a standalone research tool)

---

## Extension Structure

```
audit-extension/
  manifest.json
  background/
    service-worker.ts        # Coordinates capture, manages session state
  popup/
    popup.html               # Primary capture UI
    popup.ts
  region-select/
    region-select.ts         # Injected content script for area selection
  taxonomy/
    taxonomy.html            # Dedicated taxonomy management view
    taxonomy.ts
  lib/
    storage.ts               # chrome.storage wrapper (manifest + taxonomy)
    capture.ts               # Screenshot + crop + metadata assembly
    export.ts                # Zip export via JSZip
  styles/
    shared.css
```

Build tool: **Vite** with the `vite-plugin-web-extension` plugin. Language: **TypeScript**. No framework — vanilla DOM for the popup and taxonomy views (keeps the extension lightweight and avoids bundling React for a tool this small).

---

## Core Data Models

### Capture

```ts
interface Capture {
  id: string;                  // nanoid()
  timestamp: string;           // ISO 8601
  url: string;
  pageTitle: string;
  categoryId: string | null;   // References TaxonomyNode.id
  notes: string;
  screenshotFilename: string;  // e.g. "023-lease-form-modal.png"
}
```

### Session

```ts
interface AuditSession {
  id: string;
  label: string;               // e.g. "Buildium Audit — April 2025"
  startedAt: string;
  captures: Capture[];
}
```

### Taxonomy

```ts
interface TaxonomyNode {
  id: string;                  // nanoid(), stable across renames
  label: string;
  children: TaxonomyNode[];
}

type Taxonomy = TaxonomyNode[]; // Top-level array of groups
```

Captures reference taxonomy nodes by `id`. Renaming or reorganizing the taxonomy does not orphan captures — they resolve the current label at render time by looking up by id.

---

## Storage Layout

All state lives in `chrome.storage.local`.

| Key | Value |
|---|---|
| `session:current` | `AuditSession` (active session) |
| `session:archive` | `AuditSession[]` (completed sessions) |
| `taxonomy` | `TaxonomyNode[]` |
| `settings` | `{ outputPrefix: string }` |

Screenshots are **not** stored in `chrome.storage` — they are written to disk at capture time (see Export). The `screenshotFilename` field in each Capture is the reference.

---

## Capture Flow

### Primary: In-extension Region Selection

1. User clicks the extension icon
2. Popup opens — shows current page title, URL, and category picker
3. User hits **"Select Region"**
4. Popup closes; content script (`region-select.ts`) injects a full-viewport dimmed overlay with crosshair cursor
5. User clicks and drags to define a rectangle — selection box renders in real time
6. On mouseup, the selection rect is recorded and the overlay dismisses
7. Service worker calls `chrome.tabs.captureVisibleTab()` for the full tab screenshot
8. The screenshot is cropped to the selection rect using an offscreen `<canvas>`
9. Popup reopens, showing:
   - Cropped screenshot preview
   - Category picker (hierarchical, from live taxonomy)
   - Notes text field
   - Filename (auto-generated, editable)
10. User confirms → capture object is appended to session manifest → screenshot saved via `chrome.downloads.download()`

### Fallback: File Drop

For cases where region selection can't be used (browser dialogs, native UI elements, anything outside the page):

1. User takes screenshot with Mac's `⌘⇧4` (lands on Desktop)
2. Opens extension popup
3. Drags file from Desktop (or Finder) into the **drop zone** in the popup
4. Extension reads the file as a dataURL
5. Same tagging UI as primary flow (preview, category, notes, filename)
6. Confirm → same capture object + organized copy saved to Downloads

Both paths produce identical `Capture` objects and are indistinguishable in the output manifest.

---

## Taxonomy Manager

A dedicated page (`taxonomy.html`) opened from a link in the popup footer. Supports:

- **Add group** (top-level node)
- **Add child node** under any group or node
- **Rename** any node (inline edit)
- **Delete** any node (with confirmation if captures reference it — those captures become uncategorized, not deleted)
- **Drag-and-drop reorder** within a level
- **Drag-and-drop reparent** — move a node under a different parent

The taxonomy ships with a default starter set (see Appendix) that can be freely edited or wholesale deleted. The taxonomy is always the ground truth for the category picker in the capture popup.

---

## Export

A **"Export Session"** button in the popup produces a `.zip` download (via JSZip) containing:

```
audit-{session-label}-{date}/
  manifest.json              # Full AuditSession object
  taxonomy.json              # Snapshot of taxonomy at export time
  screenshots/
    001-{slug}.png
    002-{slug}.png
    ...
```

Filenames are zero-padded sequential integers prefixed to a kebab-case slug derived from the category + custom name. Example: `042-leasing-lease-templates-renewal-flow.png`.

The `manifest.json` is the primary artifact for downstream analysis — it can be loaded into a spreadsheet, fed to an LLM for feature summarization, or diffed against a second competitor's manifest.

---

## Output Folder Structure

All screenshots are written via `chrome.downloads.download()` to:

```
~/Downloads/
  audit-sessions/
    {session-label}/
      screenshots/
        001-{slug}.png
        ...
```

Raw Mac screenshots (on Desktop) are separate from the organized output. The drop-zone fallback copies the file into this structure — the original on Desktop is left untouched.

---

## UI Sketch — Popup

```
┌─────────────────────────────────────────┐
│  🔲 Audit Capture             [≡ Menu]  │
├─────────────────────────────────────────┤
│  Session: Buildium Audit — Apr 2025     │
│  42 captures                            │
├─────────────────────────────────────────┤
│                                         │
│  [ Screenshot preview / drop zone ]     │
│                                         │
├─────────────────────────────────────────┤
│  Category                               │
│  [Leasing          ▾] [Lease Templates] │
│                                         │
│  Notes                                  │
│  [                                    ] │
│                                         │
│  Filename                               │
│  [ 043-leasing-lease-templates        ] │
│                                         │
│  [  Select Region  ]  [  ✓ Capture  ]  │
│                                         │
├─────────────────────────────────────────┤
│  [Export Session]    [Manage Taxonomy]  │
└─────────────────────────────────────────┘
```

---

## Appendix: Default Starter Taxonomy

Starting taxonomy — treat as a scaffold to be edited, not a fixed spec:

```
Property & Unit Management
  Property Setup
  Unit Configuration
  Unit Groups / Building Hierarchy
  Photos & Media
  Utility / Meter Tracking

Leasing
  Listings & Vacancy
  Leads & Prospects
  Online Applications
  Tenant Screening
  Lease Creation & Templates
  E-Signature
  Lease Renewals
  Move-In / Move-Out
  Lease Document Storage

Tenant Management
  Tenant Profiles
  Tenant Portal
  Communications
  Notices

Rent & Payments
  Rent Roll
  Online Collection
  Late Fees
  Security Deposits
  Owner Disbursements

Accounting
  Chart of Accounts
  General Ledger
  Bank Reconciliation
  Accounts Payable
  Owner Statements
  Tax Forms
  Accounting Export

Maintenance
  Work Orders
  Tenant Requests
  Vendor Management
  Preventive Maintenance
  Inspections

Reporting & Analytics
  Occupancy / Vacancy
  Income & Expense
  Delinquency
  Custom Reports
  Dashboard / KPIs

Owner Portal
  Owner Profiles
  Owner Portal Access
  Statements Delivery

Settings & Administration
  User Roles & Permissions
  Integrations
  Audit Log

Platform & UX
  Onboarding
  Mobile Experience
  Bulk Actions
  Import Tools
  API Access
```
