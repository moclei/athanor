import React, { useCallback, useEffect, useState } from 'react';
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

// Below this in either pixel distance (mode transition) or rect dimension
// (commit), the selection collapses or commits as click-to-place rather than
// becoming a real region.
const THRESHOLD = 5;

type Mode = 'idle' | 'dragging' | 'following';

function toRect(d: DragState) {
  const x = Math.min(d.startX, d.currentX);
  const y = Math.min(d.startY, d.currentY);
  const width = Math.abs(d.currentX - d.startX);
  const height = Math.abs(d.currentY - d.startY);
  return { x, y, width, height };
}

export function RegionSelectionOverlay({ onComplete, onCancel }: Props) {
  const [mode, setMode] = useState<Mode>('idle');
  const [drag, setDrag] = useState<DragState | null>(null);

  const finish = useCallback(
    (d: DragState) => {
      const rect = toRect(d);
      if (rect.width < THRESHOLD || rect.height < THRESHOLD) {
        onCancel();
        return;
      }
      onComplete({
        ...rect,
        devicePixelRatio: window.devicePixelRatio,
      });
    },
    [onComplete, onCancel],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (mode === 'idle') {
        setMode('dragging');
        setDrag({
          startX: e.clientX,
          startY: e.clientY,
          currentX: e.clientX,
          currentY: e.clientY,
        });
        return;
      }
      if (mode === 'following' && drag) {
        const d = { ...drag, currentX: e.clientX, currentY: e.clientY };
        setMode('idle');
        setDrag(null);
        finish(d);
      }
    },
    [mode, drag, finish],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (mode !== 'dragging' && mode !== 'following') return;
      setDrag((prev) =>
        prev ? { ...prev, currentX: e.clientX, currentY: e.clientY } : null,
      );
    },
    [mode],
  );

  const handleMouseUp = useCallback(() => {
    if (mode !== 'dragging' || !drag) return;
    const dist = Math.hypot(drag.currentX - drag.startX, drag.currentY - drag.startY);
    if (dist < THRESHOLD) {
      // Treat as a click-to-place start; keep `start`, let `current` track.
      setMode('following');
      return;
    }
    setMode('idle');
    setDrag(null);
    finish(drag);
  }, [mode, drag, finish]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
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
