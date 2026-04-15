import React, { useState, useCallback } from 'react';
import { useCrannActions } from '../hooks';
import type { Capture } from '../../types';

interface Props {
  capture: Capture;
}

function extractPathname(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export function CaptureCard({ capture }: Props) {
  const { updateCapture } = useCrannActions();
  const [notes, setNotes] = useState(capture.notes);

  const handleBlur = useCallback(() => {
    if (notes !== capture.notes) {
      updateCapture({ captureId: capture.id, notes });
    }
  }, [notes, capture.id, capture.notes, updateCapture]);

  return (
    <div className="fh-capture-card">
      <div className="fh-capture-filename">{capture.filename}</div>
      <div className="fh-capture-url">{extractPathname(capture.url)}</div>
      <div className="fh-capture-category">Uncategorized</div>
      <textarea
        className="fh-capture-notes"
        placeholder="Add notes…"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        onBlur={handleBlur}
        rows={2}
      />
    </div>
  );
}
