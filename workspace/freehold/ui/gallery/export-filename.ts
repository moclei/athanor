import { slugify } from '../../service-worker/filename';

const MAX_SLUG_LEN = 100;
const FALLBACK = 'uncategorized';

/**
 * Build a kebab-case base name from a taxonomy path.
 *
 * - Joins labels with `-` after slugifying each.
 * - If the result is empty (e.g. all labels were non-alphanumeric),
 *   falls back to `uncategorized`.
 * - If longer than MAX_SLUG_LEN, truncates on a dash boundary.
 */
export function exportBaseName(taxonomyPath: string[]): string {
  if (taxonomyPath.length === 0) return FALLBACK;

  const slug = taxonomyPath
    .map(slugify)
    .filter((s) => s.length > 0)
    .join('-');

  if (slug.length === 0) return FALLBACK;

  if (slug.length <= MAX_SLUG_LEN) return slug;

  // Truncate on a dash boundary so we don't cut a word in half.
  const cut = slug.lastIndexOf('-', MAX_SLUG_LEN);
  return cut > 0 ? slug.slice(0, cut) : slug.slice(0, MAX_SLUG_LEN);
}

/**
 * Pick a unique `${base}.png` filename, appending `-2`, `-3`, … as needed
 * to avoid collisions within the export run.
 *
 * Mutates `taken` to record the chosen name.
 */
export function pickUniqueFilename(base: string, taken: Set<string>): string {
  const first = `${base}.png`;
  if (!taken.has(first)) {
    taken.add(first);
    return first;
  }

  let n = 2;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const candidate = `${base}-${n}.png`;
    if (!taken.has(candidate)) {
      taken.add(candidate);
      return candidate;
    }
    n++;
  }
}
