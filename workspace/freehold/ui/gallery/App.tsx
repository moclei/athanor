import React, { useState } from 'react';
import { useCrannReady, useCrannState, useCrannActions } from '../hooks';
import { CaptureGrid } from './components/CaptureGrid';
import { CaptureModal } from './components/CaptureModal';
import type { Capture } from '../../types';

export function GalleryApp() {
  const isReady = useCrannReady();
  const [activeProjectId] = useCrannState('activeProjectId');
  const projects = useCrannState((s) => s.projects);
  const { selectProject } = useCrannActions();
  const [openCaptureId, setOpenCaptureId] = useState<string | null>(null);

  if (!isReady) {
    return <div className="fhg-loading">Connecting…</div>;
  }

  const projectList = Object.values(projects);
  const activeProject = activeProjectId ? projects[activeProjectId] : undefined;

  // Resolve open capture from latest project state so edits propagate into the modal.
  const openCapture: Capture | undefined = activeProject && openCaptureId
    ? activeProject.captures.find((c) => c.id === openCaptureId)
    : undefined;

  // If the open capture was deleted from underneath us, close the modal.
  if (openCaptureId && !openCapture) {
    queueMicrotask(() => setOpenCaptureId(null));
  }

  return (
    <>
      <header className="fhg-header">
        <div className="fhg-header-left">
          <span className="fhg-title">Freehold Gallery</span>
          {projectList.length > 0 && (
            <select
              className="fhg-project-select"
              value={activeProjectId ?? ''}
              onChange={(e) => selectProject(e.target.value)}
            >
              {projectList.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          )}
          {activeProject && (
            <span className="fhg-count">
              {activeProject.captures.length}{' '}
              {activeProject.captures.length === 1 ? 'capture' : 'captures'}
            </span>
          )}
        </div>
        <div className="fhg-header-actions">
          <button
            type="button"
            className="fhg-btn fhg-btn--secondary"
            onClick={() => window.location.reload()}
            title="Refresh to pick up new captures from the sidebar"
          >
            Refresh
          </button>
          {/* Export / Import land in the next chunks */}
        </div>
      </header>
      <main className="fhg-body">
        {!activeProject ? (
          <div className="fhg-empty">
            No project selected. Create one from the sidebar panel first.
          </div>
        ) : (
          <CaptureGrid
            captures={activeProject.captures}
            taxonomy={activeProject.taxonomy}
            onCaptureOpen={(c) => setOpenCaptureId(c.id)}
          />
        )}
      </main>
      {activeProject && openCapture && (
        <CaptureModal
          capture={openCapture}
          taxonomy={activeProject.taxonomy}
          onClose={() => setOpenCaptureId(null)}
        />
      )}
    </>
  );
}
