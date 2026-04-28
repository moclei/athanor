import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useCrannReady, useCrannState, useCrannActions } from './hooks';
import { ShadowContainerContext } from './ShadowContainerContext';
import { ProjectSelector } from './components/ProjectSelector';
import { CaptureView } from './components/CaptureView';
import { TaxonomyView } from './components/TaxonomyView';
import { RegionSelectionOverlay } from './components/RegionSelectionOverlay';
import type { SelectionRect } from '../types';

// Clamp values keep the panel reachable even after a window resize.
const CLAMP_HORIZONTAL = 80;
const CLAMP_VERTICAL = 40;
const DEFAULT_PANEL_WIDTH = 380;

type Tab = 'capture' | 'taxonomy';

interface AppProps {
  shadowContainer: HTMLDivElement;
}

export function App({ shadowContainer }: AppProps) {
  const isReady = useCrannReady();
  const [active] = useCrannState('active');
  const [, setInitialized] = useCrannState('initialized');
  const [activeProjectId] = useCrannState('activeProjectId');
  const projects = useCrannState((s) => s.projects);
  const { createProject } = useCrannActions();
  const [, setActive] = useCrannState('active');

  const [panelPosition, setPanelPosition] = useCrannState('panelPosition');

  const [activeTab, setActiveTab] = useState<Tab>('capture');
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);

  // Local position state for the in-flight drag — avoids RPC round-trips
  // per pointermove. Committed to Crann on pointerup.
  const [dragPos, setDragPos] = useState<{ top: number; left: number } | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const dragOffset = useRef<{ dx: number; dy: number } | null>(null);

  const clampPosition = useCallback(
    (top: number, left: number) => {
      const panelWidth = panelRef.current?.offsetWidth ?? DEFAULT_PANEL_WIDTH;
      const minLeft = -(panelWidth - CLAMP_HORIZONTAL);
      const maxLeft = window.innerWidth - CLAMP_HORIZONTAL;
      const minTop = 0;
      const maxTop = Math.max(window.innerHeight - CLAMP_VERTICAL, 0);
      return {
        left: Math.min(Math.max(left, minLeft), maxLeft),
        top: Math.min(Math.max(top, minTop), maxTop),
      };
    },
    [],
  );

  const handleHeaderPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest('button, select, input')) return;
    const panel = panelRef.current;
    if (!panel) return;
    const rect = panel.getBoundingClientRect();
    dragOffset.current = { dx: e.clientX - rect.left, dy: e.clientY - rect.top };
    setDragPos({ top: rect.top, left: rect.left });
    e.currentTarget.setPointerCapture(e.pointerId);
  }, []);

  const handleHeaderPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragOffset.current) return;
      const top = e.clientY - dragOffset.current.dy;
      const left = e.clientX - dragOffset.current.dx;
      setDragPos(clampPosition(top, left));
    },
    [clampPosition],
  );

  const handleHeaderPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (!dragOffset.current) return;
      const top = e.clientY - dragOffset.current.dy;
      const left = e.clientX - dragOffset.current.dx;
      const final = clampPosition(top, left);
      dragOffset.current = null;
      setDragPos(null);
      setPanelPosition(final);
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    },
    [clampPosition, setPanelPosition],
  );

  const displayPos = dragPos ?? panelPosition;
  const panelStyle: React.CSSProperties | undefined = displayPos
    ? { top: displayPos.top, left: displayPos.left, right: 'auto' }
    : undefined;

  // Latches to true on first Crann ready — never resets.
  // Prevents the UI from unmounting during brief reconnections.
  const [uiActivated, setUiActivated] = useState(false);

  useEffect(() => {
    if (isReady && !uiActivated) {
      setUiActivated(true);
      setInitialized(true);
    }
  }, [isReady]);

  // Drive shadow container visibility from Crann `active` state
  useEffect(() => {
    if (!shadowContainer) return;
    shadowContainer.style.visibility = active ? 'visible' : 'hidden';
  }, [active, shadowContainer]);

  const { captureRegion, openGallery } = useCrannActions();

  const startSelection = useCallback(() => setIsSelecting(true), []);

  const handleSelectionComplete = useCallback(async (rect: SelectionRect) => {
    setIsSelecting(false);
    await captureRegion(rect);
  }, [captureRegion]);

  const handleSelectionCancel = useCallback(() => {
    setIsSelecting(false);
  }, []);

  if (!uiActivated) return null;

  const projectList = Object.values(projects);
  const hasProjects = projectList.length > 0;

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    const domain = newDomain.trim();
    if (!name) return;
    await createProject({ name, domain });
    setNewName('');
    setNewDomain('');
  }

  if (!hasProjects) {
    return (
      <ShadowContainerContext.Provider value={shadowContainer}>
        <div className="fh-panel" ref={panelRef} style={panelStyle}>
          <div
            className="fh-header"
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={handleHeaderPointerUp}
            onPointerCancel={handleHeaderPointerUp}
          >
            <div className="fh-header-left">
              <span className="fh-title">Freehold</span>
            </div>
            <button className="fh-close-btn" onClick={() => setActive(false)}>✕</button>
          </div>
          <div className="fh-first-run">
            <h2>Create your first project</h2>
            <p>A project groups captures and taxonomy for one competitor audit.</p>
            <form className="fh-form" onSubmit={handleCreateProject}>
              <input
                className="fh-input"
                type="text"
                placeholder="Project name"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                autoFocus
              />
              <input
                className="fh-input"
                type="text"
                placeholder="Domain (e.g. competitor.com)"
                value={newDomain}
                onChange={(e) => setNewDomain(e.target.value)}
              />
              <button className="fh-btn fh-btn--primary fh-btn--full" type="submit">
                Create Project
              </button>
            </form>
          </div>
        </div>
      </ShadowContainerContext.Provider>
    );
  }

  return (
    <ShadowContainerContext.Provider value={shadowContainer}>
      {isSelecting && (
        <RegionSelectionOverlay
          onComplete={handleSelectionComplete}
          onCancel={handleSelectionCancel}
        />
      )}

      {!isSelecting && (
        <div className="fh-panel" ref={panelRef} style={panelStyle}>
          <div
            className="fh-header"
            onPointerDown={handleHeaderPointerDown}
            onPointerMove={handleHeaderPointerMove}
            onPointerUp={handleHeaderPointerUp}
            onPointerCancel={handleHeaderPointerUp}
          >
            <div className="fh-header-left">
              <span className="fh-title">Freehold</span>
              <ProjectSelector />
            </div>
            <button className="fh-close-btn" onClick={() => setActive(false)}>✕</button>
          </div>

          <div className="fh-tabs">
            <button
              className={`fh-tab${activeTab === 'capture' ? ' fh-tab--active' : ''}`}
              onClick={() => setActiveTab('capture')}
            >
              Capture
            </button>
            <button
              className={`fh-tab${activeTab === 'taxonomy' ? ' fh-tab--active' : ''}`}
              onClick={() => setActiveTab('taxonomy')}
            >
              Taxonomy
            </button>
          </div>

          {activeTab === 'capture' && activeProjectId && (
            <div className="fh-capture-toolbar">
              <button
                className="fh-btn fh-btn--primary fh-toolbar-primary"
                onClick={startSelection}
              >
                Take Screenshot
              </button>
              <button
                className="fh-btn fh-btn--secondary"
                onClick={() => openGallery()}
                title="Open gallery in a new tab"
              >
                Gallery
              </button>
            </div>
          )}

          <div className="fh-content">
            {activeTab === 'capture' && activeProjectId && <CaptureView />}
            {activeTab === 'taxonomy' && activeProjectId && <TaxonomyView />}
          </div>
        </div>
      )}
    </ShadowContainerContext.Provider>
  );
}
