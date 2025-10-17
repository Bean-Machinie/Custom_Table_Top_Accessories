# Playground UX Upgrade - Implementation Plan

## Overview
This outlines the comprehensive upgrade to the playground/canvas interaction system to meet professional-grade UX standards.

## Current State Analysis

### ✅ What Already Works
- Basic pan (middle-mouse, space+drag, right-click)
- Basic wheel zoom (Ctrl+wheel)
- Space key detection
- Viewport state persistence
- Layer selection and manipulation
- Grid rendering (basic CSS)
- ARIA live region for zoom announcements

### ❌ What Needs Implementation/Enhancement

#### 1. Zoom System (MAJOR)
- ❌ Cursor-anchored zoom (point under cursor stays stable)
- ❌ Smooth interpolation with easing
- ❌ Zoom presets (Fit, Fill, 100%)
- ❌ Keyboard shortcuts (Ctrl+/-, Ctrl+0, Ctrl+1)
- ❌ Zoom range enforcement (5% → 800%)
- ❌ Motion-reduced animation support

#### 2. Pan System (MODERATE)
- ✅ Space-to-pan works
- ❌ Hand cursor when panning
- ❌ Inertial scrolling / ease-out
- ❌ Elastic bounds resistance
- ❌ Pan lock toggle

#### 3. Bottom HUD Bar (MAJOR - NEW COMPONENT)
- ❌ Complete new component needed
- ❌ Tool toggles (Pan with space sync)
- ❌ Zoom controls + editable readout
- ❌ Status displays (cursor pos, canvas size)
- ❌ Quick actions (Center, Reset, Toggle Grid/Rulers)
- ❌ Floating, non-intrusive positioning
- ❌ Keyboard accessible

#### 4. Minimap (MAJOR)
- ✅ Placeholder exists
- ❌ Live viewport rectangle rendering
- ❌ Click-to-jump interaction
- ❌ Drag-to-navigate
- ❌ Real-time sync with pan/zoom
- ❌ Canvas scaling awareness

#### 5. Grid System (MODERATE)
- ✅ Basic CSS grid works
- ❌ Level-of-detail (LOD) scaling
- ❌ No moiré patterns
- ❌ Crisp at all zoom levels
- ❌ Subdivisions when zoomed in

#### 6. Center-on-Load (MODERATE)
- ❌ Fit-to-screen with margin on document open
- ❌ Window resize handling with re-center
- ❌ Persistent view restoration

#### 7. Keyboard & Accessibility (MODERATE)
- ✅ Arrow keys work for layers
- ✅ Basic ARIA live region
- ❌ Ctrl+/- for zoom
- ❌ Ctrl+0 for Fit
- ❌ Ctrl+1 for 100%
- ❌ Focus management for HUD
- ❌ Screen reader announcements for tools

#### 8. Performance (MINOR - OPTIMIZATION)
- ✅ GPU-friendly transforms used
- ❌ Input event coalescing
- ❌ Crisp pixel snapping during movement
- ❌ 60 FPS monitoring
- ❌ Grid LOD to prevent frame drops

## Implementation Priority (Phases)

### Phase 1: Critical Core (Week 1)
**Goal**: Professional zoom/pan feel

1. **Cursor-anchored zoom** with smooth easing
   - Files: `playground.tsx`, `viewport-store.tsx`
   - Impact: High

2. **Improved pan with inertia**
   - Files: `playground.tsx`
   - Impact: High

3. **Bottom HUD Bar** (basic version)
   - Files: NEW `components/editor/playground-hud.tsx`
   - Impact: High

4. **Zoom keyboard shortcuts**
   - Files: `playground.tsx`
   - Impact: Medium

**Deliverable**: Smooth, professional zoom/pan + basic HUD

### Phase 2: Navigation & Discovery (Week 2)
**Goal**: Never get lost

5. **Center-on-load with fit-to-screen**
   - Files: `playground.tsx`, `viewport-store.tsx`
   - Impact: High

6. **Enhanced minimap** with click/drag
   - Files: `features/minimap/minimap.tsx` (replace placeholder)
   - Impact: High

7. **Elastic bounds**
   - Files: `playground.tsx`
   - Impact: Medium

**Deliverable**: Always-oriented, never-lost navigation

### Phase 3: Polish & Performance (Week 3)
**Goal**: 60 FPS, crisp rendering

8. **LOD Grid System**
   - Files: NEW `components/editor/grid-renderer.tsx`
   - Impact: Medium

9. **Performance optimizations**
   - Input coalescing
   - Pixel snapping
   - Frame budget monitoring
   - Files: `playground.tsx`
   - Impact: Medium

10. **Accessibility enhancements**
    - Full keyboard navigation
    - Screen reader support
    - Focus management
    - Files: `playground.tsx`, `playground-hud.tsx`
    - Impact: Medium

**Deliverable**: Silky-smooth 60 FPS, fully accessible

## File Structure (New/Modified)

```
web/src/
├── components/
│   └── editor/
│       ├── playground.tsx              # MAJOR UPDATE
│       ├── playground-hud.tsx          # NEW
│       ├── grid-renderer.tsx           # NEW (or inline)
│       └── layer-node.tsx              # EXTRACT (optional refactor)
├── features/
│   ├── minimap/
│   │   ├── minimap.tsx                 # NEW (replace placeholder)
│   │   └── minimap-placeholder.tsx     # DELETE
│   └── viewports/
│       └── viewport-controls.tsx       # MODERATE UPDATE
├── stores/
│   └── viewport-store.tsx              # MODERATE UPDATE (add presets)
├── hooks/
│   ├── use-cursor-zoom.ts              # NEW
│   ├── use-inertial-pan.ts             # NEW
│   └── use-performance-monitor.ts      # NEW (optional)
└── lib/
    ├── zoom-utils.ts                   # NEW
    └── bounds-utils.ts                 # NEW
```

## Technical Approach

### Cursor-Anchored Zoom
```typescript
// Zoom about a specific point
const zoomAboutPoint = (
  currentZoom: number,
  targetZoom: number,
  cursorX: number,
  cursorY: number,
  offsetX: number,
  offsetY: number,
  containerWidth: number,
  containerHeight: number
) => {
  // Convert cursor position to canvas space
  const canvasX = (cursorX - containerWidth / 2 - offsetX) / currentZoom;
  const canvasY = (cursorY - containerHeight / 2 - offsetY) / currentZoom;

  // Calculate new offsets to keep canvas point under cursor
  const newOffsetX = cursorX - containerWidth / 2 - canvasX * targetZoom;
  const newOffsetY = cursorY - containerHeight / 2 - canvasY * targetZoom;

  return { zoom: targetZoom, offsetX: newOffsetX, offsetY: newOffsetY };
};
```

### Inertial Pan
```typescript
// Track velocity, apply ease-out after release
const usePanVelocity = () => {
  const velocityRef = useRef({ x: 0, y: 0 });
  const lastMoveTime = useRef(0);

  const updateVelocity = (dx: number, dy: number, dt: number) => {
    velocityRef.current = { x: dx / dt, y: dy / dt };
  };

  const applyInertia = (onUpdate: (dx: number, dy: number) => void) => {
    // Ease out with requestAnimationFrame
    // ...
  };
};
```

### LOD Grid
```typescript
// Choose grid size based on zoom level
const getGridSize = (zoom: number) => {
  if (zoom < 0.25) return 100;      // Large cells
  if (zoom < 0.5) return 50;
  if (zoom < 1) return 24;          // Base
  if (zoom < 2) return 12;          // Subdivisions
  return 6;                         // Fine detail
};
```