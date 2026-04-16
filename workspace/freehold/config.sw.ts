/**
 * Freehold Crann config — service-worker build.
 *
 * Same state schema as config.ts, but with real action handler implementations.
 * All service-worker-only modules are statically imported here, which is safe
 * because this file is only included in the service-worker Vite build.
 */
import { createConfig, Scope, Persist } from 'crann';
import { nanoid } from 'nanoid';
import { buildCaptureFilename, writeScreenshot } from './service-worker/downloads';

import { captureAndCrop } from './service-worker/capture';
import { buildDefaultTaxonomy } from './ui/taxonomy-defaults';
import type { ProjectData, Capture, SelectionRect, TaxonomyNode } from './types';

// ── Tree helpers ──────────────────────────────────────────────────────────

function findNodeInTree(nodes: TaxonomyNode[], id: string): TaxonomyNode | null {
  for (const node of nodes) {
    if (node.id === id) return node;
    const found = findNodeInTree(node.children, id);
    if (found) return found;
  }
  return null;
}

function removeNodeFromTree(nodes: TaxonomyNode[], id: string): [TaxonomyNode[], TaxonomyNode | null] {
  for (let i = 0; i < nodes.length; i++) {
    if (nodes[i]!.id === id) {
      const removed = nodes[i]!;
      return [[...nodes.slice(0, i), ...nodes.slice(i + 1)], removed];
    }
    const [updatedChildren, removed] = removeNodeFromTree(nodes[i]!.children, id);
    if (removed) {
      const updated = [...nodes];
      updated[i] = { ...nodes[i]!, children: updatedChildren };
      return [updated, removed];
    }
  }
  return [nodes, null];
}

function insertNodeInTree(
  nodes: TaxonomyNode[],
  parentId: string | null,
  node: TaxonomyNode,
  index: number,
): TaxonomyNode[] {
  if (parentId === null) {
    const result = [...nodes];
    result.splice(Math.min(index, result.length), 0, node);
    return result;
  }
  return nodes.map((n) => {
    if (n.id === parentId) {
      const children = [...n.children];
      children.splice(Math.min(index, children.length), 0, node);
      return { ...n, children };
    }
    return { ...n, children: insertNodeInTree(n.children, parentId, node, index) };
  });
}

function updateNodeInTree(
  nodes: TaxonomyNode[],
  id: string,
  update: Partial<TaxonomyNode>,
): TaxonomyNode[] {
  return nodes.map((n) => {
    if (n.id === id) return { ...n, ...update };
    return { ...n, children: updateNodeInTree(n.children, id, update) };
  });
}

function collectNodeIds(node: TaxonomyNode): string[] {
  return [node.id, ...node.children.flatMap(collectNodeIds)];
}

// ── Config ────────────────────────────────────────────────────────────────

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
      handler: async (ctx, args: { name: string; domain: string }) => {
        const id = nanoid();
        const project: ProjectData = {
          id,
          name: args.name,
          domain: args.domain,
          createdAt: new Date().toISOString(),
          taxonomy: buildDefaultTaxonomy(),
          captures: [],
        };
        const projects = { ...ctx.state.projects, [id]: project };
        await ctx.setState({ projects, activeProjectId: id });
      },
    },

    selectProject: {
      handler: async (ctx, projectId: string) => {
        await ctx.setState({ activeProjectId: projectId });
      },
    },

    deleteProject: {
      handler: async (ctx, projectId: string) => {
        const projects = { ...ctx.state.projects };
        delete projects[projectId];
        const activeProjectId =
          ctx.state.activeProjectId === projectId ? null : ctx.state.activeProjectId;
        await ctx.setState({ projects, activeProjectId });
      },
    },

    captureRegion: {
      handler: async (ctx, rect: SelectionRect) => {
        const activeProject = ctx.state.projects[ctx.state.activeProjectId!];
        if (!activeProject) return;

        const tabId = ctx.agentLocation?.tabId;
        if (tabId === undefined) return;

        const tab = await chrome.tabs.get(tabId);
        const { dataUrl } = await captureAndCrop(tabId, rect);

        const captureIndex = activeProject.captures.length + 1;
        const filename = buildCaptureFilename(captureIndex, []);

        await writeScreenshot(activeProject.name, filename, dataUrl);

        const capture: Capture = {
          id: nanoid(),
          timestamp: new Date().toISOString(),
          url: tab.url ?? '',
          pageTitle: tab.title ?? '',
          taxonomyNodeId: null,
          notes: '',
          filename,
        };

        const updatedProject: ProjectData = {
          ...activeProject,
          captures: [...activeProject.captures, capture],
        };
        const projects = { ...ctx.state.projects, [activeProject.id]: updatedProject };
        await ctx.setState({ projects });
      },
    },

    dropFile: {
      handler: async (ctx, args: { dataUrl: string; originalName: string }) => {
        const activeProject = ctx.state.projects[ctx.state.activeProjectId!];
        if (!activeProject) return;

        const tabId = ctx.agentLocation?.tabId;
        const tab = tabId !== undefined ? await chrome.tabs.get(tabId) : null;

        const captureIndex = activeProject.captures.length + 1;
        const filename = buildCaptureFilename(captureIndex, []);

        await writeScreenshot(activeProject.name, filename, args.dataUrl);

        const capture: Capture = {
          id: nanoid(),
          timestamp: new Date().toISOString(),
          url: tab?.url ?? '',
          pageTitle: tab?.title ?? '',
          taxonomyNodeId: null,
          notes: '',
          filename,
        };

        const updatedProject: ProjectData = {
          ...activeProject,
          captures: [...activeProject.captures, capture],
        };
        const projects = { ...ctx.state.projects, [activeProject.id]: updatedProject };
        await ctx.setState({ projects });
      },
    },

    updateCapture: {
      handler: async (ctx, args: { captureId: string; taxonomyNodeId?: string | null; notes?: string }) => {
        const activeProject = ctx.state.projects[ctx.state.activeProjectId!];
        if (!activeProject) return;

        const idx = activeProject.captures.findIndex((c: Capture) => c.id === args.captureId);
        if (idx === -1) return;

        const updatedCapture = { ...activeProject.captures[idx]! };
        if (args.taxonomyNodeId !== undefined) updatedCapture.taxonomyNodeId = args.taxonomyNodeId;
        if (args.notes !== undefined) updatedCapture.notes = args.notes;

        const captures = [...activeProject.captures];
        captures[idx] = updatedCapture;

        const updatedProject: ProjectData = { ...activeProject, captures };
        const projects = { ...ctx.state.projects, [activeProject.id]: updatedProject };
        await ctx.setState({ projects });
      },
    },

    addTaxonomyNode: {
      handler: async (ctx, args: { parentId: string | null; label: string }) => {
        const activeProject = ctx.state.projects[ctx.state.activeProjectId!];
        if (!activeProject) return;

        const newNode: TaxonomyNode = { id: nanoid(), label: args.label, children: [] };
        const taxonomy = insertNodeInTree(
          activeProject.taxonomy,
          args.parentId,
          newNode,
          args.parentId
            ? (findNodeInTree(activeProject.taxonomy, args.parentId)?.children.length ?? 0)
            : activeProject.taxonomy.length,
        );

        const updatedProject: ProjectData = { ...activeProject, taxonomy };
        const projects = { ...ctx.state.projects, [activeProject.id]: updatedProject };
        await ctx.setState({ projects });
      },
    },

    renameTaxonomyNode: {
      handler: async (ctx, args: { nodeId: string; label: string }) => {
        const activeProject = ctx.state.projects[ctx.state.activeProjectId!];
        if (!activeProject) return;

        const taxonomy = updateNodeInTree(activeProject.taxonomy, args.nodeId, { label: args.label });
        const updatedProject: ProjectData = { ...activeProject, taxonomy };
        const projects = { ...ctx.state.projects, [activeProject.id]: updatedProject };
        await ctx.setState({ projects });
      },
    },

    deleteTaxonomyNode: {
      handler: async (ctx, nodeId: string) => {
        const activeProject = ctx.state.projects[ctx.state.activeProjectId!];
        if (!activeProject) return;

        const existing = findNodeInTree(activeProject.taxonomy, nodeId);
        if (!existing) return;

        const orphanIds = new Set(collectNodeIds(existing));
        const [taxonomy] = removeNodeFromTree(activeProject.taxonomy, nodeId);
        const captures = activeProject.captures.map((c: Capture) =>
          orphanIds.has(c.taxonomyNodeId!) ? { ...c, taxonomyNodeId: null } : c,
        );

        const updatedProject: ProjectData = { ...activeProject, taxonomy, captures };
        const projects = { ...ctx.state.projects, [activeProject.id]: updatedProject };
        await ctx.setState({ projects });
      },
    },

    moveTaxonomyNode: {
      handler: async (ctx, args: { nodeId: string; newParentId: string | null; newIndex: number }) => {
        const activeProject = ctx.state.projects[ctx.state.activeProjectId!];
        if (!activeProject) return;

        const [withoutNode, removed] = removeNodeFromTree(activeProject.taxonomy, args.nodeId);
        if (!removed) return;

        const taxonomy = insertNodeInTree(withoutNode, args.newParentId, removed, args.newIndex);
        const updatedProject: ProjectData = { ...activeProject, taxonomy };
        const projects = { ...ctx.state.projects, [activeProject.id]: updatedProject };
        await ctx.setState({ projects });
      },
    },
  },
});

export type Config = typeof config;
