import { createCrannHooks } from 'crann/react';
import { config } from '../config';

/**
 * Crann React hooks for Freehold.
 * Copied from block: state/crann/hooks — import path adjusted.
 */

const IS_DEV = false;

export const {
  useCrannState,
  useCrannActions,
  useCrannReady,
  useAgent,
  CrannProvider,
} = createCrannHooks(config, { debug: IS_DEV });
