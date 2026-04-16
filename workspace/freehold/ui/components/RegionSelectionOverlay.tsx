import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { SelectionRect } from '../../types';

interface Props {
  onComplete: (rect: SelectionRect) => void;
  onCancel: () => void;
}

interface DragState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

function toRect(drag: DragState) {
  const x = Math.min(drag.startX, drag.currentX);
  const y = Math.min(drag.startY, drag.currentY);
  const width = Math.abs(drag.currentX - drag.startX);
  const height = Math.abs(drag.currentY - drag.startY);
  return { x, y, width, height };
}

export function RegionSelectionOverlay({ onComplete, onCancel }: Props) {
  const [drag, setDrag] = useState<DragState | null>(null);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    isDragging.current = true;
    setDrag({
      startX: e.clientX,
      startY: e.clientY,
      currentX: e.clientX,
      currentY: e.clientY,
    });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging.current) return;
    setDrag((prev) => prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null);
  }, []);

  const handleMouseUp = useCallback(() => {
    if (!isDragging.current || !drag) return;
    isDragging.current = false;

    const rect = toRect(drag);
    if (rect.width < 5 || rect.height < 5) {
      onCancel();
      return;
    }

    onComplete({
      ...rect,
      devicePixelRatio: window.devicePixelRatio,
    });
  }, [drag, onComplete, onCancel]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        isDragging.current = false;
        onCancel();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onCancel]);

  const rect = drag ? toRect(drag) : null;

  return (
    <div
      className="fh-overlay"
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {!rect && <div className="fh-overlay-bg" />}

      {rect && (
        <div
          className="fh-selection-rect"
          style={{
            left: rect.x,
            top: rect.y,
            width: rect.width,
            height: rect.height,
          }}
        />
      )}
    </div>
  );
}
