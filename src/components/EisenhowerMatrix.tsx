"use client";

import { useState, useMemo, useCallback } from "react";
import {
  DndContext,
  DragOverlay,
  closestCenter,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  type Quadrant,
  QUADRANT_CONFIG,
  getQuadrantForTask,
} from "@/lib/eisenhower";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Task {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: string;
  progress: number;
  isImportant: boolean;
  estimatedPomodoros: number;
  category: string;
  sortOrder: number;
  startedAt: string | null;
  subtasks: Array<{
    id: string;
    title: string;
    completed: boolean;
    sortOrder: number;
  }>;
}

interface EisenhowerMatrixProps {
  tasks: Task[];
  urgentCutoffDays: number;
  categoryColors?: Record<string, string>;
  onImportanceChange: (taskId: string, isImportant: boolean) => void;
  onReorder: (items: Array<{ id: string; sortOrder: number }>) => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleSubtask: (
    taskId: string,
    subtaskId: string,
    completed: boolean,
  ) => void;
  onExpand: (taskId: string) => void;
  expandedTaskId: string | null;
  readOnly?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const QUADRANT_ORDER: Quadrant[] = [
  "do_first",
  "schedule",
  "delegate",
  "eliminate",
];

const LEFT_QUADRANTS: Quadrant[] = ["do_first", "delegate"];
const RIGHT_QUADRANTS: Quadrant[] = ["schedule", "eliminate"];

function isLeftColumn(q: Quadrant) {
  return LEFT_QUADRANTS.includes(q);
}

function relativeDueDate(dateStr: string): string {
  const due = new Date(dateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return `${Math.abs(diffDays)}d overdue`;
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays <= 7) return `${diffDays}d left`;
  if (diffDays <= 30) return `${Math.ceil(diffDays / 7)}w left`;
  return `${Math.ceil(diffDays / 30)}mo left`;
}

// ---------------------------------------------------------------------------
// SortableTaskItem
// ---------------------------------------------------------------------------

interface SortableTaskItemProps {
  task: Task;
  categoryColors?: Record<string, string>;
  quadrant: Quadrant;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleSubtask: (
    taskId: string,
    subtaskId: string,
    completed: boolean,
  ) => void;
  onExpand: (taskId: string) => void;
  isExpanded: boolean;
  readOnly: boolean;
}

function SortableTaskItem({
  task,
  categoryColors,
  quadrant,
  onEdit,
  onDelete,
  onToggleSubtask,
  onExpand,
  isExpanded,
  readOnly,
}: SortableTaskItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id, disabled: readOnly });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isCompleted = task.status === "completed";
  const config = QUADRANT_CONFIG[quadrant];
  const catColor = categoryColors?.[task.category] ?? "#94a3b8";

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-lg border bg-white p-3 shadow-sm transition-shadow hover:shadow-md ${
        isCompleted ? "opacity-60" : ""
      } ${isDragging ? "z-50 shadow-lg ring-2 ring-offset-1" : ""}`}
    >
      {/* Top row: drag handle + title + actions */}
      <div className="flex items-start gap-2">
        {/* Drag handle */}
        {!readOnly && (
          <button
            {...attributes}
            {...listeners}
            className="mt-0.5 shrink-0 cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
            aria-label="Drag to reorder"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="9" cy="5" r="1" />
              <circle cx="9" cy="12" r="1" />
              <circle cx="9" cy="19" r="1" />
              <circle cx="15" cy="5" r="1" />
              <circle cx="15" cy="12" r="1" />
              <circle cx="15" cy="19" r="1" />
            </svg>
          </button>
        )}

        {/* Title & meta */}
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm font-medium leading-tight ${
              isCompleted ? "text-gray-400 line-through" : "text-gray-900"
            }`}
          >
            {task.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {/* Due date */}
            <span className="text-[11px] text-gray-500">
              {relativeDueDate(task.dueDate)}
            </span>
            {/* Category pill */}
            {task.category && (
              <span
                className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none text-white"
                style={{ backgroundColor: catColor }}
              >
                {task.category}
              </span>
            )}
            {/* Pomodoro count */}
            {task.estimatedPomodoros > 0 && (
              <span className="text-[11px] text-gray-400">
                {task.estimatedPomodoros}p
              </span>
            )}
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
          {!readOnly && (
            <>
              <button
                onClick={() => onEdit(task)}
                className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Edit task"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
              </button>
              <button
                onClick={() => onDelete(task.id)}
                className="rounded p-1 text-gray-400 hover:bg-red-50 hover:text-red-500"
                aria-label="Delete task"
              >
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
              </button>
            </>
          )}
          <button
            onClick={() => onExpand(task.id)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label={isExpanded ? "Collapse" : "Expand"}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
        </div>
      </div>

      {/* Progress bar */}
      {task.progress > 0 && (
        <div className="mt-2 h-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className="h-full rounded-full transition-all duration-300"
            style={{
              width: `${task.progress}%`,
              backgroundColor: config.color,
            }}
          />
        </div>
      )}

      {/* Expanded: subtasks */}
      {isExpanded && task.subtasks.length > 0 && (
        <div className="mt-2 space-y-1 border-t border-gray-100 pt-2">
          {[...task.subtasks]
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((st) => (
              <label
                key={st.id}
                className="flex cursor-pointer items-center gap-2 rounded px-1 py-0.5 text-xs hover:bg-gray-50"
              >
                <input
                  type="checkbox"
                  checked={st.completed}
                  onChange={(e) =>
                    onToggleSubtask(task.id, st.id, e.target.checked)
                  }
                  disabled={readOnly}
                  className="h-3.5 w-3.5 rounded border-gray-300"
                  style={{ accentColor: config.color }}
                />
                <span
                  className={
                    st.completed ? "text-gray-400 line-through" : "text-gray-700"
                  }
                >
                  {st.title}
                </span>
              </label>
            ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Ghost card for DragOverlay
// ---------------------------------------------------------------------------

function DragGhostCard({
  task,
  categoryColors,
}: {
  task: Task;
  categoryColors?: Record<string, string>;
}) {
  const catColor = categoryColors?.[task.category] ?? "#94a3b8";

  return (
    <div className="w-64 rounded-lg border border-gray-200 bg-white p-3 shadow-xl ring-2 ring-blue-400/30">
      <p className="truncate text-sm font-medium text-gray-900">{task.title}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-[11px] text-gray-500">
          {relativeDueDate(task.dueDate)}
        </span>
        {task.category && (
          <span
            className="inline-flex rounded-full px-1.5 py-0.5 text-[10px] font-medium leading-none text-white"
            style={{ backgroundColor: catColor }}
          >
            {task.category}
          </span>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// QuadrantPanel
// ---------------------------------------------------------------------------

interface QuadrantPanelProps {
  quadrant: Quadrant;
  tasks: Task[];
  categoryColors?: Record<string, string>;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onToggleSubtask: (
    taskId: string,
    subtaskId: string,
    completed: boolean,
  ) => void;
  onExpand: (taskId: string) => void;
  expandedTaskId: string | null;
  readOnly: boolean;
  isOver: boolean;
}

function QuadrantPanel({
  quadrant,
  tasks,
  categoryColors,
  onEdit,
  onDelete,
  onToggleSubtask,
  onExpand,
  expandedTaskId,
  readOnly,
  isOver,
}: QuadrantPanelProps) {
  const config = QUADRANT_CONFIG[quadrant];
  const sorted = useMemo(
    () => [...tasks].sort((a, b) => a.sortOrder - b.sortOrder),
    [tasks],
  );
  const ids = useMemo(() => sorted.map((t) => t.id), [sorted]);

  return (
    <div
      className={`flex flex-col overflow-hidden rounded-xl border transition-colors duration-200 ${config.border} ${
        isOver ? "ring-2 ring-offset-1" : ""
      }`}
      style={isOver ? { borderColor: config.color, outlineColor: config.color } : undefined}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 px-4 py-2.5"
        style={{ backgroundColor: config.color }}
      >
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d={config.icon} />
        </svg>
        <div className="flex-1">
          <h3 className="text-sm font-bold tracking-wide text-white">
            {config.label}
          </h3>
          <p className="text-[11px] leading-none text-white/75">
            {config.subtitle}
          </p>
        </div>
        <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-white/20 px-1.5 text-xs font-semibold text-white">
          {tasks.length}
        </span>
      </div>

      {/* Task list */}
      <div
        className={`flex-1 space-y-2 p-3 ${config.bg}`}
        style={{ minHeight: 120 }}
        data-quadrant={quadrant}
      >
        <SortableContext items={ids} strategy={verticalListSortingStrategy}>
          {sorted.map((task) => (
            <SortableTaskItem
              key={task.id}
              task={task}
              categoryColors={categoryColors}
              quadrant={quadrant}
              onEdit={onEdit}
              onDelete={onDelete}
              onToggleSubtask={onToggleSubtask}
              onExpand={onExpand}
              isExpanded={expandedTaskId === task.id}
              readOnly={readOnly}
            />
          ))}
        </SortableContext>

        {tasks.length === 0 && (
          <div className="flex h-20 items-center justify-center">
            <p className="text-xs text-gray-400">
              {readOnly ? "No tasks" : "Drag tasks here"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function EisenhowerMatrix({
  tasks,
  urgentCutoffDays,
  categoryColors,
  onImportanceChange,
  onReorder,
  onEdit,
  onDelete,
  onToggleSubtask,
  onExpand,
  expandedTaskId,
  readOnly = false,
}: EisenhowerMatrixProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overQuadrant, setOverQuadrant] = useState<Quadrant | null>(null);

  // Bucket tasks into quadrants
  const quadrantTasks = useMemo(() => {
    const buckets: Record<Quadrant, Task[]> = {
      do_first: [],
      schedule: [],
      delegate: [],
      eliminate: [],
    };
    for (const task of tasks) {
      const q = getQuadrantForTask(task, urgentCutoffDays);
      buckets[q].push(task);
    }
    return buckets;
  }, [tasks, urgentCutoffDays]);

  const activeTask = useMemo(
    () => (activeId ? tasks.find((t) => t.id === activeId) ?? null : null),
    [activeId, tasks],
  );

  // Find which quadrant a task currently belongs to
  const findQuadrant = useCallback(
    (taskId: string): Quadrant | null => {
      for (const q of QUADRANT_ORDER) {
        if (quadrantTasks[q].some((t) => t.id === taskId)) return q;
      }
      return null;
    },
    [quadrantTasks],
  );

  // -----------------------------------------------------------------------
  // DnD handlers
  // -----------------------------------------------------------------------

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  }, []);

  const handleDragOver = useCallback(
    (event: DragOverEvent) => {
      const { over } = event;
      if (!over) {
        setOverQuadrant(null);
        return;
      }

      // Determine which quadrant the cursor is over:
      // `over.id` is either a task id or a quadrant id
      const overId = over.id as string;
      if (QUADRANT_ORDER.includes(overId as Quadrant)) {
        setOverQuadrant(overId as Quadrant);
      } else {
        // It's a task — find which quadrant that task is in
        const q = findQuadrant(overId);
        setOverQuadrant(q);
      }
    },
    [findQuadrant],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveId(null);
      setOverQuadrant(null);

      if (!over) return;

      const draggedId = active.id as string;
      const draggedTask = tasks.find((t) => t.id === draggedId);
      if (!draggedTask) return;

      const sourceQuadrant = findQuadrant(draggedId);
      if (!sourceQuadrant) return;

      // Determine destination quadrant
      const overId = over.id as string;
      let destQuadrant: Quadrant | null;
      if (QUADRANT_ORDER.includes(overId as Quadrant)) {
        destQuadrant = overId as Quadrant;
      } else {
        destQuadrant = findQuadrant(overId);
      }
      if (!destQuadrant) return;

      // Check if importance changed (crossed left/right boundary)
      const sourceIsLeft = isLeftColumn(sourceQuadrant);
      const destIsLeft = isLeftColumn(destQuadrant);

      if (sourceIsLeft !== destIsLeft) {
        // Importance changed: left = important, right = not important
        onImportanceChange(draggedId, destIsLeft);
      }

      // Compute new sort orders in the destination quadrant
      const destTasks = [...quadrantTasks[destQuadrant]].sort(
        (a, b) => a.sortOrder - b.sortOrder,
      );

      // If same quadrant, reorder within
      if (sourceQuadrant === destQuadrant) {
        const oldIndex = destTasks.findIndex((t) => t.id === draggedId);
        let newIndex: number;

        if (overId === destQuadrant) {
          // Dropped on the quadrant container itself (end of list)
          newIndex = destTasks.length - 1;
        } else {
          newIndex = destTasks.findIndex((t) => t.id === overId);
        }

        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

        // Reorder: remove from old position, insert at new
        const reordered = [...destTasks];
        const [moved] = reordered.splice(oldIndex, 1);
        reordered.splice(newIndex, 0, moved);

        onReorder(reordered.map((t, i) => ({ id: t.id, sortOrder: i })));
      } else {
        // Moved between quadrants — the urgency dimension stays auto-calculated,
        // so we just append to the destination quadrant's sort order
        let insertIndex: number;
        if (overId === (destQuadrant as string)) {
          insertIndex = destTasks.length;
        } else {
          const targetIdx = destTasks.findIndex((t) => t.id === overId);
          insertIndex = targetIdx === -1 ? destTasks.length : targetIdx;
        }

        // Build new order: destination tasks + the moved task inserted
        const newOrder = [...destTasks];
        newOrder.splice(insertIndex, 0, draggedTask);

        onReorder(newOrder.map((t, i) => ({ id: t.id, sortOrder: i })));
      }
    },
    [tasks, quadrantTasks, findQuadrant, onImportanceChange, onReorder],
  );

  const handleDragCancel = useCallback(() => {
    setActiveId(null);
    setOverQuadrant(null);
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {QUADRANT_ORDER.map((q) => (
          <QuadrantPanel
            key={q}
            quadrant={q}
            tasks={quadrantTasks[q]}
            categoryColors={categoryColors}
            onEdit={onEdit}
            onDelete={onDelete}
            onToggleSubtask={onToggleSubtask}
            onExpand={onExpand}
            expandedTaskId={expandedTaskId}
            readOnly={readOnly}
            isOver={overQuadrant === q}
          />
        ))}
      </div>

      {/* Drag overlay (ghost card) */}
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        {activeTask ? (
          <DragGhostCard task={activeTask} categoryColors={categoryColors} />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
