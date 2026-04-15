import { useState, useEffect, useCallback } from 'react';

/**
 * Typed hook for reading and writing a single chrome.storage.sync key.
 *
 * - Reads the stored value on mount; falls back to defaultValue if not set.
 * - Listens for external changes (other contexts writing the same key) and
 *   updates local state automatically.
 * - The returned setter writes to both React state and chrome.storage.sync
 *   immediately — add your own debounce if wiring to high-frequency inputs.
 *
 * Usage:
 *   const [theme, setTheme] = useStorage<'light' | 'dark'>('theme', 'dark');
 *
 * For structured settings objects, wrap this hook with a typed helper:
 *   export function useSettings() {
 *     return useStorage<MySettings>('mySettings', DEFAULT_SETTINGS);
 *   }
 */
export function useStorage<T>(
  key: string,
  defaultValue: T
): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  // Read from storage on mount
  useEffect(() => {
    chrome.storage.sync.get([key], (result) => {
      if (result[key] !== undefined) {
        // Merge with defaultValue so new fields added in future versions
        // are present even when old data is stored.
        if (
          typeof defaultValue === 'object' &&
          defaultValue !== null &&
          !Array.isArray(defaultValue)
        ) {
          setValue({ ...defaultValue, ...result[key] } as T);
        } else {
          setValue(result[key] as T);
        }
      }
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Listen for changes from other extension contexts
  useEffect(() => {
    const handleChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === 'sync' && key in changes) {
        const change = changes[key];
        if (!change) return;
        const newValue = change.newValue as T;
        if (
          typeof defaultValue === 'object' &&
          defaultValue !== null &&
          !Array.isArray(defaultValue)
        ) {
          setValue({ ...defaultValue, ...newValue });
        } else {
          setValue(newValue);
        }
      }
    };

    chrome.storage.onChanged.addListener(handleChange);
    return () => {
      chrome.storage.onChanged.removeListener(handleChange);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const set = useCallback(
    (newValue: T) => {
      setValue(newValue);
      chrome.storage.sync.set({ [key]: newValue });
    },
    [key]
  );

  return [value, set];
}
