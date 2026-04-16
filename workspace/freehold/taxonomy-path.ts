import type { TaxonomyNode } from './types';

/**
 * Return the label path from the root of the taxonomy tree to the node with
 * the given id, or null if the id is not found. Used for breadcrumbs and for
 * kebab-casing export filenames.
 */
export function findTaxonomyPath(
  nodes: TaxonomyNode[],
  nodeId: string,
  trail: string[] = [],
): string[] | null {
  for (const node of nodes) {
    const next = [...trail, node.label];
    if (node.id === nodeId) return next;
    const found = findTaxonomyPath(node.children, nodeId, next);
    if (found) return found;
  }
  return null;
}
