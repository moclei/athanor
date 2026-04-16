import React from 'react';
import type { Capture, TaxonomyNode } from '../../../types';
import { findTaxonomyPath } from '../../../taxonomy-path';
import { useBlobUrl } from '../use-blob-url';
import { useDebouncedNotes } from '../use-debounced-notes';
import { GalleryCategoryPicker } from './GalleryCategoryPicker';

interface Props {
  capture: Capture;
  taxonomy: TaxonomyNode[];
  onOpen?: ((capture: Capture) => void) | undefined;
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
  return d.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function CaptureCard({ capture, taxonomy, onOpen }: Props) {
  const { url, status } = useBlobUrl(capture.id);
  const { notes, setNotes, flush } = useDebouncedNotes(capture.id, capture.notes);

  const path = capture.taxonomyNodeId ? findTaxonomyPath(taxonomy, capture.taxonomyNodeId) : null;
  const breadcrumb = path && path.length > 0 ? path.join(' › ') : 'Uncategorized';
  const host = hostnameOf(capture.url);
  const when = formatDate(capture.timestamp);

  return (
    <article className="fhg-card">
      <button
        type="button"
        className="fhg-card-open"
        onClick={() => onOpen?.(capture)}
        aria-label={`Open ${capture.pageTitle || capture.filename}`}
      >
        <div className="fhg-card-thumb">
          {status === 'ready' && url ? (
            <img src={url} alt={capture.pageTitle || capture.filename} loading="lazy" />
          ) : status === 'loading' ? (
            <div className="fhg-thumb-state fhg-thumb-state--loading">Loading…</div>
          ) : status === 'missing' ? (
            <div className="fhg-thumb-state fhg-thumb-state--missing">Not yet imported</div>
          ) : (
            <div className="fhg-thumb-state fhg-thumb-state--error">Failed to load</div>
          )}
        </div>

        <div className="fhg-card-head">
          <div className="fhg-card-title" title={capture.pageTitle || capture.filename}>
            {capture.pageTitle || capture.filename}
          </div>
          <div className="fhg-card-meta">
            {host && <span className="fhg-card-host">{host}</span>}
            {when && <span className="fhg-card-time">{when}</span>}
          </div>
        </div>
      </button>

      <div className="fhg-card-edit">
        <div className="fhg-card-row">
          <GalleryCategoryPicker
            capture={capture}
            taxonomy={taxonomy}
            className="fhg-tax-picker fhg-tax-picker--card"
          />
          <span
            className={`fhg-card-tag${path ? '' : ' fhg-card-tag--untagged'}`}
            title={breadcrumb}
          >
            {breadcrumb}
          </span>
        </div>
        <textarea
          className="fhg-card-notes-input"
          placeholder="Add notes…"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          onBlur={flush}
          rows={2}
        />
      </div>
    </article>
  );
}
