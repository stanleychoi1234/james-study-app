"use client";

import { useState } from "react";

export interface Task {
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

interface TaskCardProps {
  task: Task;
  categoryColors?: Record<string, string>;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
  onToggleSubtask: (
    taskId: string,
    subtaskId: string,
    completed: boolean
  ) => void;
  onExpand: (id: string) => void;
  isExpanded: boolean;
  dragHandleProps?: Record<string, unknown>;
}

const DEFAULT_CATEGORY_COLORS: Record<string, string> = {
  homework: "#3b82f6",
  exam: "#ef4444",
  project: "#8b5cf6",
  reading: "#f59e0b",
  revision: "#10b981",
  default: "#6b7280",
};

function getRelativeDate(dateStr: string): { label: string; isOverdue: boolean } {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const due = new Date(dateStr);
  due.setHours(0, 0, 0, 0);
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return { label: "Overdue", isOverdue: true };
  if (diffDays === 0) return { label: "Today", isOverdue: false };
  if (diffDays === 1) return { label: "Tomorrow", isOverdue: false };
  return { label: `${diffDays} days`, isOverdue: false };
}

function getProgressColor(progress: number): string {
  if (progress >= 75) return "bg-green-500";
  if (progress >= 50) return "bg-blue-500";
  if (progress >= 25) return "bg-indigo-500";
  return "bg-gray-400";
}

export default function TaskCard({
  task,
  categoryColors,
  onEdit,
  onDelete,
  onToggleSubtask,
  onExpand,
  isExpanded,
  dragHandleProps,
}: TaskCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const isCompleted = task.status === "completed" || task.progress === 100;
  const colors = { ...DEFAULT_CATEGORY_COLORS, ...categoryColors };
  const borderColor = colors[task.category] || colors.default;
  const { label: dateLabel, isOverdue } = getRelativeDate(task.dueDate);

  const pomodoroCount = Math.min(task.estimatedPomodoros, 8);
  const extraPomodoros =
    task.estimatedPomodoros > 8 ? task.estimatedPomodoros - 8 : 0;

  const sortedSubtasks = [...task.subtasks].sort(
    (a, b) => a.sortOrder - b.sortOrder
  );

  function handleDeleteClick() {
    if (confirmDelete) {
      onDelete(task.id);
      setConfirmDelete(false);
    } else {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 3000);
    }
  }

  return (
    <div
      className={`rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md ${
        isCompleted ? "opacity-60" : ""
      }`}
      style={{ borderLeftWidth: "4px", borderLeftColor: borderColor }}
    >
      <div className="flex items-start gap-2 px-3 py-2.5">
        {/* Drag handle */}
        {dragHandleProps && (
          <button
            className="mt-1 flex cursor-grab flex-col items-center gap-px text-gray-300 hover:text-gray-500 active:cursor-grabbing"
            {...dragHandleProps}
            aria-label="Drag to reorder"
          >
            <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor">
              <circle cx="2" cy="2" r="1.5" />
              <circle cx="8" cy="2" r="1.5" />
              <circle cx="2" cy="7" r="1.5" />
              <circle cx="8" cy="7" r="1.5" />
              <circle cx="2" cy="12" r="1.5" />
              <circle cx="8" cy="12" r="1.5" />
            </svg>
          </button>
        )}

        {/* Main content */}
        <div className="min-w-0 flex-1">
          {/* Top row: title + badges */}
          <div className="flex items-center gap-2">
            {isCompleted && (
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg
                  width="12"
                  height="12"
                  viewBox="0 0 12 12"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M2 6l3 3 5-5" />
                </svg>
              </span>
            )}
            <h3
              className={`truncate text-sm font-medium ${
                isCompleted
                  ? "text-gray-400 line-through"
                  : "text-gray-900"
              }`}
            >
              {task.title}
            </h3>
          </div>

          {/* Second row: date, category, pomodoros */}
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs">
            <span
              className={`font-medium ${
                isOverdue ? "text-red-600" : "text-gray-500"
              }`}
            >
              {dateLabel}
            </span>

            <span
              className="rounded-full px-2 py-0.5 text-xs font-medium text-white"
              style={{ backgroundColor: borderColor }}
            >
              {task.category}
            </span>

            {/* Pomodoro dots */}
            {task.estimatedPomodoros > 0 && (
              <span className="flex items-center gap-0.5">
                {Array.from({ length: pomodoroCount }).map((_, i) => (
                  <span
                    key={i}
                    className="inline-block h-2 w-2 rounded-full bg-red-400"
                  />
                ))}
                {extraPomodoros > 0 && (
                  <span className="ml-0.5 text-gray-400">
                    +{extraPomodoros}
                  </span>
                )}
              </span>
            )}
          </div>

          {/* Progress bar */}
          <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className={`h-full rounded-full transition-all ${getProgressColor(
                task.progress
              )}`}
              style={{ width: `${task.progress}%` }}
            />
          </div>

          {/* Expanded subtasks */}
          {isExpanded && sortedSubtasks.length > 0 && (
            <ul className="mt-2 space-y-1 border-t border-gray-100 pt-2">
              {sortedSubtasks.map((sub) => (
                <li key={sub.id} className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={sub.completed}
                    onChange={() =>
                      onToggleSubtask(task.id, sub.id, !sub.completed)
                    }
                    className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span
                    className={`text-xs ${
                      sub.completed
                        ? "text-gray-400 line-through"
                        : "text-gray-700"
                    }`}
                  >
                    {sub.title}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex shrink-0 items-center gap-1">
          {/* Expand chevron */}
          {task.subtasks.length > 0 && (
            <button
              onClick={() => onExpand(task.id)}
              className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              aria-label={isExpanded ? "Collapse subtasks" : "Expand subtasks"}
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className={`transition-transform ${
                  isExpanded ? "rotate-180" : ""
                }`}
              >
                <path d="M3 5l4 4 4-4" />
              </svg>
            </button>
          )}

          {/* Edit */}
          <button
            onClick={() => onEdit(task)}
            className="rounded p-1 text-gray-400 hover:bg-gray-100 hover:text-indigo-600"
            aria-label="Edit task"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8.5 2.5l3 3L4 13H1v-3L8.5 2.5z" />
            </svg>
          </button>

          {/* Delete */}
          <button
            onClick={handleDeleteClick}
            className={`rounded p-1 transition-colors ${
              confirmDelete
                ? "bg-red-100 text-red-600"
                : "text-gray-400 hover:bg-gray-100 hover:text-red-500"
            }`}
            aria-label={confirmDelete ? "Confirm delete" : "Delete task"}
          >
            {confirmDelete ? (
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 7l3 3 7-7" />
              </svg>
            ) : (
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M2 4h10M5 4V2h4v2M3 4l1 8h6l1-8" />
              </svg>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
