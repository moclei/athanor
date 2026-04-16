import React from 'react';
import type { Capture, TaxonomyNode } from '../../../types';
import { CaptureCard } from './CaptureCard';

interface Props {
  captures: Capture[];
  taxonomy: TaxonomyNode[];
  onCaptureOpen?: (capture: Capture) => void;
}

export function CaptureGrid({ captures, taxonomy, onCaptureOpen }: Props) {
  if (captures.length === 0) {
    return (
      <div className="fhg-empty">
        No captures in this project yet. Take a screenshot from the sidebar panel to start.
      </div>
    );
  }

  return (
    <div className="fhg-grid">
      {captures.map((c) => (
        <CaptureCard
          key={c.id}
          capture={c}
          taxonomy={taxonomy}
          onOpen={onCaptureOpen}
        />
      ))}
    </div>
  );
}
