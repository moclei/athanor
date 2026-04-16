import React from 'react';
import type { Capture, TaxonomyNode } from '../../../types';
import { useCrannActions } from '../../hooks';

interface Props {
  capture: Capture;
  taxonomy: TaxonomyNode[];
  className?: string;
}

interface FlatOption {
  id: string;
  label: string;
  depth: number;
}

function flatten(nodes: TaxonomyNode[], depth = 0, out: FlatOption[] = []): FlatOption[] {
  for (const node of nodes) {
    out.push({ id: node.id, label: node.label, depth });
    if (node.children.length > 0) flatten(node.children, depth + 1, out);
  }
  return out;
}

export function GalleryCategoryPicker({ capture, taxonomy, className }: Props) {
  const { updateCapture } = useCrannActions();
  const options = flatten(taxonomy);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const value = e.target.value;
    updateCapture({
      captureId: capture.id,
      taxonomyNodeId: value === '' ? null : value,
    });
  }

  return (
    <select
      className={className ?? 'fhg-tax-picker'}
      value={capture.taxonomyNodeId ?? ''}
      onChange={handleChange}
      onClick={(e) => e.stopPropagation()}
    >
      <option value="">Uncategorized</option>
      {options.map((o) => (
        <option key={o.id} value={o.id}>
          {`${'\u00A0\u00A0'.repeat(o.depth)}${o.label}`}
        </option>
      ))}
    </select>
  );
}
