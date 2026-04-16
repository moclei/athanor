import React from 'react';
import { useCrannReady, useCrannState, useCrannActions } from '../hooks';

export function GalleryApp() {
  const isReady = useCrannReady();
  const [activeProjectId] = useCrannState('activeProjectId');
  const projects = useCrannState((s) => s.projects);
  const { selectProject } = useCrannActions();

  if (!isReady) {
    return <div className="fhg-loading">Connecting…</div>;
  }

  const projectList = Object.values(projects);
  const activeProject = activeProjectId ? projects[activeProjectId] : undefined;

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
        </div>
        <div className="fhg-header-actions">
          {/* Export / Import buttons land here in the next chunk */}
        </div>
      </header>
      <main className="fhg-body">
        {!activeProject ? (
          <div className="fhg-empty">No project selected. Create one from the sidebar panel first.</div>
        ) : (
          <div className="fhg-empty">
            {activeProject.captures.length} capture{activeProject.captures.length === 1 ? '' : 's'} in <strong>&nbsp;{activeProject.name}&nbsp;</strong> — grid coming in the next chunk.
          </div>
        )}
      </main>
    </>
  );
}
