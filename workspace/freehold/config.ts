import { createConfig, Scope, Persist } from 'crann';

/**
 * Crann state configuration for Freehold.
 * Copied from block: state/crann/config — customized for Freehold schema.
 *
 * Shared by service-worker (createStore) and content script (createCrannHooks).
 */
export const config = createConfig({
  name: 'freehold',

  active: {
    default: false,
    scope: Scope.Agent,
  },

  activeProjectId: {
    default: null as string | null,
    persist: Persist.Local,
  },

  projects: {
    default: {} as Record<string, import('./types').ProjectData>,
    persist: Persist.Local,
  },

  actions: {
    createProject: {
      handler: async (_ctx, _args: { name: string; domain: string }) => {
        // Implemented in Phase 2
      },
    },
    selectProject: {
      handler: async (_ctx, _projectId: string) => {
        // Implemented in Phase 2
      },
    },
    deleteProject: {
      handler: async (_ctx, _projectId: string) => {
        // Implemented in Phase 2
      },
    },
    captureRegion: {
      handler: async (_ctx, _rect: import('./types').SelectionRect) => {
        // Implemented in Phase 2
      },
    },
    dropFile: {
      handler: async (_ctx, _args: { dataUrl: string; originalName: string }) => {
        // Implemented in Phase 2
      },
    },
    updateCapture: {
      handler: async (_ctx, _args: { captureId: string; taxonomyNodeId?: string | null; notes?: string }) => {
        // Implemented in Phase 2
      },
    },
    addTaxonomyNode: {
      handler: async (_ctx, _args: { parentId: string | null; label: string }) => {
        // Implemented in Phase 4
      },
    },
    renameTaxonomyNode: {
      handler: async (_ctx, _args: { nodeId: string; label: string }) => {
        // Implemented in Phase 4
      },
    },
    deleteTaxonomyNode: {
      handler: async (_ctx, _nodeId: string) => {
        // Implemented in Phase 4
      },
    },
    moveTaxonomyNode: {
      handler: async (_ctx, _args: { nodeId: string; newParentId: string | null; newIndex: number }) => {
        // Implemented in Phase 4
      },
    },
  },
});

export type Config = typeof config;
