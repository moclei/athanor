import { createConfig, Scope, Persist } from 'crann';
import { nanoid } from 'nanoid';
import type { ProjectData, Capture, SelectionRect } from './types';

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
    default: {} as Record<string, ProjectData>,
    persist: Persist.Local,
  },

  actions: {
    createProject: {
      handler: async (ctx, args: { name: string; domain: string }) => {
        const { slugify, writeProjectJson } = await import('./service-worker/downloads');
        const id = nanoid();
        const project: ProjectData = {
          id,
          name: args.name,
          domain: args.domain,
          createdAt: new Date().toISOString(),
          taxonomy: [],
          captures: [],
        };
        const projects = { ...ctx.state.projects, [id]: project };
        await ctx.setState({ projects, activeProjectId: id });
        await writeProjectJson(slugify(args.name), project);
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
        const { captureAndCrop } = await import('./service-worker/capture');
        const { slugify, buildCaptureFilename, writeScreenshot, writeProjectJson } =
          await import('./service-worker/downloads');

        const activeProject = ctx.state.projects[ctx.state.activeProjectId!];
        if (!activeProject) return;

        const tabId = ctx.agentLocation?.tabId;
        if (tabId === undefined) return;

        const tab = await chrome.tabs.get(tabId);
        const { dataUrl } = await captureAndCrop(tabId, rect);

        const captureIndex = activeProject.captures.length + 1;
        const filename = buildCaptureFilename(captureIndex, []);
        const projectSlug = slugify(activeProject.name);

        await writeScreenshot(projectSlug, filename, dataUrl);

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
        await writeProjectJson(projectSlug, updatedProject);
      },
    },

    dropFile: {
      handler: async (ctx, args: { dataUrl: string; originalName: string }) => {
        const { slugify, buildCaptureFilename, writeScreenshot, writeProjectJson } =
          await import('./service-worker/downloads');

        const activeProject = ctx.state.projects[ctx.state.activeProjectId!];
        if (!activeProject) return;

        const tabId = ctx.agentLocation?.tabId;
        const tab = tabId !== undefined ? await chrome.tabs.get(tabId) : null;

        const captureIndex = activeProject.captures.length + 1;
        const filename = buildCaptureFilename(captureIndex, []);
        const projectSlug = slugify(activeProject.name);

        await writeScreenshot(projectSlug, filename, args.dataUrl);

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
        await writeProjectJson(projectSlug, updatedProject);
      },
    },

    updateCapture: {
      handler: async (ctx, args: { captureId: string; taxonomyNodeId?: string | null; notes?: string }) => {
        const { slugify, writeProjectJson } = await import('./service-worker/downloads');

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
        await writeProjectJson(slugify(activeProject.name), updatedProject);
      },
    },

    addTaxonomyNode: {
      handler: async (_ctx, _args: { parentId: string | null; label: string }) => {
        // Phase 4
      },
    },
    renameTaxonomyNode: {
      handler: async (_ctx, _args: { nodeId: string; label: string }) => {
        // Phase 4
      },
    },
    deleteTaxonomyNode: {
      handler: async (_ctx, _nodeId: string) => {
        // Phase 4
      },
    },
    moveTaxonomyNode: {
      handler: async (_ctx, _args: { nodeId: string; newParentId: string | null; newIndex: number }) => {
        // Phase 4
      },
    },
  },
});

export type Config = typeof config;
