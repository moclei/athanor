import React, { useState } from 'react';
import type { ProjectData } from '../../../types';
import {
  scanFreeholdFolder,
  importScannedCaptures,
  type MigrateScanResult,
  type MigrateProgress,
} from '../migrate';

interface Props {
  projects: Record<string, ProjectData>;
}

type Phase = 'idle' | 'scanning' | 'confirming' | 'importing';

export function MigrateButton({ projects }: Props) {
  const [phase, setPhase] = useState<Phase>('idle');
  const [scan, setScan] = useState<MigrateScanResult | null>(null);
  const [progress, setProgress] = useState<MigrateProgress | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [messageKind, setMessageKind] = useState<'ok' | 'err'>('ok');

  const noProjects = Object.keys(projects).length === 0;
  const disabled = noProjects || phase === 'scanning' || phase === 'importing';

  async function handleClick() {
    setMessage(null);
    setPhase('scanning');
    try {
      const result = await scanFreeholdFolder(projects);
      if (!result) {
        setPhase('idle');
        return;
      }
      setScan(result);
      setPhase('confirming');
    } catch (err) {
      const e = err as Error;
      setMessageKind('err');
      setMessage(`Import failed: ${e.message}`);
      setPhase('idle');
      console.error('[Freehold:Migrate] Scan failed:', err);
    }
  }

  async function handleConfirm() {
    if (!scan) return;
    setPhase('importing');
    try {
      const result = await importScannedCaptures(scan, (p) => setProgress(p));
      const parts = [`Imported ${result.imported}`];
      if (result.alreadyImported > 0) parts.push(`${result.alreadyImported} already imported`);
      if (result.missingCount > 0) parts.push(`${result.missingCount} missing on disk`);
      setMessageKind('ok');
      setMessage(parts.join(' · '));
    } catch (err) {
      const e = err as Error;
      setMessageKind('err');
      setMessage(`Import failed: ${e.message}`);
      console.error('[Freehold:Migrate] Import failed:', err);
    } finally {
      setPhase('idle');
      setScan(null);
      setProgress(null);
    }
  }

  function handleCancel() {
    setPhase('idle');
    setScan(null);
  }

  const buttonLabel =
    phase === 'scanning'
      ? 'Scanning…'
      : phase === 'importing' && progress
        ? `Importing ${progress.done}/${progress.total}…`
        : 'Import from disk';

  return (
    <div className="fhg-migrate-wrap">
      <button
        type="button"
        className="fhg-btn fhg-btn--secondary"
        onClick={handleClick}
        disabled={disabled}
        title={
          noProjects
            ? 'Create a project first'
            : 'Import captures from a freehold/ folder on disk'
        }
      >
        {buttonLabel}
      </button>
      {message && (
        <span className={`fhg-export-msg fhg-export-msg--${messageKind}`}>
          {message}
        </span>
      )}
      {phase === 'confirming' && scan && (
        <MigrateConfirmModal
          scan={scan}
          onConfirm={handleConfirm}
          onCancel={handleCancel}
        />
      )}
    </div>
  );
}

interface ConfirmProps {
  scan: MigrateScanResult;
  onConfirm: () => void;
  onCancel: () => void;
}

function MigrateConfirmModal({ scan, onConfirm, onCancel }: ConfirmProps) {
  const totalToImport = scan.perProject.reduce((s, p) => s + p.toImport.length, 0);
  const totalAlready = scan.perProject.reduce((s, p) => s + p.alreadyImported, 0);
  const totalMissing = scan.perProject.reduce((s, p) => s + p.missingOnDisk.length, 0);

  return (
    <div className="fhg-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => {
      if (e.target === e.currentTarget) onCancel();
    }}>
      <div className="fhg-modal fhg-modal--small">
        <header className="fhg-modal-header">
          <div className="fhg-modal-titlewrap">
            <h2 className="fhg-modal-title">Import from "{scan.rootName}"</h2>
            <div className="fhg-modal-meta">
              <span>
                {totalToImport} to import · {totalAlready} already imported · {totalMissing} missing
              </span>
            </div>
          </div>
          <button
            type="button"
            className="fhg-modal-close"
            aria-label="Cancel"
            onClick={onCancel}
          >
            ×
          </button>
        </header>

        <div className="fhg-migrate-body">
          <table className="fhg-migrate-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Folder</th>
                <th className="fhg-num">To import</th>
                <th className="fhg-num">Already</th>
                <th className="fhg-num">Missing</th>
              </tr>
            </thead>
            <tbody>
              {scan.perProject.map((p) => (
                <tr key={p.projectId}>
                  <td>{p.projectName}</td>
                  <td>
                    {p.matchedFolder ? (
                      <code>{p.matchedFolder}/</code>
                    ) : (
                      <span className="fhg-migrate-muted">no match</span>
                    )}
                  </td>
                  <td className="fhg-num">{p.toImport.length}</td>
                  <td className="fhg-num">{p.alreadyImported}</td>
                  <td className="fhg-num">{p.missingOnDisk.length}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {scan.unmatchedFolders.length > 0 && (
            <p className="fhg-migrate-muted">
              Folders in <code>{scan.rootName}/</code> that didn't match any project:{' '}
              {scan.unmatchedFolders.map((n) => <code key={n}>{n}/</code>).reduce<React.ReactNode[]>(
                (acc, el, i) => (i === 0 ? [el] : [...acc, ' ', el]),
                [],
              )}
              <br />
              Rename your project to match the folder name (slugified) if you want it included.
            </p>
          )}
        </div>

        <div className="fhg-modal-actions fhg-modal-actions--split">
          <button type="button" className="fhg-btn fhg-btn--secondary" onClick={onCancel}>
            Cancel
          </button>
          <button
            type="button"
            className="fhg-btn fhg-btn--primary"
            onClick={onConfirm}
            disabled={totalToImport === 0}
          >
            {totalToImport === 0 ? 'Nothing to import' : `Import ${totalToImport}`}
          </button>
        </div>
      </div>
    </div>
  );
}
