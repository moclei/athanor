import React, { useState } from 'react';
import { useCrannState, useCrannActions } from '../hooks';
import { TaxonomyTree } from './TaxonomyTree';

export function TaxonomyView() {
  const [activeProjectId] = useCrannState('activeProjectId');
  const projects = useCrannState((s) => s.projects);
  const { addTaxonomyNode } = useCrannActions();

  const [isAdding, setIsAdding] = useState(false);
  const [newGroupLabel, setNewGroupLabel] = useState('');

  const activeProject = activeProjectId ? projects[activeProjectId] : undefined;
  const taxonomy = activeProject?.taxonomy ?? [];

  async function handleAddGroup(e: React.FormEvent) {
    e.preventDefault();
    const label = newGroupLabel.trim();
    if (!label) return;
    await addTaxonomyNode({ parentId: null, label });
    setNewGroupLabel('');
    setIsAdding(false);
  }

  return (
    <div className="fh-taxonomy-view">
      <div className="fh-taxonomy-header">
        <button
          className="fh-btn fh-btn--secondary"
          onClick={() => setIsAdding(!isAdding)}
        >
          {isAdding ? 'Cancel' : '+ Add Group'}
        </button>
      </div>

      {isAdding && (
        <form className="fh-inline-form" onSubmit={handleAddGroup}>
          <input
            className="fh-input"
            type="text"
            placeholder="Group name"
            value={newGroupLabel}
            onChange={(e) => setNewGroupLabel(e.target.value)}
            autoFocus
          />
          <div className="fh-inline-form-actions">
            <button className="fh-btn fh-btn--primary" type="submit">Add</button>
            <button
              className="fh-btn fh-btn--secondary"
              type="button"
              onClick={() => { setIsAdding(false); setNewGroupLabel(''); }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {taxonomy.length === 0 && !isAdding ? (
        <div className="fh-taxonomy-empty">
          No taxonomy groups yet. Add a group to get started.
        </div>
      ) : (
        <TaxonomyTree nodes={taxonomy} parentId={null} depth={0} />
      )}
    </div>
  );
}
