"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const CATEGORIES = ["School", "Private", "Business", "Family", "Friends"];

const DEFAULT_COLORS: Record<string, string> = {
  School: "#3b82f6",
  Private: "#8b5cf6",
  Business: "#f59e0b",
  Family: "#ef4444",
  Friends: "#22c55e",
};

const TIMEZONES = [
  "Australia/Brisbane",
  "Australia/Sydney",
  "Australia/Melbourne",
  "Australia/Perth",
  "Australia/Adelaide",
  "Australia/Hobart",
  "Australia/Darwin",
];

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  // Task priority
  const [urgentCutoffDays, setUrgentCutoffDays] = useState(7);

  // Category colors
  const [categoryColors, setCategoryColors] = useState<Record<string, string>>(
    () => ({ ...DEFAULT_COLORS })
  );

  // Profile
  const [userEmail, setUserEmail] = useState("");
  const [timezone, setTimezone] = useState("Australia/Brisbane");

  // Email defaults
  const [defaultReminderEmail, setDefaultReminderEmail] = useState("");

  // UI state
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3000);
  }

  // -------------------------------------------------------------------------
  // Load settings + user data
  // -------------------------------------------------------------------------

  useEffect(() => {
    async function loadData() {
      try {
        const [settingsRes, meRes] = await Promise.all([
          fetch("/api/settings"),
          fetch("/api/auth/me"),
        ]);

        if (settingsRes.ok) {
          const { settings } = await settingsRes.json();
          if (settings) {
            setUrgentCutoffDays(settings.urgentCutoffDays ?? 7);

            if (settings.categoryColors) {
              try {
                const parsed =
                  typeof settings.categoryColors === "string"
                    ? JSON.parse(settings.categoryColors)
                    : settings.categoryColors;
                setCategoryColors((prev) => ({ ...prev, ...parsed }));
              } catch {
                // ignore invalid JSON
              }
            }
          }
        }

        if (meRes.ok) {
          const { user } = await meRes.json();
          if (user) {
            setUserEmail(user.email || "");
            setTimezone(user.timezone || "Australia/Brisbane");
            setDefaultReminderEmail(user.email || "");
          }
        }
      } catch {
        showToast("error", "Failed to load settings");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  // -------------------------------------------------------------------------
  // Save
  // -------------------------------------------------------------------------

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          urgentCutoffDays,
          categoryColors: JSON.stringify(categoryColors),
        }),
      });

      if (!res.ok) throw new Error("Failed to save settings");
      showToast("success", "Settings saved successfully");
    } catch {
      showToast("error", "Failed to save settings");
    } finally {
      setSaving(false);
    }
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (loading) {
    return (
      <div
        className="min-h-screen bg-gray-50"
        style={{
          backgroundImage: "url(/images/settings-bg.png)",
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
        }}
      >
        <div className="min-h-screen bg-white/85 backdrop-blur-sm">
          <Navbar />
          <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
            <div className="flex justify-center py-16">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
            </div>
          </main>
          <Footer />
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen bg-gray-50"
      style={{
        backgroundImage: "url(/images/settings-bg.png)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
      }}
    >
      <div className="min-h-screen bg-white/85 backdrop-blur-sm">
        <Navbar />
        <main className="mx-auto max-w-2xl px-4 py-8 sm:px-6 lg:px-8">
          {/* Toast */}
          {toast && (
            <div
              className={`fixed right-4 top-4 z-50 rounded-lg px-4 py-3 text-sm font-medium shadow-lg transition-all ${
                toast.type === "success"
                  ? "bg-green-600 text-white"
                  : "bg-red-600 text-white"
              }`}
            >
              {toast.message}
            </div>
          )}

          {/* Header */}
          <div className="mb-8 flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
              <p className="mt-1 text-sm text-gray-500">
                Customize your study app experience
              </p>
            </div>
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                  Saving...
                </>
              ) : (
                <>
                  <svg
                    className="mr-1.5 h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  Save Settings
                </>
              )}
            </button>
          </div>

          <div className="space-y-6">
            {/* =========================================================== */}
            {/* Task Priority                                                 */}
            {/* =========================================================== */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Task Priority
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                Tasks due within{" "}
                <span className="font-semibold text-blue-600">
                  {urgentCutoffDays}
                </span>{" "}
                day{urgentCutoffDays !== 1 ? "s" : ""} are considered{" "}
                <span className="font-semibold text-red-600">urgent</span> in
                the Eisenhower Matrix.
              </p>

              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <span>1 day</span>
                  <span>15 days</span>
                  <span>30 days</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={urgentCutoffDays}
                  onChange={(e) =>
                    setUrgentCutoffDays(parseInt(e.target.value))
                  }
                  className="mt-1 w-full accent-blue-600"
                />
                <div className="mt-2 text-center">
                  <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-700">
                    {urgentCutoffDays} day{urgentCutoffDays !== 1 ? "s" : ""}
                  </span>
                </div>
              </div>
            </section>

            {/* =========================================================== */}
            {/* Category Colors                                               */}
            {/* =========================================================== */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Category Colors
              </h2>
              <p className="mt-1 mb-4 text-sm text-gray-500">
                Customize colors for your task categories.
              </p>

              <div className="space-y-3">
                {CATEGORIES.map((cat) => (
                  <div
                    key={cat}
                    className="flex items-center gap-4 rounded-lg border border-gray-100 p-3"
                  >
                    {/* Color swatch */}
                    <div
                      className="h-8 w-8 shrink-0 rounded-lg shadow-inner"
                      style={{
                        backgroundColor:
                          categoryColors[cat] ?? DEFAULT_COLORS[cat],
                      }}
                    />

                    {/* Category name */}
                    <span className="min-w-0 flex-1 text-sm font-medium text-gray-900">
                      {cat}
                    </span>

                    {/* Color input */}
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={categoryColors[cat] ?? DEFAULT_COLORS[cat]}
                        onChange={(e) =>
                          setCategoryColors((prev) => ({
                            ...prev,
                            [cat]: e.target.value,
                          }))
                        }
                        className="h-8 w-8 cursor-pointer rounded border border-gray-200 p-0"
                      />
                      <input
                        type="text"
                        value={categoryColors[cat] ?? DEFAULT_COLORS[cat]}
                        onChange={(e) =>
                          setCategoryColors((prev) => ({
                            ...prev,
                            [cat]: e.target.value,
                          }))
                        }
                        className="w-24 rounded-lg border border-gray-300 px-2 py-1.5 text-xs font-mono text-gray-700 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                        maxLength={7}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* =========================================================== */}
            {/* Profile                                                       */}
            {/* =========================================================== */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">Profile</h2>
              <p className="mt-1 mb-4 text-sm text-gray-500">
                Your account details.
              </p>

              <div className="space-y-4">
                {/* Email (read-only) */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={userEmail}
                    readOnly
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none cursor-not-allowed"
                  />
                </div>

                {/* Timezone */}
                <div>
                  <label
                    htmlFor="timezone"
                    className="block text-sm font-medium text-gray-700 mb-1"
                  >
                    Timezone
                  </label>
                  <select
                    id="timezone"
                    value={timezone}
                    onChange={(e) => setTimezone(e.target.value)}
                    className="w-full rounded-lg border border-gray-300 px-4 py-2.5 text-sm text-gray-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500"
                  >
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace("Australia/", "").replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </section>

            {/* =========================================================== */}
            {/* Email Defaults                                                */}
            {/* =========================================================== */}
            <section className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-gray-900">
                Email Defaults
              </h2>
              <p className="mt-1 mb-4 text-sm text-gray-500">
                Default email used for assignment reminders.
              </p>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Default Reminder Email
                </label>
                <input
                  type="email"
                  value={defaultReminderEmail}
                  readOnly
                  className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500 outline-none cursor-not-allowed"
                />
                <p className="mt-1.5 text-xs text-gray-400">
                  This is your account email. Reminders will be sent here by
                  default.
                </p>
              </div>
            </section>
          </div>

          {/* Bottom save button */}
          <div className="mt-8 flex justify-end">
            <button
              onClick={handleSave}
              disabled={saving}
              className="inline-flex items-center rounded-lg bg-blue-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 transition-colors"
            >
              {saving ? "Saving..." : "Save Settings"}
            </button>
          </div>
        </main>
        <Footer />
      </div>
    </div>
  );
}
