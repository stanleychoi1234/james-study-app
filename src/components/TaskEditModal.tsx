"use client";

import { useEffect, useCallback } from "react";
import TaskForm from "./TaskForm";

interface TaskEditModalProps {
  task: {
    id: string;
    title: string;
    description: string;
    dueDate: string;
    isImportant: boolean;
    estimatedPomodoros: number;
    category: string;
    emailEnabled: boolean;
    reminderEmail: string | null;
    ccEmails: string | null;
    reminderSchedule: string;
    recurType: string | null;
    recurEndDate: string | null;
  };
  onSave: (id: string, data: Record<string, unknown>) => Promise<void>;
  onClose: () => void;
  userEmail?: string;
}

export default function TaskEditModal({
  task,
  onSave,
  onClose,
  userEmail,
}: TaskEditModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [handleKeyDown]);

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const handleSubmit = async (data: Record<string, unknown>) => {
    await onSave(task.id, data);
    onClose();
  };

  // Parse reminderSchedule from JSON string to array
  let scheduleArray: string[] = [];
  try {
    const parsed = JSON.parse(task.reminderSchedule);
    if (Array.isArray(parsed)) scheduleArray = parsed;
  } catch {
    // If it's not valid JSON, try comma-separated
    if (task.reminderSchedule) {
      scheduleArray = task.reminderSchedule
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    }
  }

  const initialData = {
    id: task.id,
    title: task.title,
    description: task.description,
    dueDate: task.dueDate,
    isImportant: task.isImportant,
    estimatedPomodoros: task.estimatedPomodoros,
    category: task.category,
    emailEnabled: task.emailEnabled,
    reminderEmail: task.reminderEmail ?? undefined,
    ccEmails: task.ccEmails ?? undefined,
    reminderSchedule: scheduleArray,
    recurType: task.recurType ?? "one-time",
    recurEndDate: task.recurEndDate ?? undefined,
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Modal */}
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-gray-200 bg-white px-5 py-3.5 rounded-t-xl">
          <h2 className="text-lg font-semibold text-gray-900">Edit Task</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4">
          <TaskForm
            mode="edit"
            initialData={initialData}
            onSubmit={handleSubmit}
            onCancel={onClose}
            userEmail={userEmail}
          />
        </div>
      </div>
    </div>
  );
}
