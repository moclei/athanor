import { useCallback, useEffect, useRef, useState } from 'react';
import { useCrannActions } from '../hooks';

/**
 * Local-state notes editor with debounced persistence.
 *
 * Resets local state when `captureId` changes (e.g. modal switches captures)
 * or when `incomingNotes` changes from somewhere other than this editor
 * (e.g. an inline edit on a card while the modal is open for a different one).
 */
export function useDebouncedNotes(
  captureId: string,
  incomingNotes: string,
  delayMs = 500,
) {
  const { updateCapture } = useCrannActions();
  const [notes, setNotes] = useState(incomingNotes);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedRef = useRef(incomingNotes);

  // Sync local draft when the source of truth changes from outside our edits.
  useEffect(() => {
    if (incomingNotes !== lastSyncedRef.current) {
      lastSyncedRef.current = incomingNotes;
      setNotes(incomingNotes);
    }
  }, [incomingNotes]);

  // Reset on captureId switch.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    setNotes(incomingNotes);
    lastSyncedRef.current = incomingNotes;
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [captureId]);

  useEffect(() => {
    if (notes === incomingNotes) return;
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      lastSyncedRef.current = notes;
      updateCapture({ captureId, notes });
    }, delayMs);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [notes, incomingNotes, captureId, delayMs, updateCapture]);

  const flush = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    if (notes !== incomingNotes) {
      lastSyncedRef.current = notes;
      updateCapture({ captureId, notes });
    }
  }, [notes, incomingNotes, captureId, updateCapture]);

  return { notes, setNotes, flush };
}
