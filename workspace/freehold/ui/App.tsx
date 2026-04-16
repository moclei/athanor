import React, { useState, useEffect, useCallback } from 'react';
import { useCrannReady, useCrannState, useCrannActions } from './hooks';
import { ShadowContainerContext } from './ShadowContainerContext';
import { ProjectSelector } from './components/ProjectSelector';
import { CaptureView } from './components/CaptureView';
import { TaxonomyView } from './components/TaxonomyView';
import { RegionSelectionOverlay } from './components/RegionSelectionOverlay';
import type { SelectionRect } from '../types';

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

  const [activeTab, setActiveTab] = useState<Tab>('capture');
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');
  const [isSelecting, setIsSelecting] = useState(false);

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

  const { captureRegion } = useCrannActions();

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
        <div className="fh-panel">
          <div className="fh-header">
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
        <div className="fh-panel">
          <div className="fh-header">
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
                className="fh-btn fh-btn--primary fh-btn--full"
                onClick={startSelection}
              >
                Take Screenshot
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
