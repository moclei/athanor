/**
 * Panel stylesheet injected into the shadow root as a single <style> element.
 * Components use class names defined here. Inline styles only for dynamic values.
 */

export const panelStyles = /* css */ `
/* ------------------------------------------------------------------ Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* ----------------------------------------------------------- Panel shell */
.fh-panel {
  position: fixed;
  top: 16px;
  right: 16px;
  width: 380px;
  height: calc(100vh - 32px);
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.18), 0 2px 8px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  pointer-events: auto;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: #1a1a1a;
  line-height: 1.4;
}

/* ------------------------------------------------------------- Header */
.fh-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.fh-header-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.fh-title {
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: #111;
}

.fh-close-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  border-radius: 6px;
  cursor: pointer;
  color: #888;
  font-size: 16px;
  line-height: 1;
  transition: background 0.15s, color 0.15s;
}
.fh-close-btn:hover {
  background: #f0f0f0;
  color: #333;
}
.fh-close-btn:focus-visible {
  outline: 2px solid #666;
  outline-offset: 1px;
}

/* --------------------------------------------------------- Tab bar */
.fh-tabs {
  display: flex;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.fh-tab {
  flex: 1;
  padding: 9px 0;
  text-align: center;
  font-size: 12px;
  font-weight: 600;
  color: #888;
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  transition: color 0.15s, border-color 0.15s;
}
.fh-tab:hover {
  color: #555;
}
.fh-tab--active {
  color: #111;
  border-bottom-color: #111;
}
.fh-tab:focus-visible {
  outline: 2px solid #666;
  outline-offset: -2px;
}

/* -------------------------------------------- Fixed capture toolbar */
.fh-capture-toolbar {
  display: flex;
  gap: 8px;
  padding: 10px 14px;
  border-bottom: 1px solid #e5e5e5;
  flex-shrink: 0;
}

.fh-toolbar-primary {
  flex: 1;
}

/* --------------------------------------------------- Tab content area */
.fh-content {
  flex: 1;
  overflow-y: auto;
  padding: 14px;
}

/* ------------------------------------------------- Project selector */
.fh-project-select {
  appearance: none;
  -webkit-appearance: none;
  padding: 5px 24px 5px 8px;
  font-size: 12px;
  font-weight: 500;
  border: 1px solid #d4d4d4;
  border-radius: 6px;
  background: #fafafa url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%23888'/%3E%3C/svg%3E") no-repeat right 8px center;
  cursor: pointer;
  color: #333;
  max-width: 160px;
  text-overflow: ellipsis;
  transition: border-color 0.15s;
}
.fh-project-select:hover {
  border-color: #aaa;
}
.fh-project-select:focus {
  outline: none;
  border-color: #666;
}

/* ------------------------------------------------------ Buttons */
.fh-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 14px;
  font-size: 12px;
  font-weight: 600;
  border: none;
  border-radius: 7px;
  cursor: pointer;
  transition: background 0.15s, transform 0.1s;
}
.fh-btn:active {
  transform: scale(0.97);
}

.fh-btn--primary {
  background: #111;
  color: #fff;
}
.fh-btn--primary:hover {
  background: #333;
}

.fh-btn--secondary {
  background: #f0f0f0;
  color: #333;
}
.fh-btn--secondary:hover {
  background: #e2e2e2;
}

.fh-btn--full {
  width: 100%;
}

/* --------------------------------------------------- Drop zone */
.fh-dropzone {
  border: 2px dashed #d4d4d4;
  border-radius: 8px;
  padding: 20px;
  text-align: center;
  color: #999;
  font-size: 12px;
  cursor: default;
  transition: border-color 0.15s, background 0.15s, color 0.15s;
  margin-top: 10px;
}
.fh-dropzone--active {
  border-color: #666;
  background: #f8f8f8;
  color: #555;
}

/* --------------------------------------------------- Capture list */
.fh-capture-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-top: 12px;
}

/* --------------------------------------------------- Capture card */
.fh-capture-card {
  background: #fafafa;
  border: 1px solid #e8e8e8;
  border-radius: 8px;
  padding: 10px 12px;
  transition: border-color 0.15s, box-shadow 0.15s;
}
.fh-capture-card:hover {
  border-color: #d0d0d0;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.fh-capture-url {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fh-capture-category {
  font-size: 11px;
  color: #aaa;
  margin-top: 6px;
  font-style: italic;
}

.fh-capture-notes {
  width: 100%;
  margin-top: 8px;
  padding: 6px 8px;
  font-size: 12px;
  font-family: inherit;
  border: 1px solid #e0e0e0;
  border-radius: 6px;
  background: #fff;
  resize: vertical;
  min-height: 52px;
  color: #333;
  transition: border-color 0.15s;
}
.fh-capture-notes:focus {
  outline: none;
  border-color: #888;
}
.fh-capture-notes::placeholder {
  color: #bbb;
}

/* ----------------------------------------- First-run / create form */
.fh-first-run {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  padding: 32px 24px;
  text-align: center;
}

.fh-first-run h2 {
  font-size: 16px;
  font-weight: 700;
  margin-bottom: 6px;
  color: #111;
}

.fh-first-run p {
  font-size: 13px;
  color: #777;
  margin-bottom: 20px;
}

.fh-form {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.fh-input {
  width: 100%;
  padding: 8px 10px;
  font-size: 13px;
  font-family: inherit;
  border: 1px solid #d4d4d4;
  border-radius: 7px;
  background: #fafafa;
  color: #333;
  transition: border-color 0.15s;
}
.fh-input:focus {
  outline: none;
  border-color: #888;
  background: #fff;
}
.fh-input::placeholder {
  color: #bbb;
}

/* ---------------------------------------- Region selection overlay */
.fh-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  cursor: crosshair;
  pointer-events: auto;
  z-index: 1;
}

.fh-overlay-bg {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.3);
}

.fh-selection-rect {
  position: absolute;
  border: 2px solid #fff;
  background: transparent;
  box-shadow: 0 0 0 9999px rgba(0, 0, 0, 0.3);
}

/* ----------------------------------------------- Taxonomy view */
.fh-taxonomy-view {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.fh-taxonomy-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.fh-taxonomy-header-actions {
  display: flex;
  gap: 4px;
}

.fh-btn--small {
  padding: 4px 8px;
  font-size: 11px;
}

.fh-taxonomy-empty {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px 16px;
  color: #aaa;
  font-size: 13px;
  text-align: center;
}

/* ------------------------------------------------ Taxonomy tree */
.fh-tree-level {
  display: flex;
  flex-direction: column;
}

.fh-tree-node {
  display: flex;
  flex-direction: column;
}

.fh-tree-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 4px;
  border-radius: 5px;
  min-height: 30px;
  transition: background 0.1s;
}
.fh-tree-row:hover {
  background: #f5f5f5;
}

.fh-tree-toggle {
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 8px;
  color: #888;
  border-radius: 4px;
  padding: 0;
}
.fh-tree-toggle:hover {
  background: #e8e8e8;
  color: #444;
}

.fh-tree-drag-handle {
  width: 16px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  cursor: grab;
  color: #ccc;
  font-size: 10px;
  border-radius: 3px;
  user-select: none;
}
.fh-tree-drag-handle:hover {
  color: #888;
  background: #eee;
}

.fh-tree-label {
  flex: 1;
  font-size: 12px;
  color: #333;
  cursor: default;
  user-select: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 2px 4px;
  border-radius: 4px;
}
.fh-tree-label:hover {
  background: #ececec;
}

.fh-tree-rename-input {
  flex: 1;
  font-size: 12px;
  font-family: inherit;
  padding: 2px 6px;
  border: 1px solid #888;
  border-radius: 4px;
  outline: none;
  background: #fff;
  color: #333;
}

.fh-tree-actions {
  position: relative;
  flex-shrink: 0;
}

.fh-tree-menu-btn {
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: none;
  background: transparent;
  cursor: pointer;
  font-size: 14px;
  color: #aaa;
  border-radius: 4px;
  line-height: 1;
  padding: 0;
  opacity: 0;
  transition: opacity 0.1s, background 0.1s;
}
.fh-tree-row:hover .fh-tree-menu-btn {
  opacity: 1;
}
.fh-tree-menu-btn:hover {
  background: #e0e0e0;
  color: #444;
}

.fh-tree-menu {
  position: absolute;
  top: 100%;
  right: 0;
  z-index: 10;
  background: #fff;
  border: 1px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.12);
  padding: 4px 0;
  min-width: 130px;
}

.fh-tree-menu-item {
  display: block;
  width: 100%;
  padding: 6px 12px;
  font-size: 12px;
  font-family: inherit;
  text-align: left;
  border: none;
  background: none;
  color: #333;
  cursor: pointer;
  white-space: nowrap;
}
.fh-tree-menu-item:hover {
  background: #f0f0f0;
}
.fh-tree-menu-item--danger {
  color: #d44;
}
.fh-tree-menu-item--danger:hover {
  background: #fef0f0;
}

.fh-tree-submenu {
  border-top: 1px solid #eee;
  padding-top: 4px;
  margin-top: 4px;
  max-height: 200px;
  overflow-y: auto;
}
.fh-tree-submenu .fh-tree-menu-item {
  font-size: 11px;
  color: #555;
  padding: 5px 16px;
}

/* ---------------------------------------------- Category picker */
.fh-category-picker {
  width: 100%;
  margin-top: 6px;
  padding: 4px 6px;
  font-size: 11px;
  font-family: inherit;
  border: 1px solid #e0e0e0;
  border-radius: 5px;
  background: #fff;
  color: #555;
  cursor: pointer;
  appearance: auto;
}
.fh-category-picker:focus {
  outline: none;
  border-color: #888;
}

/* -------------------------------------------------- Scrollbar */
.fh-content::-webkit-scrollbar {
  width: 5px;
}
.fh-content::-webkit-scrollbar-track {
  background: transparent;
}
.fh-content::-webkit-scrollbar-thumb {
  background: #d4d4d4;
  border-radius: 3px;
}
.fh-content::-webkit-scrollbar-thumb:hover {
  background: #bbb;
}

/* -------------------------------------------------- Inline form */
.fh-inline-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 0;
}

.fh-inline-form .fh-input {
  font-size: 12px;
  padding: 6px 8px;
}

.fh-inline-form-actions {
  display: flex;
  gap: 6px;
}
`;
