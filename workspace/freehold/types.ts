export interface ProjectData {
  id: string;
  name: string;
  domain: string;
  createdAt: string;
  taxonomy: TaxonomyNode[];
  captures: Capture[];
}

export interface Capture {
  id: string;
  timestamp: string;
  url: string;
  pageTitle: string;
  taxonomyNodeId: string | null;
  notes: string;
  filename: string;
}

export interface TaxonomyNode {
  id: string;
  label: string;
  children: TaxonomyNode[];
}

export interface SelectionRect {
  x: number;
  y: number;
  width: number;
  height: number;
  devicePixelRatio: number;
}
