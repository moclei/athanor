import { createConfig, Scope, Persist } from 'crann';
import type { ProjectData, Capture, SelectionRect, TaxonomyNode } from './types';

/**
 * Freehold Crann config — state schema + action stubs.
 *
 * Action handlers here are no-ops. They exist only to declare action names
 * and parameter types so the content-script RPC proxy is correctly typed.
 * The real implementations live in config.sw.ts (service-worker build only).
 */
export const config = createConfig({
  name: 'freehold',

  active: {
    default: false,
    scope: Scope.Agent,
  },

  initialized: {
    default: false,
    scope: Scope.Agent,
  },

  activeProjectId: {
    default: null as string | null,
    persist: Persist.Local,
  },

  projects: {
    default: {} as Record<string, ProjectData>,
    persist: Persist.Local,
  },

  actions: {
    createProject: {
      handler: async (_ctx, _args: { name: string; domain: string }) => {},
    },
    selectProject: {
      handler: async (_ctx, _projectId: string) => {},
    },
    deleteProject: {
      handler: async (_ctx, _projectId: string) => {},
    },
    captureRegion: {
      handler: async (_ctx, _rect: SelectionRect) => {},
    },
    dropFile: {
      handler: async (_ctx, _args: { dataUrl: string; originalName: string }) => {},
    },
    updateCapture: {
      handler: async (
        _ctx,
        _args: { captureId: string; taxonomyNodeId?: string | null; notes?: string },
      ) => {},
    },
    addTaxonomyNode: {
      handler: async (_ctx, _args: { parentId: string | null; label: string }) => {},
    },
    renameTaxonomyNode: {
      handler: async (_ctx, _args: { nodeId: string; label: string }) => {},
    },
    deleteTaxonomyNode: {
      handler: async (_ctx, _nodeId: string) => {},
    },
    moveTaxonomyNode: {
      handler: async (
        _ctx,
        _args: { nodeId: string; newParentId: string | null; newIndex: number },
      ) => {},
    },
    openGallery: {
      handler: async (_ctx) => {},
    },
  },
});

export type Config = typeof config;
