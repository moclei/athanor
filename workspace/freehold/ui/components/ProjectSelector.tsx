import React, { useState } from 'react';
import { useCrannState, useCrannActions } from '../hooks';

export function ProjectSelector() {
  const [activeProjectId] = useCrannState('activeProjectId');
  const projects = useCrannState((s) => s.projects);
  const { selectProject, createProject } = useCrannActions();

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDomain, setNewDomain] = useState('');

  const projectList = Object.values(projects);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    if (value === '__new__') {
      setShowCreate(true);
      return;
    }
    selectProject(value);
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    await createProject({ name, domain: newDomain.trim() });
    setNewName('');
    setNewDomain('');
    setShowCreate(false);
  }

  if (showCreate) {
    return (
      <form className="fh-inline-form" onSubmit={handleCreate}>
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
          placeholder="Domain"
          value={newDomain}
          onChange={(e) => setNewDomain(e.target.value)}
        />
        <div className="fh-inline-form-actions">
          <button className="fh-btn fh-btn--primary" type="submit">Create</button>
          <button className="fh-btn fh-btn--secondary" type="button" onClick={() => setShowCreate(false)}>
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <select
      className="fh-project-select"
      value={activeProjectId ?? ''}
      onChange={handleChange}
    >
      {projectList.map((p) => (
        <option key={p.id} value={p.id}>{p.name}</option>
      ))}
      <option value="__new__">➕ New Project…</option>
    </select>
  );
}
