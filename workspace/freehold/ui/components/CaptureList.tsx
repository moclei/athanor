import React from 'react';
import { useCrannState } from '../hooks';
import { CaptureCard } from './CaptureCard';

export function CaptureList() {
  const [activeProjectId] = useCrannState('activeProjectId');
  const projects = useCrannState((s) => s.projects);

  const project = activeProjectId ? projects[activeProjectId] : undefined;
  if (!project || project.captures.length === 0) return null;

  const reversed = [...project.captures].reverse();

  return (
    <div className="fh-capture-list">
      {reversed.map((capture) => (
        <CaptureCard key={capture.id} capture={capture} />
      ))}
    </div>
  );
}
