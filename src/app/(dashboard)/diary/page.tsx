"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";

interface DiaryEntry {
  id: string;
  entryDate: string;
  content: string;
  moodScore: number | null;
  weather: string | null;
  createdAt: string;
}

const MOOD_EMOJIS: Record<number, string> = {
  1: "\u{1F629}", 2: "\u{1F61E}", 3: "\u{1F615}", 4: "\u{1F610}",
  5: "\u{1F642}", 6: "\u{1F60A}", 7: "\u{1F604}", 8: "\u{1F60D}",
  9: "\u{1F929}", 10: "\u{1F31F}",
};

const WEATHER_OPTIONS = [
  { key: "sunny", emoji: "\u{2600}\u{FE0F}", label: "Sunny" },
  { key: "cloudy", emoji: "\u{2601}\u{FE0F}", label: "Cloudy" },
  { key: "rainy", emoji: "\u{1F327}\u{FE0F}", label: "Rainy" },
  { key: "stormy", emoji: "\u{26C8}\u{FE0F}", label: "Stormy" },
  { key: "windy", emoji: "\u{1F32C}\u{FE0F}", label: "Windy" },
  { key: "snowy", emoji: "\u{2744}\u{FE0F}", label: "Snowy" },
  { key: "hot", emoji: "\u{1F525}", label: "Hot" },
  { key: "cold", emoji: "\u{1F976}", label: "Cold" },
];

function getWeatherEmoji(key: string | null): string {
  if (!key) return "";
  return WEATHER_OPTIONS.find((w) => w.key === key)?.emoji || "";
}

// Mood-based background gradient
function getMoodBg(score: number | null): string {
  if (!score) return "from-gray-50 to-white";
  if (score <= 2) return "from-red-50 via-orange-50 to-white";
  if (score <= 4) return "from-orange-50 via-amber-50 to-white";
  if (score <= 6) return "from-amber-50 via-yellow-50 to-white";
  if (score <= 8) return "from-lime-50 via-green-50 to-white";
  return "from-green-50 via-emerald-50 to-white";
}

function getMoodColor(score: number): string {
  if (score <= 2) return "bg-red-400";
  if (score <= 4) return "bg-orange-400";
  if (score <= 6) return "bg-amber-400";
  if (score <= 8) return "bg-lime-400";
  return "bg-green-400";
}

function getMoodBadgeStyle(score: number): string {
  if (score <= 2) return "bg-red-100 text-red-700 border-red-200";
  if (score <= 4) return "bg-orange-100 text-orange-700 border-orange-200";
  if (score <= 6) return "bg-amber-100 text-amber-700 border-amber-200";
  if (score <= 8) return "bg-lime-100 text-lime-700 border-lime-200";
  return "bg-green-100 text-green-700 border-green-200";
}

function getMoodAccent(score: number | null): string {
  if (!score) return "border-amber-200";
  if (score <= 2) return "border-red-200";
  if (score <= 4) return "border-orange-200";
  if (score <= 6) return "border-amber-200";
  if (score <= 8) return "border-lime-200";
  return "border-green-200";
}

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-AU", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
  });
}

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [content, setContent] = useState("");
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [weather, setWeather] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [isEditMode, setIsEditMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());

  const today = new Date().toISOString().split("T")[0];

  const fetchEntries = useCallback(async (search?: string) => {
    try {
      const url = search ? `/api/diary?search=${encodeURIComponent(search)}` : "/api/diary";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load");
      const data = await res.json();
      setEntries(data.entries || []);
    } catch { setError("Failed to load diary entries"); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchEntries(); }, [fetchEntries]);

  // Load today's entry if exists
  useEffect(() => {
    const todayEntry = entries.find((e) => e.entryDate === today);
    if (todayEntry) {
      setContent(todayEntry.content);
      setMoodScore(todayEntry.moodScore);
      setWeather(todayEntry.weather);
      setIsEditMode(true);
    }
  }, [entries, today]);

  async function handleSave() {
    if (!content.trim()) return;
    setSaving(true); setError(""); setSuccessMsg("");
    try {
      const method = isEditMode ? "PUT" : "POST";
      const res = await fetch("/api/diary", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ entryDate: today, content: content.trim(), moodScore, weather }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to save");
      }
      setSuccessMsg(isEditMode ? "Entry updated!" : "Entry saved!");
      setIsEditMode(true);
      await fetchEntries();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save");
    } finally { setSaving(false); }
  }

  function handleSearch() { fetchEntries(searchQuery.trim() || undefined); }
  function clearSearch() { setSearchQuery(""); fetchEntries(); }
  function toggleExpanded(id: string) {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }

  const pastEntries = entries.filter((e) => e.entryDate !== today);
  const moodTrendEntries = entries.filter((e) => e.moodScore).slice(0, 10).reverse();

  return (
    <div className="min-h-screen" style={{ backgroundImage: "url(/images/diary-bg.png)", backgroundSize: "cover", backgroundPosition: "center", backgroundAttachment: "fixed" }}>
      <div className={`min-h-screen bg-gradient-to-b ${getMoodBg(moodScore)} transition-colors duration-700`} style={{ backgroundColor: "rgba(255,255,255,0.82)" }}>
      <Navbar />
      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Reflective Diary</h1>
          <p className="text-sm text-gray-500 mt-1">Capture your thoughts, track your mood and the weather</p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex justify-between">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-red-500">&times;</button>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {successMsg}
          </div>
        )}

        {/* Today's Entry Card */}
        <div className={`bg-white rounded-2xl shadow-sm border-2 ${getMoodAccent(moodScore)} p-6 mb-8 transition-colors duration-500`}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {isEditMode ? "Edit Today's Entry" : "Today's Entry"}
              </h2>
              <p className="text-sm text-amber-600 mt-0.5">{formatDateDisplay(today)}</p>
            </div>
            {isEditMode && (
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">Editing</span>
            )}
          </div>

          {/* Mood selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-2">How are you feeling?</label>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                const isSelected = moodScore === score;
                return (
                  <button key={score} onClick={() => setMoodScore(isSelected ? null : score)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-all border-2 ${
                      isSelected
                        ? `${getMoodColor(score)} text-white border-transparent ring-2 ring-offset-1 ring-amber-400 scale-110`
                        : "bg-gray-50 text-gray-500 border-gray-200 hover:border-amber-300 hover:bg-amber-50"
                    }`}
                    title={`Mood: ${score}/10`}
                  >
                    {MOOD_EMOJIS[score] || score}
                  </button>
                );
              })}
            </div>
            {moodScore && (
              <p className="text-xs text-gray-400 mt-1.5">Mood: {moodScore}/10 {MOOD_EMOJIS[moodScore]}</p>
            )}
          </div>

          {/* Weather selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-2">What&apos;s the weather?</label>
            <div className="flex flex-wrap gap-2">
              {WEATHER_OPTIONS.map((w) => (
                <button key={w.key} onClick={() => setWeather(weather === w.key ? null : w.key)}
                  className={`px-3 py-1.5 rounded-full text-sm border transition-all ${
                    weather === w.key
                      ? "bg-blue-100 border-blue-300 text-blue-700 ring-1 ring-blue-300"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-300"
                  }`}
                >
                  {w.emoji} {w.label}
                </button>
              ))}
            </div>
          </div>

          {/* Content */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind today? Write about your day, what you learned, how you're feeling..."
            className="w-full h-40 p-4 border border-gray-200 rounded-xl text-gray-700 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300
              resize-y bg-amber-50/20"
          />

          <div className="mt-4 flex justify-end">
            <button onClick={handleSave} disabled={saving || !content.trim()}
              className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-orange-500 text-white font-medium rounded-xl
                hover:from-amber-400 hover:to-orange-400 disabled:opacity-50 disabled:cursor-not-allowed
                transition-all shadow-sm hover:shadow-md">
              {saving ? "Saving..." : isEditMode ? "Update Entry" : "Save Entry"}
            </button>
          </div>
        </div>

        {/* Mood Trend */}
        {moodTrendEntries.length > 1 && (
          <div className="bg-white rounded-2xl shadow-sm border border-amber-100 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">Mood Trend</h2>
            <div className="flex items-end gap-3 h-28">
              {moodTrendEntries.map((entry) => {
                const score = entry.moodScore!;
                const heightPercent = (score / 10) * 100;
                return (
                  <div key={entry.id} className="flex flex-col items-center flex-1 gap-1">
                    <span className="text-xs text-gray-500">{MOOD_EMOJIS[score] || score}</span>
                    <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                      <div className={`w-6 rounded-t-md ${getMoodColor(score)} transition-all duration-300`}
                        style={{ height: `${heightPercent}%`, minHeight: "4px" }}
                        title={`${score}/10 on ${entry.entryDate}`} />
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">{entry.entryDate.slice(5)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Past Entries */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Past Entries</h2>

          {/* Search */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input type="text" value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search entries..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300" />
            </div>
            <button onClick={handleSearch} className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-200">Search</button>
            {searchQuery && <button onClick={clearSearch} className="px-3 py-2 text-gray-400 hover:text-gray-600 text-sm">Clear</button>}
          </div>

          {loading && (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-amber-200 border-t-amber-500 rounded-full animate-spin" />
            </div>
          )}

          {!loading && pastEntries.length === 0 && (
            <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-amber-200">
              <div className="text-4xl mb-3">{"\u{1F4DD}"}</div>
              <p className="text-gray-500 font-medium">No past entries yet</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery ? "No entries match your search." : "Start writing above to create your first diary entry."}
              </p>
            </div>
          )}

          {!loading && pastEntries.length > 0 && (
            <div className="space-y-3">
              {pastEntries.map((entry) => {
                const isExpanded = expandedEntries.has(entry.id);
                const isLong = entry.content.length > 200;
                const preview = isLong ? entry.content.slice(0, 200) + "..." : entry.content;

                return (
                  <div key={entry.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden hover:border-amber-200 transition-colors">
                    <button onClick={() => isLong && toggleExpanded(entry.id)} className="w-full text-left p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                            <span className="text-sm font-medium text-gray-700">{formatDateDisplay(entry.entryDate)}</span>
                            {entry.moodScore && (
                              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getMoodBadgeStyle(entry.moodScore)}`}>
                                {MOOD_EMOJIS[entry.moodScore]} {entry.moodScore}/10
                              </span>
                            )}
                            {entry.weather && (
                              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">
                                {getWeatherEmoji(entry.weather)} {WEATHER_OPTIONS.find(w => w.key === entry.weather)?.label}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 whitespace-pre-line">
                            {isExpanded ? entry.content : preview}
                          </p>
                          {isLong && (
                            <span className="inline-block mt-2 text-xs text-amber-600 font-medium">
                              {isExpanded ? "Show less" : "Read more"}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
      </div>
    </div>
  );
}
