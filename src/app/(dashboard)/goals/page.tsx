"use client";

import { useState, useEffect, useCallback, useRef, KeyboardEvent } from "react";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import confetti from "canvas-confetti";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import EisenhowerMatrix from "@/components/EisenhowerMatrix";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Goal {
  id: string;
  title: string;
  completed: boolean;
  sortOrder: number;
}

interface MatrixTask {
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

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fireConfetti() {
  confetti({
    particleCount: 60,
    spread: 55,
    origin: { y: 0.7 },
    colors: ["#22c55e", "#3b82f6", "#a855f7", "#f59e0b"],
  });
}

function getMotivationalMessage(completed: number, total: number): string {
  if (total === 0) return "Set your first goal to get started!";
  const pct = Math.round((completed / total) * 100);
  if (pct === 100) return "All goals achieved! You're unstoppable!";
  if (pct >= 75) return "Almost there! Keep pushing!";
  if (pct >= 50) return "Halfway done! Great momentum!";
  if (pct >= 25) return "Making solid progress! Keep it up!";
  if (completed > 0) return "You've started! Every goal counts!";
  return "Time to crush some goals!";
}

// ---------------------------------------------------------------------------
// SortableGoalItem
// ---------------------------------------------------------------------------

interface SortableGoalItemProps {
  goal: Goal;
  onToggle: (id: string, completed: boolean) => void;
  onEdit: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

function SortableGoalItem({
  goal,
  onToggle,
  onEdit,
  onDelete,
}: SortableGoalItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(goal.title);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  function startEdit() {
    setEditText(goal.title);
    setEditing(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function saveEdit() {
    const trimmed = editText.trim();
    if (trimmed && trimmed !== goal.title) {
      onEdit(goal.id, trimmed);
    }
    setEditing(false);
  }

  function handleEditKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") saveEdit();
    if (e.key === "Escape") setEditing(false);
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group flex items-center gap-3 rounded-lg border bg-white px-4 py-3 shadow-sm transition-shadow hover:shadow-md ${
        isDragging ? "z-50 shadow-lg ring-2 ring-blue-300 ring-offset-1" : ""
      } ${goal.completed ? "opacity-60" : ""}`}
    >
      {/* Drag handle */}
      <button
        {...attributes}
        {...listeners}
        className="shrink-0 cursor-grab touch-none text-gray-300 hover:text-gray-500 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <svg
          width="16"
          height="16"
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

      {/* Checkbox */}
      <input
        type="checkbox"
        checked={goal.completed}
        onChange={(e) => onToggle(goal.id, e.target.checked)}
        className="h-5 w-5 shrink-0 rounded border-gray-300 text-green-600 focus:ring-green-500"
      />

      {/* Title / Edit input */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            type="text"
            value={editText}
            onChange={(e) => setEditText(e.target.value)}
            onBlur={saveEdit}
            onKeyDown={handleEditKeyDown}
            className="w-full rounded border border-blue-300 px-2 py-1 text-sm text-gray-900 outline-none focus:ring-2 focus:ring-blue-400"
          />
        ) : (
          <p
            className={`truncate text-sm font-medium ${
              goal.completed ? "text-gray-400 line-through" : "text-gray-900"
            }`}
          >
            {goal.title}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!editing && (
          <button
            onClick={startEdit}
            className="rounded p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            aria-label="Edit goal"
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
        )}
        {confirmDelete ? (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onDelete(goal.id)}
              className="rounded px-2 py-1 text-xs font-medium bg-red-600 text-white hover:bg-red-700"
            >
              Confirm
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              className="rounded px-2 py-1 text-xs font-medium border border-gray-300 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirmDelete(true)}
            className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
            aria-label="Delete goal"
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
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DragGhostGoal
// ---------------------------------------------------------------------------

function DragGhostGoal({ goal }: { goal: Goal }) {
  return (
    <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white px-4 py-3 shadow-xl ring-2 ring-blue-400/30">
      <input
        type="checkbox"
        checked={goal.completed}
        readOnly
        className="h-5 w-5 shrink-0 rounded border-gray-300"
      />
      <p className="truncate text-sm font-medium text-gray-900">{goal.title}</p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function GoalsPage() {
  // Goals state
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [newGoalText, setNewGoalText] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const [activeGoal, setActiveGoal] = useState<Goal | null>(null);

  // Matrix state
  const [matrixTasks, setMatrixTasks] = useState<MatrixTask[]>([]);
  const [urgentCutoffDays, setUrgentCutoffDays] = useState(7);
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>({});
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  // Toast
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  // -------------------------------------------------------------------------
  // Fetch goals
  // -------------------------------------------------------------------------

  const fetchGoals = useCallback(async () => {
    try {
      const res = await fetch("/api/goals");
      if (!res.ok) throw new Error("Failed to load goals");
      const data = await res.json();
      setGoals(data.goals);
    } catch {
      showToast("error", "Failed to load goals");
    } finally {
      setLoading(false);
    }
  }, []);

  // -------------------------------------------------------------------------
  // Fetch matrix data
  // -------------------------------------------------------------------------

  const fetchMatrixData = useCallback(async () => {
    try {
      const [assignRes, settingsRes] = await Promise.all([
        fetch("/api/assignments"),
        fetch("/api/settings"),
      ]);

      if (assignRes.ok) {
        const assignData = await assignRes.json();
        const assignments = assignData.assignments || [];
        const tasks: MatrixTask[] = assignments.map((a: Record<string, unknown>) => ({
          id: a.id as string,
          title: a.title as string,
          description: (a.description as string) || "",
          dueDate: a.dueDate as string,
          status: a.status as string,
          progress: (a.progress as number) || 0,
          isImportant: (a.isImportant as boolean) ?? true,
          estimatedPomodoros: (a.estimatedPomodoros as number) || 0,
          category: (a.category as string) || "",
          sortOrder: (a.sortOrder as number) || 0,
          startedAt: (a.startedAt as string) || null,
          subtasks: Array.isArray(a.subtasks) ? a.subtasks as MatrixTask["subtasks"] : [],
        }));
        setMatrixTasks(tasks);
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json();
        const s = settingsData.settings;
        if (s) {
          setUrgentCutoffDays(s.urgentCutoffDays ?? 7);
          if (s.categoryColors) {
            try {
              const parsed = typeof s.categoryColors === "string"
                ? JSON.parse(s.categoryColors)
                : s.categoryColors;
              setCategoryColors(parsed);
            } catch {
              // ignore invalid JSON
            }
          }
        }
      }
    } catch {
      // silently fail matrix data — it's supplementary
    }
  }, []);

  useEffect(() => {
    fetchGoals();
    fetchMatrixData();
  }, [fetchGoals, fetchMatrixData]);

  // -------------------------------------------------------------------------
  // Goal CRUD
  // -------------------------------------------------------------------------

  async function handleAddGoal() {
    const trimmed = newGoalText.trim();
    if (!trimmed) return;

    try {
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: trimmed }),
      });
      if (!res.ok) throw new Error("Failed to create goal");
      const data = await res.json();
      setGoals((prev) => [...prev, data.goal]);
      setNewGoalText("");
    } catch {
      showToast("error", "Failed to add goal");
    }
  }

  async function handleToggleGoal(id: string, completed: boolean) {
    // Optimistic update
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, completed } : g))
    );

    if (completed) fireConfetti();

    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      if (!res.ok) throw new Error("Failed to update goal");
    } catch {
      // Revert on failure
      setGoals((prev) =>
        prev.map((g) => (g.id === id ? { ...g, completed: !completed } : g))
      );
      showToast("error", "Failed to update goal");
    }
  }

  async function handleEditGoal(id: string, title: string) {
    setGoals((prev) =>
      prev.map((g) => (g.id === id ? { ...g, title } : g))
    );

    try {
      const res = await fetch(`/api/goals/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (!res.ok) throw new Error("Failed to update goal");
    } catch {
      showToast("error", "Failed to update goal");
      fetchGoals();
    }
  }

  async function handleDeleteGoal(id: string) {
    const prev = [...goals];
    setGoals((g) => g.filter((goal) => goal.id !== id));

    try {
      const res = await fetch(`/api/goals/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete goal");
    } catch {
      setGoals(prev);
      showToast("error", "Failed to delete goal");
    }
  }

  // -------------------------------------------------------------------------
  // Drag-to-reorder goals
  // -------------------------------------------------------------------------

  function handleDragStart(event: DragStartEvent) {
    const dragged = goals.find((g) => g.id === event.active.id);
    setActiveGoal(dragged ?? null);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveGoal(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = goals.findIndex((g) => g.id === active.id);
    const newIndex = goals.findIndex((g) => g.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = arrayMove(goals, oldIndex, newIndex);
    const withOrder = reordered.map((g, i) => ({ ...g, sortOrder: i }));
    setGoals(withOrder);

    try {
      await fetch("/api/goals/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: withOrder.map((g) => ({ id: g.id, sortOrder: g.sortOrder })),
        }),
      });
    } catch {
      showToast("error", "Failed to reorder goals");
      fetchGoals();
    }
  }

  // -------------------------------------------------------------------------
  // Eisenhower Matrix handlers
  // -------------------------------------------------------------------------

  async function handleImportanceChange(taskId: string, isImportant: boolean) {
    setMatrixTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, isImportant } : t))
    );

    try {
      await fetch(`/api/assignments/${taskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isImportant }),
      });
    } catch {
      fetchMatrixData();
    }
  }

  async function handleMatrixReorder(items: Array<{ id: string; sortOrder: number }>) {
    try {
      await fetch("/api/assignments/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
    } catch {
      // silently fail
    }
  }

  function handleMatrixEdit(task: MatrixTask) {
    window.location.href = `/assignments?edit=${task.id}`;
  }

  async function handleMatrixDelete(taskId: string) {
    setMatrixTasks((prev) => prev.filter((t) => t.id !== taskId));
    try {
      await fetch(`/api/assignments/${taskId}`, { method: "DELETE" });
    } catch {
      fetchMatrixData();
    }
  }

  async function handleToggleSubtask(
    taskId: string,
    subtaskId: string,
    completed: boolean
  ) {
    try {
      await fetch(`/api/assignments/${taskId}/subtasks/${subtaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ completed }),
      });
      fetchMatrixData();
    } catch {
      // silently fail
    }
  }

  function handleExpandTask(taskId: string) {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  }

  // -------------------------------------------------------------------------
  // Computed values
  // -------------------------------------------------------------------------

  const completedCount = goals.filter((g) => g.completed).length;
  const totalCount = goals.length;
  const displayGoals = showCompleted
    ? goals
    : goals.filter((g) => !g.completed);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        backgroundImage: "url(/images/goals-bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="min-h-screen bg-white/85 backdrop-blur-sm">
        <Navbar />
        <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Toast */}
          {toast && (
            <div
              className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
                toast.type === "success"
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              {toast.message}
            </div>
          )}

          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">
              Goals &amp; Planning
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              {getMotivationalMessage(completedCount, totalCount)}
            </p>
          </div>

          {/* ============================================================= */}
          {/* Goals Whiteboard Section                                        */}
          {/* ============================================================= */}
          <section className="mb-10 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-900">
                My Goals
              </h2>
              <div className="flex items-center gap-3">
                <span className="text-sm text-gray-500">
                  {completedCount}/{totalCount} goals achieved
                </span>
                <button
                  onClick={() => setShowCompleted((v) => !v)}
                  className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-50 transition-colors"
                >
                  {showCompleted ? "Hide completed" : "Show completed"}
                </button>
              </div>
            </div>

            {/* Progress bar */}
            {totalCount > 0 && (
              <div className="mb-4 h-2 overflow-hidden rounded-full bg-gray-100">
                <div
                  className="h-full rounded-full bg-green-500 transition-all duration-500"
                  style={{
                    width: `${Math.round((completedCount / totalCount) * 100)}%`,
                  }}
                />
              </div>
            )}

            {/* Loading */}
            {loading && (
              <div className="flex justify-center py-10">
                <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
              </div>
            )}

            {/* Goals list with DnD */}
            {!loading && (
              <DndContext
                collisionDetection={closestCenter}
                onDragStart={handleDragStart}
                onDragEnd={handleDragEnd}
              >
                <SortableContext
                  items={displayGoals.map((g) => g.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {displayGoals.map((goal) => (
                      <SortableGoalItem
                        key={goal.id}
                        goal={goal}
                        onToggle={handleToggleGoal}
                        onEdit={handleEditGoal}
                        onDelete={handleDeleteGoal}
                      />
                    ))}
                  </div>
                </SortableContext>

                <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
                  {activeGoal ? <DragGhostGoal goal={activeGoal} /> : null}
                </DragOverlay>
              </DndContext>
            )}

            {/* Empty state */}
            {!loading && goals.length === 0 && (
              <div className="py-8 text-center">
                <svg
                  className="mx-auto h-12 w-12 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                <p className="mt-3 text-sm text-gray-500">
                  No goals yet. Add your first one below!
                </p>
              </div>
            )}

            {/* Add goal input */}
            <div className="mt-4 flex gap-2">
              <input
                type="text"
                value={newGoalText}
                onChange={(e) => setNewGoalText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleAddGoal();
                }}
                placeholder="Add a new goal..."
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
              />
              <button
                onClick={handleAddGoal}
                disabled={!newGoalText.trim()}
                className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
              >
                <svg
                  className="mr-1.5 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Add Goal
              </button>
            </div>
          </section>

          {/* ============================================================= */}
          {/* Eisenhower Matrix Section                                       */}
          {/* ============================================================= */}
          <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Task Priority Matrix
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Drag tasks between quadrants to change importance. Urgency is
                calculated from due dates.
              </p>
            </div>

            {matrixTasks.length > 0 ? (
              <EisenhowerMatrix
                tasks={matrixTasks}
                urgentCutoffDays={urgentCutoffDays}
                categoryColors={categoryColors}
                onImportanceChange={handleImportanceChange}
                onReorder={handleMatrixReorder}
                onEdit={handleMatrixEdit}
                onDelete={handleMatrixDelete}
                onToggleSubtask={handleToggleSubtask}
                onExpand={handleExpandTask}
                expandedTaskId={expandedTaskId}
                readOnly={false}
              />
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <svg
                  className="h-12 w-12 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"
                  />
                </svg>
                <p className="mt-3 text-sm text-gray-500">
                  No assignments yet. Create assignments to see them in the
                  priority matrix.
                </p>
              </div>
            )}
          </section>
        </main>
        <Footer />
      </div>
    </div>
  );
}
