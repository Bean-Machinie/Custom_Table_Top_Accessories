export interface ViewportGeometry {
  zoom: number;
  offsetX: number;
  offsetY: number;
}

export interface Point {
  x: number;
  y: number;
}

interface GeometryContext {
  documentRect: DOMRect;
}

export const clientToDocument = (
  point: Point,
  viewport: ViewportGeometry,
  context: GeometryContext
): Point => {
  const zoom = viewport.zoom || 1;
  return {
    x: (point.x - context.documentRect.left) / zoom,
    y: (point.y - context.documentRect.top) / zoom
  };
};

export const documentToClient = (
  point: Point,
  viewport: ViewportGeometry,
  context: GeometryContext
): Point => {
  const zoom = viewport.zoom || 1;
  return {
    x: context.documentRect.left + point.x * zoom,
    y: context.documentRect.top + point.y * zoom
  };
};
