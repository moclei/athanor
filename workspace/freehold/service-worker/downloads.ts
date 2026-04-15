import type { ProjectData } from '../types';

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
}

/**
 * Build a capture filename: `{NNN}-{slug}.png`.
 * captureIndex is 1-based, padded to 3 digits.
 * taxonomyPath is the label chain from root to assigned node, kebab-cased.
 * Empty path → 'uncategorized'.
 */
export function buildCaptureFilename(captureIndex: number, taxonomyPath: string[]): string {
  const counter = String(captureIndex).padStart(3, '0');
  const slug =
    taxonomyPath.length > 0
      ? taxonomyPath.map((label) => slugify(label)).join('-')
      : 'uncategorized';
  return `${counter}-${slug}.png`;
}

export async function writeScreenshot(
  projectSlug: string,
  filename: string,
  dataUrl: string,
): Promise<number> {
  return chrome.downloads.download({
    url: dataUrl,
    filename: `freehold/${projectSlug}/screenshots/${filename}`,
    conflictAction: 'overwrite',
  });
}

export async function writeProjectJson(
  projectSlug: string,
  projectData: ProjectData,
): Promise<number> {
  const json = JSON.stringify(projectData, null, 2);
  const dataUrl = `data:application/json;base64,${btoa(json)}`;
  return chrome.downloads.download({
    url: dataUrl,
    filename: `freehold/${projectSlug}/project.json`,
    conflictAction: 'overwrite',
  });
}
