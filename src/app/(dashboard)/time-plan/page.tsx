"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
  assignment: { title: string; category: string };
}

interface WeeklyCommitment {
  id: string;
  title: string;
  dayOfWeek: number;
  startHour: number;
  startMin: number;
  endHour: number;
  endMin: number;
  duration: number;
  color: string | null;
  termStart: string | null;
  termEnd: string | null;
}

interface CalendarStatus {
  google: { connected: boolean };
  outlook: { connected: boolean };
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const DAY_LABELS_FULL = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const START_HOUR = 6;
const END_HOUR = 22;
const TOTAL_SLOTS = (END_HOUR - START_HOUR) * 2;
const CELL_HEIGHT = 32; // px per half-hour slot

const COMMITMENT_COLORS = [
  "#9ca3af", "#ef4444", "#f97316", "#f59e0b", "#84cc16",
  "#22c55e", "#14b8a6", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899",
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

function formatTime(hour: number, min: number): string {
  const h = hour % 12 || 12;
  const ampm = hour < 12 ? "AM" : "PM";
  return `${h}:${min === 0 ? "00" : "30"} ${ampm}`;
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

function isSameDate(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}

/** Get today's day index (0=Mon) within the viewed week, or -1 if not visible */
function getTodayIndex(weekStart: Date): number {
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    if (isToday(weekStart, i)) return i;
  }
  return -1;
}

// ---------------------------------------------------------------------------
// DraggableTaskBlock
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
      style={{ borderColor: color, backgroundColor: `${color}18` }}
    >
      <p className="text-xs font-semibold truncate mb-1" style={{ color }}>
        {task.title}
      </p>
      <div className="flex items-center gap-0.5">
        {Array.from({ length: total }).map((_, i) => (
          <span
            key={i}
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: i < plannedCount ? color : `${color}40` }}
          />
        ))}
        <span className="text-[10px] ml-1 text-gray-500">
          {plannedCount}/{total}
        </span>
      </div>
    </div>
  );
}

function DragOverlayBlock({ task }: { task: TaskAssignment }) {
  const color = getCategoryColor(task.category);
  return (
    <div
      className="w-36 rounded-lg px-3 py-2 border-2 shadow-xl"
      style={{ borderColor: color, backgroundColor: `${color}30` }}
    >
      <p className="text-xs font-semibold truncate" style={{ color }}>
        {task.title}
      </p>
    </div>
  );
}

// ---------------------------------------------------------------------------
// DroppableCell
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
        relative border-b border-r border-gray-200
        transition-colors duration-100
        ${isPastCell ? "opacity-60" : ""}
        ${isWeekend ? "bg-gray-50/60" : ""}
        ${isTodayCol ? "bg-blue-50/40" : ""}
        ${isOver ? "bg-blue-100 border-dashed border-blue-400" : ""}
      `}
      style={{ height: CELL_HEIGHT }}
    >
      {children}
    </div>
  );
}

// ---------------------------------------------------------------------------
// SlotBlock
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
        onClick={(e) => { e.stopPropagation(); onRemove(slot.id); }}
        className="opacity-0 group-hover:opacity-100 transition-opacity ml-0.5 hover:bg-white/30 rounded px-0.5 flex-shrink-0"
        aria-label="Remove slot"
      >
        x
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommitmentBlock — spans multiple cells with cross-hatch pattern
// ---------------------------------------------------------------------------

function CommitmentBlock({
  commitment,
  spanSlots,
  isFirst,
}: {
  commitment: WeeklyCommitment;
  spanSlots: number;
  isFirst: boolean;
}) {
  if (!isFirst) return null; // Only render from the first cell

  const bgColor = commitment.color || "#9ca3af";

  return (
    <div
      className="absolute left-0.5 right-0.5 rounded flex items-start px-1.5 py-0.5 text-[10px] font-medium text-white z-10 overflow-hidden"
      style={{
        top: 2,
        height: spanSlots * CELL_HEIGHT - 4,
        backgroundColor: bgColor,
        backgroundImage:
          "repeating-linear-gradient(45deg, transparent, transparent 3px, rgba(255,255,255,0.15) 3px, rgba(255,255,255,0.15) 6px)",
      }}
    >
      <span className="truncate">{commitment.title}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Due Tasks Pill (for the all-day row)
// ---------------------------------------------------------------------------

function DueTaskPill({ task }: { task: TaskAssignment }) {
  const color = getCategoryColor(task.category);
  return (
    <div
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold text-white mr-1 mb-0.5 max-w-full"
      style={{ backgroundColor: color }}
      title={task.title}
    >
      <svg className="w-2.5 h-2.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <span className="truncate">{task.title}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// CommitmentsModal (updated with from/to time + term dates)
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
  onAdd: (c: Omit<WeeklyCommitment, "id" | "duration">) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}) {
  const [title, setTitle] = useState("");
  const [dayOfWeek, setDayOfWeek] = useState(0);
  const [startHour, setStartHour] = useState(9);
  const [startMin, setStartMin] = useState<0 | 30>(0);
  const [endHour, setEndHour] = useState(10);
  const [endMin, setEndMin] = useState<0 | 30>(0);
  const [color, setColor] = useState(COMMITMENT_COLORS[0]); // grey default
  const [termStart, setTermStart] = useState("");
  const [termEnd, setTermEnd] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  if (!open) return null;

  const startTotal = startHour * 60 + startMin;
  const endTotal = endHour * 60 + endMin;
  const isValidTime = endTotal > startTotal;

  async function handleAdd() {
    if (!title.trim()) { setError("Title is required"); return; }
    if (!isValidTime) { setError("End time must be after start time"); return; }
    setError("");
    setSaving(true);
    try {
      await onAdd({
        title: title.trim(),
        dayOfWeek,
        startHour,
        startMin,
        endHour,
        endMin,
        color,
        termStart: termStart || null,
        termEnd: termEnd || null,
      });
      setTitle("");
      setDayOfWeek(0);
      setStartHour(9);
      setStartMin(0);
      setEndHour(10);
      setEndMin(0);
      setColor(COMMITMENT_COLORS[0]);
      setTermStart("");
      setTermEnd("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add");
    } finally {
      setSaving(false);
    }
  }

  const hourOptions = Array.from({ length: END_HOUR - START_HOUR + 1 }, (_, i) => START_HOUR + i);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Weekly Commitments</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
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

          <div className="flex gap-2 flex-wrap items-center">
            <select
              value={dayOfWeek}
              onChange={(e) => setDayOfWeek(parseInt(e.target.value))}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              {DAY_LABELS_FULL.map((label, i) => (
                <option key={i} value={i}>{label}</option>
              ))}
            </select>

            <span className="text-xs text-gray-500">From</span>
            <select
              value={startHour}
              onChange={(e) => setStartHour(parseInt(e.target.value))}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
            <select
              value={startMin}
              onChange={(e) => setStartMin(parseInt(e.target.value) as 0 | 30)}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              <option value={0}>:00</option>
              <option value={30}>:30</option>
            </select>

            <span className="text-xs text-gray-500">To</span>
            <select
              value={endHour}
              onChange={(e) => setEndHour(parseInt(e.target.value))}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              {hourOptions.map((h) => (
                <option key={h} value={h}>{formatHour(h)}</option>
              ))}
            </select>
            <select
              value={endMin}
              onChange={(e) => setEndMin(parseInt(e.target.value) as 0 | 30)}
              className="border rounded-lg px-2 py-1.5 text-sm"
            >
              <option value={0}>:00</option>
              <option value={30}>:30</option>
            </select>
          </div>

          {!isValidTime && (startHour !== 9 || endHour !== 10) && (
            <p className="text-xs text-amber-600">End time must be after start time</p>
          )}

          {/* Term dates (optional) */}
          <div className="flex gap-2 items-center flex-wrap">
            <span className="text-xs text-gray-500">Term period (optional):</span>
            <input
              type="date"
              value={termStart}
              onChange={(e) => setTermStart(e.target.value)}
              className="border rounded-lg px-2 py-1 text-sm"
              placeholder="Start"
            />
            <span className="text-xs text-gray-400">to</span>
            <input
              type="date"
              value={termEnd}
              onChange={(e) => setTermEnd(e.target.value)}
              className="border rounded-lg px-2 py-1 text-sm"
              placeholder="End"
            />
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
                style={{
                  backgroundColor: c,
                  backgroundImage: c === "#9ca3af"
                    ? "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)"
                    : undefined,
                }}
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
            <div key={c.id} className="flex items-center justify-between rounded-lg border px-3 py-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{
                    backgroundColor: c.color || "#9ca3af",
                    backgroundImage:
                      (c.color || "#9ca3af") === "#9ca3af"
                        ? "repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(255,255,255,0.4) 1px, rgba(255,255,255,0.4) 2px)"
                        : undefined,
                  }}
                />
                <span className="text-sm font-medium text-gray-700 truncate">{c.title}</span>
                <span className="text-xs text-gray-400 flex-shrink-0">
                  {DAY_LABELS_FULL[c.dayOfWeek]}{" "}
                  {formatTime(c.startHour, c.startMin)} – {formatTime(c.endHour, c.endMin)}
                </span>
                {c.termStart && c.termEnd && (
                  <span className="text-[10px] text-purple-500 flex-shrink-0">
                    (Term: {c.termStart} – {c.termEnd})
                  </span>
                )}
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
// Calendar Sync Modal
// ---------------------------------------------------------------------------

function CalendarSyncModal({
  open,
  onClose,
  calendarStatus,
  onConnectGoogle,
  onConnectOutlook,
  onDisconnect,
  onSyncWeek,
  syncing,
}: {
  open: boolean;
  onClose: () => void;
  calendarStatus: CalendarStatus;
  onConnectGoogle: () => void;
  onConnectOutlook: () => void;
  onDisconnect: (provider: "google" | "outlook") => void;
  onSyncWeek: (provider: "google" | "outlook") => void;
  syncing: boolean;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-bold text-gray-800">Calendar Sync</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">
            &times;
          </button>
        </div>

        <div className="p-4 space-y-4">
          <p className="text-sm text-gray-500">
            Sync your study blocks and task due dates to your calendar. Events include a link back to the Pomodoro timer and a 1-day-before reminder for due dates.
          </p>

          {/* Google Calendar */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
                <span className="font-medium text-sm text-gray-700">Google Calendar</span>
              </div>
              {calendarStatus.google.connected ? (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Connected
                </span>
              ) : (
                <span className="text-xs text-gray-400">Not connected</span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              {calendarStatus.google.connected ? (
                <>
                  <button
                    onClick={() => onSyncWeek("google")}
                    disabled={syncing}
                    className="flex-1 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {syncing ? "Syncing..." : "Sync This Week"}
                  </button>
                  <button
                    onClick={() => onDisconnect("google")}
                    className="text-xs text-red-500 hover:text-red-700 px-2"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={onConnectGoogle}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Connect Google Calendar
                </button>
              )}
            </div>
          </div>

          {/* Outlook Calendar */}
          <div className="border rounded-lg p-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.58a.786.786 0 01-.58.24h-8.17v-12.1h8.17c.23 0 .424.08.58.24.16.16.238.35.238.562zM7.21 2.498L0 4.107v15.786l7.21 1.609V2.498zm8.907 3.71H8.91v3.18h3.305v8.214H8.91v3.182h7.207c.23 0 .424-.08.58-.238a.786.786 0 00.24-.58V6.984a.786.786 0 00-.24-.58.786.786 0 00-.58-.196zm-8.908 7.79a2.71 2.71 0 01-.668 1.885 2.14 2.14 0 01-1.672.743 2.14 2.14 0 01-1.674-.743 2.71 2.71 0 01-.666-1.884c0-.77.222-1.405.666-1.906a2.14 2.14 0 011.674-.743c.656 0 1.213.248 1.672.743.445.501.668 1.136.668 1.906z" />
                </svg>
                <span className="font-medium text-sm text-gray-700">Outlook Calendar</span>
              </div>
              {calendarStatus.outlook.connected ? (
                <span className="text-xs text-green-600 font-medium flex items-center gap-1">
                  <span className="w-2 h-2 bg-green-500 rounded-full" />
                  Connected
                </span>
              ) : (
                <span className="text-xs text-gray-400">Not connected</span>
              )}
            </div>
            <div className="mt-3 flex gap-2">
              {calendarStatus.outlook.connected ? (
                <>
                  <button
                    onClick={() => onSyncWeek("outlook")}
                    disabled={syncing}
                    className="flex-1 bg-blue-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {syncing ? "Syncing..." : "Sync This Week"}
                  </button>
                  <button
                    onClick={() => onDisconnect("outlook")}
                    className="text-xs text-red-500 hover:text-red-700 px-2"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <button
                  onClick={onConnectOutlook}
                  className="flex-1 bg-white border border-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Connect Outlook Calendar
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function TimePlanPage() {
  const [weekStart, setWeekStart] = useState<Date>(() => getMonday(new Date()));
  const [tasks, setTasks] = useState<TaskAssignment[]>([]);
  const [slots, setSlots] = useState<TimePlanSlot[]>([]);
  const [commitments, setCommitments] = useState<WeeklyCommitment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [showCommitments, setShowCommitments] = useState(false);
  const [showCalendarSync, setShowCalendarSync] = useState(false);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({
    google: { connected: false },
    outlook: { connected: false },
  });
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState("");
  const [currentTime, setCurrentTime] = useState(new Date());

  const gridRef = useRef<HTMLDivElement>(null);
  const todayColRef = useRef<HTMLDivElement>(null);

  const weekStartStr = toISODate(weekStart);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Check URL params for calendar connection result
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const connected = params.get("calendarConnected");
    const calError = params.get("calendarError");
    if (connected) {
      setSyncMessage(`${connected === "google" ? "Google" : "Outlook"} Calendar connected successfully!`);
      // Clean URL
      window.history.replaceState({}, "", "/time-plan");
      fetchCalendarStatus();
    }
    if (calError) {
      setError(`Calendar connection failed: ${calError}`);
      window.history.replaceState({}, "", "/time-plan");
    }
  }, []);

  const pointerSensor = useSensor(PointerSensor, { activationConstraint: { distance: 5 } });
  const touchSensor = useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } });
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

  const fetchCalendarStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/calendar/status");
      if (res.ok) {
        const data = await res.json();
        setCalendarStatus(data);
      }
    } catch {
      // Ignore
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchTasks(), fetchCommitments(), fetchSlots(), fetchCalendarStatus()]).finally(() =>
      setLoading(false)
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { fetchSlots(); }, [fetchSlots]);

  // Auto-scroll to today column on load
  useEffect(() => {
    if (!loading && todayColRef.current) {
      todayColRef.current.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
    }
  }, [loading, weekStart]);

  // Auto-scroll to current time on load
  useEffect(() => {
    if (!loading && gridRef.current) {
      const now = new Date();
      const hour = now.getHours();
      if (hour >= START_HOUR && hour < END_HOUR) {
        const minutesFromStart = (hour - START_HOUR) * 60 + now.getMinutes();
        const totalHeight = TOTAL_SLOTS * CELL_HEIGHT;
        const totalMinutes = (END_HOUR - START_HOUR) * 60;
        const scrollTo = (minutesFromStart / totalMinutes) * totalHeight - 200;
        gridRef.current.scrollTop = Math.max(0, scrollTo);
      }
    }
  }, [loading]);

  // -----------------------------------------------------------------------
  // Derived data
  // -----------------------------------------------------------------------

  const plannedCountByTask = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const s of slots) {
      counts[s.assignmentId] = (counts[s.assignmentId] || 0) + 1;
    }
    return counts;
  }, [slots]);

  const planTasks = useMemo(
    () => tasks.filter((t) => t.status !== "completed" && t.estimatedPomodoros > 0),
    [tasks]
  );

  const slotsByCell = useMemo(() => {
    const map: Record<string, TimePlanSlot> = {};
    for (const s of slots) {
      map[slotKey(s.dayOfWeek, s.startHour, s.startMin)] = s;
    }
    return map;
  }, [slots]);

  // Build commitment lookup — map each cell they occupy
  const commitmentCellMap = useMemo(() => {
    const map: Record<string, { commitment: WeeklyCommitment; isFirst: boolean; spanSlots: number }> = {};

    // Filter commitments by term dates
    const viewDates = Array.from({ length: 7 }, (_, i) => toISODate(addDays(weekStart, i)));

    for (const c of commitments) {
      // Check term filter
      if (c.termStart && c.termEnd) {
        const weekEndDate = viewDates[6];
        const weekStartDate = viewDates[0];
        if (weekEndDate < c.termStart || weekStartDate > c.termEnd) continue;
      }

      const startTotal = c.startHour * 60 + c.startMin;
      const endTotal = c.endHour * 60 + c.endMin;
      const durationMin = endTotal > startTotal ? endTotal - startTotal : 30;
      const numSlots = Math.ceil(durationMin / 30);

      let isFirst = true;
      for (let i = 0; i < numSlots; i++) {
        const minuteOffset = startTotal + i * 30;
        const h = Math.floor(minuteOffset / 60);
        const m = minuteOffset % 60;
        if (h >= END_HOUR) break;
        const key = slotKey(c.dayOfWeek, h, m);
        map[key] = { commitment: c, isFirst, spanSlots: numSlots - i };
        isFirst = false;
      }
    }
    return map;
  }, [commitments, weekStart]);

  // Tasks due on each day of the view
  const tasksDueByDay = useMemo(() => {
    const byDay: Record<number, TaskAssignment[]> = {};
    for (let i = 0; i < 7; i++) {
      const dayDate = addDays(weekStart, i);
      byDay[i] = tasks.filter((t) => {
        if (t.status === "completed") return false;
        const due = new Date(t.dueDate);
        return isSameDate(due, dayDate);
      });
    }
    return byDay;
  }, [tasks, weekStart]);

  const hasDueTasks = useMemo(() =>
    Object.values(tasksDueByDay).some((arr) => arr.length > 0),
    [tasksDueByDay]
  );

  const draggedTask = useMemo(
    () => (draggedTaskId ? planTasks.find((t) => t.id === draggedTaskId) : null),
    [draggedTaskId, planTasks]
  );

  // Current time indicator position
  const todayIdx = getTodayIndex(weekStart);
  const currentTimePosition = useMemo(() => {
    if (todayIdx === -1) return null;
    const hour = currentTime.getHours();
    const minute = currentTime.getMinutes();
    if (hour < START_HOUR || hour >= END_HOUR) return null;
    const minutesFromStart = (hour - START_HOUR) * 60 + minute;
    const totalMinutes = (END_HOUR - START_HOUR) * 60;
    const topPx = (minutesFromStart / totalMinutes) * (TOTAL_SLOTS * CELL_HEIGHT);
    return { topPx, dayIdx: todayIdx };
  }, [currentTime, todayIdx]);

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
    const cellId = slotKey(day, hour, min);
    if (slotsByCell[cellId] || commitmentCellMap[cellId]) return;

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
      await fetchSlots();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add slot");
    }
  }

  async function removeSlot(id: string) {
    try {
      const res = await fetch(`/api/time-plan/slots?id=${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove slot");
      setSlots((prev) => prev.filter((s) => s.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to remove slot");
    }
  }

  // -----------------------------------------------------------------------
  // Commitment CRUD
  // -----------------------------------------------------------------------

  async function addCommitment(c: Omit<WeeklyCommitment, "id" | "duration">) {
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
    const res = await fetch(`/api/time-plan/commitments/${id}`, { method: "DELETE" });
    if (!res.ok) throw new Error("Failed to delete commitment");
    setCommitments((prev) => prev.filter((c) => c.id !== id));
  }

  // -----------------------------------------------------------------------
  // Calendar sync
  // -----------------------------------------------------------------------

  async function connectCalendar(provider: "google" | "outlook") {
    try {
      const res = await fetch(`/api/calendar/${provider}/auth`);
      const data = await res.json();
      if (data.error) {
        setError(data.error);
        return;
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to start calendar connection");
    }
  }

  async function disconnectCalendar(provider: "google" | "outlook") {
    try {
      await fetch(`/api/calendar/status?provider=${provider}`, { method: "DELETE" });
      await fetchCalendarStatus();
      setSyncMessage(`${provider === "google" ? "Google" : "Outlook"} Calendar disconnected.`);
    } catch {
      setError("Failed to disconnect calendar");
    }
  }

  async function syncWeekToCalendar(provider: "google" | "outlook") {
    setSyncing(true);
    setSyncMessage("");
    try {
      // Build events from slots + due tasks
      const events: {
        title: string;
        description: string;
        startTime: string;
        endTime: string;
        reminder: number;
        link?: string;
      }[] = [];

      const appUrl = window.location.origin;

      // Study blocks
      for (const slot of slots) {
        const dayDate = addDays(weekStart, slot.dayOfWeek);
        const startDT = new Date(dayDate);
        startDT.setHours(slot.startHour, slot.startMin, 0, 0);
        const endDT = new Date(startDT);
        endDT.setMinutes(endDT.getMinutes() + 30);

        events.push({
          title: `Study: ${slot.assignment.title}`,
          description: `Study session for ${slot.assignment.title} (${slot.assignment.category})`,
          startTime: startDT.toISOString(),
          endTime: endDT.toISOString(),
          reminder: 15,
          link: `${appUrl}/pomodoro`,
        });
      }

      // Due dates
      for (let day = 0; day < 7; day++) {
        const dueTasks = tasksDueByDay[day] || [];
        for (const task of dueTasks) {
          const dayDate = addDays(weekStart, day);
          const startDT = new Date(dayDate);
          startDT.setHours(9, 0, 0, 0);
          const endDT = new Date(dayDate);
          endDT.setHours(9, 30, 0, 0);

          events.push({
            title: `Due: ${task.title}`,
            description: `Task due today: ${task.title} (${task.category})`,
            startTime: startDT.toISOString(),
            endTime: endDT.toISOString(),
            reminder: 1440, // 1 day before
            link: `${appUrl}/assignments`,
          });
        }
      }

      if (events.length === 0) {
        setSyncMessage("No events to sync for this week.");
        return;
      }

      const res = await fetch(`/api/calendar/${provider}/sync`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ events }),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 401) {
          setError("Calendar connection expired. Please reconnect.");
          await fetchCalendarStatus();
        } else {
          setError(data.error || "Sync failed");
        }
        return;
      }

      setSyncMessage(`Synced ${data.synced}/${data.total} events to ${provider === "google" ? "Google" : "Outlook"} Calendar!`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  // -----------------------------------------------------------------------
  // Week navigation
  // -----------------------------------------------------------------------

  function prevWeek() { setWeekStart((ws) => addDays(ws, -7)); }
  function nextWeek() { setWeekStart((ws) => addDays(ws, 7)); }
  function goThisWeek() { setWeekStart(getMonday(new Date())); }

  const isCurrentWeek = toISODate(weekStart) === toISODate(getMonday(new Date()));

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

          {/* Error / success banners */}
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-2 flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError("")} className="ml-2 font-bold">&times;</button>
            </div>
          )}
          {syncMessage && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm rounded-lg px-4 py-2 flex items-center justify-between">
              <span>{syncMessage}</span>
              <button onClick={() => setSyncMessage("")} className="ml-2 font-bold">&times;</button>
            </div>
          )}

          {/* Week navigator */}
          <div className="flex items-center justify-between mb-4 bg-white rounded-xl border shadow-sm px-4 py-3">
            <button
              onClick={prevWeek}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Previous week"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <div className="text-center">
              <div className="font-semibold text-gray-800">
                Week of {formatWeekLabel(weekStart)}
              </div>
              <div className="flex items-center justify-center gap-2 mt-1">
                {!isCurrentWeek && (
                  <button
                    onClick={goThisWeek}
                    className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                  >
                    This Week
                  </button>
                )}
                {/* Calendar sync buttons */}
                <button
                  onClick={() => setShowCalendarSync(true)}
                  className="inline-flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700 font-medium border border-gray-200 rounded-lg px-2 py-0.5 hover:bg-gray-50 transition-colors"
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  Sync Calendar
                  {(calendarStatus.google.connected || calendarStatus.outlook.connected) && (
                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={nextWeek}
              className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
              aria-label="Next week"
            >
              <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-blue-400 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : (
            <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
              {/* Task blocks panel */}
              <div className="mb-4 bg-white rounded-xl border shadow-sm p-4">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-sm font-semibold text-gray-700">Tasks to Plan</h2>
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
                <div className="overflow-x-auto" ref={gridRef}>
                  <div className="min-w-[700px]">
                    {/* Due tasks row (Outlook-style all-day row) */}
                    {hasDueTasks && (
                      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b-2 border-orange-200 bg-orange-50/50">
                        <div className="px-2 py-1.5 flex items-center">
                          <span className="text-[10px] text-orange-500 font-semibold">DUE</span>
                        </div>
                        {DAY_LABELS_FULL.map((_, dayIdx) => {
                          const dueTasks = tasksDueByDay[dayIdx] || [];
                          const isTodayColumn = isToday(weekStart, dayIdx);
                          return (
                            <div
                              key={dayIdx}
                              className={`border-l border-orange-200 px-1 py-1 min-h-[28px] ${
                                isTodayColumn ? "bg-blue-50/40" : ""
                              }`}
                            >
                              {dueTasks.slice(0, 2).map((t) => (
                                <DueTaskPill key={t.id} task={t} />
                              ))}
                              {dueTasks.length > 2 && (
                                <span className="text-[9px] text-orange-500 font-medium">
                                  +{dueTasks.length - 2} more
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    {/* Day headers */}
                    <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b bg-gray-50 sticky top-0 z-20">
                      <div className="px-2 py-2" />
                      {DAY_LABELS_FULL.map((label, dayIdx) => {
                        const dayDate = addDays(weekStart, dayIdx);
                        const today = isToday(weekStart, dayIdx);
                        return (
                          <div
                            key={dayIdx}
                            ref={today ? todayColRef : undefined}
                            className={`text-center py-2 text-xs font-semibold border-l ${
                              today
                                ? "text-blue-700 bg-blue-100/80"
                                : dayIdx >= 5
                                ? "text-gray-400 bg-gray-50/80"
                                : "text-gray-600"
                            }`}
                          >
                            {label}{" "}
                            <span className={`font-normal ${today ? "bg-blue-600 text-white rounded-full px-1.5 py-0.5" : ""}`}>
                              {dayDate.getDate()}
                            </span>
                          </div>
                        );
                      })}
                    </div>

                    {/* Time rows with relative container for time indicator */}
                    <div className="relative">
                      {/* Current time indicator line */}
                      {currentTimePosition && (
                        <div
                          className="absolute z-20 pointer-events-none left-0 right-0"
                          style={{ top: currentTimePosition.topPx }}
                        >
                          <div className="grid grid-cols-[60px_repeat(7,1fr)]">
                            <div />
                            {DAY_LABELS_FULL.map((_, i) => (
                              <div key={i} className={i === currentTimePosition.dayIdx ? "" : "invisible"}>
                                <div className="flex items-center">
                                  <div className="w-2 h-2 rounded-full bg-red-500 -ml-1 flex-shrink-0" />
                                  <div className="flex-1 h-[2px] bg-red-500" />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {timeRows.map(({ hour, min }) => (
                        <div
                          key={`${hour}-${min}`}
                          className="grid grid-cols-[60px_repeat(7,1fr)]"
                        >
                          <div className="px-2 flex items-center border-b border-r border-gray-200" style={{ height: CELL_HEIGHT }}>
                            {min === 0 && (
                              <span className="text-[10px] text-gray-400 leading-none">
                                {formatHour(hour)}
                              </span>
                            )}
                          </div>

                          {DAY_LABELS_FULL.map((_, dayIdx) => {
                            const cellId = slotKey(dayIdx, hour, min);
                            const existingSlot = slotsByCell[cellId];
                            const commitmentInfo = commitmentCellMap[cellId];
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
                                  <SlotBlock slot={existingSlot} onRemove={removeSlot} />
                                )}
                                {commitmentInfo && (
                                  <CommitmentBlock
                                    commitment={commitmentInfo.commitment}
                                    spanSlots={commitmentInfo.spanSlots}
                                    isFirst={commitmentInfo.isFirst}
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
              </div>

              <DragOverlay>
                {draggedTask ? <DragOverlayBlock task={draggedTask} /> : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>
      </main>

      {/* Modals */}
      <CommitmentsModal
        open={showCommitments}
        onClose={() => setShowCommitments(false)}
        commitments={commitments}
        onAdd={addCommitment}
        onDelete={deleteCommitment}
      />

      <CalendarSyncModal
        open={showCalendarSync}
        onClose={() => setShowCalendarSync(false)}
        calendarStatus={calendarStatus}
        onConnectGoogle={() => connectCalendar("google")}
        onConnectOutlook={() => connectCalendar("outlook")}
        onDisconnect={disconnectCalendar}
        onSyncWeek={syncWeekToCalendar}
        syncing={syncing}
      />

      <Footer />
    </>
  );
}
