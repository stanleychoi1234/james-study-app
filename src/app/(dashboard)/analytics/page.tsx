"use client";

import { useEffect, useState } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { levelFromXp, levelProgress, xpToNextLevel, levelTitle, streakMessage } from "@/lib/xp";

interface AnalyticsData {
  dailyMinutes: Record<string, number>;
  categoryMinutes: Record<string, number>;
  heatmap: number[][];
  thisWeekMinutes: number;
  lastWeekMinutes: number;
  weekChange: number;
  habitConsistency: { id: string; title: string; totalLogs: number; last7Days: number; rate: number }[];
  taskCompletionRate: number;
  totalTasks: number;
  completedTasks: number;
  thisWeekBySubject: Record<string, number>;
  lastWeekBySubject: Record<string, number>;
  moods: { date: string; mood: number }[];
  moodTrend: number;
  burnout: { level: string; message: string };
  insights: string[];
  todayXp: number;
  streak: { current: number; longest: number; freezesAvailable: number };
}

interface XpData {
  totalXp: number;
  level: number;
  progress: number;
  toNext: number;
  title: string;
  multiplier: number;
  dailyXp: Record<string, number>;
}

const CAT_COLORS: Record<string, string> = {
  School: "#3b82f6",
  Private: "#8b5cf6",
  Business: "#f59e0b",
  Family: "#10b981",
  Friends: "#ec4899",
  Unlinked: "#6b7280",
};

const MOOD_EMOJIS = ["", "😢", "😕", "😐", "🙂", "😄"];

function BarChart({ data, maxVal }: { data: { label: string; value: number; color?: string }[]; maxVal?: number }) {
  const max = maxVal || Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1 h-32">
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1">
          <span className="text-[10px] text-gray-500 font-medium">{d.value > 0 ? d.value : ""}</span>
          <div
            className="w-full rounded-t-sm transition-all"
            style={{
              height: `${Math.max((d.value / max) * 100, 2)}%`,
              backgroundColor: d.color || "#3b82f6",
              minHeight: d.value > 0 ? 4 : 2,
            }}
          />
          <span className="text-[9px] text-gray-400">{d.label}</span>
        </div>
      ))}
    </div>
  );
}

function HeatmapGrid({ data }: { data: number[][] }) {
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const max = Math.max(...data.flat(), 1);

  return (
    <div className="overflow-x-auto">
      <div className="grid gap-0.5" style={{ gridTemplateColumns: "40px repeat(24, 1fr)" }}>
        <div />
        {Array.from({ length: 24 }, (_, h) => (
          <div key={h} className="text-[8px] text-gray-400 text-center">
            {h % 3 === 0 ? (h < 12 ? `${h || 12}a` : `${h === 12 ? 12 : h - 12}p`) : ""}
          </div>
        ))}
        {dayLabels.map((day, d) => (
          <>
            <div key={`l-${d}`} className="text-[10px] text-gray-500 pr-1 flex items-center">{day}</div>
            {Array.from({ length: 24 }, (_, h) => {
              const val = data[d][h];
              const intensity = val / max;
              return (
                <div
                  key={`${d}-${h}`}
                  className="aspect-square rounded-sm"
                  style={{
                    backgroundColor: val > 0
                      ? `rgba(59, 130, 246, ${0.15 + intensity * 0.85})`
                      : "#f3f4f6",
                  }}
                  title={`${dayLabels[d]} ${h}:00 — ${val} min`}
                />
              );
            })}
          </>
        ))}
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [xp, setXp] = useState<XpData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      fetch("/api/analytics").then(r => r.json()),
      fetch("/api/xp").then(r => r.json()),
    ])
      .then(([a, x]) => { setAnalytics(a); setXp(x); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30 p-8">
          <div className="max-w-7xl mx-auto">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-gray-200 rounded w-48" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[1, 2, 3].map(i => <div key={i} className="h-48 bg-gray-200 rounded-2xl" />)}
              </div>
            </div>
          </div>
        </main>
      </>
    );
  }

  if (!analytics || !xp) return null;

  // Prepare daily chart data (last 14 days)
  const dailyEntries = Object.entries(analytics.dailyMinutes)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, mins]) => ({
      label: new Date(date + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short" }).slice(0, 2),
      value: mins,
      color: "#3b82f6",
    }));

  // Category pie data
  const catEntries = Object.entries(analytics.categoryMinutes).map(([cat, mins]) => ({
    label: cat,
    value: mins,
    color: CAT_COLORS[cat] || "#6b7280",
  }));
  const totalCatMinutes = catEntries.reduce((s, c) => s + c.value, 0);

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-gradient-to-br from-gray-50 via-white to-blue-50/30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Study Analytics</h1>
              <p className="text-gray-500 mt-1">Your personal study insights and patterns</p>
            </div>
          </div>

          {/* XP & Level Bar */}
          <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 mb-6 text-white shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl bg-white/20 flex items-center justify-center text-2xl font-bold">
                    {xp.level}
                  </div>
                  <div>
                    <div className="font-bold text-lg">{xp.title}</div>
                    <div className="text-indigo-200 text-sm">{xp.totalXp.toLocaleString()} XP total</div>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <div className="text-2xl font-bold">🔥 {analytics.streak.current}</div>
                  <div className="text-xs text-indigo-200">Day streak</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{analytics.todayXp}</div>
                  <div className="text-xs text-indigo-200">XP today</div>
                </div>
                {xp.multiplier > 1 && (
                  <div className="text-center">
                    <div className="text-2xl font-bold text-yellow-300">{xp.multiplier}x</div>
                    <div className="text-xs text-indigo-200">Streak bonus</div>
                  </div>
                )}
              </div>
            </div>
            <div className="mt-4">
              <div className="flex justify-between text-xs text-indigo-200 mb-1">
                <span>Level {xp.level}</span>
                <span>{xp.toNext} XP to Level {xp.level + 1}</span>
              </div>
              <div className="w-full bg-white/20 rounded-full h-3">
                <div
                  className="bg-gradient-to-r from-yellow-400 to-orange-400 h-3 rounded-full transition-all"
                  style={{ width: `${xp.progress * 100}%` }}
                />
              </div>
            </div>
            <p className="mt-2 text-sm text-indigo-200">{streakMessage(analytics.streak.current)}</p>
          </div>

          {/* Burnout Warning */}
          {analytics.burnout.level !== "low" && (
            <div className={`rounded-2xl p-4 mb-6 border ${
              analytics.burnout.level === "high"
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200"
            }`}>
              <div className="flex items-start gap-3">
                <span className="text-2xl">{analytics.burnout.level === "high" ? "🚨" : "⚠️"}</span>
                <div>
                  <h3 className={`font-semibold ${
                    analytics.burnout.level === "high" ? "text-red-800" : "text-amber-800"
                  }`}>
                    {analytics.burnout.level === "high" ? "Burnout Warning" : "Take Care"}
                  </h3>
                  <p className={`text-sm mt-1 ${
                    analytics.burnout.level === "high" ? "text-red-700" : "text-amber-700"
                  }`}>
                    {analytics.burnout.message}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Smart Insights */}
          {analytics.insights.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
                <span>💡</span> Smart Insights
              </h2>
              <div className="space-y-2">
                {analytics.insights.map((insight, i) => (
                  <div key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-blue-50 rounded-lg p-3 border border-blue-100">
                    <svg className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {insight}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Row 1: Study Time + Category */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
            {/* Daily Study Time */}
            <div className="lg:col-span-2 bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold text-gray-900">Study Time (14 days)</h2>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500">This week:</span>
                  <span className="font-bold text-gray-900">{Math.round(analytics.thisWeekMinutes / 60 * 10) / 10}h</span>
                  {analytics.weekChange !== 0 && (
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      analytics.weekChange > 0
                        ? "bg-green-100 text-green-700"
                        : "bg-red-100 text-red-700"
                    }`}>
                      {analytics.weekChange > 0 ? "+" : ""}{analytics.weekChange}%
                    </span>
                  )}
                </div>
              </div>
              <BarChart data={dailyEntries} />
            </div>

            {/* Category Breakdown */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">By Category</h2>
              {totalCatMinutes === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No study sessions yet</p>
              ) : (
                <div className="space-y-3">
                  {catEntries.sort((a, b) => b.value - a.value).map(cat => (
                    <div key={cat.label}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{cat.label}</span>
                        <span className="text-gray-500">{Math.round(cat.value / 60 * 10) / 10}h</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className="h-2 rounded-full transition-all"
                          style={{
                            width: `${(cat.value / totalCatMinutes) * 100}%`,
                            backgroundColor: cat.color,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Row 2: Heatmap */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Productivity Heatmap</h2>
            <p className="text-xs text-gray-500 mb-4">When you focus best — darker = more study minutes</p>
            <HeatmapGrid data={analytics.heatmap} />
          </div>

          {/* Row 3: Habits + Tasks + Mood */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            {/* Habit Consistency */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Habit Consistency</h2>
              {analytics.habitConsistency.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-8">No habits tracked</p>
              ) : (
                <div className="space-y-3">
                  {analytics.habitConsistency.map(h => (
                    <div key={h.id}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700 truncate">{h.title}</span>
                        <span className={`font-bold ${h.rate >= 80 ? "text-green-600" : h.rate >= 50 ? "text-amber-600" : "text-red-500"}`}>
                          {h.rate}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${h.rate >= 80 ? "bg-green-500" : h.rate >= 50 ? "bg-amber-500" : "bg-red-400"}`}
                          style={{ width: `${h.rate}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{h.last7Days}/7 days this week</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Task Completion */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Task Progress</h2>
              <div className="text-center py-4">
                <div className="relative inline-flex">
                  <svg width={120} height={120} viewBox="0 0 120 120">
                    <circle cx={60} cy={60} r={50} fill="none" stroke="#f3f4f6" strokeWidth={10} />
                    <circle
                      cx={60} cy={60} r={50} fill="none"
                      stroke="#22c55e" strokeWidth={10}
                      strokeDasharray={`${(analytics.taskCompletionRate / 100) * 314} 314`}
                      strokeLinecap="round"
                      transform="rotate(-90 60 60)"
                    />
                    <text x={60} y={55} textAnchor="middle" className="fill-gray-900 font-bold" fontSize={24}>
                      {analytics.taskCompletionRate}%
                    </text>
                    <text x={60} y={72} textAnchor="middle" className="fill-gray-400" fontSize={10}>
                      complete
                    </text>
                  </svg>
                </div>
                <p className="text-sm text-gray-500 mt-2">
                  {analytics.completedTasks} of {analytics.totalTasks} tasks done
                </p>
              </div>
            </div>

            {/* Mood Trend */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Mood Trend</h2>
              {analytics.moods.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-3xl mb-2">😐</p>
                  <p className="text-sm text-gray-400">No mood data yet. Check in daily!</p>
                </div>
              ) : (
                <>
                  <div className="flex items-end gap-1 h-24 mb-3">
                    {analytics.moods.slice(-14).map((m, i) => (
                      <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                        <span className="text-xs">{MOOD_EMOJIS[m.mood]}</span>
                        <div
                          className="w-full rounded-t-sm"
                          style={{
                            height: `${(m.mood / 5) * 100}%`,
                            backgroundColor: m.mood >= 4 ? "#22c55e" : m.mood >= 3 ? "#f59e0b" : "#ef4444",
                          }}
                        />
                      </div>
                    ))}
                  </div>
                  <div className={`text-sm font-medium text-center ${
                    analytics.moodTrend > 0 ? "text-green-600" : analytics.moodTrend < 0 ? "text-red-600" : "text-gray-600"
                  }`}>
                    {analytics.moodTrend > 0.3 ? "📈 Mood is improving!" :
                     analytics.moodTrend < -0.3 ? "📉 Mood is declining. Take care of yourself." :
                     "→ Mood is steady."}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* XP History Chart */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 mb-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Daily XP Earned</h2>
            <BarChart
              data={Object.entries(xp.dailyXp)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([date, pts]) => ({
                  label: new Date(date + "T12:00:00").toLocaleDateString("en-AU", { weekday: "short" }).slice(0, 2),
                  value: pts,
                  color: "#8b5cf6",
                }))}
            />
          </div>

          {/* Streak Stats */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Streak Stats</h2>
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-3xl font-bold text-orange-500">🔥 {analytics.streak.current}</div>
                <div className="text-sm text-gray-500 mt-1">Current streak</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-blue-500">🏆 {analytics.streak.longest}</div>
                <div className="text-sm text-gray-500 mt-1">Longest streak</div>
              </div>
              <div>
                <div className="text-3xl font-bold text-cyan-500">🧊 {analytics.streak.freezesAvailable}</div>
                <div className="text-sm text-gray-500 mt-1">Freezes available</div>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
