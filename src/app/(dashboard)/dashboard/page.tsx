"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Navbar from "@/components/Navbar";

interface Assignment {
  _id: string;
  title: string;
  subject: string;
  dueDate: string;
  status: string;
}

interface DashboardData {
  pendingCount: number;
  pomodoroMinutes: number;
  pomodoroSessions: number;
  activeHabits: number;
  hasDiaryEntry: boolean;
  upcomingAssignments: Assignment[];
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 animate-pulse">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-24 bg-gray-200 rounded" />
        <div className="h-10 w-10 bg-gray-200 rounded-lg" />
      </div>
      <div className="h-8 w-16 bg-gray-200 rounded mb-1" />
      <div className="h-3 w-20 bg-gray-100 rounded" />
    </div>
  );
}

function SkeletonRow() {
  return (
    <div className="flex items-center justify-between py-3 animate-pulse">
      <div className="flex-1">
        <div className="h-4 w-48 bg-gray-200 rounded mb-2" />
        <div className="h-3 w-24 bg-gray-100 rounded" />
      </div>
      <div className="h-6 w-20 bg-gray-200 rounded-full" />
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
  if (diffDays === 1) return "Due tomorrow";
  if (diffDays <= 7) return `Due in ${diffDays} days`;

  return due.toLocaleDateString("en-AU", {
    month: "short",
    day: "numeric",
    year: due.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
  });
}

function dueDateColor(dateStr: string): string {
  const due = new Date(dateStr);
  const now = new Date();
  const diffMs = due.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return "bg-red-100 text-red-700";
  if (diffDays <= 1) return "bg-orange-100 text-orange-700";
  if (diffDays <= 3) return "bg-yellow-100 text-yellow-700";
  return "bg-green-100 text-green-700";
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchDashboard() {
      try {
        const [assignmentsRes, pomodoroRes, habitsRes, diaryRes] =
          await Promise.allSettled([
            fetch("/api/assignments?status=pending"),
            fetch("/api/pomodoro/log"),
            fetch("/api/habits"),
            fetch("/api/diary"),
          ]);

        let pendingCount = 0;
        let upcomingAssignments: Assignment[] = [];
        if (assignmentsRes.status === "fulfilled" && assignmentsRes.value.ok) {
          const assignmentsData = await assignmentsRes.value.json();
          const assignments: Assignment[] = assignmentsData.assignments || assignmentsData || [];
          pendingCount = assignments.length;
          upcomingAssignments = assignments
            .filter((a) => a.dueDate)
            .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())
            .slice(0, 5);
        }

        let pomodoroMinutes = 0;
        let pomodoroSessions = 0;
        if (pomodoroRes.status === "fulfilled" && pomodoroRes.value.ok) {
          const pomodoroData = await pomodoroRes.value.json();
          const logs = pomodoroData.sessions || pomodoroData.logs || pomodoroData || [];
          const today = new Date().toISOString().split("T")[0];
          const todayLogs = Array.isArray(logs)
            ? logs.filter((l: { startTime?: string; createdAt?: string }) => {
                const logDate = (l.startTime || l.createdAt || "").split("T")[0];
                return logDate === today;
              })
            : [];
          pomodoroSessions = todayLogs.length;
          pomodoroMinutes = todayLogs.reduce(
            (sum: number, l: { durationMinutes?: number; duration?: number }) =>
              sum + (l.durationMinutes || l.duration || 25),
            0
          );
        }

        let activeHabits = 0;
        if (habitsRes.status === "fulfilled" && habitsRes.value.ok) {
          const habitsData = await habitsRes.value.json();
          const habits = habitsData.habits || habitsData || [];
          activeHabits = Array.isArray(habits) ? habits.length : 0;
        }

        let hasDiaryEntry = false;
        if (diaryRes.status === "fulfilled" && diaryRes.value.ok) {
          const diaryData = await diaryRes.value.json();
          const diaryEntries = diaryData.entries || [];
          const today = new Date().toISOString().split("T")[0];
          hasDiaryEntry = diaryEntries.some((e: { entryDate: string }) => e.entryDate === today);
        }

        setData({
          pendingCount,
          pomodoroMinutes,
          pomodoroSessions,
          activeHabits,
          hasDiaryEntry,
          upcomingAssignments,
        });
      } catch (err) {
        console.error("Failed to load dashboard data:", err);
        setData({
          pendingCount: 0,
          pomodoroMinutes: 0,
          pomodoroSessions: 0,
          activeHabits: 0,
          hasDiaryEntry: false,
          upcomingAssignments: [],
        });
      } finally {
        setLoading(false);
      }
    }

    fetchDashboard();
  }, []);

  const summaryCards = [
    {
      title: "Pending Assignments",
      value: data?.pendingCount ?? 0,
      subtitle: "tasks remaining",
      icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
      color: "bg-blue-50 text-blue-600",
      href: "/assignments",
    },
    {
      title: "Focus Today",
      value: `${data?.pomodoroMinutes ?? 0}m`,
      subtitle: `${data?.pomodoroSessions ?? 0} sessions`,
      icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
      color: "bg-indigo-50 text-indigo-600",
      href: "/pomodoro",
    },
    {
      title: "Active Habits",
      value: data?.activeHabits ?? 0,
      subtitle: "being tracked",
      icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
      color: "bg-emerald-50 text-emerald-600",
      href: "/habits",
    },
    {
      title: "Today's Diary",
      value: data?.hasDiaryEntry ? "Done" : "Not yet",
      subtitle: data?.hasDiaryEntry ? "entry written" : "write one now",
      icon: "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z",
      color: data?.hasDiaryEntry
        ? "bg-green-50 text-green-600"
        : "bg-amber-50 text-amber-600",
      href: "/diary",
    },
  ];

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 mt-1">
              {new Date().toLocaleDateString("en-AU", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>

          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : summaryCards.map((card) => (
                  <Link
                    key={card.title}
                    href={card.href}
                    className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 hover:shadow-md hover:border-gray-200 transition-all group"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <span className="text-sm font-medium text-gray-500">
                        {card.title}
                      </span>
                      <div
                        className={`w-10 h-10 rounded-lg flex items-center justify-center ${card.color}`}
                      >
                        <svg
                          className="w-5 h-5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d={card.icon}
                          />
                        </svg>
                      </div>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                      {card.value}
                    </div>
                    <p className="text-xs text-gray-400 mt-1">{card.subtitle}</p>
                  </Link>
                ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Upcoming Assignments */}
            <div className="lg:col-span-2 bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">
                  Upcoming Assignments
                </h2>
                <Link
                  href="/assignments"
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  View all
                </Link>
              </div>

              {loading ? (
                <div className="divide-y divide-gray-100">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonRow key={i} />
                  ))}
                </div>
              ) : data?.upcomingAssignments.length === 0 ? (
                <div className="text-center py-8">
                  <svg
                    className="w-12 h-12 text-gray-300 mx-auto mb-3"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  <p className="text-gray-400 text-sm">
                    No pending assignments. Nice work!
                  </p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {data?.upcomingAssignments.map((assignment) => (
                    <div
                      key={assignment._id}
                      className="flex items-center justify-between py-3"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {assignment.title}
                        </p>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {assignment.subject}
                        </p>
                      </div>
                      <span
                        className={`ml-3 text-xs font-medium px-2.5 py-1 rounded-full whitespace-nowrap ${dueDateColor(
                          assignment.dueDate
                        )}`}
                      >
                        {formatDueDate(assignment.dueDate)}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Actions */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Quick Actions
              </h2>
              <div className="space-y-3">
                <Link
                  href="/assignments"
                  className="flex items-center p-3 rounded-lg bg-blue-50 hover:bg-blue-100 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-md bg-blue-600 flex items-center justify-center mr-3">
                    <svg
                      className="w-4 h-4 text-white"
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
                  </div>
                  <span className="text-sm font-medium text-blue-700 group-hover:text-blue-800">
                    Add Assignment
                  </span>
                </Link>

                <Link
                  href="/pomodoro"
                  className="flex items-center p-3 rounded-lg bg-indigo-50 hover:bg-indigo-100 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-md bg-indigo-600 flex items-center justify-center mr-3">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-indigo-700 group-hover:text-indigo-800">
                    Start Focus Session
                  </span>
                </Link>

                <Link
                  href="/habits"
                  className="flex items-center p-3 rounded-lg bg-emerald-50 hover:bg-emerald-100 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-md bg-emerald-600 flex items-center justify-center mr-3">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-emerald-700 group-hover:text-emerald-800">
                    Track Habits
                  </span>
                </Link>

                <Link
                  href="/diary"
                  className="flex items-center p-3 rounded-lg bg-amber-50 hover:bg-amber-100 transition-colors group"
                >
                  <div className="w-8 h-8 rounded-md bg-amber-600 flex items-center justify-center mr-3">
                    <svg
                      className="w-4 h-4 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                      />
                    </svg>
                  </div>
                  <span className="text-sm font-medium text-amber-700 group-hover:text-amber-800">
                    Write in Diary
                  </span>
                </Link>
              </div>

              {/* Focus Summary */}
              {!loading && data && data.pomodoroMinutes > 0 && (
                <div className="mt-6 pt-5 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 mb-3">
                    Today&apos;s Focus
                  </h3>
                  <div className="flex items-center">
                    <div className="flex-1">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="bg-indigo-500 h-2 rounded-full transition-all"
                          style={{
                            width: `${Math.min(
                              (data.pomodoroMinutes / 120) * 100,
                              100
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                    <span className="ml-3 text-sm font-medium text-gray-600">
                      {data.pomodoroMinutes}m / 120m
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
