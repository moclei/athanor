import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useCrannState, useCrannActions } from '../hooks';
import { findTaxonomyPath } from '../../taxonomy-path';
import type { Capture, TaxonomyNode } from '../../types';

interface Props {
  capture: Capture;
}

export function CategoryPicker({ capture }: Props) {
  const [activeProjectId] = useCrannState('activeProjectId');
  const projects = useCrannState((s) => s.projects);
  const { updateCapture, quickAddTaxonomyAndAssign } = useCrannActions();

  const activeProject = activeProjectId ? projects[activeProjectId] : undefined;
  const taxonomy = activeProject?.taxonomy ?? [];

  const [isOpen, setIsOpen] = useState(false);
  // Group id whose "Add tag" row is currently expanded as an input. null when
  // no group has the inline form open.
  const [addingFor, setAddingFor] = useState<string | null>(null);
  const [addingLabel, setAddingLabel] = useState('');
  // Which top-level groups are currently expanded in the popover. All start
  // collapsed every time the popover opens.
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => new Set());

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  const currentLabel = capture.taxonomyNodeId
    ? findTaxonomyPath(taxonomy, capture.taxonomyNodeId)?.slice(-1)[0] ?? 'Uncategorized'
    : 'Uncategorized';

  const closePopover = useCallback(() => {
    setIsOpen(false);
    setAddingFor(null);
    setAddingLabel('');
    setExpandedGroups(new Set());
  }, []);

  const toggleGroup = useCallback((groupId: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  }, []);

  // Outside-click closes the popover. Listener attached to the shadow root
  // (not the host) so composedPath() can see nodes inside the closed shadow:
  // from a host-level listener, closed-shadow internals are filtered out of
  // the path and every inside-click would read as "outside".
  useEffect(() => {
    if (!isOpen) return;
    const popoverNode = popoverRef.current;
    if (!popoverNode) return;
    const root = popoverNode.getRootNode();
    if (!(root instanceof ShadowRoot) && !(root instanceof Document)) return;
    function handlePointerDown(e: Event) {
      const path = (e as PointerEvent).composedPath();
      if (popoverRef.current && path.includes(popoverRef.current)) return;
      if (triggerRef.current && path.includes(triggerRef.current)) return;
      closePopover();
    }
    root.addEventListener('pointerdown', handlePointerDown);
    return () => root.removeEventListener('pointerdown', handlePointerDown);
  }, [isOpen, closePopover]);

  function handleSelectNode(nodeId: string | null) {
    updateCapture({ captureId: capture.id, taxonomyNodeId: nodeId });
    closePopover();
  }

  function startAdd(groupId: string) {
    setAddingFor(groupId);
    setAddingLabel('');
  }

  function cancelAdd() {
    setAddingFor(null);
    setAddingLabel('');
  }

  async function commitAdd(parentId: string) {
    const label = addingLabel.trim();
    if (!label) {
      cancelAdd();
      return;
    }
    await quickAddTaxonomyAndAssign({ parentId, label, captureId: capture.id });
    closePopover();
  }

  return (
    <div className="fh-cat-wrapper">
      <button
        ref={triggerRef}
        type="button"
        className="fh-cat-trigger"
        onClick={() => setIsOpen((o) => !o)}
      >
        {currentLabel}
      </button>

      {isOpen && (
        <div ref={popoverRef} className="fh-cat-popover" role="listbox">
          <button
            type="button"
            className="fh-cat-option fh-cat-option--root"
            onClick={() => handleSelectNode(null)}
          >
            Uncategorized
          </button>

          {taxonomy.map((group) => (
            <CategoryGroup
              key={group.id}
              group={group}
              isExpanded={expandedGroups.has(group.id)}
              addingFor={addingFor}
              addingLabel={addingLabel}
              onToggle={toggleGroup}
              onSelect={handleSelectNode}
              onStartAdd={startAdd}
              onChangeAddLabel={setAddingLabel}
              onCommitAdd={commitAdd}
              onCancelAdd={cancelAdd}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface GroupProps {
  group: TaxonomyNode;
  isExpanded: boolean;
  addingFor: string | null;
  addingLabel: string;
  onToggle: (groupId: string) => void;
  onSelect: (nodeId: string | null) => void;
  onStartAdd: (groupId: string) => void;
  onChangeAddLabel: (value: string) => void;
  onCommitAdd: (parentId: string) => void | Promise<void>;
  onCancelAdd: () => void;
}

function CategoryGroup({
  group,
  isExpanded,
  addingFor,
  addingLabel,
  onToggle,
  onSelect,
  onStartAdd,
  onChangeAddLabel,
  onCommitAdd,
  onCancelAdd,
}: GroupProps) {
  const isAdding = addingFor === group.id;

  return (
    <div className="fh-cat-group">
      <button
        type="button"
        className="fh-cat-group-header"
        aria-expanded={isExpanded}
        onClick={() => onToggle(group.id)}
      >
        <span
          className={`fh-cat-chevron${isExpanded ? ' fh-cat-chevron--open' : ''}`}
          aria-hidden="true"
        >
          ▸
        </span>
        {group.label}
      </button>
      {isExpanded && (
        <>
          {group.children.map((child) => (
            <button
              key={child.id}
              type="button"
              className="fh-cat-option"
              onClick={() => onSelect(child.id)}
            >
              {child.label}
            </button>
          ))}
          {isAdding ? (
            <input
              type="text"
              className="fh-cat-add-input"
              autoFocus
              value={addingLabel}
              placeholder="New tag…"
              onChange={(e) => onChangeAddLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  void onCommitAdd(group.id);
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  onCancelAdd();
                }
              }}
              onBlur={onCancelAdd}
            />
          ) : (
            <button
              type="button"
              className="fh-cat-add-row"
              onClick={() => onStartAdd(group.id)}
            >
              + Add tag
            </button>
          )}
        </>
      )}
    </div>
  );
}
