import React, { useState } from 'react';
import { useCrannActions } from '../hooks';
import { RegionSelectionOverlay } from './RegionSelectionOverlay';
import { FileDropZone } from './FileDropZone';
import { CaptureList } from './CaptureList';
import type { SelectionRect } from '../../types';

export function CaptureView() {
  const { captureRegion } = useCrannActions();
  const [isSelecting, setIsSelecting] = useState(false);

  function handleSelectionComplete(rect: SelectionRect) {
    setIsSelecting(false);
    captureRegion(rect);
  }

  function handleSelectionCancel() {
    setIsSelecting(false);
  }

  return (
    <>
      {isSelecting && (
        <RegionSelectionOverlay
          onComplete={handleSelectionComplete}
          onCancel={handleSelectionCancel}
        />
      )}

      {!isSelecting && (
        <>
          <button
            className="fh-btn fh-btn--primary fh-btn--full"
            onClick={() => setIsSelecting(true)}
          >
            📷 Take Screenshot
          </button>

          <FileDropZone />
          <CaptureList />
        </>
      )}
    </>
  );
}
