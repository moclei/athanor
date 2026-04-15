import React, { useState } from 'react';
import { useCrannReady, useCrannState, useCrannActions } from './hooks';
import { ProjectSelector } from './components/ProjectSelector';
import { CaptureView } from './components/CaptureView';
import { TaxonomyView } from './components/TaxonomyView';

type Tab = 'capture' | 'taxonomy';

export function App() {
  const isReady = useCrannReady();
  const [activeProjectId] = useCrannState('activeProjectId');
  const projects = useCrannState((s) => s.projects);
  const { createProject } = useCrannActions();
  const [, setActive] = useCrannState('active');

  const [activeTab, setActiveTab] = useState<Tab>('capture');

  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');

  if (!isReady) return null;

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
    );
  }

  return (
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

      <div className="fh-content">
        {activeTab === 'capture' && activeProjectId && <CaptureView />}
        {activeTab === 'taxonomy' && activeProjectId && <TaxonomyView />}
      </div>
    </div>
  );
}
