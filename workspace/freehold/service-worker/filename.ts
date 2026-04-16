export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a stable capture filename: `{NNN}-{slug}.png`.
 *
 * captureIndex is 1-based, padded to 3 digits.
 * taxonomyPath is the label chain from root to assigned node, kebab-cased.
 * Empty path → 'uncategorized'.
 *
 * This name is stored on the Capture record and stays stable once assigned.
 * Export-time renaming (based on current taxonomy) is handled separately in
 * the gallery export flow.
 */
export function buildCaptureFilename(captureIndex: number, taxonomyPath: string[]): string {
  const counter = String(captureIndex).padStart(3, '0');
  const slug =
    taxonomyPath.length > 0
      ? taxonomyPath.map((label) => slugify(label)).join('-')
      : 'uncategorized';
  return `${counter}-${slug}.png`;
}
