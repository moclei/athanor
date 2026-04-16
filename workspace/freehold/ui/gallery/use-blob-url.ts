import { useEffect, useState } from 'react';
import * as imageStore from '../../image-store';

export type BlobUrlStatus = 'loading' | 'ready' | 'missing' | 'error';

/**
 * Hook: fetch a capture's Blob from IndexedDB and expose an object URL for it.
 * Revokes the URL on unmount or when the captureId changes. Yields `missing`
 * when the blob isn't present (pre-migration captures).
 */
export function useBlobUrl(captureId: string): { url: string | null; status: BlobUrlStatus } {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<BlobUrlStatus>('loading');

  useEffect(() => {
    let cancelled = false;
    let createdUrl: string | null = null;

    setUrl(null);
    setStatus('loading');

    imageStore
      .get(captureId)
      .then((blob) => {
        if (cancelled) return;
        if (!blob) {
          setStatus('missing');
          return;
        }
        createdUrl = URL.createObjectURL(blob);
        setUrl(createdUrl);
        setStatus('ready');
      })
      .catch(() => {
        if (cancelled) return;
        setStatus('error');
      });

    return () => {
      cancelled = true;
      if (createdUrl) URL.revokeObjectURL(createdUrl);
    };
  }, [captureId]);

  return { url, status };
}
