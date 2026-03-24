"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import Navbar from "@/components/Navbar";
import { getSmartGreeting, getNextSchoolEvent } from "@/lib/school-calendar";

interface DashboardData {
  assignmentStats: {
    pending: number;
    in_progress: number;
    completed: number;
    total: number;
    overdue: number;
  };
  upcoming: {
    id: string;
    title: string;
    dueDate: string;
    status: string;
    progress: number;
  }[];
  focusMinutesToday: number;
  focusSessionsToday: number;
  habitsTotal: number;
  habitsDoneToday: number;
  habitDetails: {
    id: string;
    title: string;
    doneToday: boolean;
    streak: number;
  }[];
  diaryDays: { date: string; mood: number | null }[];
  todayHasEntry: boolean;
}

// Encouraging messages based on assignment progress
function getAssignmentEncouragement(stats: DashboardData["assignmentStats"]): string {
  if (stats.total === 0) return "No assignments yet — add your first one to get started!";
  if (stats.completed === stats.total) return "All assignments complete! You're absolutely crushing it!";
  const pct = Math.round((stats.completed / stats.total) * 100);
  if (pct >= 75) return "Almost there! You've completed " + pct + "% of your assignments. Keep going!";
  if (pct >= 50) return "Halfway done! Solid progress — keep the momentum going!";
  if (stats.in_progress > 0) return "You're making progress! " + stats.in_progress + " assignment(s) in progress.";
  if (stats.overdue > 0) return "You have " + stats.overdue + " overdue — tackle the urgent ones first!";
  return "Time to get started! Pick an assignment and begin.";
}

function getFocusEncouragement(minutes: number): string {
  if (minutes === 0) return "No focus time yet today. Start a session!";
  if (minutes >= 120) return "Over 2 hours of focus! You're on fire today!";
  if (minutes >= 60) return "Over an hour of deep work — impressive focus!";
  if (minutes >= 25) return "Great start! Keep the focus sessions going.";
  return minutes + " minutes focused. Every minute counts!";
}

function getHabitEncouragement(done: number, total: number): string {
  if (total === 0) return "Create some habits to start building routines!";
  if (done === total) return "All habits done today! You're unstoppable!";
  if (done > total / 2) return "More than halfway — finish strong!";
  if (done > 0) return done + " down, " + (total - done) + " to go. You can do it!";
  return "Fresh start today — knock out those habits!";
}

// Tiny pie chart SVG
function PieChart({
  slices,
  size = 140,
}: {
  slices: { value: number; color: string; label: string }[];
  size?: number;
}) {
  const total = slices.reduce((s, sl) => s + sl.value, 0);
  if (total === 0) {
    return (
      <div className="flex items-center justify-center" style={{ width: size, height: size }}>
        <div className="w-full h-full rounded-full border-4 border-dashed border-gray-200 flex items-center justify-center">
          <span className="text-xs text-gray-400">No data</span>
        </div>
      </div>
    );
  }

  const r = size / 2;
  const innerR = r * 0.6;
  let cumulativeAngle = -Math.PI / 2;

  const paths = slices
    .filter((s) => s.value > 0)
    .map((slice) => {
      const angle = (slice.value / total) * 2 * Math.PI;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle = endAngle;

      const x1 = r + r * 0.9 * Math.cos(startAngle);
      const y1 = r + r * 0.9 * Math.sin(startAngle);
      const x2 = r + r * 0.9 * Math.cos(endAngle);
      const y2 = r + r * 0.9 * Math.sin(endAngle);
      const ix1 = r + innerR * Math.cos(endAngle);
      const iy1 = r + innerR * Math.sin(endAngle);
      const ix2 = r + innerR * Math.cos(startAngle);
      const iy2 = r + innerR * Math.sin(startAngle);
      const largeArc = angle > Math.PI ? 1 : 0;

      const d = [
        `M ${x1} ${y1}`,
        `A ${r * 0.9} ${r * 0.9} 0 ${largeArc} 1 ${x2} ${y2}`,
        `L ${ix1} ${iy1}`,
        `A ${innerR} ${innerR} 0 ${largeArc} 0 ${ix2} ${iy2}`,
        `Z`,
      ].join(" ");

      return <path key={slice.label} d={d} fill={slice.color} />;
    });

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {paths}
      <text
        x={r}
        y={r - 4}
        textAnchor="middle"
        className="fill-gray-900 font-bold"
        fontSize="20"
      >
        {total}
      </text>
      <text
        x={r}
        y={r + 12}
        textAnchor="middle"
        className="fill-gray-400"
        fontSize="10"
      >
        total
      </text>
    </svg>
  );
}

// Mood-to-yellow intensity: 1 = very light, 10 = dark golden
function moodToYellow(mood: number | null): string {
  if (!mood) return "bg-amber-300 text-amber-900"; // default
  // Scale from very light (1) to dark gold (10)
  const colors: Record<number, string> = {
    1: "bg-yellow-50 text-yellow-600",
    2: "bg-yellow-100 text-yellow-700",
    3: "bg-yellow-200 text-yellow-800",
    4: "bg-amber-200 text-amber-800",
    5: "bg-amber-300 text-amber-900",
    6: "bg-amber-400 text-white",
    7: "bg-amber-500 text-white",
    8: "bg-yellow-500 text-white",
    9: "bg-yellow-600 text-white",
    10: "bg-yellow-700 text-white",
  };
  return colors[mood] || "bg-amber-300 text-amber-900";
}

// Calendar mini component with mood-based coloring
function MiniCalendar({ diaryDays }: { diaryDays: { date: string; mood: number | null }[] }) {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = now.getDate();

  // Map date -> mood
  const moodMap = new Map<string, number | null>();
  diaryDays.forEach((d) => moodMap.set(d.date, d.mood));

  const monthName = now.toLocaleDateString("en-AU", { month: "long", year: "numeric" });
  const dayLabels = ["S", "M", "T", "W", "T", "F", "S"];

  const cells: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div>
      <div className="text-sm font-semibold text-gray-700 mb-2">{monthName}</div>
      <div className="grid grid-cols-7 gap-0.5 text-center">
        {dayLabels.map((d, i) => (
          <div key={i} className="text-[10px] font-medium text-gray-400 py-1">
            {d}
          </div>
        ))}
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />;
          const dateStr =
            year + "-" +
            String(month + 1).padStart(2, "0") + "-" +
            String(day).padStart(2, "0");
          const hasEntry = moodMap.has(dateStr);
          const mood = moodMap.get(dateStr) ?? null;
          const isToday = day === today;
          return (
            <div
              key={i}
              className={`text-[11px] w-7 h-7 flex items-center justify-center rounded-full mx-auto font-medium ${
                hasEntry
                  ? `${moodToYellow(mood)} font-bold`
                  : isToday
                  ? "ring-2 ring-blue-300 text-gray-700 font-semibold"
                  : "text-gray-500"
              }`}
              title={hasEntry ? `Mood: ${mood || "?"}/10` : ""}
            >
              {day}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDueDate(dateStr: string): string {
  const due = new Date(dateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `${diffDays} days`;
  return due.toLocaleDateString("en-AU", { month: "short", day: "numeric" });
}

function dueDateColor(dateStr: string): string {
  const due = new Date(dateStr);
  const diffDays = Math.ceil((due.getTime() - Date.now()) / 86400000);
  if (diffDays < 0) return "bg-red-100 text-red-700";
  if (diffDays <= 1) return "bg-orange-100 text-orange-700";
  if (diffDays <= 3) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse bg-gray-200 rounded-xl ${className}`} />;
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState("");

  useEffect(() => {
    fetch("/api/dashboard")
      .then((r) => r.json())
      .then((d) => setData(d))
      .catch(() => {})
      .finally(() => setLoading(false));
    fetch("/api/auth/me")
      .then((r) => r.json())
      .then((d) => { if (d.user?.role) setUserRole(d.user.role); })
      .catch(() => {});
  }, []);

  // Use Brisbane timezone for greeting
  const brisbaneNow = new Date(new Date().toLocaleString("en-US", { timeZone: "Australia/Brisbane" }));
  const brisbaneHour = brisbaneNow.getHours();
  const todayStr = brisbaneNow.getFullYear() + "-" +
    String(brisbaneNow.getMonth() + 1).padStart(2, "0") + "-" +
    String(brisbaneNow.getDate()).padStart(2, "0");
  const greeting = getSmartGreeting(brisbaneHour, todayStr);
  const schoolEvent = getNextSchoolEvent(todayStr);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        {/* Hero header with background image */}
        <div className="relative overflow-hidden bg-gray-900 mb-6">
          <Image src="/images/dashboard-bg.png" alt="" fill className="object-cover opacity-40" />
          <div className="absolute inset-0 bg-gradient-to-r from-gray-900/80 to-gray-900/40" />
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <h1 className="text-2xl font-bold text-white">{greeting}</h1>
            <div className="flex items-center gap-3 mt-1 flex-wrap">
              <p className="text-gray-300">
                {brisbaneNow.toLocaleDateString("en-AU", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
              {schoolEvent && (
                <span className="text-xs font-medium bg-blue-500/20 text-blue-300 px-2.5 py-1 rounded-full border border-blue-500/30">
                  {schoolEvent}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">

          {loading ? (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <SkeletonBlock className="lg:col-span-2 h-64" />
              <SkeletonBlock className="h-64" />
              <SkeletonBlock className="h-48" />
              <SkeletonBlock className="h-48" />
              <SkeletonBlock className="h-48" />
            </div>
          ) : data ? (
            <>
              {/* Top Row: Assignments + Focus */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
                {/* Assignment Pie Card */}
                <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Assignments</h2>
                    <Link href="/assignments" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View all &rarr;
                    </Link>
                  </div>
                  <div className="flex flex-col sm:flex-row items-center gap-6">
                    <PieChart
                      slices={[
                        { value: data.assignmentStats.completed, color: "#22c55e", label: "Completed" },
                        { value: data.assignmentStats.in_progress, color: "#3b82f6", label: "In Progress" },
                        { value: data.assignmentStats.pending, color: "#f59e0b", label: "Pending" },
                        { value: data.assignmentStats.overdue, color: "#ef4444", label: "Overdue" },
                      ]}
                    />
                    <div className="flex-1">
                      <div className="grid grid-cols-2 gap-3 mb-4">
                        {[
                          { label: "Completed", value: data.assignmentStats.completed, color: "bg-green-500" },
                          { label: "In Progress", value: data.assignmentStats.in_progress, color: "bg-blue-500" },
                          { label: "Pending", value: data.assignmentStats.pending, color: "bg-amber-500" },
                          { label: "Overdue", value: data.assignmentStats.overdue, color: "bg-red-500" },
                        ].map((item) => (
                          <div key={item.label} className="flex items-center gap-2">
                            <div className={`w-3 h-3 rounded-full ${item.color}`} />
                            <span className="text-sm text-gray-600">
                              {item.label}: <strong>{item.value}</strong>
                            </span>
                          </div>
                        ))}
                      </div>
                      <div className="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-3 border border-blue-100">
                        <p className="text-sm text-blue-800 font-medium">
                          {getAssignmentEncouragement(data.assignmentStats)}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Focus Today Card */}
                <div className={`bg-white rounded-2xl shadow-sm border p-6 ${
                  data.focusMinutesToday > 0 ? "border-green-200 bg-gradient-to-br from-green-50/50 to-white" : "border-gray-100"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Focus Today</h2>
                    <Link href="/pomodoro" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Start &rarr;
                    </Link>
                  </div>
                  <div className="text-center py-4">
                    <div className={`text-5xl font-bold ${data.focusMinutesToday > 0 ? "text-green-600" : "text-gray-300"}`}>
                      {data.focusMinutesToday}
                    </div>
                    <div className="text-sm text-gray-500 mt-1">minutes focused</div>
                    <div className="text-xs text-gray-400 mt-1">
                      {data.focusSessionsToday} session{data.focusSessionsToday !== 1 ? "s" : ""}
                    </div>
                  </div>
                  {/* Focus progress bar toward 120min goal */}
                  <div className="mt-4">
                    <div className="flex justify-between text-xs text-gray-400 mb-1">
                      <span>Daily goal</span>
                      <span>{Math.min(data.focusMinutesToday, 120)}/120 min</span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2.5">
                      <div
                        className={`h-2.5 rounded-full transition-all ${
                          data.focusMinutesToday >= 120
                            ? "bg-gradient-to-r from-green-400 to-emerald-500"
                            : "bg-gradient-to-r from-blue-400 to-cyan-500"
                        }`}
                        style={{ width: `${Math.min((data.focusMinutesToday / 120) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div className="mt-3 text-sm text-gray-600 font-medium">
                    {getFocusEncouragement(data.focusMinutesToday)}
                  </div>
                </div>
              </div>

              {/* Middle Row: Habits + Diary + Upcoming */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
                {/* Habits Card */}
                <div className={`bg-white rounded-2xl shadow-sm border p-6 ${
                  data.habitsDoneToday === data.habitsTotal && data.habitsTotal > 0
                    ? "border-green-200 bg-gradient-to-br from-green-50/50 to-white"
                    : "border-gray-100"
                }`}>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Habits</h2>
                    <Link href="/habits" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      View &rarr;
                    </Link>
                  </div>
                  <div className="text-center mb-4">
                    <span className="text-4xl font-bold text-gray-900">
                      {data.habitsDoneToday}
                    </span>
                    <span className="text-lg text-gray-400">/{data.habitsTotal}</span>
                    <p className="text-xs text-gray-500 mt-1">completed today</p>
                  </div>
                  {/* Habit list */}
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {data.habitDetails.map((h) => (
                      <div key={h.id} className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                            h.doneToday
                              ? "bg-green-500 text-white"
                              : "bg-gray-100 text-gray-400"
                          }`}>
                            {h.doneToday ? "✓" : ""}
                          </div>
                          <span className={h.doneToday ? "text-gray-700" : "text-gray-500"}>
                            {h.title}
                          </span>
                        </div>
                        {h.streak > 0 && (
                          <span className="text-xs text-orange-500 font-medium">
                            🔥 {h.streak}d
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg p-2.5 border border-purple-100">
                    <p className="text-xs text-purple-800 font-medium">
                      {getHabitEncouragement(data.habitsDoneToday, data.habitsTotal)}
                    </p>
                  </div>
                </div>

                {/* Diary Calendar Card */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-bold text-gray-900">Diary</h2>
                    <Link href="/diary" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
                      Write &rarr;
                    </Link>
                  </div>
                  <MiniCalendar diaryDays={data.diaryDays} />
                  <div className="mt-3 text-center">
                    {data.todayHasEntry ? (
                      <span className="inline-flex items-center gap-1 text-sm text-green-600 font-medium bg-green-50 px-3 py-1 rounded-full">
                        ✓ Entry written today
                      </span>
                    ) : (
                      <Link
                        href="/diary"
                        className="inline-flex items-center gap-1 text-sm text-blue-600 font-medium bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition-colors"
                      >
                        ✏️ Write today&apos;s entry
                      </Link>
                    )}
                  </div>
                </div>

                {/* Upcoming Assignments */}
                <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
                  <h2 className="text-lg font-bold text-gray-900 mb-4">Upcoming</h2>
                  {data.upcoming.length === 0 ? (
                    <div className="text-center py-8">
                      <div className="text-4xl mb-2">🎉</div>
                      <p className="text-sm text-gray-400">All clear! No upcoming assignments.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {data.upcoming.map((a) => (
                        <div key={a.id} className="flex items-center justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{a.title}</p>
                            {a.progress > 0 && (
                              <div className="w-full bg-gray-100 rounded-full h-1 mt-1">
                                <div
                                  className="bg-blue-500 h-1 rounded-full"
                                  style={{ width: `${a.progress}%` }}
                                />
                              </div>
                            )}
                          </div>
                          <span
                            className={`ml-3 text-xs font-medium px-2 py-0.5 rounded-full whitespace-nowrap ${dueDateColor(a.dueDate)}`}
                          >
                            {formatDueDate(a.dueDate)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Actions */}
              <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
                {[
                  { href: "/assignments", label: "Assignments", icon: "📋", gradient: "from-blue-500 to-cyan-500" },
                  { href: "/pomodoro", label: "Focus", icon: "🎯", gradient: "from-red-500 to-orange-500" },
                  { href: "/habits", label: "Habits", icon: "✅", gradient: "from-purple-500 to-pink-500" },
                  { href: "/meditate", label: "Breathe", icon: "🧘", gradient: "from-indigo-500 to-purple-500" },
                  { href: "/diary", label: "Diary", icon: "📝", gradient: "from-amber-500 to-yellow-500" },
                  { href: "/calendar", label: "Calendar", icon: "📅", gradient: "from-teal-500 to-green-500" },
                  ...((userRole === "manager" || userRole === "deputy_manager")
                    ? [{ href: "/admin", label: "Users", icon: "👥", gradient: "from-gray-600 to-gray-800" }]
                    : []),
                ].map((action) => (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all text-center"
                  >
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${action.gradient} flex items-center justify-center mx-auto mb-2 text-lg shadow-sm`}>
                      {action.icon}
                    </div>
                    <span className="text-xs font-medium text-gray-700 group-hover:text-gray-900">
                      {action.label}
                    </span>
                  </Link>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </main>
    </>
  );
}
