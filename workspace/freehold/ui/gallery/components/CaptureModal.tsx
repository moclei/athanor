import React, { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Capture, TaxonomyNode } from '../../../types';
import { useCrannActions } from '../../hooks';
import { findTaxonomyPath } from '../../../taxonomy-path';
import { useBlobUrl } from '../use-blob-url';
import { useDebouncedNotes } from '../use-debounced-notes';
import { GalleryCategoryPicker } from './GalleryCategoryPicker';

interface Props {
  capture: Capture;
  taxonomy: TaxonomyNode[];
  onClose: () => void;
}

function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return '';
  }
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  return d.toLocaleString();
}

export function CaptureModal({ capture, taxonomy, onClose }: Props) {
  const { url, status } = useBlobUrl(capture.id);
  const { deleteCapture } = useCrannActions();
  const { notes, setNotes, flush } = useDebouncedNotes(capture.id, capture.notes);

  const path = capture.taxonomyNodeId ? findTaxonomyPath(taxonomy, capture.taxonomyNodeId) : null;
  const breadcrumb = path && path.length > 0 ? path.join(' › ') : 'Uncategorized';
  const host = hostnameOf(capture.url);
  const when = formatDate(capture.timestamp);

  const dialogRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        flush();
        onClose();
      }
    }
    document.addEventListener('keydown', onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [flush, onClose]);

  function handleBackdropMouseDown(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      flush();
      onClose();
    }
  }

  function handleDelete() {
    const confirmed = window.confirm(
      `Delete this capture?\n\n"${capture.pageTitle || capture.filename}"\n\nThis cannot be undone.`,
    );
    if (!confirmed) return;
    deleteCapture(capture.id);
    onClose();
  }

  return createPortal(
    <div
      className="fhg-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-label={capture.pageTitle || capture.filename}
      onMouseDown={handleBackdropMouseDown}
    >
      <div className="fhg-modal" ref={dialogRef}>
        <header className="fhg-modal-header">
          <div className="fhg-modal-titlewrap">
            <h2 className="fhg-modal-title" title={capture.pageTitle || capture.filename}>
              {capture.pageTitle || capture.filename}
            </h2>
            <div className="fhg-modal-meta">
              {host && (
                <a
                  className="fhg-modal-host"
                  href={capture.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  title={capture.url}
                >
                  {host}
                </a>
              )}
              {when && <span className="fhg-modal-time">{when}</span>}
            </div>
          </div>
          <button
            type="button"
            className="fhg-modal-close"
            aria-label="Close"
            onClick={() => {
              flush();
              onClose();
            }}
          >
            ×
          </button>
        </header>

        <div className="fhg-modal-body">
          <div className="fhg-modal-image">
            {status === 'ready' && url ? (
              <img src={url} alt={capture.pageTitle || capture.filename} />
            ) : status === 'loading' ? (
              <div className="fhg-thumb-state fhg-thumb-state--loading">Loading…</div>
            ) : status === 'missing' ? (
              <div className="fhg-thumb-state fhg-thumb-state--missing">
                Image not yet imported.
              </div>
            ) : (
              <div className="fhg-thumb-state fhg-thumb-state--error">Failed to load.</div>
            )}
          </div>

          <aside className="fhg-modal-side">
            <label className="fhg-field">
              <span className="fhg-field-label">Tag</span>
              <GalleryCategoryPicker
                capture={capture}
                taxonomy={taxonomy}
                className="fhg-tax-picker fhg-tax-picker--full"
              />
              <span
                className={`fhg-field-hint${path ? '' : ' fhg-field-hint--muted'}`}
                title={breadcrumb}
              >
                {breadcrumb}
              </span>
            </label>

            <label className="fhg-field">
              <span className="fhg-field-label">Notes</span>
              <textarea
                className="fhg-modal-notes"
                placeholder="Add notes…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                onBlur={flush}
                rows={8}
              />
            </label>

            <div className="fhg-modal-actions">
              <button
                type="button"
                className="fhg-btn fhg-btn--danger"
                onClick={handleDelete}
              >
                Delete capture
              </button>
            </div>
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
}
