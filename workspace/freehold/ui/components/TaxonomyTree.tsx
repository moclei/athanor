import React, { useState, useRef, useEffect } from 'react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useCrannState, useCrannActions } from '../hooks';
import type { TaxonomyNode } from '../../types';

interface TreeProps {
  nodes: TaxonomyNode[];
  parentId: string | null;
  depth: number;
  expandAll?: boolean;
  expandGeneration?: number;
}

export function TaxonomyTree({ nodes, parentId, depth, expandAll, expandGeneration }: TreeProps) {
  const { moveTaxonomyNode } = useCrannActions();
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const ids = nodes.map((n) => n.id);

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = ids.indexOf(active.id as string);
    const newIndex = ids.indexOf(over.id as string);
    if (oldIndex === -1 || newIndex === -1) return;

    moveTaxonomyNode({
      nodeId: active.id as string,
      newParentId: parentId,
      newIndex,
    });
  }

  if (nodes.length === 0) return null;

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={ids} strategy={verticalListSortingStrategy}>
        <div className="fh-tree-level" data-depth={depth}>
          {nodes.map((node) => (
            <TaxonomyTreeNode
              key={node.id}
              node={node}
              depth={depth}
              expandAll={expandAll}
              expandGeneration={expandGeneration}
            />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}

interface NodeProps {
  node: TaxonomyNode;
  depth: number;
  expandAll?: boolean;
  expandGeneration?: number;
}

function TaxonomyTreeNode({ node, depth, expandAll, expandGeneration }: NodeProps) {
  const { addTaxonomyNode, renameTaxonomyNode, deleteTaxonomyNode, moveTaxonomyNode } =
    useCrannActions();
  const projects = useCrannState((s) => s.projects);
  const [activeProjectId] = useCrannState('activeProjectId');

  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (expandGeneration !== undefined) {
      setExpanded(!!expandAll);
    }
  }, [expandGeneration]);
  const [isEditing, setIsEditing] = useState(false);
  const [editLabel, setEditLabel] = useState(node.label);
  const [menuOpen, setMenuOpen] = useState(false);
  const [moveMenuOpen, setMoveMenuOpen] = useState(false);
  const [isAddingChild, setIsAddingChild] = useState(false);
  const [childLabel, setChildLabel] = useState('');

  const inputRef = useRef<HTMLInputElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: node.id,
  });

  const style: React.CSSProperties = {
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const hasChildren = node.children.length > 0;

  function startRename() {
    setEditLabel(node.label);
    setIsEditing(true);
    setMenuOpen(false);
    requestAnimationFrame(() => inputRef.current?.select());
  }

  function commitRename() {
    const label = editLabel.trim();
    if (label && label !== node.label) {
      renameTaxonomyNode({ nodeId: node.id, label });
    }
    setIsEditing(false);
  }

  function handleRenameKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitRename();
    } else if (e.key === 'Escape') {
      setIsEditing(false);
    }
  }

  function handleDelete() {
    setMenuOpen(false);
    const confirmed = window.confirm(
      `Delete "${node.label}"${hasChildren ? ` and its ${node.children.length} children` : ''}?`
    );
    if (confirmed) {
      deleteTaxonomyNode(node.id);
    }
  }

  function handleAddChild(e: React.FormEvent) {
    e.preventDefault();
    const label = childLabel.trim();
    if (!label) return;
    addTaxonomyNode({ parentId: node.id, label });
    setChildLabel('');
    setIsAddingChild(false);
    setExpanded(true);
  }

  function startAddChild() {
    setMenuOpen(false);
    setIsAddingChild(true);
    setExpanded(true);
  }

  const activeProject = activeProjectId ? projects[activeProjectId] : undefined;
  const taxonomy = activeProject?.taxonomy ?? [];

  function collectMoveTargets(
    nodes: TaxonomyNode[],
    excludeId: string,
    prefix: string,
  ): { id: string | null; label: string }[] {
    const targets: { id: string | null; label: string }[] = [];
    for (const n of nodes) {
      if (n.id === excludeId) continue;
      const path = prefix ? `${prefix} > ${n.label}` : n.label;
      targets.push({ id: n.id, label: path });
      targets.push(...collectMoveTargets(n.children, excludeId, path));
    }
    return targets;
  }

  function handleMoveTo(targetId: string | null) {
    moveTaxonomyNode({ nodeId: node.id, newParentId: targetId, newIndex: 0 });
    setMoveMenuOpen(false);
    setMenuOpen(false);
  }

  return (
    <div ref={setNodeRef} style={style} className="fh-tree-node">
      <div className="fh-tree-row" style={{ paddingLeft: depth * 16 }}>
        <button
          className="fh-tree-toggle"
          onClick={() => setExpanded(!expanded)}
          style={{ visibility: hasChildren ? 'visible' : 'hidden' }}
        >
          {expanded ? '▼' : '▶'}
        </button>

        <div {...attributes} {...listeners} className="fh-tree-drag-handle" title="Drag to reorder">
          ⠿
        </div>

        {isEditing ? (
          <input
            ref={inputRef}
            className="fh-tree-rename-input"
            value={editLabel}
            onChange={(e) => setEditLabel(e.target.value)}
            onBlur={commitRename}
            onKeyDown={handleRenameKeyDown}
            autoFocus
          />
        ) : (
          <span className="fh-tree-label" onDoubleClick={startRename}>
            {node.label}
          </span>
        )}

        <div className="fh-tree-actions" ref={menuRef}>
          <button
            className="fh-tree-menu-btn"
            onClick={() => { setMenuOpen(!menuOpen); setMoveMenuOpen(false); }}
          >
            ⋮
          </button>
          {menuOpen && (
            <div className="fh-tree-menu">
              <button className="fh-tree-menu-item" onClick={startRename}>Rename</button>
              <button className="fh-tree-menu-item" onClick={startAddChild}>Add Child</button>
              <button
                className="fh-tree-menu-item"
                onClick={() => setMoveMenuOpen(!moveMenuOpen)}
              >
                Move to…
              </button>
              <button className="fh-tree-menu-item fh-tree-menu-item--danger" onClick={handleDelete}>
                Delete
              </button>
              {moveMenuOpen && (
                <div className="fh-tree-submenu">
                  <button
                    className="fh-tree-menu-item"
                    onClick={() => handleMoveTo(null)}
                  >
                    Root level
                  </button>
                  {collectMoveTargets(taxonomy, node.id, '').map((target) => (
                    <button
                      key={target.id}
                      className="fh-tree-menu-item"
                      onClick={() => handleMoveTo(target.id)}
                    >
                      {target.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {isAddingChild && (
        <form
          className="fh-inline-form"
          style={{ paddingLeft: (depth + 1) * 16 + 8 }}
          onSubmit={handleAddChild}
        >
          <input
            className="fh-input"
            type="text"
            placeholder="Child name"
            value={childLabel}
            onChange={(e) => setChildLabel(e.target.value)}
            autoFocus
          />
          <div className="fh-inline-form-actions">
            <button className="fh-btn fh-btn--primary" type="submit">Add</button>
            <button
              className="fh-btn fh-btn--secondary"
              type="button"
              onClick={() => { setIsAddingChild(false); setChildLabel(''); }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {expanded && hasChildren && (
        <TaxonomyTree
          nodes={node.children}
          parentId={node.id}
          depth={depth + 1}
          expandAll={expandAll}
          expandGeneration={expandGeneration}
        />
      )}
    </div>
  );
}
