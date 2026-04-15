import React from 'react';
import { useCrannState, useCrannActions } from '../hooks';
import type { Capture, TaxonomyNode } from '../../types';

interface Props {
  capture: Capture;
}

export function CategoryPicker({ capture }: Props) {
  const [activeProjectId] = useCrannState('activeProjectId');
  const projects = useCrannState((s) => s.projects);
  const { updateCapture } = useCrannActions();

  const activeProject = activeProjectId ? projects[activeProjectId] : undefined;
  const taxonomy = activeProject?.taxonomy ?? [];

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    updateCapture({
      captureId: capture.id,
      taxonomyNodeId: value === '' ? null : value,
    });
  }

  return (
    <select
      className="fh-category-picker"
      value={capture.taxonomyNodeId ?? ''}
      onChange={handleChange}
    >
      <option value="">Uncategorized</option>
      {taxonomy.map((group) => (
        <optgroup key={group.id} label={group.label}>
          <GroupOption node={group} prefix="" />
          {group.children.map((child) => (
            <option key={child.id} value={child.id}>
              {child.label}
            </option>
          ))}
        </optgroup>
      ))}
    </select>
  );
}

function GroupOption({ node, prefix }: { node: TaxonomyNode; prefix: string }) {
  const label = prefix ? `${prefix} > ${node.label}` : node.label;
  return <option value={node.id}>{label} (group)</option>;
}
