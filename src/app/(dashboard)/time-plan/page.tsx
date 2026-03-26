"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  DragStartEvent,
  DragEndEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { getCategoryColor } from "@/lib/categories";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface TaskAssignment {
  id: string;
  title: string;
  status: "pending" | "in_progress" | "completed";
  dueDate: string;
  estimatedPomodoros: number;
  category: string;
}

interface TimePlanSlot {
  id: string;
  assignmentId: string;
  weekStart: string;
  dayOfWeek: number;
  startHour: number;
  startMin: number;
  assignment: {
    title: string;
    category: string;
  };
}

interface WeeklyCommitment {
  id: string;
  title: string;
  dayOfWeek: number;
  startHour: number;
  startMin: number;
  color: string | null;
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const START_HOUR = 6;
const END_HOUR = 22; // exclusive — last slot starts at 21:30
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2; // 32 half-hour slots

const COMMITMENT_COLORS = [
  "#ef4444", "#f97316", "#f59e0b", "#84cc16", "#22c55e",
  "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
];

// ---------------------------------------------------------------------------
// Utility helpers
// ---------------------------------------------------------------------------

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date: Date, n: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function formatWeekLabel(monday: Date): string {
  return monday.toLocaleDateString("en-AU", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatHour(hour: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h} ${ampm}`;
}

function slotKey(day: number, hour: number, min: number): string {
  return `slot-${day}-${hour}-${min}`;
}

function parseSlotKey(key: string): { day: number; hour: number; min: number } | null {
  const m = key.match(/^slot-(\d+)-(\d+)-(\d+)$/);
  if (!m) return null;
  return { day: parseInt(m[1]), hour: parseInt(m[2]), min: parseInt(m[3]) };
}

function isPast(weekStart: Date, day: number, hour: number, min: number): boolean {
  const d = addDays(weekStart, day);
  d.setHours(hour, min, 0, 0);
  return d.getTime() < Date.now();
}

function isToday(weekStart: Date, day: number): boolean {
  const d = addDays(weekStart, day);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

// ---------------------------------------------------------------------------
// DraggableTaskBlock — one task in the panel
// ---------------------------------------------------------------------------

function DraggableTaskBlock({
  task,
  plannedCount,
}: {
  task: TaskAssignment;
  plannedCount: number;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: `task-${task.id}`,
    data: { assignmentId: task.id },
  });

  const total = task.estimatedPomodoros;
  const allPlanned = plannedCount >= total;
  const color = getCategoryColor(task.category);

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`
        flex-shrink-0 w-36 rounded-lg px-3 py-2 cursor-grab select-none
        border-2 transition-all duration-150
        ${isDragging ? "opacity-40 scale-95" : "opacity-100"}
        ${allPlanned ? "ring-2 ring-green-400 shadow-[0_0_8px_rgba(74,222,128,0.5)]" : ""}
      `}
      style={{
        borderColor: color,
        backgroundColor: `${color}18`,
      }}
    >
      <p
        className="text-xs font-semibold truncate mb-1"
        style={{ color }}
      >
        {task.title}
      </p>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full"
            style={{
              backgroundColor: i < plannedCount ? color : `${color}40`,
            }}
          />
        ))}
        <span className="text-[10px] ml-1 text-gray-500">
          {plannedCount}/{total}
        </span>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DragOverlayBlock — the ghost element while dragging
// ---------------------------------------------------------------------------

function DragOverlayBlock({ task }: { task: TaskAssignment }) {
  const color = getCategoryColor(task.category);
  return (
    <div
      className="w-36 rounded-lg px-3 py-2 border-2 shadow-xl"
      style={{
        borderColor: color,
        backgroundColor: `${color}30`,
      }}
    >
      <p className="text-xs font-semibold truncate" style={{ color }}>
        {task.title}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DroppableCell — one cell in the timetable grid
// ---------------------------------------------------------------------------

function DroppableCell({
  id,
  children,
  isPastCell,
  isWeekend,
  isTodayCol,
}: {
  id: string;
  children: React.ReactNode;
  isPastCell: boolean;
  isWeekend: boolean;
  isTodayCol: boolean;
}) {
  const { isOver, setNodeRef } = useDroppable({ id });

  return (
    <div
      ref={setNodeRef}
      className={`
        relative h-8 border-b border-r border-gray-200
        transition-colors duration-100
        ${isPastCell ? "opacity-60" : ""}
        ${isWeekend ? "bg-gray-50/60" : ""}
        ${isTodayCol ? "bg-blue-50/40" : ""}
        ${isOver ? "bg-blue-100 border-dashed border-blue-400" : ""}
      `}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlotBlock — rendered task block inside a cell
// ---------------------------------------------------------------------------

function SlotBlock({
  slot,
  onRemove,
}: {
  slot: TimePlanSlot;
  onRemove: (id: string) => void;
}) {
  const color = getCategoryColor(slot.assignment.category);

  return (
    <div
      className="absolute inset-0.5 rounded flex items-center justify-between px-1.5 text-[10px] font-medium text-white z-10 group"
      style={{ backgroundColor: color }}
    >
      <span className="truncate">{slot.assignment.title}</span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(slot.id);
        }}
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:bg-white/30 rounded px-0.5 flex-shrink-0"
        aria-label="Remove slot"
      >
        x
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommitmentBlock — rendered commitment block inside a cell
// ---------------------------------------------------------------------------

function CommitmentBlock({ commitment }: { commitment: WeeklyCommitment }) {
  return (
    <div
      className="absolute inset-0.5 rounded flex items-center px-1.5 text-[10px] font-medium text-white z-10"
      style={{ backgroundColor: commitment.color || "#6b7280" }}
    >
      <span className="truncate">{commitment.title}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommitmentsModal
// ---------------------------------------------------------------------------

function CommitmentsModal({
  open,
  onClose,
  commitments,
  onAdd,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  commitments: WeeklyCommitment[];
  onAdd: (c: Omit<WeeklyCommitment, "id">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startHour, setStartHour] = useState(9);
  const [startMin, setStartMin] = useState<0 | 30>(0);
  const [color, setColor] = useState(COMMITMENT_COLORS[0]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  async function handleAdd() {
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onAdd({ title: title.trim(), dayOfWeek, startHour, startMin, color });
      setTitle("");
      setDayOfWeek(0);
      setStartHour(9);
      setStartMin(0);
      setColor(COMMITMENT_COLORS[0]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Weekly Commitments</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl leading-none"
          >
            &times;
          </button>
        </div>

        {/* Add form */}
        <div className="p-4 border-b space-y-3">
          <h3 className="text-sm font-semibold text-gray-600">Add New</h3>
          {error && <p className="text-xs text-red-600">{error}</p>}

          <input
            type="text"
            placeholder="Title (e.g. Basketball, Piano)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-400 focus:outline-none"
          />

          <div className="flex gap-2 flex-wrap">
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              {DAY_LABELS.map((label, i) => (
                <option key={i} value={i}>
                  {label}
                </option>
              ))}
            </select>

            <select
              value={startHour}
              onChange={(e) => setStartHour(parseInt(e.target.value))}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              {Array.from({ length: END_HOUR - START_HOUR }, (_, i) => START_HOUR + i).map(
                (h) => (
                  <option key={h} value={h}>
                    {formatHour(h)}
                  </option>
                )
              )}
            </select>

            <select
              value={startMin}
              onChange={(e) => setStartMin(parseInt(e.target.value) as 0 | 30)}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              <option value={0}>:00</option>
              <option value={30}>:30</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-xs text-gray-500 mr-1">Color:</span>
            {COMMITMENT_COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                className={`w-5 h-5 rounded-full border-2 transition-all ${
                  color === c ? "border-gray-800 scale-110" : "border-transparent"
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>

          <button
            onClick={handleAdd}
            disabled={saving}
            className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Adding..." : "Add Commitment"}
          </button>
        </div>

        {/* List */}
        <div className="p-4 space-y-2">
          {commitments.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">
              No commitments yet. Add your recurring activities above.
            </p>
          )}
          {commitments.map((c) => (
            <div
              key={c.id}
              className="flex items-center justify-between rounded-lg border px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: c.color || "#6b7280" }}
                />
                <span className="text-sm font-medium text-gray-700 truncate">
                  {c.title}
                </span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {DAY_LABELS[c.dayOfWeek]} {formatHour(c.startHour)}
                  {c.startMin === 30 ? ":30" : ":00"}
                </span>
              </div>
              <button
                onClick={() => onDelete(c.id)}
                className="text-red-400 hover:text-red-600 text-sm ml-2 flex-shrink-0"
              >
                Delete
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function TimePlanPage() {
  // Week navigation
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));

  // Data
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [slots, setSlots] = useState<TimePlanSlot[]>([]);
  const [commitments, setCommitments] = useState<WeeklyCommitment[]>([]);

  // UI state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [showCommitments, setShowCommitments] = useState(false);

  const weekStartStr = toISODate(weekStart);

  // Sensors for dnd-kit
  const pointerSensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 5 },
  });
  const touchSensor = useSensor(TouchSensor, {
    activationConstraint: { delay: 200, tolerance: 5 },
  });
  const sensors = useSensors(pointerSensor, touchSensor);

  // -----------------------------------------------------------------------
  // Data fetching
  // -----------------------------------------------------------------------

  const fetchTasks = useCallback(async () => {
    try {
      const res = await fetch("/api/assignments");
      if (!res.ok) throw new Error("Failed to load assignments");
      const data = await res.json();
      setTasks(data.assignments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load tasks");
    }
  }, []);

  const fetchSlots = useCallback(async () => {
    try {
      const res = await fetch(`/api/time-plan/slots?weekStart=${weekStartStr}`);
      if (!res.ok) throw new Error("Failed to load slots");
      const data = await res.json();
      setSlots(data.slots);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load slots");
    }
  }, [weekStartStr]);

  const fetchCommitments = useCallback(async () => {
    try {
      const res = await fetch("/api/time-plan/commitments");
      if (!res.ok) throw new Error("Failed to load commitments");
      const data = await res.json();
      setCommitments(data.commitments);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load commitments");
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchCommitments(), fetchSlots()]).finally(() =>
      setLoading(false)
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch slots when week changes
  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  // Count how many slots each assignment has across ALL weeks (for the dot display)
  // We only count slots for the current viewed week for the panel dots.
  // Actually, the spec says "planned slots for this week" so count per-week.
  const plannedCountByTask = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of slots) {
      counts[s.assignmentId] = (counts[s.assignmentId] || 0) + 1;
    }
    return counts;
  }, [slots]);

  // Filter tasks: non-completed with estimatedPomodoros > 0
  const planTasks = useMemo(
    () =>
      tasks.filter(
        (t) => t.status !== "completed" && t.estimatedPomodoros > 0
      ),
    [tasks]
  );

  // Index slots by cell key for quick lookup
  const slotsByCell = useMemo(() => {
    const map: Record<string, TimePlanSlot> = {};
    for (const s of slots) {
      map[slotKey(s.dayOfWeek, s.startHour, s.startMin)] = s;
    }
    return map;
  }, [slots]);

  // Index commitments by cell key
  const commitmentsByCell = useMemo(() => {
    const map: Record<string, WeeklyCommitment> = {};
    for (const c of commitments) {
      map[slotKey(c.dayOfWeek, c.startHour, c.startMin)] = c;
    }
    return map;
  }, [commitments]);

  // The dragged task object
  const draggedTask = useMemo(
    () => (draggedTaskId ? planTasks.find((t) => t.id === draggedTaskId) : null),
    [draggedTaskId, planTasks]
  );

  // -----------------------------------------------------------------------
  // DnD handlers
  // -----------------------------------------------------------------------

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id).replace("task-", "");
    setDraggedTaskId(id);
  }

  async function handleDragEnd(event: DragEndEvent) {
    setDraggedTaskId(null);

    const { active, over } = event;
    if (!over) return;

    const assignmentId = String(active.id).replace("task-", "");
    const parsed = parseSlotKey(String(over.id));
    if (!parsed) return;

    const { day, hour, min } = parsed;

    // Check cell is not occupied
    const cellId = slotKey(day, hour, min);
    if (slotsByCell[cellId] || commitmentsByCell[cellId]) return;

    try {
      const res = await fetch("/api/time-plan/slots", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId,
          weekStart: weekStartStr,
          dayOfWeek: day,
          startHour: hour,
          startMin: min,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to add slot");
        return;
      }

      // Refetch slots to stay in sync
      await fetchSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add slot");
    }
  }

  // -----------------------------------------------------------------------
  // Slot removal
  // -----------------------------------------------------------------------

  async function removeSlot(id: string) {
    try {
      const res = await fetch(`/api/time-plan/slots?id=${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to remove slot");
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove slot");
    }
  }

  // -----------------------------------------------------------------------
  // Commitment CRUD
  // -----------------------------------------------------------------------

  async function addCommitment(c: Omit<WeeklyCommitment, "id">) {
    const res = await fetch("/api/time-plan/commitments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(c),
    });
    if (!res.ok) {
      const data = await res.json();
      throw new Error(data.error || "Failed to add commitment");
    }
    await fetchCommitments();
  }

  async function deleteCommitment(id: string) {
    const res = await fetch(`/api/time-plan/commitments/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete commitment");
    setCommitments((prev) => prev.filter((c) => c.id !== id));
  }

  // -----------------------------------------------------------------------
  // Week navigation
  // -----------------------------------------------------------------------

  function prevWeek() {
    setWeekStart((ws) => addDays(ws, -7));
  }
  function nextWeek() {
    setWeekStart((ws) => addDays(ws, 7));
  }
  function goThisWeek() {
    setWeekStart(getMonday(new Date()));
  }

  const isCurrentWeek =
    toISODate(weekStart) === toISODate(getMonday(new Date()));

  // -----------------------------------------------------------------------
  // Build time rows
  // -----------------------------------------------------------------------

  const timeRows = useMemo(() => {
    const rows: { hour: number; min: number }[] = [];
    for (let i = 0; i < TOTAL_SLOTS; i++) {
      const hour = START_HOUR + Math.floor(i / 2);
      const min = (i % 2) * 30;
      rows.push({ hour, min });
    }
    return rows;
  }, []);

  // -----------------------------------------------------------------------
  // Render
  // -----------------------------------------------------------------------

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
        <div className="max-w-[1400px] mx-auto px-4 py-6">
          {/* Page header */}
          <div className="mb-6">
            <h1 className="text-2xl font-bold text-gray-800">Time Plan</h1>
            <p className="text-sm text-gray-500 mt-1">
              Drag tasks into your weekly timetable to plan study blocks.
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError("")} className="ml-2 font-bold">
                &times;
              </button>
            </div>
          )}

          {/* Week navigator */}
          <div className="flex items-center justify-between mb-4 bg-white rounded-xl border shadow-sm px-4 py-3">
            <button
              onClick={prevWeek}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Previous week"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <span className="font-semibold text-gray-800">
                Week of {formatWeekLabel(weekStart)}
              </span>
              {!isCurrentWeek && (
                <button
                  onClick={goThisWeek}
                  className="ml-3 text-xs text-blue-600 hover:text-blue-800 font-medium"
                >
                  This Week
                </button>
              )}
            </div>
            <button
              onClick={nextWeek}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Next week"
            >
              <svg
                className="w-5 h-5 text-gray-600"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              {/* Task blocks panel */}
              <div className="mb-4 bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">
                    Tasks to Plan
                  </h2>
                  <button
                    onClick={() => setShowCommitments(true)}
                    className="text-xs font-medium text-purple-600 hover:text-purple-800 border border-purple-200 rounded-lg px-3 py-1.5 hover:bg-purple-50 transition-colors"
                  >
                    Weekly Commitments
                  </button>
                </div>
                {planTasks.length === 0 ? (
                  <p className="text-xs text-gray-400">
                    No tasks to plan. Create assignments with estimated pomodoros first.
                  </p>
                ) : (
                  <div className="flex gap-2 overflow-x-auto pb-2 -mx-1 px-1">
                    {planTasks.map((task) => (
                      <DraggableTaskBlock
                        key={task.id}
                        task={task}
                        plannedCount={plannedCountByTask[task.id] || 0}
                      />
                    ))}
                  </div>
                )}
              </div>

              {/* Timetable grid */}
              <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
                {/* Scrollable on mobile */}
                <div className="overflow-x-auto">
                  <div className="min-w-[700px]">
                    {/* Day headers */}
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-gray-50">
                      <div className="px-2 py-2" />
                      {DAY_LABELS.map((label, dayIdx) => {
                        const dayDate = addDays(weekStart, dayIdx);
                        const today = isToday(weekStart, dayIdx);
                        return (
                          <div
                            key={dayIdx}
                            className={`text-center py-2 text-xs font-semibold border-l ${
                              today
                                ? "text-blue-700 bg-blue-50/60"
                                : dayIdx >= 5
                                ? "text-gray-400 bg-gray-50/80"
                                : "text-gray-600"
                            }`}
                          >
                            {label}{" "}
                            <span className="font-normal">
                              {dayDate.getDate()}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Time rows */}
                    {timeRows.map(({ hour, min }) => (
                      <div
                        key={`${hour}-${min}`}
                        className="grid grid-cols-[60px_repeat(7,1fr)]"
                      >
                        {/* Time label */}
                        <div className="px-2 flex items-center border-b border-r border-gray-200 h-8">
                          {min === 0 && (
                            <span className="text-[10px] text-gray-400 leading-none">
                              {formatHour(hour)}
                            </span>
                          )}
                        </div>

                        {/* Day cells */}
                        {DAY_LABELS.map((_, dayIdx) => {
                          const cellId = slotKey(dayIdx, hour, min);
                          const existingSlot = slotsByCell[cellId];
                          const existingCommitment = commitmentsByCell[cellId];
                          const pastCell = isPast(weekStart, dayIdx, hour, min);
                          const todayCol = isToday(weekStart, dayIdx);
                          const weekend = dayIdx >= 5;

                          return (
                            <DroppableCell
                              key={cellId}
                              id={cellId}
                              isPastCell={pastCell}
                              isWeekend={weekend}
                              isTodayCol={todayCol}
                            >
                              {existingSlot && (
                                <SlotBlock
                                  slot={existingSlot}
                                  onRemove={removeSlot}
                                />
                              )}
                              {existingCommitment && (
                                <CommitmentBlock
                                  commitment={existingCommitment}
                                />
                              )}
                            </DroppableCell>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Drag overlay */}
              <DragOverlay>
                {draggedTask ? <DragOverlayBlock task={draggedTask} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </main>

      {/* Commitments modal */}
      <CommitmentsModal
        open={showCommitments}
        onClose={() => setShowCommitments(false)}
        commitments={commitments}
        onAdd={addCommitment}
        onDelete={deleteCommitment}
      />

      <Footer />
    </>
  );
}
