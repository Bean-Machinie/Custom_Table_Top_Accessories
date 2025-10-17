export type LayerType = 'base' | 'image';

export interface Transform {
  x: number;
  y: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  width: number;
  height: number;
}

export interface Layer {
  id: string;
  name: string;
  type: LayerType;
  order: number;
  visible: boolean;
  locked: boolean;
  transform: Transform;
  assetUrl?: string;
  thumbnailUrl?: string;
}

export interface FrameMetadata {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
  revision: number;
}

export interface FrameDocument {
  id: string;
  width: number;
  height: number;
  dpi: number;
  baseColor: string;
  paperColor: string;
  layers: Layer[];
  metadata: FrameMetadata;
}

export interface EditorViewportState {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface CreateDocumentInput {
  name: string;
  width: number;
  height: number;
  dpi: number;
  baseColor: string;
  paperColor: string;
}

export interface DocumentStoreSnapshot {
  activeDocumentId: string | null;
  documents: Record<string, FrameDocument>;
}
