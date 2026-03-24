"use client";

import { useState, useEffect, FormEvent } from "react";
import Navbar from "@/components/Navbar";

interface HabitLog {
  id: string;
  logDate: string;
}

interface HabitStats {
  currentStreak: number;
  longestStreak: number;
  completionRate: number;
  totalCompletions: number;
}

interface Habit {
  id: string;
  title: string;
  frequency: string;
  stats?: HabitStats;
  recentLogs?: HabitLog[];
}

function getTodayStr(): string {
  const d = new Date();
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
}

function getLast7Days(): string[] {
  const days: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"));
  }
  return days;
}

function getDayLabel(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-AU", { weekday: "short" });
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [creating, setCreating] = useState(false);
  const [loggingId, setLoggingId] = useState<string | null>(null);

  const today = getTodayStr();
  const last7 = getLast7Days();

  async function fetchHabits() {
    try {
      const res = await fetch("/api/habits");
      if (!res.ok) throw new Error("Failed to fetch habits");
      const json = await res.json();
      const data: Habit[] = json.habits || json;

      const enriched = await Promise.all(
        data.map(async (habit) => {
          const [statsRes, logsRes] = await Promise.all([
            fetch(`/api/habits/${habit.id}/stats`),
            fetch(`/api/habits/${habit.id}/log`),
          ]);
          const stats: HabitStats = statsRes.ok
            ? await statsRes.json()
            : { currentStreak: 0, longestStreak: 0, completionRate: 0, totalCompletions: 0 };
          const logsJson = logsRes.ok ? await logsRes.json() : { logs: [] };
          const recentLogs: HabitLog[] = logsJson.logs || logsJson;
          return { ...habit, stats, recentLogs };
        })
      );

      setHabits(enriched);
    } catch (err) {
      console.error("Error fetching habits:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchHabits();
  }, []);

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title.trim(), frequency }),
      });
      if (!res.ok) throw new Error("Failed to create habit");
      setTitle("");
      setFrequency("daily");
      await fetchHabits();
    } catch (err) {
      console.error("Error creating habit:", err);
    } finally {
      setCreating(false);
    }
  }

  async function handleLog(habitId: string) {
    setLoggingId(habitId);
    try {
      const res = await fetch(`/api/habits/${habitId}/log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logDate: today }),
      });
      if (!res.ok) throw new Error("Failed to log habit");
      await fetchHabits();
    } catch (err) {
      console.error("Error logging habit:", err);
    } finally {
      setLoggingId(null);
    }
  }

  function isCompletedOn(habit: Habit, dateStr: string): boolean {
    return habit.recentLogs?.some((log) => log.logDate === dateStr) ?? false;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Habit Tracker</h1>

        {/* Create New Habit Form */}
        <form
          onSubmit={handleCreate}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8"
        >
          <h2 className="text-lg font-semibold text-gray-800 mb-4">New Habit</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="text"
              placeholder="Habit title..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              required
            />
            <select
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            >
              <option value="daily">Daily</option>
              <option value="weekly">Weekly</option>
              <option value="weekdays">Weekdays</option>
            </select>
            <button
              type="submit"
              disabled={creating || !title.trim()}
              className="px-6 py-2 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {creating ? "Adding..." : "Add Habit"}
            </button>
          </div>
        </form>

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="flex flex-col items-center gap-3">
              <div className="w-10 h-10 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin" />
              <p className="text-gray-500">Loading habits...</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && habits.length === 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">🎯</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No habits yet</h2>
            <p className="text-gray-500">
              Create your first habit above to start building streaks!
            </p>
          </div>
        )}

        {/* Habit Cards */}
        <div className="space-y-4">
          {habits.map((habit) => {
            const completedToday = isCompletedOn(habit, today);
            const stats = habit.stats ?? {
              currentStreak: 0,
              longestStreak: 0,
              completionRate: 0,
              totalCompletions: 0,
            };

            return (
              <div
                key={habit.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  {/* Left: Title, Frequency, Streak */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <h3 className="text-lg font-semibold text-gray-900 truncate">
                        {habit.title}
                      </h3>
                      <span className="shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 capitalize">
                        {habit.frequency}
                      </span>
                    </div>

                    {/* Streak Display */}
                    <div className="flex items-center gap-4 mt-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-2xl" title="Current streak">🔥</span>
                        <span className="text-2xl font-bold text-indigo-600">
                          {stats.currentStreak}
                        </span>
                        <span className="text-sm text-gray-500">day streak</span>
                      </div>
                      <div className="text-sm text-gray-500">
                        Best: <span className="font-semibold text-gray-700">{stats.longestStreak}</span>
                      </div>
                    </div>

                    {/* Completion Rate */}
                    <div className="mt-3 flex items-center gap-3">
                      <div className="flex-1 max-w-xs bg-gray-200 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, Math.round(stats.completionRate))}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium text-gray-600 shrink-0">
                        {Math.round(stats.completionRate)}% completion
                      </span>
                    </div>
                  </div>

                  {/* Right: Mark Complete Button */}
                  <div className="shrink-0">
                    {completedToday ? (
                      <div className="flex items-center gap-2 px-5 py-2.5 bg-green-100 text-green-700 rounded-lg font-medium">
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                        Done today
                      </div>
                    ) : (
                      <button
                        onClick={() => handleLog(habit.id)}
                        disabled={loggingId === habit.id}
                        className="px-5 py-2.5 bg-indigo-600 text-white font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                      >
                        {loggingId === habit.id ? "Logging..." : "Mark Complete"}
                      </button>
                    )}
                  </div>
                </div>

                {/* Weekly Heatmap */}
                <div className="mt-5 pt-4 border-t border-gray-100">
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wide">
                    Last 7 days
                  </p>
                  <div className="flex gap-2">
                    {last7.map((day) => {
                      const done = isCompletedOn(habit, day);
                      const isToday = day === today;
                      return (
                        <div key={day} className="flex flex-col items-center gap-1">
                          <div
                            className={`w-9 h-9 rounded-lg flex items-center justify-center text-xs font-medium transition-colors ${
                              done
                                ? "bg-green-500 text-white"
                                : "bg-gray-200 text-gray-400"
                            } ${isToday ? "ring-2 ring-indigo-400 ring-offset-1" : ""}`}
                            title={day}
                          >
                            {done ? (
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                              </svg>
                            ) : (
                              <span className="text-[10px]">{new Date(day + "T00:00:00").getDate()}</span>
                            )}
                          </div>
                          <span className={`text-[10px] ${isToday ? "font-bold text-indigo-600" : "text-gray-400"}`}>
                            {getDayLabel(day)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
