"use client";

import { useState } from "react";

interface SubtaskListProps {
  taskId: string;
  subtasks: Array<{
    id: string;
    title: string;
    completed: boolean;
    sortOrder: number;
  }>;
  onToggle: (taskId: string, subtaskId: string, completed: boolean) => void;
  onAdd: (taskId: string, title: string) => void;
  onDelete: (taskId: string, subtaskId: string) => void;
  progress: number;
}

function getProgressColor(progress: number): string {
  if (progress >= 75) return "bg-green-500";
  if (progress >= 50) return "bg-blue-500";
  if (progress >= 25) return "bg-indigo-500";
  return "bg-gray-400";
}

export default function SubtaskList({
  taskId,
  subtasks,
  onToggle,
  onAdd,
  onDelete,
  progress,
}: SubtaskListProps) {
  const [newTitle, setNewTitle] = useState("");

  const sorted = [...subtasks].sort((a, b) => a.sortOrder - b.sortOrder);
  const completedCount = subtasks.filter((s) => s.completed).length;

  function handleAdd() {
    const trimmed = newTitle.trim();
    if (!trimmed) return;
    onAdd(taskId, trimmed);
    setNewTitle("");
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  }

  return (
    <div className="space-y-2">
      {/* Progress summary */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-gray-500">
          {completedCount}/{subtasks.length} completed
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-gray-100">
          <div
            className={`h-full rounded-full transition-all ${getProgressColor(progress)}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Subtask list */}
      <ul className="space-y-0.5">
        {sorted.map((sub) => (
          <li
            key={sub.id}
            className="group flex items-center gap-2 rounded px-1 py-1 hover:bg-gray-50"
          >
            <input
              type="checkbox"
              checked={sub.completed}
              onChange={() => onToggle(taskId, sub.id, !sub.completed)}
              className="h-3.5 w-3.5 shrink-0 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            <span
              className={`flex-1 text-sm ${
                sub.completed
                  ? "text-gray-400 line-through"
                  : "text-gray-700"
              }`}
            >
              {sub.title}
            </span>
            <button
              onClick={() => onDelete(taskId, sub.id)}
              className="shrink-0 rounded p-0.5 text-gray-300 opacity-0 transition-opacity hover:text-red-500 group-hover:opacity-100"
              aria-label={`Delete subtask: ${sub.title}`}
            >
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
                <path d="M2 2l8 8M10 2l-8 8" />
              </svg>
            </button>
          </li>
        ))}
      </ul>

      {/* Add subtask input */}
      <div className="flex items-center gap-1.5 pt-1">
        <input
          type="text"
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add subtask..."
          className="min-w-0 flex-1 rounded border border-gray-200 px-2 py-1 text-sm text-gray-700 placeholder-gray-400 outline-none focus:border-indigo-400 focus:ring-1 focus:ring-indigo-400"
        />
        <button
          onClick={handleAdd}
          disabled={!newTitle.trim()}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-indigo-500 text-white transition-colors hover:bg-indigo-600 disabled:cursor-not-allowed disabled:bg-gray-300"
          aria-label="Add subtask"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 12 12"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          >
            <path d="M6 1v10M1 6h10" />
          </svg>
        </button>
      </div>
    </div>
  );
}
