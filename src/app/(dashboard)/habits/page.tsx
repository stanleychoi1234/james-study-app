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

function getLast30Days(): string[] {
  const days: string[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0"));
  }
  return days;
}

function getStreakMessage(streak: number): string {
  if (streak >= 30) return "Legendary! 30+ day streak!";
  if (streak >= 21) return "3 weeks strong! A habit is forming!";
  if (streak >= 14) return "Two weeks! You're unstoppable!";
  if (streak >= 7) return "One week! Keep the momentum!";
  if (streak >= 3) return "Nice! 3-day streak building!";
  if (streak >= 1) return "Started! Don't break the chain!";
  return "Start today to build your streak!";
}

function getStreakEmoji(streak: number): string {
  if (streak >= 30) return "\u{1F451}"; // crown
  if (streak >= 21) return "\u{1F4AA}"; // flexed bicep
  if (streak >= 14) return "\u{26A1}"; // lightning
  if (streak >= 7) return "\u{1F525}"; // fire
  if (streak >= 3) return "\u{2B50}"; // star
  if (streak >= 1) return "\u{1F331}"; // seedling
  return "\u{1F4A4}"; // zzz
}

// Mini progress ring
function ProgressRing({ pct, size = 44, strokeWidth = 4 }: { pct: number; size?: number; strokeWidth?: number }) {
  const r = (size - strokeWidth) / 2;
  const c = 2 * Math.PI * r;
  const offset = c * (1 - Math.min(pct, 100) / 100);
  const color = pct >= 80 ? "#22c55e" : pct >= 50 ? "#3b82f6" : pct >= 25 ? "#f59e0b" : "#e5e7eb";

  return (
    <svg width={size} height={size} className="-rotate-90">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={strokeWidth} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset} className="transition-all duration-700" />
    </svg>
  );
}

export default function HabitsPage() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [creating, setCreating] = useState(false);
  const [loggingId, setLoggingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);

  const today = getTodayStr();
  const last30 = getLast30Days();

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

  useEffect(() => { fetchHabits(); }, []);

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
      setShowForm(false);
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

  async function handleDelete(habitId: string) {
    try {
      const res = await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete habit");
      setHabits((prev) => prev.filter((h) => h.id !== habitId));
      setDeletingId(null);
    } catch (err) {
      console.error("Error deleting habit:", err);
    }
  }

  function isCompletedOn(habit: Habit, dateStr: string): boolean {
    return habit.recentLogs?.some((log) => log.logDate === dateStr) ?? false;
  }

  // Summary stats
  const totalHabits = habits.length;
  const doneToday = habits.filter((h) => isCompletedOn(h, today)).length;
  const allDone = totalHabits > 0 && doneToday === totalHabits;

  return (
    <div className="min-h-screen" style={{ backgroundImage: "url(/images/habits-bg.png)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      <div className="min-h-screen bg-white/85 backdrop-blur-sm">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Habit Tracker</h1>
            <p className="text-sm text-gray-500 mt-1">Build streaks, crush goals, level up</p>
          </div>
          <button
            onClick={() => setShowForm(!showForm)}
            className="inline-flex items-center px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 transition-colors"
          >
            <svg className="w-4 h-4 mr-1.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showForm ? "M6 18L18 6M6 6l12 12" : "M12 4v16m8-8H4"} />
            </svg>
            {showForm ? "Cancel" : "New Habit"}
          </button>
        </div>

        {/* Today's Summary */}
        {totalHabits > 0 && (
          <div className={`rounded-2xl p-5 mb-6 border ${
            allDone
              ? "bg-gradient-to-r from-green-50 to-emerald-50 border-green-200"
              : "bg-white border-gray-100"
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">Today&apos;s Progress</p>
                <p className="text-3xl font-bold text-gray-900 mt-1">
                  {doneToday}<span className="text-lg text-gray-400">/{totalHabits}</span>
                </p>
              </div>
              <div className="relative">
                <ProgressRing pct={totalHabits > 0 ? (doneToday / totalHabits) * 100 : 0} size={56} strokeWidth={5} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-gray-700">
                    {totalHabits > 0 ? Math.round((doneToday / totalHabits) * 100) : 0}%
                  </span>
                </div>
              </div>
            </div>
            {allDone && (
              <p className="mt-2 text-sm font-medium text-green-700">
                All habits done today! You&apos;re on fire!
              </p>
            )}
          </div>
        )}

        {/* Create Form */}
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">New Habit</h2>
            <form onSubmit={handleCreate} className="flex flex-col sm:flex-row gap-3">
              <input
                type="text"
                placeholder="e.g. Read 20 pages, Exercise 30 min..."
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                required
              />
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="rounded-lg border border-gray-300 px-4 py-2.5 text-gray-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="weekdays">Weekdays</option>
              </select>
              <button
                type="submit"
                disabled={creating || !title.trim()}
                className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {creating ? "Adding..." : "Add"}
              </button>
            </form>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="flex justify-center py-16">
            <div className="w-10 h-10 border-4 border-purple-200 border-t-purple-600 rounded-full animate-spin" />
          </div>
        )}

        {/* Empty */}
        {!loading && habits.length === 0 && (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-12 text-center">
            <div className="text-5xl mb-4">{"\u{1F3AF}"}</div>
            <h2 className="text-xl font-semibold text-gray-700 mb-2">No habits yet</h2>
            <p className="text-gray-500 mb-4">Create your first habit to start building streaks!</p>
            <button onClick={() => setShowForm(true)}
              className="px-6 py-2.5 bg-purple-600 text-white font-medium rounded-lg hover:bg-purple-700 transition-colors">
              Create First Habit
            </button>
          </div>
        )}

        {/* Habit Cards */}
        <div className="space-y-4">
          {habits.map((habit) => {
            const completedToday = isCompletedOn(habit, today);
            const stats = habit.stats ?? { currentStreak: 0, longestStreak: 0, completionRate: 0, totalCompletions: 0 };

            return (
              <div key={habit.id}
                className={`bg-white rounded-2xl shadow-sm border overflow-hidden transition-all hover:shadow-md ${
                  completedToday ? "border-green-200" : "border-gray-200"
                }`}
              >
                <div className="p-5">
                  {/* Header row */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xl">{getStreakEmoji(stats.currentStreak)}</span>
                        <h3 className="text-lg font-bold text-gray-900 truncate">{habit.title}</h3>
                        <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-700 capitalize">
                          {habit.frequency}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">{getStreakMessage(stats.currentStreak)}</p>
                    </div>

                    {/* Check/Done button */}
                    <div className="flex items-center gap-2">
                      {completedToday ? (
                        <div className="flex items-center gap-1.5 px-4 py-2 bg-green-100 text-green-700 rounded-xl font-semibold text-sm">
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                          Done
                        </div>
                      ) : (
                        <button
                          onClick={() => handleLog(habit.id)}
                          disabled={loggingId === habit.id}
                          className="px-5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white font-semibold rounded-xl hover:from-purple-500 hover:to-indigo-500 disabled:opacity-50 transition-all shadow-sm hover:shadow-md text-sm"
                        >
                          {loggingId === habit.id ? "..." : "Complete"}
                        </button>
                      )}
                      {/* Delete */}
                      {deletingId === habit.id ? (
                        <div className="flex gap-1">
                          <button onClick={() => handleDelete(habit.id)} className="px-2 py-1 text-xs bg-red-600 text-white rounded-lg">Yes</button>
                          <button onClick={() => setDeletingId(null)} className="px-2 py-1 text-xs border border-gray-300 rounded-lg">No</button>
                        </div>
                      ) : (
                        <button onClick={() => setDeletingId(habit.id)} className="p-1.5 text-gray-300 hover:text-red-500 transition-colors" title="Delete">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-6 mt-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-lg">{"\u{1F525}"}</span>
                      <span className="text-2xl font-bold text-gray-900">{stats.currentStreak}</span>
                      <span className="text-xs text-gray-500">day streak</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Best: <span className="font-semibold text-gray-700">{stats.longestStreak}</span>
                    </div>
                    <div className="text-sm text-gray-500">
                      Total: <span className="font-semibold text-gray-700">{stats.totalCompletions}</span>
                    </div>
                    <div className="ml-auto relative">
                      <ProgressRing pct={stats.completionRate} size={40} strokeWidth={3} />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-[10px] font-bold text-gray-600">{Math.round(stats.completionRate)}%</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 30-day heatmap */}
                <div className="px-5 pb-4 pt-2 border-t border-gray-50">
                  <p className="text-[10px] font-medium text-gray-400 uppercase tracking-wider mb-2">Last 30 days</p>
                  <div className="flex gap-[3px] flex-wrap">
                    {last30.map((day) => {
                      const done = isCompletedOn(habit, day);
                      const isToday = day === today;
                      return (
                        <div
                          key={day}
                          className={`w-[18px] h-[18px] rounded-[3px] transition-colors ${
                            done
                              ? "bg-green-500"
                              : "bg-gray-100"
                          } ${isToday ? "ring-2 ring-purple-400 ring-offset-1" : ""}`}
                          title={`${day}${done ? " - Done" : ""}`}
                        />
                      );
                    })}
                  </div>
                  <div className="flex items-center gap-2 mt-2 text-[10px] text-gray-400">
                    <span>Less</span>
                    <div className="w-3 h-3 rounded-sm bg-gray-100" />
                    <div className="w-3 h-3 rounded-sm bg-green-500" />
                    <span>More</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
      </div>
    </div>
  );
}
