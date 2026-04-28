import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useCrannActions } from '../hooks';
import { CategoryPicker } from './CategoryPicker';
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
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (notes === capture.notes) return;
    debounceRef.current = setTimeout(() => {
      updateCapture({ captureId: capture.id, notes });
    }, 500);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [notes, capture.id, capture.notes, updateCapture]);

  const handleBlur = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (notes !== capture.notes) {
      updateCapture({ captureId: capture.id, notes });
    }
  }, [notes, capture.id, capture.notes, updateCapture]);

  return (
    <div className="fh-capture-card">
      <div className="fh-capture-url">{extractPathname(capture.url)}</div>
      <CategoryPicker capture={capture} />
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
