/**
 * SPIKE: File drop events inside a closed shadow DOM.
 *
 * Validates risk R4 from the research doc: do native dragenter/dragover/drop
 * events fire correctly on elements inside a closed shadow root?
 *
 * To test: load the extension, click the action icon, then drag an image
 * file from the desktop onto the green drop zone. Check the page console
 * for log output confirming each event fired and the file was read.
 *
 * This spike is meant to be imported into the content script entry point
 * temporarily for testing, then removed once validated.
 */

export function mountDropSpike(shadowRoot: ShadowRoot): void {
  const dropZone = document.createElement('div');
  Object.assign(dropZone.style, {
    width: '300px',
    height: '200px',
    border: '3px dashed #4CAF50',
    borderRadius: '12px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: '#4CAF50',
    fontFamily: 'system-ui, sans-serif',
    fontSize: '16px',
    position: 'fixed',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    zIndex: '999999',
    pointerEvents: 'auto',
  });
  dropZone.textContent = 'Drop an image file here';

  dropZone.addEventListener('dragenter', (e) => {
    e.preventDefault();
    console.log('[drop-spike] dragenter fired ✅');
    dropZone.style.borderColor = '#2196F3';
    dropZone.style.backgroundColor = 'rgba(33, 150, 243, 0.1)';
  });

  dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    console.log('[drop-spike] dragover fired ✅');
  });

  dropZone.addEventListener('dragleave', () => {
    console.log('[drop-spike] dragleave fired ✅');
    dropZone.style.borderColor = '#4CAF50';
    dropZone.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';
  });

  dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    e.stopPropagation();
    console.log('[drop-spike] drop fired ✅');

    dropZone.style.borderColor = '#4CAF50';
    dropZone.style.backgroundColor = 'rgba(255, 255, 255, 0.95)';

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) {
      console.log('[drop-spike] No files in drop event');
      return;
    }

    const file = files[0]!;
    console.log('[drop-spike] File received:', file.name, file.type, file.size, 'bytes');

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      console.log('[drop-spike] FileReader.readAsDataURL OK, length:', dataUrl.length);
      console.log('[drop-spike] ✅ Full drop pipeline completed successfully!');
      dropZone.textContent = `✅ ${file.name} (${dataUrl.length} chars)`;
    };
    reader.onerror = () => {
      console.error('[drop-spike] FileReader error:', reader.error);
    };
    reader.readAsDataURL(file);
  });

  shadowRoot.appendChild(dropZone);
  console.log('[drop-spike] Drop zone mounted inside shadow root');
}
