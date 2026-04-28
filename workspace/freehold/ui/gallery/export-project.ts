import type { ProjectData, Capture } from '../../types';
import * as imageStore from '../../image-store';
import { findTaxonomyPath } from '../../taxonomy-path';
import { slugify } from '../../service-worker/filename';
import { exportBaseName, pickUniqueFilename } from './export-filename';

export interface ExportProgress {
  done: number;
  total: number;
  currentName: string | null;
}

export interface ExportResult {
  written: number;
  skipped: number;
  skippedIds: string[];
  folderName: string;
}

interface ExportEntry {
  capture: Capture;
  // Relative path including subfolder, e.g. `properties/property-list.png`.
  exportFilename: string;
  // Bare filename written into the subfolder, e.g. `property-list.png`.
  filename: string;
  groupSlug: string;
  taxonomyPath: string[];
}

const UNCATEGORIZED = 'uncategorized';

/**
 * Prompt for a directory and export the project's captures + metadata.json.
 *
 * Throws if the user cancels the picker (DOMException name = 'AbortError').
 */
export async function exportProject(
  project: ProjectData,
  onProgress?: (p: ExportProgress) => void,
): Promise<ExportResult> {
  // Type guard: File System Access API is Chromium-only.
  if (typeof window.showDirectoryPicker !== 'function') {
    throw new Error('Your browser does not support the directory picker API.');
  }

  const dirHandle = await window.showDirectoryPicker({
    id: 'freehold-export',
    mode: 'readwrite',
    startIn: 'downloads',
  });

  // Plan filenames up front so metadata.json reflects what's on disk.
  // Filename collisions are tracked per-folder so two groups can each have a
  // `property-list.png` without conflict.
  const takenByFolder = new Map<string, Set<string>>();
  const entries: ExportEntry[] = project.captures.map((capture) => {
    const taxonomyPath = capture.taxonomyNodeId
      ? findTaxonomyPath(project.taxonomy, capture.taxonomyNodeId) ?? []
      : [];
    const groupSlug = resolveGroupSlug(taxonomyPath);
    let folderTaken = takenByFolder.get(groupSlug);
    if (!folderTaken) {
      folderTaken = new Set<string>();
      takenByFolder.set(groupSlug, folderTaken);
    }
    const base = exportBaseName(taxonomyPath);
    const filename = pickUniqueFilename(base, folderTaken);
    const exportFilename = `${groupSlug}/${filename}`;
    return { capture, exportFilename, filename, groupSlug, taxonomyPath };
  });

  const total = entries.length + 1; // +1 for metadata.json
  let done = 0;
  let written = 0;
  const skippedIds: string[] = [];

  // Cache subfolder handles so we don't reopen them per write.
  const subfolderHandles = new Map<string, FileSystemDirectoryHandle>();
  async function getSubfolder(slug: string): Promise<FileSystemDirectoryHandle> {
    const cached = subfolderHandles.get(slug);
    if (cached) return cached;
    const handle = await dirHandle.getDirectoryHandle(slug, { create: true });
    subfolderHandles.set(slug, handle);
    return handle;
  }

  for (const entry of entries) {
    onProgress?.({ done, total, currentName: entry.exportFilename });

    const blob = await imageStore.get(entry.capture.id);
    if (!blob) {
      skippedIds.push(entry.capture.id);
      done++;
      continue;
    }

    const folder = await getSubfolder(entry.groupSlug);
    await writeBlob(folder, entry.filename, blob);
    written++;
    done++;
  }

  // Write metadata.json at the root of the picked directory.
  onProgress?.({ done, total, currentName: 'metadata.json' });
  const metadata = buildMetadata(project, entries, skippedIds);
  const metaBlob = new Blob([JSON.stringify(metadata, null, 2)], {
    type: 'application/json',
  });
  await writeBlob(dirHandle, 'metadata.json', metaBlob);
  done++;

  onProgress?.({ done, total, currentName: null });

  return {
    written,
    skipped: skippedIds.length,
    skippedIds,
    folderName: dirHandle.name,
  };
}

/**
 * Subfolder = slugified top-level taxonomy label only. Captures tagged at any
 * depth resolve to `slugify(taxonomyPath[0])`. Untagged or empty-slug paths
 * fall back to `uncategorized/`.
 */
function resolveGroupSlug(taxonomyPath: string[]): string {
  const top = taxonomyPath[0];
  if (!top) return UNCATEGORIZED;
  const slug = slugify(top);
  return slug.length > 0 ? slug : UNCATEGORIZED;
}

function buildMetadata(
  project: ProjectData,
  entries: ExportEntry[],
  skippedIds: string[],
) {
  return {
    schemaVersion: 2,
    exportedAt: new Date().toISOString(),
    project: {
      id: project.id,
      name: project.name,
      domain: project.domain,
      createdAt: project.createdAt,
    },
    taxonomy: project.taxonomy,
    captures: entries.map(({ capture, exportFilename, taxonomyPath }) => ({
      id: capture.id,
      exportFilename,
      taxonomyNodeId: capture.taxonomyNodeId,
      taxonomyPath,
      notes: capture.notes,
      url: capture.url,
      pageTitle: capture.pageTitle,
      timestamp: capture.timestamp,
      originalFilename: capture.filename,
      blobMissing: skippedIds.includes(capture.id) || undefined,
    })),
  };
}

async function writeBlob(
  dir: FileSystemDirectoryHandle,
  name: string,
  blob: Blob,
): Promise<void> {
  const fileHandle = await dir.getFileHandle(name, { create: true });
  const writable = await fileHandle.createWritable();
  await writable.write(blob);
  await writable.close();
}
