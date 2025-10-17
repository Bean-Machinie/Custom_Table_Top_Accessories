import type { Layer } from '@shared/index';
import clsx from 'classnames';
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent as ReactDragEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode
} from 'react';

import { AddLayerButton } from './add-layer-button';
import {
  collectDescendantIds,
  flattenLayerTree,
  findLayerById,
  getLayerAncestors
} from '../../lib/layer-tree';
import { useEditorDispatch, useEditorState } from '../../stores/editor-store';

const ROW_HEIGHT = 40;
const INDENT_PER_LEVEL = 16;

interface LayersPanelProps {
  selectedLayerIds: string[];
  onSelectLayers: (updater: (current: string[]) => string[]) => void;
}

interface FlattenedRow {
  id: string;
  layer: Layer;
  depth: number;
  hasChildren: boolean;
  ancestors: Layer[];
}

interface DragState {
  layerId: string;
  overId: string | null;
  position: 'before' | 'after' | 'inside';
}

export const LayersPanel = ({ selectedLayerIds, onSelectLayers }: LayersPanelProps) => {
  const { activeDocumentId, documents } = useEditorState();
  const dispatch = useEditorDispatch();
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [pendingName, setPendingName] = useState('');
  const [anchorId, setAnchorId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState | null>(null);
  const [contextMenu, setContextMenu] = useState<{
    layerId: string;
    x: number;
    y: number;
  } | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const renameInputRef = useRef<HTMLInputElement | null>(null);

  const document = activeDocumentId ? documents[activeDocumentId] ?? null : null;

  const rows: FlattenedRow[] = useMemo(() => {
    if (!document) return [];
    const flattened = flattenLayerTree(document.layers);
    return flattened.map((entry) => ({
      id: entry.layer.id,
      layer: entry.layer,
      depth: entry.depth,
      hasChildren: entry.hasChildren,
      ancestors: getLayerAncestors(document.layers, entry.layer.id)
    }));
  }, [document]);

  const shouldVirtualize = rows.length > 200;
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: rows.length });

  useEffect(() => {
    if (!shouldVirtualize) {
      setVisibleRange({ start: 0, end: rows.length });
      return;
    }
    const container = scrollRef.current;
    if (!container) return;
    const handle = () => {
      const height = container.clientHeight || 1;
      const scrollTop = container.scrollTop;
      const start = Math.max(0, Math.floor(scrollTop / ROW_HEIGHT) - 5);
      const end = Math.min(rows.length, Math.ceil((scrollTop + height) / ROW_HEIGHT) + 5);
      setVisibleRange({ start, end });
    };
    handle();
    container.addEventListener('scroll', handle);
    return () => container.removeEventListener('scroll', handle);
  }, [rows.length, shouldVirtualize]);

  useEffect(() => {
    if (renamingId) {
      renameInputRef.current?.focus();
      renameInputRef.current?.select();
    }
  }, [renamingId]);

  useEffect(() => {
    if (!toast) return;
    const timeout = window.setTimeout(() => setToast(null), 2000);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const updateSelection = useCallback(
    (updater: (current: string[]) => string[]) => {
      const next = updater(selectedLayerIds);
      onSelectLayers(() => next);
      setAnchorId(next.length > 0 ? next[next.length - 1] : null);
    },
    [onSelectLayers, selectedLayerIds]
  );

  const handleSelect = useCallback(
    (layerId: string, event: ReactMouseEvent<HTMLButtonElement> | ReactMouseEvent<HTMLDivElement>) => {
      if (!document) return;
      if (event.shiftKey && anchorId) {
        const startIndex = rows.findIndex((row) => row.id === anchorId);
        const endIndex = rows.findIndex((row) => row.id === layerId);
        if (startIndex !== -1 && endIndex !== -1) {
          const [from, to] = startIndex < endIndex ? [startIndex, endIndex] : [endIndex, startIndex];
          const range = rows.slice(from, to + 1).map((row) => row.id);
          updateSelection(() => range);
          return;
        }
      }
      if (event.metaKey || event.ctrlKey) {
        updateSelection((current) => {
          if (current.includes(layerId)) {
            return current.filter((id) => id !== layerId);
          }
          return [...current, layerId];
        });
        return;
      }
      onSelectLayers(() => [layerId]);
      setAnchorId(layerId);
    },
    [anchorId, document, onSelectLayers, rows, updateSelection]
  );

  const commitRename = useCallback(() => {
    if (!document || !renamingId) return;
    const name = pendingName.trim();
    if (!name) {
      setRenamingId(null);
      return;
    }
    dispatch({
      type: 'update-layer',
      documentId: document.id,
      layerId: renamingId,
      layer: { name }
    });
    setRenamingId(null);
  }, [dispatch, document, pendingName, renamingId]);

  const cancelRename = useCallback(() => {
    setRenamingId(null);
  }, []);

  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      if (!document) return;
      if ((event.key === 'Delete' || event.key === 'Backspace') && selectedLayerIds.length > 0) {
        event.preventDefault();
        dispatch({ type: 'remove-layers', documentId: document.id, layerIds: selectedLayerIds });
        return;
      }
      if (event.key === 'F2' && selectedLayerIds.length === 1) {
        event.preventDefault();
        const layerId = selectedLayerIds[0];
        const layer = findLayerById(document.layers, layerId);
        if (!layer || layer.type === 'base') {
          setToast('Base Canvas cannot be renamed.');
          return;
        }
        setPendingName(layer.name);
        setRenamingId(layer.id);
        return;
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'g') {
        event.preventDefault();
        if (event.shiftKey) {
          if (selectedLayerIds.length === 1) {
            dispatch({ type: 'ungroup-layer', documentId: document.id, layerId: selectedLayerIds[0] });
          }
        } else if (selectedLayerIds.length >= 2) {
          dispatch({ type: 'group-layers', documentId: document.id, layerIds: selectedLayerIds });
        }
        return;
      }
      if ((event.metaKey || event.ctrlKey) && (event.key === 'ArrowUp' || event.key === 'ArrowDown')) {
        event.preventDefault();
        const direction = event.key === 'ArrowUp' ? -1 : 1;
        selectedLayerIds.forEach((layerId) => {
          const row = rows.find((entry) => entry.id === layerId);
          if (!row) return;
          const siblings = rows
            .filter((entry) => (entry.layer.parentId ?? null) === (row.layer.parentId ?? null))
            .sort((a, b) => a.layer.order - b.layer.order);
          const currentIndex = siblings.findIndex((entry) => entry.id === layerId);
          if (currentIndex === -1) return;
          let targetIndex: number;
          if (event.shiftKey) {
            targetIndex = direction < 0 ? 0 : siblings.length;
          } else {
            targetIndex = currentIndex + direction;
          }
          if (!event.shiftKey && (targetIndex < 0 || targetIndex >= siblings.length)) {
            return;
          }
          if (event.shiftKey) {
            dispatch({
              type: 'move-layer',
              documentId: document.id,
              layerId,
              targetParentId: row.layer.parentId ?? null,
              targetIndex
            });
            return;
          }
          const targetRow = siblings[targetIndex];
          const insertionIndex = direction > 0 ? targetRow.layer.order + 1 : targetRow.layer.order;
          dispatch({
            type: 'move-layer',
            documentId: document.id,
            layerId,
            targetParentId: row.layer.parentId ?? null,
            targetIndex: insertionIndex
          });
        });
      }
    },
    [dispatch, document, rows, selectedLayerIds]
  );

  const toggleVisibility = useCallback(
    (layer: Layer) => {
      if (!document) return;
      if (layer.type === 'base') {
        setToast('Base Canvas visibility is fixed.');
        return;
      }
      dispatch({
        type: 'update-layer',
        documentId: document.id,
        layerId: layer.id,
        layer: { visible: !layer.visible }
      });
    },
    [dispatch, document]
  );

  const toggleLock = useCallback(
    (layer: Layer) => {
      if (!document) return;
      if (layer.type === 'base') {
        setToast('Base Canvas is permanently locked.');
        return;
      }
      dispatch({
        type: 'update-layer',
        documentId: document.id,
        layerId: layer.id,
        layer: { locked: !layer.locked }
      });
    },
    [dispatch, document]
  );

  const beginRename = useCallback(
    (layer: Layer) => {
      if (layer.type === 'base') {
        setToast('Base Canvas cannot be renamed.');
        return;
      }
      setPendingName(layer.name);
      setRenamingId(layer.id);
    },
    []
  );

  const openContextMenu = useCallback((event: ReactMouseEvent<HTMLDivElement>, layerId: string) => {
    event.preventDefault();
    setContextMenu({ layerId, x: event.clientX, y: event.clientY });
  }, []);

  useEffect(() => {
    const close = () => setContextMenu(null);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setContextMenu(null);
      }
    };
    window.addEventListener('click', close);
    window.addEventListener('contextmenu', close);
    window.addEventListener('keydown', handleKey);
    return () => {
      window.removeEventListener('click', close);
      window.removeEventListener('contextmenu', close);
      window.removeEventListener('keydown', handleKey);
    };
  }, []);

  const handleDragStart = useCallback((layerId: string, event: ReactDragEvent<HTMLButtonElement>) => {
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('application/x-layer-id', layerId);
    setDragState({ layerId, overId: null, position: 'after' });
  }, []);

  const handleDragOverRow = useCallback((event: ReactDragEvent<HTMLDivElement>, row: FlattenedRow) => {
    if (!dragState) return;
    if (row.id === dragState.layerId) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const bounds = event.currentTarget.getBoundingClientRect();
    const offset = event.clientY - bounds.top;
    const position: DragState['position'] =
      row.layer.type === 'group' && offset > bounds.height * 0.33 && offset < bounds.height * 0.66
        ? 'inside'
        : offset < bounds.height / 2
          ? 'before'
          : 'after';
    setDragState((state) => (state ? { ...state, overId: row.id, position } : null));
  }, [dragState]);

  const handleDropRow = useCallback((event: ReactDragEvent<HTMLDivElement>, row: FlattenedRow) => {
    event.preventDefault();
    if (!document || !dragState) return;
    const sourceId = event.dataTransfer.getData('application/x-layer-id') || dragState.layerId;
    if (!sourceId) return;
    if (collectDescendantIds(document.layers, sourceId).includes(row.id)) {
      setToast('Cannot move a layer into its own children.');
      setDragState(null);
      return;
    }
    let targetParentId = row.layer.parentId ?? null;
    let targetIndex = row.layer.order;
    if (dragState.position === 'after') {
      targetIndex = row.layer.order + 1;
    }
    if (dragState.position === 'inside' && row.layer.type === 'group' && !row.layer.locked) {
      targetParentId = row.layer.id;
      targetIndex = 0;
    }
    dispatch({
      type: 'move-layer',
      documentId: document.id,
      layerId: sourceId,
      targetParentId,
      targetIndex
    });
    setDragState(null);
  }, [dispatch, document, dragState]);

  const handleDragEnd = useCallback(() => setDragState(null), []);

  const renderRows = () => {
    if (!document) {
      return (
        <div className="flex h-full items-center justify-center text-xs text-muted">
          No canvas open — choose File → New to begin.
        </div>
      );
    }
    if (rows.length <= 1) {
      return (
        <div className="flex h-full items-center justify-center px-6 text-center text-xs text-muted">
          Drop an image or click + Add Layer to get started.
        </div>
      );
    }

    const start = shouldVirtualize ? visibleRange.start : 0;
    const end = shouldVirtualize ? visibleRange.end : rows.length;
    const slice = rows.slice(start, end);

    return (
      <div
        role="tree"
        aria-label="Layers"
        tabIndex={0}
        onKeyDown={handleKeyDown}
        className="relative flex flex-col outline-none"
        style={{ paddingTop: shouldVirtualize ? start * ROW_HEIGHT : 0, paddingBottom: shouldVirtualize ? (rows.length - end) * ROW_HEIGHT : 0 }}
      >
        {slice.map((row) => {
          const selected = selectedLayerIds.includes(row.id);
          const lockedByAncestor = row.ancestors.some((ancestor) => ancestor.locked);
          const isLocked = row.layer.locked || lockedByAncestor;
          const showDropIndicator = dragState?.overId === row.id;
          const highlightInside = dragState?.overId === row.id && dragState.position === 'inside';
          const baseLabel = row.layer.type === 'base';
          const displayName = baseLabel ? 'Base Canvas • Locked' : row.layer.name;
          const paddingLeft = row.depth * INDENT_PER_LEVEL;

          return (
            <div
              key={row.id}
              role="treeitem"
              aria-selected={selected}
              aria-level={row.depth + 1}
              className={clsx(
                'group relative flex h-10 items-center gap-2 rounded-md px-2 transition-colors focus-within:outline focus-within:outline-2 focus-within:outline-accent/60',
                selected
                  ? 'bg-primary/10 ring-1 ring-inset ring-primary/40'
                  : highlightInside
                    ? 'bg-primary/5 ring-1 ring-inset ring-primary/30'
                    : 'hover:bg-surface/10',
                isLocked && 'opacity-70'
              )}
              style={{ marginLeft: paddingLeft }}
              onContextMenu={(event) => openContextMenu(event, row.id)}
              onDragOver={(event) => handleDragOverRow(event, row)}
              onDrop={(event) => handleDropRow(event, row)}
            >
              <button
                type="button"
                className={clsx(
                  'flex h-6 w-6 items-center justify-center rounded-md text-xs text-muted transition-opacity duration-150 group-hover:opacity-100 focus-visible:opacity-100',
                  isLocked ? 'cursor-not-allowed opacity-40' : 'cursor-grab opacity-0 hover:bg-surface/20'
                )}
                aria-label="Reorder layer"
                draggable={!isLocked}
                onDragStart={(event) => handleDragStart(row.id, event)}
                onDragEnd={handleDragEnd}
                disabled={isLocked}
                title={isLocked ? 'Layer is locked' : undefined}
                tabIndex={0}
              >
                <GripIcon />
              </button>
              <button
                type="button"
                className={clsx(
                  'flex h-6 w-6 items-center justify-center rounded-md transition',
                  row.layer.visible ? 'text-muted hover:bg-surface/20' : 'text-muted/60 hover:bg-surface/20'
                )}
                aria-label={row.layer.visible ? 'Hide layer' : 'Show layer'}
                onClick={() => toggleVisibility(row.layer)}
                tabIndex={0}
              >
                {row.layer.visible ? <EyeIcon /> : <EyeOffIcon />}
              </button>
              <div
                className="h-6 w-6 shrink-0 overflow-hidden rounded-sm border border-border/40 bg-[length:8px_8px]"
                style={{
                  backgroundImage: row.layer.assetUrl
                    ? undefined
                    : 'linear-gradient(45deg, rgba(255,255,255,0.08) 25%, transparent 25%), linear-gradient(-45deg, rgba(255,255,255,0.08) 25%, transparent 25%), linear-gradient(45deg, transparent 75%, rgba(255,255,255,0.08) 75%), linear-gradient(-45deg, transparent 75%, rgba(255,255,255,0.08) 75%)',
                  backgroundPosition: '0 0, 0 4px, 4px -4px, -4px 0'
                }}
              >
                {row.layer.assetUrl && (
                  <img src={row.layer.assetUrl} alt="" className="h-full w-full object-cover" />
                )}
              </div>
              {row.hasChildren ? (
                <button
                  type="button"
                  className="flex h-6 w-6 items-center justify-center rounded-md text-muted transition hover:bg-surface/20"
                  aria-label={row.layer.collapsed ? 'Expand group' : 'Collapse group'}
                  onClick={(event) => {
                    event.stopPropagation();
                    dispatch({
                      type: 'toggle-layer-collapse',
                      documentId: document.id,
                      layerId: row.id,
                      collapsed: !row.layer.collapsed
                    });
                  }}
                >
                  {row.layer.collapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
                </button>
              ) : (
                <span className="h-6 w-6" aria-hidden="true" />
              )}
              <button
                type="button"
                className={clsx(
                  'flex flex-1 items-center rounded-md px-2 py-1 text-left text-sm transition focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent/60',
                  selected ? 'text-primary' : 'text-surface'
                )}
                onDoubleClick={() => beginRename(row.layer)}
                onClick={(event) => handleSelect(row.id, event)}
              >
                <span className="truncate">
                  {renamingId === row.id ? (
                    <input
                      ref={renameInputRef}
                      value={pendingName}
                      onChange={(event) => setPendingName(event.target.value)}
                      onBlur={commitRename}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          commitRename();
                        }
                        if (event.key === 'Escape') {
                          cancelRename();
                        }
                      }}
                      className="w-full bg-transparent text-sm text-surface outline-none"
                    />
                  ) : (
                    displayName
                  )}
                </span>
              </button>
              <button
                type="button"
                className={clsx(
                  'flex h-6 w-6 items-center justify-center rounded-md transition',
                  isLocked ? 'text-muted/40 cursor-not-allowed' : 'text-muted hover:bg-surface/20'
                )}
                aria-label={row.layer.locked ? 'Unlock layer' : 'Lock layer'}
                onClick={() => toggleLock(row.layer)}
                disabled={isLocked}
              >
                {row.layer.locked ? <LockIcon /> : <UnlockIcon />}
              </button>
              {showDropIndicator && dragState?.position !== 'inside' && (
                <span
                  className="pointer-events-none absolute left-0 right-0 h-px bg-primary"
                  style={{
                    top: dragState.position === 'before' ? 0 : undefined,
                    bottom: dragState.position === 'after' ? 0 : undefined
                  }}
                />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <section className="relative flex h-full flex-1 flex-col overflow-hidden rounded-2xl bg-surface/20 text-surface shadow-lg">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-border/20 bg-background/70 px-4 py-3 text-xs font-semibold uppercase tracking-[0.3em] text-muted">
        {selectedLayerIds.length > 1 ? `${selectedLayerIds.length} SELECTED` : 'LAYERS'}
        <AddLayerButton variant="compact" />
      </header>
      <div ref={scrollRef} className="relative flex-1 overflow-auto px-2 py-2">
        {renderRows()}
      </div>
      <footer className="border-t border-border/10 px-4 py-3 text-[11px] text-muted">
        Drag to reorder, double-click to rename, right-click for actions.
      </footer>
      {toast && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 w-[min(90%,240px)] -translate-x-1/2 rounded-md border border-border/40 bg-background/80 px-3 py-2 text-center text-xs text-muted">
          {toast}
        </div>
      )}
      {contextMenu && document && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          layerId={contextMenu.layerId}
          documentId={document.id}
          selectedLayerIds={selectedLayerIds}
          onRename={beginRename}
          onDuplicate={(layerId) => dispatch({ type: 'duplicate-layer', documentId: document.id, layerId })}
          onDelete={(layerIds) => dispatch({ type: 'remove-layers', documentId: document.id, layerIds })}
          onGroup={(ids) => dispatch({ type: 'group-layers', documentId: document.id, layerIds: ids })}
          onUngroup={(layerId) => dispatch({ type: 'ungroup-layer', documentId: document.id, layerId })}
        />
      )}
    </section>
  );
};

interface ContextMenuProps {
  x: number;
  y: number;
  layerId: string;
  documentId: string;
  selectedLayerIds: string[];
  onRename: (layer: Layer) => void;
  onDuplicate: (layerId: string) => void;
  onDelete: (layerIds: string[]) => void;
  onGroup: (layerIds: string[]) => void;
  onUngroup: (layerId: string) => void;
}

const ContextMenu = ({
  x,
  y,
  layerId,
  selectedLayerIds,
  onRename,
  onDuplicate,
  onDelete,
  onGroup,
  onUngroup
}: ContextMenuProps) => {
  const { activeDocumentId, documents } = useEditorState();
  const document = activeDocumentId ? documents[activeDocumentId] ?? null : null;
  const layer = document ? findLayerById(document.layers, layerId) : null;
  if (!layer) return null;

  const selection = selectedLayerIds.includes(layerId) ? selectedLayerIds : [layerId];
  const canRename = layer.type !== 'base';
  const canDuplicate = layer.type !== 'base';
  const canDelete = selection.some((id) => findLayerById(document!.layers, id)?.type !== 'base');
  const canGroup =
    selection.length >= 2 && selection.every((id) => findLayerById(document!.layers, id)?.type !== 'base');
  const canUngroup = selection.length === 1 && layer.type === 'group';

  return (
    <div
      className="fixed z-50 min-w-[160px] rounded-md border border-border/40 bg-background/95 p-1 text-xs text-surface shadow-lg backdrop-blur"
      style={{ left: x + 4, top: y + 4 }}
      role="menu"
    >
      <MenuItem disabled={!canRename} onClick={() => canRename && onRename(layer)}>
        Rename
      </MenuItem>
      <MenuItem disabled={!canDuplicate} onClick={() => canDuplicate && onDuplicate(layer.id)}>
        Duplicate
      </MenuItem>
      <MenuItem disabled={!canGroup} onClick={() => canGroup && onGroup(selection)}>
        Group
      </MenuItem>
      <MenuItem disabled={!canUngroup} onClick={() => canUngroup && onUngroup(layer.id)}>
        Ungroup
      </MenuItem>
      <MenuItem disabled={!canDelete} tone="danger" onClick={() => canDelete && onDelete(selection)}>
        Delete
      </MenuItem>
    </div>
  );
};

const MenuItem = ({
  children,
  disabled,
  onClick,
  tone = 'default'
}: {
  children: ReactNode;
  disabled?: boolean;
  tone?: 'default' | 'danger';
  onClick: () => void;
}) => (
  <button
    type="button"
    className={clsx(
      'flex w-full items-center justify-between rounded-md px-3 py-2 text-left transition',
      disabled
        ? 'cursor-not-allowed text-muted/50'
        : tone === 'danger'
          ? 'text-danger hover:bg-danger/10'
          : 'hover:bg-surface/10'
    )}
    onClick={disabled ? undefined : onClick}
    role="menuitem"
    disabled={disabled}
  >
    {children}
  </button>
);

const GripIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path
      d="M3 2.5c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5.22.5.5.5Zm0 3c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5.22.5.5.5Zm0 3c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5.22.5.5.5Zm3-6c.28 0 .5-.22.5-.5S6.28 2 6 2s-.5.22-.5.5.22.5.5.5Zm0 3c.28 0 .5-.22.5-.5S6.28 5 6 5s-.5.22-.5.5.22.5.5.5Zm0 3c.28 0 .5-.22.5-.5s-.22-.5-.5-.5-.5.22-.5.5.22.5.5.5Z"
      fill="currentColor"
    />
  </svg>
);

const EyeIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M1.333 8c1.333-2.667 3.733-4.333 6.667-4.333S13.333 5.333 14.667 8c-1.334 2.667-3.734 4.333-6.667 4.333S2.666 10.667 1.333 8Zm6.667 2a2 2 0 1 0 0-4 2 2 0 0 0 0 4Z"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const EyeOffIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
    <path
      d="M2 2.667 13.333 14"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M4.007 4.68c-.998.69-1.853 1.645-2.674 3.32 1.333 2.667 3.733 4.333 6.667 4.333 1.01 0 1.95-.194 2.82-.56M11.433 10.1c.83-.61 1.61-1.46 2.567-3.1-1.333-2.667-3.733-4.333-6.667-4.333-.81 0-1.57.13-2.3.36"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const LockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M4.5 6V4.667a2.5 2.5 0 0 1 5 0V6m-6 0h7.333c.368 0 .667.299.667.667v4.666c0 .368-.299.667-.667.667H3.5a.667.667 0 0 1-.667-.667V6.667C2.833 6.299 3.132 6 3.5 6Zm3.5 2v2"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const UnlockIcon = () => (
  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
    <path
      d="M9.5 6V4.5a2.167 2.167 0 0 0-3.965-1.18"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
    />
    <path
      d="M3.5 6h7.333c.368 0 .667.299.667.667v4.666c0 .368-.299.667-.667.667H2.833A.667.667 0 0 1 2.166 11.333V6.667C2.166 6.299 2.465 6 2.833 6Zm3.5 2v2"
      stroke="currentColor"
      strokeWidth="1.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M4.5 3.5 7.5 6l-3 2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true">
    <path d="M3.5 4.5 6 7l2.5-2.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
