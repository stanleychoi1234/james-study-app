"use client";

import { useState, useEffect, useCallback } from "react";
import EisenhowerMatrix from "@/components/EisenhowerMatrix";
import TaskForm from "@/components/TaskForm";
import TaskEditModal from "@/components/TaskEditModal";
import SubtaskList from "@/components/SubtaskList";
import { fireSmallConfetti, fireBigConfetti } from "@/lib/confetti";
import { TASK_CATEGORIES, DEFAULT_CATEGORY_COLORS } from "@/lib/categories";
import { getQuadrantForTask, QUADRANT_CONFIG } from "@/lib/eisenhower";
import Navbar from "@/components/Navbar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Subtask {
  id: string;
  title: string;
  completed: boolean;
  sortOrder: number;
}

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
  emailEnabled: boolean;
  reminderEmail: string | null;
  ccEmails: string | null;
  reminderSchedule: string;
  recurType: string | null;
  recurEndDate: string | null;
  referenceCode?: string;
  subtasks: Subtask[];
}

type ViewMode = "matrix" | "list";
type SortMode = "dueDate" | "manual";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STATUS_LABELS: Record<string, string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

function formatDueDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
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

function getUrgencyColor(dateStr: string, status: string): string {
  if (status === "completed") return "border-l-green-500";
  const diffMs = new Date(dateStr).getTime() - Date.now();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 0) return "border-l-red-500";
  if (diffHours < 24) return "border-l-amber-500";
  if (diffHours < 72) return "border-l-yellow-400";
  return "border-l-emerald-500";
}

function getProgressColor(progress: number): string {
  if (progress >= 75) return "bg-green-500";
  if (progress >= 50) return "bg-blue-500";
  if (progress >= 25) return "bg-indigo-500";
  return "bg-gray-400";
}

function getCategoryBadgeStyle(category: string, colors: Record<string, string>): React.CSSProperties {
  const color = colors[category] || DEFAULT_CATEGORY_COLORS[category as keyof typeof DEFAULT_CATEGORY_COLORS] || "#6b7280";
  return {
    backgroundColor: `${color}18`,
    color,
    borderColor: `${color}40`,
  };
}

// ---------------------------------------------------------------------------
// Skeleton loader
// ---------------------------------------------------------------------------

function LoadingSkeleton() {
  return (
    <div className="space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-7 w-32 bg-gray-200 rounded" />
          <div className="h-4 w-48 bg-gray-100 rounded mt-2" />
        </div>
        <div className="h-10 w-28 bg-gray-200 rounded-lg" />
      </div>
      {/* Matrix skeleton */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-gray-200 p-4">
            <div className="h-5 w-24 bg-gray-200 rounded mb-3" />
            <div className="space-y-3">
              <div className="h-16 bg-gray-100 rounded-lg" />
              <div className="h-16 bg-gray-100 rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// List view card
// ---------------------------------------------------------------------------

function TaskListCard({
  task,
  categoryColors,
  expanded,
  onExpand,
  onEdit,
  onDelete,
  onToggleSubtask,
  onAddSubtask,
  onDeleteSubtask,
}: {
  task: Task;
  categoryColors: Record<string, string>;
  expanded: boolean;
  onExpand: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleSubtask: (taskId: string, subtaskId: string, completed: boolean) => void;
  onAddSubtask: (taskId: string, title: string) => void;
  onDeleteSubtask: (taskId: string, subtaskId: string) => void;
}) {
  const isCompleted = task.status === "completed";
  const subtaskCount = task.subtasks?.length || 0;
  const completedSubtasks = task.subtasks?.filter((s) => s.completed).length || 0;
  const dueRelative = relativeDueDate(task.dueDate);
  const isOverdue = dueRelative.includes("overdue");

  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${getUrgencyColor(
        task.dueDate,
        task.status
      )} transition-all hover:shadow-md`}
    >
      <div className="p-4 sm:p-5">
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3
                className={`font-semibold text-gray-900 ${
                  isCompleted ? "line-through text-gray-400" : ""
                }`}
              >
                {task.title}
              </h3>
              <span
                className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                  STATUS_STYLES[task.status] || "bg-gray-100 text-gray-700"
                }`}
              >
                {STATUS_LABELS[task.status] || task.status}
              </span>
              {task.category && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border"
                  style={getCategoryBadgeStyle(task.category, categoryColors)}
                >
                  {task.category}
                </span>
              )}
              {isOverdue && !isCompleted && (
                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
                  Overdue
                </span>
              )}
            </div>

            {task.description && (
              <p className="mt-1 text-sm text-gray-500 line-clamp-2">{task.description}</p>
            )}

            <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
              <span className="flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {formatDueDate(task.dueDate)}
              </span>
              <span className={isOverdue && !isCompleted ? "text-red-500 font-medium" : ""}>
                {dueRelative}
              </span>
              {subtaskCount > 0 && (
                <span>
                  {completedSubtasks}/{subtaskCount} subtasks
                </span>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-1 shrink-0">
            {subtaskCount > 0 && (
              <button
                onClick={onExpand}
                className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
                title={expanded ? "Collapse subtasks" : "Expand subtasks"}
              >
                <svg
                  className={`w-4 h-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            )}
            <button
              onClick={onEdit}
              className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              title="Edit task"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
            </button>
            <button
              onClick={onDelete}
              className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 transition-colors"
              title="Delete task"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Progress bar */}
        {subtaskCount > 0 && (
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${getProgressColor(task.progress)}`}
                  style={{ width: `${task.progress}%` }}
                />
              </div>
              <span className="text-xs text-gray-400 tabular-nums w-8 text-right">
                {task.progress}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Expanded subtask list */}
      {expanded && task.subtasks && (
        <div className="border-t border-gray-100 px-4 sm:px-5 py-3 bg-gray-50/50 rounded-b-xl">
          <SubtaskList
            taskId={task.id}
            subtasks={task.subtasks}
            onToggle={onToggleSubtask}
            onAdd={onAddSubtask}
            onDelete={onDeleteSubtask}
            progress={task.progress}
          />
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Page Component
// ---------------------------------------------------------------------------

export default function TasksPage() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [view, setView] = useState<ViewMode>("matrix");
  const [showCreate, setShowCreate] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [filter, setFilter] = useState({ category: "All", status: "All" });
  const [sortMode, setSortMode] = useState<SortMode>("dueDate");
  const [settings, setSettings] = useState<{
    urgentCutoffDays: number;
    categoryColors: Record<string, string>;
  }>({ urgentCutoffDays: 7, categoryColors: {} });
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // -------------------------------------------------------------------------
  // Data fetching
  // -------------------------------------------------------------------------

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/assignments");
      if (!res.ok) throw new Error("Failed to load tasks");
      const data = await res.json();
      setTasks(data.assignments ?? data ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    }
  }, []);

  useEffect(() => {
    async function loadAll() {
      setLoading(true);
      try {
        const [tasksRes, settingsRes, meRes] = await Promise.allSettled([
          fetch("/api/assignments"),
          fetch("/api/settings"),
          fetch("/api/auth/me"),
        ]);

        // Tasks
        if (tasksRes.status === "fulfilled" && tasksRes.value.ok) {
          const data = await tasksRes.value.json();
          setTasks(data.assignments ?? data ?? []);
        }

        // Settings
        if (settingsRes.status === "fulfilled" && settingsRes.value.ok) {
          const data = await settingsRes.value.json();
          setSettings((prev) => ({
            urgentCutoffDays: data.urgentCutoffDays ?? data.settings?.urgentCutoffDays ?? prev.urgentCutoffDays,
            categoryColors: data.categoryColors ?? data.settings?.categoryColors ?? prev.categoryColors,
          }));
        }

        // User email
        if (meRes.status === "fulfilled" && meRes.value.ok) {
          const data = await meRes.value.json();
          if (data.email) setUserEmail(data.email);
        }
      } catch {
        setError("Failed to load page data");
      } finally {
        setLoading(false);
      }
    }

    loadAll();
  }, []);

  // -------------------------------------------------------------------------
  // Filtering & sorting
  // -------------------------------------------------------------------------

  const filteredTasks = tasks.filter((t) => {
    if (filter.category !== "All" && t.category !== filter.category) return false;
    if (filter.status === "Active" && t.status === "completed") return false;
    if (filter.status === "Completed" && t.status !== "completed") return false;
    return true;
  });

  const sortedTasks = [...filteredTasks].sort((a, b) => {
    if (sortMode === "manual") return a.sortOrder - b.sortOrder;
    return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
  });

  const taskCounts = {
    total: tasks.length,
    active: tasks.filter((t) => t.status !== "completed").length,
    completed: tasks.filter((t) => t.status === "completed").length,
  };

  // -------------------------------------------------------------------------
  // Create handler
  // -------------------------------------------------------------------------

  const handleCreate = useCallback(
    async (data: Record<string, unknown>) => {
      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to create task");
      }
      await fetchTasks();
      setShowCreate(false);
    },
    [fetchTasks]
  );

  // -------------------------------------------------------------------------
  // Edit handler
  // -------------------------------------------------------------------------

  const handleEditSave = useCallback(
    async (id: string, data: Record<string, unknown>) => {
      const res = await fetch(`/api/assignments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update task");
      }
      const result = await res.json();
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...result.assignment } : t))
      );
      setEditingTask(null);
    },
    []
  );

  // -------------------------------------------------------------------------
  // Delete handler
  // -------------------------------------------------------------------------

  const handleDelete = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete task");
      setTasks((prev) => prev.filter((t) => t.id !== id));
      setDeletingId(null);
    } catch {
      setError("Failed to delete task");
    }
  }, []);

  const confirmDelete = useCallback(
    (id: string) => {
      if (deletingId === id) {
        handleDelete(id);
      } else {
        setDeletingId(id);
        // Auto-cancel after 3s
        setTimeout(() => setDeletingId((cur) => (cur === id ? null : cur)), 3000);
      }
    },
    [deletingId, handleDelete]
  );

  // -------------------------------------------------------------------------
  // Importance change (DnD between quadrants)
  // -------------------------------------------------------------------------

  const handleImportanceChange = useCallback(
    async (taskId: string, isImportant: boolean) => {
      // Optimistic update
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, isImportant } : t))
      );
      try {
        const res = await fetch(`/api/assignments/${taskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isImportant }),
        });
        if (!res.ok) throw new Error("Failed to update importance");
      } catch {
        // Revert
        setTasks((prev) =>
          prev.map((t) => (t.id === taskId ? { ...t, isImportant: !isImportant } : t))
        );
        setError("Failed to update task importance");
      }
    },
    []
  );

  // -------------------------------------------------------------------------
  // Reorder
  // -------------------------------------------------------------------------

  const handleReorder = useCallback(
    async (items: Array<{ id: string; sortOrder: number }>) => {
      // Optimistic update
      setTasks((prev) => {
        const orderMap = new Map(items.map((i) => [i.id, i.sortOrder]));
        return prev.map((t) => {
          const newOrder = orderMap.get(t.id);
          return newOrder !== undefined ? { ...t, sortOrder: newOrder } : t;
        });
      });
      try {
        await fetch("/api/assignments/reorder", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ items }),
        });
      } catch {
        setError("Failed to reorder tasks");
        await fetchTasks();
      }
    },
    [fetchTasks]
  );

  // -------------------------------------------------------------------------
  // Subtask toggle
  // -------------------------------------------------------------------------

  const handleToggleSubtask = useCallback(
    async (taskId: string, subtaskId: string, completed: boolean) => {
      try {
        const res = await fetch(`/api/assignments/${taskId}/subtasks/${subtaskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ completed: !completed }),
        });
        if (!res.ok) throw new Error("Failed to toggle subtask");
        const data = await res.json();

        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== taskId) return t;
            const updatedSubtasks = t.subtasks.map((s) =>
              s.id === subtaskId ? { ...s, completed: !completed } : s
            );
            const newProgress = data.progress ?? t.progress;
            return { ...t, subtasks: updatedSubtasks, progress: newProgress, status: data.status ?? t.status };
          })
        );

        // Confetti logic
        const task = tasks.find((t) => t.id === taskId);
        if (task && !completed) {
          const allDone = task.subtasks.every((s) =>
            s.id === subtaskId ? true : s.completed
          );
          if (allDone) {
            fireBigConfetti();
          } else {
            fireSmallConfetti();
          }
        }
      } catch {
        setError("Failed to update subtask");
      }
    },
    [tasks]
  );

  // -------------------------------------------------------------------------
  // Subtask add
  // -------------------------------------------------------------------------

  const handleAddSubtask = useCallback(
    async (taskId: string, title: string) => {
      try {
        const res = await fetch(`/api/assignments/${taskId}/subtasks`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title }),
        });
        if (!res.ok) throw new Error("Failed to add subtask");
        const data = await res.json();

        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== taskId) return t;
            const newSubtask: Subtask = data.subtask ?? {
              id: data.id ?? crypto.randomUUID(),
              title,
              completed: false,
              sortOrder: t.subtasks.length,
            };
            return {
              ...t,
              subtasks: [...t.subtasks, newSubtask],
              progress: data.progress ?? t.progress,
            };
          })
        );
      } catch {
        setError("Failed to add subtask");
      }
    },
    []
  );

  // -------------------------------------------------------------------------
  // Subtask delete
  // -------------------------------------------------------------------------

  const handleDeleteSubtask = useCallback(
    async (taskId: string, subtaskId: string) => {
      try {
        const res = await fetch(`/api/assignments/${taskId}/subtasks/${subtaskId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to delete subtask");
        const data = await res.json().catch(() => ({}));

        setTasks((prev) =>
          prev.map((t) => {
            if (t.id !== taskId) return t;
            return {
              ...t,
              subtasks: t.subtasks.filter((s) => s.id !== subtaskId),
              progress: data.progress ?? t.progress,
            };
          })
        );
      } catch {
        setError("Failed to delete subtask");
      }
    },
    []
  );

  // -------------------------------------------------------------------------
  // Expand handler
  // -------------------------------------------------------------------------

  const handleExpand = useCallback((taskId: string) => {
    setExpandedTaskId((prev) => (prev === taskId ? null : taskId));
  }, []);

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        backgroundImage: "url(/images/assignments-bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <Navbar />
      <div className="min-h-screen bg-white/85 backdrop-blur-sm">
        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* ---- Header ---- */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                  {taskCounts.total}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {taskCounts.active} active &middot; {taskCounts.completed} completed
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* View toggle */}
              <div className="flex bg-gray-100 rounded-lg p-0.5">
                <button
                  onClick={() => setView("matrix")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    view === "matrix"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zm10 0a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                    </svg>
                    Matrix
                  </span>
                </button>
                <button
                  onClick={() => setView("list")}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    view === "list"
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                    </svg>
                    List
                  </span>
                </button>
              </div>

              {/* New Task button */}
              <button
                onClick={() => setShowCreate(!showCreate)}
                className={`inline-flex items-center px-4 py-2 text-sm font-medium rounded-lg transition-colors ${
                  showCreate
                    ? "bg-gray-200 text-gray-700 hover:bg-gray-300"
                    : "bg-blue-600 text-white hover:bg-blue-700"
                }`}
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d={showCreate ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"}
                  />
                </svg>
                {showCreate ? "Cancel" : "New Task"}
              </button>
            </div>
          </div>

          {/* ---- Create Form (slides down) ---- */}
          <div
            className={`overflow-hidden transition-all duration-300 ease-in-out ${
              showCreate ? "max-h-[2000px] opacity-100 mb-6" : "max-h-0 opacity-0"
            }`}
          >
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Create New Task</h2>
              <TaskForm
                mode="create"
                onSubmit={handleCreate}
                onCancel={() => setShowCreate(false)}
                userEmail={userEmail}
              />
            </div>
          </div>

          {/* ---- Error Banner ---- */}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
              <span className="text-sm">{error}</span>
              <button onClick={() => setError("")} className="text-red-500 hover:text-red-700 ml-3">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          )}

          {/* ---- Filter Bar ---- */}
          {!loading && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
              {/* Category pills */}
              <div className="flex flex-wrap gap-1.5">
                {["All", ...TASK_CATEGORIES].map((cat) => {
                  const isActive = filter.category === cat;
                  const catColor =
                    cat !== "All"
                      ? settings.categoryColors[cat] ||
                        DEFAULT_CATEGORY_COLORS[cat as keyof typeof DEFAULT_CATEGORY_COLORS] ||
                        "#6b7280"
                      : undefined;

                  return (
                    <button
                      key={cat}
                      onClick={() => setFilter((f) => ({ ...f, category: cat }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        isActive
                          ? "text-white border-transparent"
                          : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                      }`}
                      style={
                        isActive && catColor
                          ? { backgroundColor: catColor, borderColor: catColor }
                          : isActive
                          ? { backgroundColor: "#374151", borderColor: "#374151", color: "#fff" }
                          : undefined
                      }
                    >
                      {cat}
                      {cat !== "All" && (
                        <span className="ml-1 opacity-70">
                          ({tasks.filter((t) => t.category === cat).length})
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-2 ml-auto">
                {/* Status filter */}
                <div className="flex bg-gray-100 rounded-lg p-0.5">
                  {["All", "Active", "Completed"].map((s) => (
                    <button
                      key={s}
                      onClick={() => setFilter((f) => ({ ...f, status: s }))}
                      className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                        filter.status === s
                          ? "bg-white text-gray-900 shadow-sm"
                          : "text-gray-500 hover:text-gray-700"
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>

                {/* Sort selector (list view only) */}
                {view === "list" && (
                  <select
                    value={sortMode}
                    onChange={(e) => setSortMode(e.target.value as SortMode)}
                    className="text-xs border border-gray-200 rounded-lg px-2.5 py-1.5 bg-white text-gray-600 focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="dueDate">Sort: Due Date</option>
                    <option value="manual">Sort: Manual</option>
                  </select>
                )}
              </div>
            </div>
          )}

          {/* ---- Loading State ---- */}
          {loading && <LoadingSkeleton />}

          {/* ---- Matrix View ---- */}
          {!loading && view === "matrix" && (
            <EisenhowerMatrix
              tasks={filteredTasks}
              urgentCutoffDays={settings.urgentCutoffDays}
              categoryColors={settings.categoryColors}
              onImportanceChange={handleImportanceChange}
              onReorder={handleReorder}
              onEdit={(task) => setEditingTask(task as Task)}
              onDelete={(taskId) => confirmDelete(taskId)}
              onToggleSubtask={handleToggleSubtask}
              onExpand={handleExpand}
              expandedTaskId={expandedTaskId}
            />
          )}

          {/* ---- List View ---- */}
          {!loading && view === "list" && (
            <>
              {sortedTasks.length === 0 ? (
                <div className="text-center py-16">
                  <svg
                    className="mx-auto w-16 h-16 text-gray-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                    />
                  </svg>
                  <h3 className="mt-4 text-lg font-medium text-gray-900">
                    {filter.category !== "All" || filter.status !== "All"
                      ? "No tasks match your filters"
                      : "No tasks yet"}
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    {filter.category !== "All" || filter.status !== "All"
                      ? "Try adjusting your filters or create a new task."
                      : "Create your first task to get started."}
                  </p>
                  {filter.category === "All" && filter.status === "All" && (
                    <button
                      onClick={() => setShowCreate(true)}
                      className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                      </svg>
                      New Task
                    </button>
                  )}
                </div>
              ) : (
                <div className="space-y-3">
                  {sortedTasks.map((task) => (
                    <TaskListCard
                      key={task.id}
                      task={task}
                      categoryColors={settings.categoryColors}
                      expanded={expandedTaskId === task.id}
                      onExpand={() => handleExpand(task.id)}
                      onEdit={() => setEditingTask(task)}
                      onDelete={() => confirmDelete(task.id)}
                      onToggleSubtask={handleToggleSubtask}
                      onAddSubtask={handleAddSubtask}
                      onDeleteSubtask={handleDeleteSubtask}
                    />
                  ))}
                </div>
              )}
            </>
          )}

          {/* ---- Empty State for Matrix ---- */}
          {!loading && view === "matrix" && tasks.length === 0 && (
            <div className="text-center py-12 mt-4">
              <p className="text-gray-500 text-sm">
                Your Eisenhower Matrix is empty. Create a task to see it placed into a quadrant.
              </p>
              <button
                onClick={() => setShowCreate(true)}
                className="mt-3 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Task
              </button>
            </div>
          )}

          {/* ---- Delete Confirmation Floating Toast ---- */}
          {deletingId && (
            <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-gray-900 text-white rounded-xl shadow-2xl px-5 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4">
              <span className="text-sm">Delete this task?</span>
              <button
                onClick={() => handleDelete(deletingId)}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-red-600 hover:bg-red-700 transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setDeletingId(null)}
                className="px-3 py-1 text-xs font-medium rounded-lg bg-gray-700 hover:bg-gray-600 transition-colors"
              >
                Cancel
              </button>
            </div>
          )}
        </main>
      </div>

      {/* ---- Edit Modal ---- */}
      {editingTask && (
        <TaskEditModal
          task={{
            id: editingTask.id,
            title: editingTask.title,
            description: editingTask.description,
            dueDate: editingTask.dueDate,
            isImportant: editingTask.isImportant,
            estimatedPomodoros: editingTask.estimatedPomodoros,
            category: editingTask.category,
            emailEnabled: editingTask.emailEnabled,
            reminderEmail: editingTask.reminderEmail,
            ccEmails: editingTask.ccEmails,
            reminderSchedule: editingTask.reminderSchedule,
            recurType: editingTask.recurType,
            recurEndDate: editingTask.recurEndDate,
          }}
          onSave={handleEditSave}
          onClose={() => setEditingTask(null)}
          userEmail={userEmail}
        />
      )}
    </div>
  );
}
