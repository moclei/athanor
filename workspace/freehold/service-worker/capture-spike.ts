/**
 * SPIKE: OffscreenCanvas cropping pipeline in a Chrome MV3 service worker.
 *
 * Validates risk R2 from the research doc: can we do the full pipeline of
 * captureVisibleTab → fetch → createImageBitmap → OffscreenCanvas.drawImage
 * → convertToBlob → data URL → chrome.downloads.download() entirely within
 * the service worker context (no chrome.offscreen API needed)?
 *
 * To test: load the extension, open the service worker DevTools console,
 * and call `testCaptureSpike()` from the console, or trigger it from
 * chrome.action.onClicked in a test harness.
 *
 * Expected result: a cropped PNG downloads to the user's Downloads folder.
 */

import type { SelectionRect } from '../types';

async function blobToDataUrl(blob: Blob): Promise<string> {
  const buffer = await blob.arrayBuffer();
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  return `data:${blob.type};base64,${btoa(binary)}`;
}

/**
 * Full capture pipeline spike:
 * 1. captureVisibleTab → data URL of the full viewport
 * 2. fetch(dataUrl) → Blob
 * 3. createImageBitmap(blob) → ImageBitmap
 * 4. OffscreenCanvas + drawImage to crop the region
 * 5. convertToBlob → Blob
 * 6. blobToDataUrl → data URL of the cropped image
 * 7. chrome.downloads.download() → file on disk
 */
export async function testCaptureSpike(rect?: SelectionRect): Promise<void> {
  const testRect: SelectionRect = rect ?? {
    x: 50,
    y: 50,
    width: 200,
    height: 150,
    devicePixelRatio: 1,
  };

  console.log('[capture-spike] Starting pipeline with rect:', testRect);

  // Step 1: Capture the visible tab
  const screenshotDataUrl = await chrome.tabs.captureVisibleTab(null as unknown as number, {
    format: 'png',
  });
  console.log('[capture-spike] captureVisibleTab OK, data URL length:', screenshotDataUrl.length);

  // Step 2: Fetch the data URL to get a Blob
  const response = await fetch(screenshotDataUrl);
  const fullBlob = await response.blob();
  console.log('[capture-spike] fetch → blob OK, size:', fullBlob.size);

  // Step 3: Create an ImageBitmap from the full screenshot
  const bitmap = await createImageBitmap(fullBlob);
  console.log('[capture-spike] createImageBitmap OK, dimensions:', bitmap.width, '×', bitmap.height);

  // Step 4: Crop using OffscreenCanvas
  const dpr = testRect.devicePixelRatio;
  const cropX = Math.round(testRect.x * dpr);
  const cropY = Math.round(testRect.y * dpr);
  const cropW = Math.round(testRect.width * dpr);
  const cropH = Math.round(testRect.height * dpr);

  const canvas = new OffscreenCanvas(cropW, cropH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2d context from OffscreenCanvas');

  ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  bitmap.close();
  console.log('[capture-spike] OffscreenCanvas drawImage OK, crop:', cropW, '×', cropH);

  // Step 5: Convert to Blob
  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
  console.log('[capture-spike] convertToBlob OK, size:', croppedBlob.size);

  // Step 6: Convert to data URL
  const croppedDataUrl = await blobToDataUrl(croppedBlob);
  console.log('[capture-spike] blobToDataUrl OK, data URL length:', croppedDataUrl.length);

  // Step 7: Download the cropped image
  const downloadId = await chrome.downloads.download({
    url: croppedDataUrl,
    filename: 'freehold-spike-test/capture-spike-output.png',
    conflictAction: 'overwrite',
  });
  console.log('[capture-spike] download initiated, downloadId:', downloadId);
  console.log('[capture-spike] ✅ Full pipeline completed successfully!');
}

// Expose to service worker global scope for console testing
// @ts-expect-error — attaching to service worker global
self.testCaptureSpike = testCaptureSpike;
