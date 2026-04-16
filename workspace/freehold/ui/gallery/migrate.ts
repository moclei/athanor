import type { ProjectData } from '../../types';
import * as imageStore from '../../image-store';
import { slugify } from '../../service-worker/filename';

/**
 * Imports pre-existing captures from a user-selected `freehold/` folder
 * into IndexedDB.
 *
 * Expected layout (matches the legacy chrome.downloads writer):
 *   freehold/
 *     {slugify(projectName)}/
 *       screenshots/
 *         {NNN}-{slug}.png
 *
 * Matching strategy:
 *   1. For each project in Crann state, look for a subfolder whose name
 *      equals slugify(project.name).
 *   2. Look inside that folder's `screenshots/` subdirectory.
 *   3. For each capture whose blob is NOT yet in IndexedDB, look for a
 *      file with name === capture.filename.
 *   4. Import matching files; skip captures that are already imported
 *      or whose file is missing.
 */

export interface MigrateScanResult {
  rootName: string;
  perProject: ProjectScan[];
  unmatchedFolders: string[]; // subfolders we couldn't tie to any project
}

export interface ProjectScan {
  projectId: string;
  projectName: string;
  matchedFolder: string | null; // null if no folder matched
  toImport: PlannedImport[];
  alreadyImported: number;
  missingOnDisk: string[]; // filenames we expected but didn't find
}

export interface PlannedImport {
  captureId: string;
  filename: string;
  fileHandle: FileSystemFileHandle;
}

export interface MigrateProgress {
  done: number;
  total: number;
  currentName: string | null;
}

export interface MigrateResult {
  imported: number;
  alreadyImported: number;
  missingCount: number;
  perProject: { projectName: string; imported: number; skipped: number }[];
}

/**
 * Prompt the user for the freehold/ folder and produce a scan plan.
 */
export async function scanFreeholdFolder(
  projects: Record<string, ProjectData>,
): Promise<MigrateScanResult | null> {
  if (typeof window.showDirectoryPicker !== 'function') {
    throw new Error('Your browser does not support the directory picker API.');
  }

  let rootHandle: FileSystemDirectoryHandle;
  try {
    rootHandle = await window.showDirectoryPicker({
      id: 'freehold-import',
      mode: 'read',
      startIn: 'downloads',
    });
  } catch (e) {
    if ((e as DOMException).name === 'AbortError') return null;
    throw e;
  }

  // Index every directory at the top level by its (lowercased) name.
  const folderHandles = new Map<string, FileSystemDirectoryHandle>();
  for await (const entry of rootHandle.values()) {
    if (entry.kind === 'directory') {
      folderHandles.set(entry.name.toLowerCase(), entry);
    }
  }

  const matchedFolderNames = new Set<string>();
  const perProject: ProjectScan[] = [];

  for (const project of Object.values(projects)) {
    const slug = slugify(project.name).toLowerCase();
    const folder = folderHandles.get(slug);
    const scan: ProjectScan = {
      projectId: project.id,
      projectName: project.name,
      matchedFolder: folder ? folder.name : null,
      toImport: [],
      alreadyImported: 0,
      missingOnDisk: [],
    };

    if (folder) {
      matchedFolderNames.add(folder.name.toLowerCase());

      // Build a filename → handle map from `{folder}/screenshots/`.
      const fileHandles = await listScreenshotFiles(folder);

      for (const capture of project.captures) {
        const alreadyHave = await imageStore.has(capture.id);
        if (alreadyHave) {
          scan.alreadyImported++;
          continue;
        }

        const handle = fileHandles.get(capture.filename);
        if (handle) {
          scan.toImport.push({
            captureId: capture.id,
            filename: capture.filename,
            fileHandle: handle,
          });
        } else {
          scan.missingOnDisk.push(capture.filename);
        }
      }
    }

    perProject.push(scan);
  }

  const unmatchedFolders: string[] = [];
  for (const [lcName, h] of folderHandles) {
    if (!matchedFolderNames.has(lcName)) unmatchedFolders.push(h.name);
  }

  return {
    rootName: rootHandle.name,
    perProject,
    unmatchedFolders,
  };
}

/**
 * Execute a previously prepared scan: stream blobs into IndexedDB.
 */
export async function importScannedCaptures(
  scan: MigrateScanResult,
  onProgress?: (p: MigrateProgress) => void,
): Promise<MigrateResult> {
  const total = scan.perProject.reduce((sum, p) => sum + p.toImport.length, 0);
  let done = 0;
  let imported = 0;
  let alreadyImported = 0;
  let missingCount = 0;
  const perProject: MigrateResult['perProject'] = [];

  for (const project of scan.perProject) {
    let projectImported = 0;
    alreadyImported += project.alreadyImported;
    missingCount += project.missingOnDisk.length;

    for (const item of project.toImport) {
      onProgress?.({ done, total, currentName: item.filename });
      try {
        const file = await item.fileHandle.getFile();
        const blob = file.slice(0, file.size, file.type || 'image/png');
        await imageStore.put(item.captureId, blob);
        imported++;
        projectImported++;
      } catch (e) {
        console.error('[Freehold:Migrate] Failed to import', item.filename, e);
        missingCount++;
      }
      done++;
    }

    perProject.push({
      projectName: project.projectName,
      imported: projectImported,
      skipped: project.alreadyImported + project.missingOnDisk.length,
    });
  }

  onProgress?.({ done, total, currentName: null });

  return { imported, alreadyImported, missingCount, perProject };
}

async function listScreenshotFiles(
  projectFolder: FileSystemDirectoryHandle,
): Promise<Map<string, FileSystemFileHandle>> {
  const map = new Map<string, FileSystemFileHandle>();

  // Look for a `screenshots` subfolder; case-insensitive match.
  let screenshots: FileSystemDirectoryHandle | null = null;
  for await (const entry of projectFolder.values()) {
    if (entry.kind === 'directory' && entry.name.toLowerCase() === 'screenshots') {
      screenshots = entry;
      break;
    }
  }
  if (!screenshots) return map;

  for await (const entry of screenshots.values()) {
    if (entry.kind === 'file') {
      map.set(entry.name, entry);
    }
  }

  return map;
}
