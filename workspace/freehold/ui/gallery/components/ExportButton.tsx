import React, { useState } from 'react';
import type { ProjectData } from '../../../types';
import { exportProject, type ExportProgress } from '../export-project';

interface Props {
  project: ProjectData | undefined;
}

export function ExportButton({ project }: Props) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<ExportProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<'ok' | 'err'>('ok');

  const disabled = !project || project.captures.length === 0 || busy;

  async function handleExport() {
    if (!project) return;

    setBusy(true);
    setMessage(null);
    setProgress({ done: 0, total: project.captures.length + 1, currentName: null });

    try {
      const result = await exportProject(project, (p) => setProgress(p));
      const parts = [`Exported ${result.written} to "${result.folderName}"`];
      if (result.skipped > 0) {
        parts.push(`${result.skipped} skipped (missing image data)`);
      }
      setMessageKind('ok');
      setMessage(parts.join(' · '));
    } catch (err) {
      const e = err as DOMException | Error;
      if (e.name === 'AbortError') {
        // User cancelled the picker — silent.
        setMessage(null);
      } else {
        setMessageKind('err');
        setMessage(`Export failed: ${e.message}`);
        console.error('[Freehold:Gallery] Export failed:', err);
      }
    } finally {
      setBusy(false);
      setProgress(null);
    }
  }

  return (
    <div className="fhg-export-wrap">
      <button
        type="button"
        className="fhg-btn fhg-btn--secondary"
        onClick={handleExport}
        disabled={disabled}
        title={
          !project
            ? 'Select a project first'
            : project.captures.length === 0
              ? 'Project has no captures to export'
              : 'Export this project to a folder'
        }
      >
        {busy && progress
          ? `Exporting ${progress.done}/${progress.total}…`
          : 'Export'}
      </button>
      {message && (
        <span className={`fhg-export-msg fhg-export-msg--${messageKind}`}>
          {message}
        </span>
      )}
    </div>
  );
}
