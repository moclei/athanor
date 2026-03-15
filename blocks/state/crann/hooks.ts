import { createCrannHooks } from 'crann/react';
import { config } from './config';

// Enable debug logging in development builds only.
// TODO: wire this to your build system (e.g. process.env.NODE_ENV === 'development').
const IS_DEV = false;

/**
 * Crann React hooks — created once and exported for use across all components.
 *
 * Import these hooks into any React component that needs to read or write state:
 *
 *   import { useCrannState, useCrannActions, useCrannReady } from '../hooks';
 *
 * Hook signatures:
 *
 *   useCrannReady(): boolean
 *     Returns true when the agent is connected to the store.
 *     Use this to gate rendering until state is available.
 *
 *   useCrannState('key'): [value, setter]
 *     Key form — returns a [value, setter] tuple, like useState.
 *     Triggers a re-render when the key changes.
 *
 *   useCrannState(s => s.key): value
 *     Selector form — returns the selected value only (no setter).
 *     Use when you only need to read, or when deriving from multiple keys.
 *
 *   useCrannActions(): { actionName: (...args) => Promise<result> }
 *     Returns stable action references. Calling an action triggers the
 *     corresponding handler in the service worker.
 *
 *   useAgent(): Agent
 *     Returns the raw Crann agent. Prefer the typed hooks above for most uses.
 *
 *   CrannProvider
 *     Optional React context provider. Not required in Crann v2 for typical
 *     usage — hooks connect directly without a provider wrapper.
 *     Use CrannProvider if you need to pass the agent via React context explicitly.
 *
 * Example usage in a component:
 *
 *   const isReady = useCrannReady();
 *   const [active, setActive] = useCrannState('active');
 *   const count = useCrannState(s => s.globalCount);
 *   const { openSettings } = useCrannActions();
 *
 *   if (!isReady) return null;
 *   return <button onClick={() => setActive(!active)}>Toggle</button>;
 */
export const {
  useCrannState,
  useCrannActions,
  useCrannReady,
  useAgent,
  CrannProvider,
} = createCrannHooks(config, { debug: IS_DEV });
