"use client";

import { useState, useCallback } from "react";

interface TaskFormProps {
  mode: "create" | "edit";
  initialData?: {
    id?: string;
    title?: string;
    description?: string;
    dueDate?: string;
    isImportant?: boolean;
    estimatedPomodoros?: number;
    category?: string;
    emailEnabled?: boolean;
    reminderEmail?: string;
    ccEmails?: string;
    reminderSchedule?: string[];
    recurType?: string;
    recurEndDate?: string;
  };
  onSubmit: (data: Record<string, unknown>) => Promise<void>;
  onCancel?: () => void;
  userEmail?: string;
}

const CATEGORIES = [
  { value: "School", color: "bg-blue-500" },
  { value: "Private", color: "bg-purple-500" },
  { value: "Business", color: "bg-emerald-500" },
  { value: "Family", color: "bg-amber-500" },
  { value: "Friends", color: "bg-pink-500" },
] as const;

const REMINDER_INTERVALS = [
  "7d",
  "5d",
  "3d",
  "2d",
  "1d",
  "8h",
  "4h",
  "2h",
  "1h",
  "30m",
  "15m",
] as const;

const RECUR_OPTIONS = [
  { value: "one-time", label: "One-time" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "fortnightly", label: "Fortnightly" },
  { value: "monthly", label: "Monthly" },
] as const;

function parseDueDate(dueDate?: string) {
  if (!dueDate) return { date: "", time: "" };
  const d = new Date(dueDate);
  if (isNaN(d.getTime())) return { date: "", time: "" };
  const date = d.toISOString().split("T")[0];
  const time = d.toTimeString().slice(0, 5);
  return { date, time };
}

function getMaxRecurEndDate(): string {
  const d = new Date();
  d.setMonth(d.getMonth() + 3);
  return d.toISOString().split("T")[0];
}

export default function TaskForm({
  mode,
  initialData,
  onSubmit,
  onCancel,
  userEmail,
}: TaskFormProps) {
  const { date: initDate, time: initTime } = parseDueDate(
    initialData?.dueDate
  );

  const [title, setTitle] = useState(initialData?.title ?? "");
  const [description, setDescription] = useState(
    initialData?.description ?? ""
  );
  const [dueDate, setDueDate] = useState(initDate);
  const [dueTime, setDueTime] = useState(initTime);
  const [isImportant, setIsImportant] = useState(
    initialData?.isImportant ?? false
  );
  const [category, setCategory] = useState(
    initialData?.category ?? "School"
  );
  const [estimatedPomodoros, setEstimatedPomodoros] = useState(
    initialData?.estimatedPomodoros ?? 1
  );
  const [emailEnabled, setEmailEnabled] = useState(
    initialData?.emailEnabled ?? false
  );
  const [emailExpanded, setEmailExpanded] = useState(
    initialData?.emailEnabled ?? false
  );
  const [reminderEmail, setReminderEmail] = useState(
    initialData?.reminderEmail ?? userEmail ?? ""
  );
  const [ccEmails, setCcEmails] = useState(initialData?.ccEmails ?? "");
  const [reminderSchedule, setReminderSchedule] = useState<string[]>(
    initialData?.reminderSchedule ?? ["1d", "1h"]
  );
  const [recurType, setRecurType] = useState(
    initialData?.recurType ?? "one-time"
  );
  const [recurEndDate, setRecurEndDate] = useState(
    initialData?.recurEndDate ?? ""
  );
  const [submitting, setSubmitting] = useState(false);

  const toggleReminder = useCallback((interval: string) => {
    setReminderSchedule((prev) =>
      prev.includes(interval)
        ? prev.filter((i) => i !== interval)
        : [...prev, interval]
    );
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setSubmitting(true);
    try {
      const combinedDue =
        dueDate && dueTime
          ? new Date(`${dueDate}T${dueTime}`).toISOString()
          : dueDate
            ? new Date(`${dueDate}T23:59`).toISOString()
            : undefined;

      await onSubmit({
        ...(initialData?.id && { id: initialData.id }),
        title: title.trim(),
        description: description.trim(),
        dueDate: combinedDue,
        isImportant,
        estimatedPomodoros,
        category,
        emailEnabled,
        reminderEmail: emailEnabled ? reminderEmail : null,
        ccEmails: emailEnabled ? ccEmails : null,
        reminderSchedule: emailEnabled ? reminderSchedule : [],
        recurType: mode === "create" ? recurType : undefined,
        recurEndDate:
          mode === "create" && recurType !== "one-time"
            ? recurEndDate || null
            : undefined,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const pomodoroHours = estimatedPomodoros * 0.5;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Title <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What needs to be done?"
          required
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
        />
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Description
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Add details..."
          rows={2}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none resize-none"
        />
      </div>

      {/* Due Date + Time */}
      <div className="flex gap-3">
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Due Date
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Time
          </label>
          <input
            type="time"
            value={dueTime}
            onChange={(e) => setDueTime(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      {/* Important Toggle */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setIsImportant(!isImportant)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
            isImportant
              ? "bg-amber-100 text-amber-700 border border-amber-300"
              : "bg-gray-100 text-gray-500 border border-gray-200"
          }`}
        >
          <svg
            className="h-4 w-4"
            fill={isImportant ? "currentColor" : "none"}
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
            />
          </svg>
          {isImportant ? "Important" : "Not Important"}
        </button>
      </div>

      {/* Category */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Category
        </label>
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              type="button"
              onClick={() => setCategory(cat.value)}
              className={`rounded-full px-3 py-1 text-sm font-medium transition-all ${
                category === cat.value
                  ? `${cat.color} text-white shadow-sm`
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
            >
              {cat.value}
            </button>
          ))}
        </div>
      </div>

      {/* Estimated Time (Pomodoro blocks) */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1.5">
          Estimated Time
        </label>
        <div className="flex items-center gap-3">
          <div className="inline-flex items-center rounded-lg border border-gray-300">
            <button
              type="button"
              onClick={() =>
                setEstimatedPomodoros(Math.max(1, estimatedPomodoros - 1))
              }
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-l-lg transition-colors text-lg leading-none"
            >
              &minus;
            </button>
            <span className="px-3 py-1.5 text-sm font-medium border-x border-gray-300 min-w-[3rem] text-center">
              {estimatedPomodoros}
            </span>
            <button
              type="button"
              onClick={() =>
                setEstimatedPomodoros(Math.min(16, estimatedPomodoros + 1))
              }
              className="px-3 py-1.5 text-gray-600 hover:bg-gray-100 rounded-r-lg transition-colors text-lg leading-none"
            >
              +
            </button>
          </div>
          <span className="text-sm text-gray-500">
            30min blocks &middot; {pomodoroHours}h total
          </span>
        </div>
        {/* Visual dots */}
        <div className="flex gap-1 mt-2 flex-wrap">
          {Array.from({ length: estimatedPomodoros }).map((_, i) => (
            <span
              key={i}
              className="inline-block h-2.5 w-2.5 rounded-full bg-blue-400"
            />
          ))}
        </div>
      </div>

      {/* Email Reminders */}
      <div className="rounded-lg border border-gray-200">
        <button
          type="button"
          onClick={() => {
            const next = !emailExpanded;
            setEmailExpanded(next);
            if (!next) setEmailEnabled(false);
          }}
          className="flex w-full items-center justify-between px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 rounded-lg"
        >
          <span className="flex items-center gap-2">
            <svg
              className="h-4 w-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
              />
            </svg>
            Email Reminders
          </span>
          <svg
            className={`h-4 w-4 text-gray-400 transition-transform ${emailExpanded ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>

        {emailExpanded && (
          <div className="border-t border-gray-200 px-3 py-3 space-y-3">
            {/* Enable toggle */}
            <label className="flex items-center gap-2 cursor-pointer">
              <button
                type="button"
                role="switch"
                aria-checked={emailEnabled}
                onClick={() => setEmailEnabled(!emailEnabled)}
                className={`relative inline-flex h-5 w-9 shrink-0 rounded-full transition-colors ${
                  emailEnabled ? "bg-blue-500" : "bg-gray-300"
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform mt-0.5 ${
                    emailEnabled ? "translate-x-4 ml-0.5" : "translate-x-0 ml-0.5"
                  }`}
                />
              </button>
              <span className="text-sm text-gray-600">
                Enable email reminders
              </span>
            </label>

            {emailEnabled && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Reminder email
                  </label>
                  <input
                    type="email"
                    value={reminderEmail}
                    onChange={(e) => setReminderEmail(e.target.value)}
                    placeholder="you@example.com"
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    CC emails (comma separated)
                  </label>
                  <input
                    type="text"
                    value={ccEmails}
                    onChange={(e) => setCcEmails(e.target.value)}
                    placeholder="parent@example.com, tutor@example.com"
                    className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1.5">
                    Remind me before due date
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {REMINDER_INTERVALS.map((interval) => (
                      <button
                        key={interval}
                        type="button"
                        onClick={() => toggleReminder(interval)}
                        className={`rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                          reminderSchedule.includes(interval)
                            ? "bg-blue-100 text-blue-700 border border-blue-300"
                            : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        {interval}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>

      {/* Recurring (create mode only) */}
      {mode === "create" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recurring
          </label>
          <select
            value={recurType}
            onChange={(e) => setRecurType(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none bg-white"
          >
            {RECUR_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {recurType !== "one-time" && (
            <div className="mt-2">
              <label className="block text-xs font-medium text-gray-500 mb-1">
                End date (max 3 months)
              </label>
              <input
                type="date"
                value={recurEndDate}
                onChange={(e) => setRecurEndDate(e.target.value)}
                max={getMaxRecurEndDate()}
                className="w-full rounded-md border border-gray-300 px-2.5 py-1.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none"
              />
            </div>
          )}
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <button
          type="submit"
          disabled={submitting || !title.trim()}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {submitting
            ? "Saving..."
            : mode === "create"
              ? "Create Task"
              : "Save Changes"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
