"use client";

import { useState, useEffect, FormEvent } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface Assignment {
  id: string;
  title: string;
  description: string;
  dueDate: string;
  status: "pending" | "in_progress" | "completed";
  progress: number;
  startedAt: string | null;
  emailEnabled: boolean;
  reminderEmail: string | null;
  reminderSchedule: string;
  referenceCode: string;
}

type StatusFilter = "all" | "pending" | "in_progress" | "completed";

const STATUS_LABELS: Record<Assignment["status"], string> = {
  pending: "Pending",
  in_progress: "In Progress",
  completed: "Completed",
};

const STATUS_STYLES: Record<Assignment["status"], string> = {
  pending: "bg-yellow-100 text-yellow-800",
  in_progress: "bg-blue-100 text-blue-800",
  completed: "bg-green-100 text-green-800",
};

const REMINDER_OPTIONS = [
  { key: "7d", label: "7 days" },
  { key: "5d", label: "5 days" },
  { key: "3d", label: "3 days" },
  { key: "2d", label: "2 days" },
  { key: "1d", label: "1 day" },
  { key: "8h", label: "8 hours" },
  { key: "4h", label: "4 hours" },
  { key: "2h", label: "2 hours" },
  { key: "1h", label: "1 hour" },
  { key: "30m", label: "30 min" },
  { key: "15m", label: "15 min" },
];

const DEFAULT_SCHEDULE = ["3d", "1d", "1h"];

const MILESTONES = [10, 25, 50, 75, 90, 100];

function getUrgencyClass(dueDate: string, status: Assignment["status"]): string {
  if (status === "completed") return "border-l-green-500";
  const diffMs = new Date(dueDate).getTime() - Date.now();
  const diffHours = diffMs / (1000 * 60 * 60);
  if (diffHours < 0) return "border-l-red-500";
  if (diffHours < 24) return "border-l-yellow-500";
  return "border-l-green-500";
}

function getUrgencyLabel(dueDate: string, status: Assignment["status"]): string | null {
  if (status === "completed") return null;
  const diffHours = (new Date(dueDate).getTime() - Date.now()) / (1000 * 60 * 60);
  if (diffHours < 0) return "Overdue";
  if (diffHours < 24) return "Due soon";
  return null;
}

function formatDateTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-AU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function getProgressColor(progress: number): string {
  if (progress >= 90) return "bg-green-500";
  if (progress >= 75) return "bg-emerald-500";
  if (progress >= 50) return "bg-blue-500";
  if (progress >= 25) return "bg-indigo-500";
  return "bg-gray-400";
}

export default function AssignmentsPage() {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<StatusFilter>("all");

  // Form state
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [dueTime, setDueTime] = useState("08:00");
  const [emailEnabled, setEmailEnabled] = useState(false);
  const [reminderEmail, setReminderEmail] = useState("");
  const [ccEmails, setCcEmails] = useState("");
  const [reminderSchedule, setReminderSchedule] = useState<string[]>(DEFAULT_SCHEDULE);
  const [recurType, setRecurType] = useState("");
  const [recurEndDate, setRecurEndDate] = useState("");
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState("");
  const [showForm, setShowForm] = useState(false);

  // Delete confirmation + start confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [startingId, setStartingId] = useState<string | null>(null);

  // Track which assignment's progress is being updated
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Fetch user email for default
  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => {
        if (d.email) setReminderEmail(d.email);
      })
      .catch(() => {});
  }, []);

  async function fetchAssignments() {
    try {
      setError("");
      const res = await fetch("/api/assignments");
      if (!res.ok) throw new Error("Failed to load assignments");
      const data = await res.json();
      setAssignments(data.assignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchAssignments();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setFormError("");

    if (!title.trim() || !dueDate) {
      setFormError("Title and due date are required.");
      return;
    }

    setCreating(true);
    try {
      const dueDateTimeStr = `${dueDate}T${dueTime || "08:00"}:00`;

      const res = await fetch("/api/assignments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          dueDate: dueDateTimeStr,
          emailEnabled,
          reminderEmail: emailEnabled ? reminderEmail : undefined,
          ccEmails: emailEnabled && ccEmails.trim() ? ccEmails.trim() : undefined,
          reminderSchedule: emailEnabled ? reminderSchedule : undefined,
          recurType: recurType || undefined,
          recurEndDate: recurEndDate || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create assignment");
      }

      const data = await res.json();
      setAssignments((prev) =>
        [...prev, data.assignment].sort(
          (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()
        )
      );
      setTitle("");
      setDescription("");
      setDueDate("");
      setDueTime("08:00");
      setEmailEnabled(false);
      setCcEmails("");
      setReminderSchedule(DEFAULT_SCHEDULE);
      setRecurType("");
      setRecurEndDate("");
      setShowForm(false);
      // Refetch all (recurring creates multiple)
      if (recurType) fetchAssignments();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setCreating(false);
    }
  }

  async function handleStart(id: string) {
    try {
      const res = await fetch(`/api/assignments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start" }),
      });
      if (!res.ok) throw new Error("Failed to start assignment");
      const data = await res.json();
      setAssignments((prev) => prev.map((a) => (a.id === id ? data.assignment : a)));
    } catch {
      setError("Failed to start assignment");
    } finally {
      setStartingId(null);
    }
  }

  async function handleProgressUpdate(id: string, progress: number) {
    setUpdatingId(id);
    try {
      const res = await fetch(`/api/assignments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progress }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update progress");
      }
      const data = await res.json();
      setAssignments((prev) => prev.map((a) => (a.id === id ? data.assignment : a)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update progress");
    } finally {
      setUpdatingId(null);
    }
  }

  async function handleDelete(id: string) {
    try {
      const res = await fetch(`/api/assignments/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete assignment");
      setAssignments((prev) => prev.filter((a) => a.id !== id));
      setDeletingId(null);
    } catch {
      setError("Failed to delete assignment");
    }
  }

  function toggleScheduleKey(key: string) {
    setReminderSchedule((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  const filtered =
    filter === "all" ? assignments : assignments.filter((a) => a.status === filter);

  const counts = {
    all: assignments.length,
    pending: assignments.filter((a) => a.status === "pending").length,
    in_progress: assignments.filter((a) => a.status === "in_progress").length,
    completed: assignments.filter((a) => a.status === "completed").length,
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assignments</h1>
            <p className="text-sm text-gray-500 mt-1">
              Track and manage your school assignments
            </p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"}
              />
            </svg>
            {showForm ? "Cancel" : "New Assignment"}
          </button>
        </div>

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Create New Assignment
            </h2>
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                  Title
                </label>
                <input
                  id="title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Math Chapter 5 Problems"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional details about the assignment..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                />
              </div>

              {/* Date + Time */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Date
                  </label>
                  <input
                    id="dueDate"
                    type="date"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label htmlFor="dueTime" className="block text-sm font-medium text-gray-700 mb-1">
                    Due Time
                  </label>
                  <input
                    id="dueTime"
                    type="time"
                    value={dueTime}
                    onChange={(e) => setDueTime(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                  />
                </div>
              </div>

              {/* Email Reminders Section */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => setEmailEnabled(!emailEnabled)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <svg className="w-5 h-5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <span className="text-sm font-medium text-gray-700">Email Reminders</span>
                  </div>
                  <div
                    className={`w-10 h-6 rounded-full transition-colors relative ${
                      emailEnabled ? "bg-blue-600" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                        emailEnabled ? "translate-x-5" : "translate-x-1"
                      }`}
                    />
                  </div>
                </button>

                {emailEnabled && (
                  <div className="px-4 py-4 space-y-4 border-t border-gray-200">
                    <div>
                      <label htmlFor="reminderEmail" className="block text-xs font-medium text-gray-600 mb-1">
                        Send reminders to
                      </label>
                      <input
                        id="reminderEmail"
                        type="email"
                        value={reminderEmail}
                        onChange={(e) => setReminderEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <label htmlFor="ccEmails" className="block text-xs font-medium text-gray-600 mb-1">
                        CC (optional — separate multiple with comma or semicolon)
                      </label>
                      <input
                        id="ccEmails"
                        type="text"
                        value={ccEmails}
                        onChange={(e) => setCcEmails(e.target.value)}
                        placeholder="teacher@school.edu, parent@email.com"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                      />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-600 mb-2">Remind me</p>
                      <div className="flex flex-wrap gap-2">
                        {REMINDER_OPTIONS.map((opt) => (
                          <button
                            key={opt.key}
                            type="button"
                            onClick={() => toggleScheduleKey(opt.key)}
                            className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                              reminderSchedule.includes(opt.key)
                                ? "bg-blue-100 border-blue-300 text-blue-700"
                                : "bg-white border-gray-300 text-gray-500 hover:border-gray-400"
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Recurring Section */}
              <div className="border border-gray-200 rounded-lg p-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recurring (optional)
                </label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {[
                    { key: "", label: "One-time" },
                    { key: "daily", label: "Daily" },
                    { key: "weekly", label: "Weekly" },
                    { key: "fortnightly", label: "Fortnightly" },
                    { key: "monthly", label: "Monthly" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => setRecurType(opt.key)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        recurType === opt.key
                          ? "bg-blue-100 border-blue-300 text-blue-700"
                          : "bg-white border-gray-300 text-gray-500 hover:border-gray-400"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                {recurType && (
                  <div>
                    <label htmlFor="recurEndDate" className="block text-xs font-medium text-gray-600 mb-1">
                      Repeat until (max 3 months)
                    </label>
                    <input
                      id="recurEndDate"
                      type="date"
                      value={recurEndDate}
                      onChange={(e) => setRecurEndDate(e.target.value)}
                      min={dueDate || new Date().toISOString().split("T")[0]}
                      max={(() => { const d = new Date(); d.setMonth(d.getMonth() + 3); return d.toISOString().split("T")[0]; })()}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
                    />
                    <p className="text-xs text-gray-400 mt-1">
                      This will create multiple assignments with the same title, repeating {recurType} until the end date.
                    </p>
                  </div>
                )}
              </div>

              {formError && <p className="text-sm text-red-600">{formError}</p>}
              <button
                type="submit"
                disabled={creating}
                className="w-full py-2.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? "Creating..." : "Create Assignment"}
              </button>
            </form>
          </div>
        )}

        {/* Error Banner */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center justify-between">
            <span className="text-sm">{error}</span>
            <button onClick={() => setError("")} className="text-red-500 hover:text-red-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-6">
          {(["all", "pending", "in_progress", "completed"] as StatusFilter[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === tab
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {tab === "all" ? "All" : tab === "in_progress" ? "In Progress" : tab.charAt(0).toUpperCase() + tab.slice(1)}{" "}
              <span className="text-xs text-gray-400">({counts[tab]})</span>
            </button>
          ))}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-16">
            <div className="w-8 h-8 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-500 mt-3">Loading assignments...</p>
          </div>
        )}

        {/* Empty State */}
        {!loading && filtered.length === 0 && (
          <div className="text-center py-16">
            <svg className="mx-auto w-16 h-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
            <h3 className="mt-4 text-lg font-medium text-gray-900">
              {filter === "all"
                ? "No assignments yet"
                : `No ${STATUS_LABELS[filter as Assignment["status"]].toLowerCase()} assignments`}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              {filter === "all" ? "Create your first assignment to get started." : "Assignments with this status will appear here."}
            </p>
            {filter === "all" && (
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
              >
                <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                New Assignment
              </button>
            )}
          </div>
        )}

        {/* Assignment List */}
        {!loading && filtered.length > 0 && (
          <div className="space-y-4">
            {filtered.map((assignment) => {
              const urgencyLabel = getUrgencyLabel(assignment.dueDate, assignment.status);
              const isStarted = !!assignment.startedAt;
              const isCompleted = assignment.status === "completed";

              return (
                <div
                  key={assignment.id}
                  className={`bg-white rounded-xl shadow-sm border border-gray-200 border-l-4 ${getUrgencyClass(
                    assignment.dueDate,
                    assignment.status
                  )} p-5 transition-all hover:shadow-md`}
                >
                  {/* Top Row: Title, Status, Actions */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3
                          className={`font-semibold text-gray-900 ${
                            isCompleted ? "line-through text-gray-500" : ""
                          }`}
                        >
                          {assignment.title}
                        </h3>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                            STATUS_STYLES[assignment.status]
                          }`}
                        >
                          {STATUS_LABELS[assignment.status]}
                        </span>
                        {urgencyLabel && (
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                              urgencyLabel === "Overdue" ? "bg-red-100 text-red-800" : "bg-yellow-100 text-yellow-800"
                            }`}
                          >
                            {urgencyLabel}
                          </span>
                        )}
                        {assignment.emailEnabled && (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700">
                            Email
                          </span>
                        )}
                      </div>
                      {assignment.description && (
                        <p className="mt-1 text-sm text-gray-600 line-clamp-2">{assignment.description}</p>
                      )}
                      <div className="mt-2 flex items-center gap-3 text-xs text-gray-400">
                        <span>Due: {formatDateTime(assignment.dueDate)}</span>
                        {assignment.referenceCode && (
                          <span className="font-mono bg-gray-100 px-1.5 py-0.5 rounded">{assignment.referenceCode}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Start Button (only when pending) */}
                      {!isStarted && !isCompleted && (
                        <>
                          {startingId === assignment.id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleStart(assignment.id)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg bg-orange-600 text-white hover:bg-orange-700 transition-colors"
                              >
                                Confirm Start
                              </button>
                              <button
                                onClick={() => setStartingId(null)}
                                className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setStartingId(assignment.id)}
                              className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors"
                            >
                              Start
                            </button>
                          )}
                        </>
                      )}

                      {/* Delete */}
                      {deletingId === assignment.id ? (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleDelete(assignment.id)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setDeletingId(null)}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setDeletingId(assignment.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                          title="Delete assignment"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar + Milestones (visible once started) */}
                  {isStarted && (
                    <div className="mt-4 pt-4 border-t border-gray-100">
                      {/* Progress bar */}
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-xs font-medium text-gray-500 w-16">
                          {assignment.progress}%
                        </span>
                        <div className="flex-1 relative">
                          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full transition-all duration-500 ${getProgressColor(assignment.progress)}`}
                              style={{ width: `${assignment.progress}%` }}
                            />
                          </div>
                          {/* Milestone tick marks */}
                          <div className="absolute inset-0 flex">
                            {MILESTONES.slice(0, -1).map((m) => (
                              <div
                                key={m}
                                className="absolute top-0 h-2"
                                style={{ left: `${m}%` }}
                              >
                                <div
                                  className={`w-0.5 h-full ${
                                    assignment.progress >= m ? "bg-white/50" : "bg-gray-300"
                                  }`}
                                />
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Milestone buttons */}
                      {!isCompleted && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {MILESTONES.map((m) => (
                            <button
                              key={m}
                              disabled={
                                m <= assignment.progress || updatingId === assignment.id
                              }
                              onClick={() => handleProgressUpdate(assignment.id, m)}
                              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                                m <= assignment.progress
                                  ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                                  : m === 100
                                  ? "bg-green-600 text-white hover:bg-green-700"
                                  : "bg-gray-100 text-gray-700 hover:bg-blue-100 hover:text-blue-700"
                              }`}
                            >
                              {m === 100 ? "Complete" : `${m}%`}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
}
