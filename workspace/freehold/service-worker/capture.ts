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
 * Full capture pipeline: captureVisibleTab → crop via OffscreenCanvas → data URL.
 * Resolves the calling tab's window to ensure the correct viewport is captured.
 */
export async function captureAndCrop(
  tabId: number,
  rect: SelectionRect,
): Promise<{ dataUrl: string }> {
  const tab = await chrome.tabs.get(tabId);
  const screenshotDataUrl = await chrome.tabs.captureVisibleTab(tab.windowId, {
    format: 'png',
  });

  const response = await fetch(screenshotDataUrl);
  const fullBlob = await response.blob();
  const bitmap = await createImageBitmap(fullBlob);

  const dpr = rect.devicePixelRatio;
  const cropX = Math.round(rect.x * dpr);
  const cropY = Math.round(rect.y * dpr);
  const cropW = Math.round(rect.width * dpr);
  const cropH = Math.round(rect.height * dpr);

  const canvas = new OffscreenCanvas(cropW, cropH);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Failed to get 2d context from OffscreenCanvas');

  ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
  bitmap.close();

  const croppedBlob = await canvas.convertToBlob({ type: 'image/png' });
  const dataUrl = await blobToDataUrl(croppedBlob);

  return { dataUrl };
}
