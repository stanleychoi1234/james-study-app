"use client";

import { useState, useEffect, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface DiaryEntry {
  id: string;
  entryDate: string;
  content: string;
  moodScore: number | null;
  createdAt: string;
  updatedAt: string;
}

const MOOD_EMOJIS: Record<number, string> = {
  1: "\u{1F629}",
  2: "\u{1F61E}",
  3: "\u{1F615}",
  4: "\u{1F610}",
  5: "\u{1F642}",
  6: "\u{1F60A}",
  7: "\u{1F604}",
  8: "\u{1F60D}",
  9: "\u{1F929}",
  10: "\u{1F31F}",
};

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

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  return date.toLocaleDateString("en-AU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function getTodayString(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default function DiaryPage() {
  const [entries, setEntries] = useState<DiaryEntry[]>([]);
  const [content, setContent] = useState("");
  const [moodScore, setMoodScore] = useState<number | null>(null);
  const [isEditMode, setIsEditMode] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [expandedEntries, setExpandedEntries] = useState<Set<string>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const today = getTodayString();

  const fetchEntries = useCallback(async (search?: string) => {
    setLoading(true);
    try {
      const url = search
        ? `/api/diary?search=${encodeURIComponent(search)}`
        : "/api/diary";
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load entries");
      const data = await res.json();
      setEntries(data.entries || []);

      // Check if today's entry already exists
      const todayEntry = (data.entries || []).find(
        (e: DiaryEntry) => e.entryDate === today
      );
      if (todayEntry) {
        setContent(todayEntry.content);
        setMoodScore(todayEntry.moodScore);
        setIsEditMode(true);
      }
    } catch {
      setError("Could not load diary entries.");
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  function handleSearch() {
    fetchEntries(searchQuery || undefined);
  }

  function clearSearch() {
    setSearchQuery("");
    fetchEntries();
  }

  async function handleSave() {
    if (!content.trim()) {
      setError("Please write something before saving.");
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMsg(null);

    try {
      const method = isEditMode ? "PUT" : "POST";
      const res = await fetch("/api/diary", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryDate: today,
          content: content.trim(),
          moodScore,
        }),
      });

      if (res.status === 409) {
        // Entry already exists for today, switch to edit mode
        setIsEditMode(true);
        setError("An entry already exists for today. Switched to edit mode -- press Save again to update.");
        setSaving(false);
        return;
      }

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save");
      }

      setSuccessMsg(isEditMode ? "Entry updated!" : "Entry saved!");
      setIsEditMode(true);
      fetchEntries(searchQuery || undefined);

      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save entry.");
    } finally {
      setSaving(false);
    }
  }

  function toggleExpanded(id: string) {
    setExpandedEntries((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }

  // Past entries: everything except today
  const pastEntries = entries.filter((e) => e.entryDate !== today);

  // Mood trend: last 7 entries that have mood scores
  const moodTrendEntries = entries
    .filter((e) => e.moodScore !== null)
    .slice(0, 7)
    .reverse();

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 to-orange-50">
      <Navbar />

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-warm-gray-900 text-gray-800">
            Reflective Diary
          </h1>
          <p className="mt-1 text-gray-500">
            A space for your thoughts, feelings, and reflections.
          </p>
        </div>

        {/* Error / Success messages */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
            <span>{error}</span>
            <button
              onClick={() => setError(null)}
              className="ml-2 text-red-400 hover:text-red-600"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-700 rounded-lg text-sm">
            {successMsg}
          </div>
        )}

        {/* Today's entry card */}
        <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-gray-800">
                {isEditMode ? "Edit Today's Entry" : "Today's Entry"}
              </h2>
              <p className="text-sm text-amber-600 mt-0.5">
                {formatDateDisplay(today)}
              </p>
            </div>
            {isEditMode && (
              <span className="text-xs font-medium bg-amber-100 text-amber-700 px-2.5 py-1 rounded-full">
                Editing
              </span>
            )}
          </div>

          {/* Mood selector */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-600 mb-2">
              How are you feeling?
            </label>
            <div className="flex flex-wrap gap-1.5">
              {Array.from({ length: 10 }, (_, i) => i + 1).map((score) => {
                const isSelected = moodScore === score;
                const showEmoji = [1, 3, 5, 7, 10].includes(score);
                return (
                  <button
                    key={score}
                    onClick={() =>
                      setMoodScore(isSelected ? null : score)
                    }
                    className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium
                      transition-all duration-150 border-2
                      ${
                        isSelected
                          ? `${getMoodColor(score)} text-white border-transparent ring-2 ring-offset-1 ring-amber-400 scale-110`
                          : "bg-gray-50 text-gray-500 border-gray-200 hover:border-amber-300 hover:bg-amber-50"
                      }`}
                    title={`Mood: ${score}/10`}
                  >
                    {showEmoji ? MOOD_EMOJIS[score] : score}
                  </button>
                );
              })}
            </div>
            {moodScore && (
              <p className="text-xs text-gray-400 mt-1.5">
                Mood: {moodScore}/10 {MOOD_EMOJIS[moodScore]}
              </p>
            )}
          </div>

          {/* Content textarea */}
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            placeholder="What's on your mind today? Write about your day, what you learned, how you're feeling..."
            className="w-full h-40 p-4 border border-gray-200 rounded-lg text-gray-700 placeholder-gray-400
              focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300
              resize-y bg-amber-50/30"
          />

          {/* Save button */}
          <div className="mt-4 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving || !content.trim()}
              className="px-6 py-2.5 bg-amber-500 text-white font-medium rounded-lg
                hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed
                transition-colors shadow-sm"
            >
              {saving ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                  </svg>
                  Saving...
                </span>
              ) : isEditMode ? (
                "Update Entry"
              ) : (
                "Save Entry"
              )}
            </button>
          </div>
        </div>

        {/* Mood trend */}
        {moodTrendEntries.length > 1 && (
          <div className="bg-white rounded-xl shadow-sm border border-amber-100 p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-800 mb-4">
              Mood Trend
            </h2>
            <div className="flex items-end gap-3 h-28">
              {moodTrendEntries.map((entry) => {
                const score = entry.moodScore!;
                const heightPercent = (score / 10) * 100;
                return (
                  <div
                    key={entry.id}
                    className="flex flex-col items-center flex-1 gap-1"
                  >
                    <span className="text-xs text-gray-500">
                      {MOOD_EMOJIS[score] || score}
                    </span>
                    <div className="w-full flex items-end justify-center" style={{ height: "80px" }}>
                      <div
                        className={`w-6 rounded-t-md ${getMoodColor(score)} transition-all duration-300`}
                        style={{ height: `${heightPercent}%`, minHeight: "4px" }}
                        title={`${score}/10 on ${entry.entryDate}`}
                      />
                    </div>
                    <span className="text-[10px] text-gray-400 whitespace-nowrap">
                      {entry.entryDate.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-gray-400 mt-3 text-center">
              Last {moodTrendEntries.length} entries with mood scores
            </p>
          </div>
        )}

        {/* Past entries section */}
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            Past Entries
          </h2>

          {/* Search bar */}
          <div className="flex gap-2 mb-4">
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search entries..."
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700
                  placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-300"
              />
            </div>
            <button
              onClick={handleSearch}
              className="px-4 py-2 bg-amber-100 text-amber-700 rounded-lg text-sm font-medium
                hover:bg-amber-200 transition-colors"
            >
              Search
            </button>
            {searchQuery && (
              <button
                onClick={clearSearch}
                className="px-3 py-2 text-gray-400 hover:text-gray-600 text-sm"
              >
                Clear
              </button>
            )}
          </div>

          {/* Loading state */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin w-6 h-6 text-amber-500" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
              </svg>
              <span className="ml-2 text-gray-500 text-sm">Loading entries...</span>
            </div>
          )}

          {/* Empty state */}
          {!loading && pastEntries.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed border-amber-200">
              <svg
                className="mx-auto w-12 h-12 text-amber-300 mb-3"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
              <p className="text-gray-500 font-medium">No past entries yet</p>
              <p className="text-gray-400 text-sm mt-1">
                {searchQuery
                  ? "No entries match your search."
                  : "Start writing above to create your first diary entry."}
              </p>
            </div>
          )}

          {/* Entry list */}
          {!loading && pastEntries.length > 0 && (
            <div className="space-y-3">
              {pastEntries.map((entry) => {
                const isExpanded = expandedEntries.has(entry.id);
                const isLong = entry.content.length > 200;
                const preview = isLong
                  ? entry.content.slice(0, 200) + "..."
                  : entry.content;

                return (
                  <div
                    key={entry.id}
                    className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden
                      hover:border-amber-200 transition-colors"
                  >
                    <button
                      onClick={() => isLong && toggleExpanded(entry.id)}
                      className="w-full text-left p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className="text-sm font-medium text-gray-700">
                              {formatDateDisplay(entry.entryDate)}
                            </span>
                            {entry.moodScore && (
                              <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full border ${getMoodBadgeStyle(
                                  entry.moodScore
                                )}`}
                              >
                                {MOOD_EMOJIS[entry.moodScore] || ""} {entry.moodScore}/10
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
      <Footer />
    </div>
  );
}
