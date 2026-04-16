import type { ProjectData, Capture } from '../../types';
import * as imageStore from '../../image-store';
import { findTaxonomyPath } from '../../taxonomy-path';
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
  exportFilename: string;
  taxonomyPath: string[];
}

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
  const taken = new Set<string>();
  const entries: ExportEntry[] = project.captures.map((capture) => {
    const taxonomyPath = capture.taxonomyNodeId
      ? findTaxonomyPath(project.taxonomy, capture.taxonomyNodeId) ?? []
      : [];
    const base = exportBaseName(taxonomyPath);
    const exportFilename = pickUniqueFilename(base, taken);
    return { capture, exportFilename, taxonomyPath };
  });

  const total = entries.length + 1; // +1 for metadata.json
  let done = 0;
  let written = 0;
  const skippedIds: string[] = [];

  for (const entry of entries) {
    onProgress?.({ done, total, currentName: entry.exportFilename });

    const blob = await imageStore.get(entry.capture.id);
    if (!blob) {
      skippedIds.push(entry.capture.id);
      done++;
      continue;
    }

    await writeBlob(dirHandle, entry.exportFilename, blob);
    written++;
    done++;
  }

  // Write metadata.json
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

function buildMetadata(
  project: ProjectData,
  entries: ExportEntry[],
  skippedIds: string[],
) {
  return {
    schemaVersion: 1,
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
