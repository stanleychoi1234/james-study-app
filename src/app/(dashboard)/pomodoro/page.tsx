"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";

type Phase = "focus" | "shortBreak" | "longBreak";

interface Assignment {
  id: string;
  title: string;
}

interface TodayStats {
  totalFocusMinutes: number;
  sessionsCompleted: number;
}

const PHASE_CONFIG: Record<Phase, { label: string; color: string; bg: string; ring: string; stroke: string }> = {
  focus: {
    label: "Focus",
    color: "text-red-600",
    bg: "bg-red-50",
    ring: "ring-red-200",
    stroke: "#dc2626",
  },
  shortBreak: {
    label: "Short Break",
    color: "text-green-600",
    bg: "bg-green-50",
    ring: "ring-green-200",
    stroke: "#16a34a",
  },
  longBreak: {
    label: "Long Break",
    color: "text-blue-600",
    bg: "bg-blue-50",
    ring: "ring-blue-200",
    stroke: "#2563eb",
  },
};

function playBeep() {
  try {
    const ctx = new AudioContext();
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.connect(gain);
    gain.connect(ctx.destination);
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(880, ctx.currentTime);
    gain.gain.setValueAtTime(0.3, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.8);
    oscillator.start(ctx.currentTime);
    oscillator.stop(ctx.currentTime + 0.8);

    // Second beep
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1100, ctx.currentTime + 0.3);
    gain2.gain.setValueAtTime(0.3, ctx.currentTime + 0.3);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.1);
    osc2.start(ctx.currentTime + 0.3);
    osc2.stop(ctx.currentTime + 1.1);
  } catch {
    // Audio not available
  }
}

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export default function PomodoroPage() {
  // Settings
  const [focusDuration, setFocusDuration] = useState(25);
  const [shortBreakDuration, setShortBreakDuration] = useState(5);
  const [longBreakDuration, setLongBreakDuration] = useState(15);
  const [showSettings, setShowSettings] = useState(false);

  // Timer state
  const [phase, setPhase] = useState<Phase>("focus");
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  // Timestamp-delta tracking
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Assignment linking
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");

  // Today's stats
  const [todayStats, setTodayStats] = useState<TodayStats>({
    totalFocusMinutes: 0,
    sessionsCompleted: 0,
  });

  // Get duration for a phase
  const getDuration = useCallback(
    (p: Phase): number => {
      switch (p) {
        case "focus":
          return focusDuration;
        case "shortBreak":
          return shortBreakDuration;
        case "longBreak":
          return longBreakDuration;
      }
    },
    [focusDuration, shortBreakDuration, longBreakDuration]
  );

  // Total duration in seconds for progress calculation
  const totalDurationSeconds = getDuration(phase) * 60;
  const progress = totalDurationSeconds > 0 ? 1 - secondsLeft / totalDurationSeconds : 0;

  // Fetch pending assignments
  useEffect(() => {
    async function fetchAssignments() {
      try {
        const res = await fetch("/api/assignments?status=pending");
        if (res.ok) {
          const data = await res.json();
          setAssignments(data.assignments || []);
        }
      } catch {
        // Silently fail
      }
    }
    fetchAssignments();
  }, []);

  // Log a completed focus session
  async function logSession(durationMinutes: number) {
    try {
      await fetch("/api/pomodoro/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          assignmentId: selectedAssignmentId || null,
          durationMinutes,
          type: "focus",
        }),
      });
    } catch {
      // Silently fail
    }
  }

  // Handle timer completion
  const handleTimerComplete = useCallback(async () => {
    playBeep();

    if (phase === "focus") {
      const newSessions = sessionsCompleted + 1;
      setSessionsCompleted(newSessions);

      // Update today's stats
      setTodayStats((prev) => ({
        totalFocusMinutes: prev.totalFocusMinutes + focusDuration,
        sessionsCompleted: prev.sessionsCompleted + 1,
      }));

      // Log the session
      await logSession(focusDuration);

      // After 4 focus sessions, take a long break
      if (newSessions % 4 === 0) {
        setPhase("longBreak");
        setSecondsLeft(longBreakDuration * 60);
      } else {
        setPhase("shortBreak");
        setSecondsLeft(shortBreakDuration * 60);
      }
    } else {
      // Break completed, go back to focus
      setPhase("focus");
      setSecondsLeft(focusDuration * 60);
    }

    setIsRunning(false);
    endTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sessionsCompleted, focusDuration, shortBreakDuration, longBreakDuration, selectedAssignmentId]);

  // The core interval-based tick using timestamp deltas
  useEffect(() => {
    if (!isRunning) return;

    // Set the end time when starting
    if (endTimeRef.current === null) {
      endTimeRef.current = Date.now() + secondsLeft * 1000;
    }

    intervalRef.current = setInterval(() => {
      const remaining = Math.round((endTimeRef.current! - Date.now()) / 1000);
      if (remaining <= 0) {
        setSecondsLeft(0);
        handleTimerComplete();
      } else {
        setSecondsLeft(remaining);
      }
    }, 250);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [isRunning, handleTimerComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  function handleStart() {
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    setIsRunning(true);
  }

  function handlePause() {
    setIsRunning(false);
    endTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  function handleReset() {
    setIsRunning(false);
    endTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSecondsLeft(getDuration(phase) * 60);
  }

  function switchPhase(newPhase: Phase) {
    if (isRunning) return;
    setPhase(newPhase);
    setSecondsLeft(getDuration(newPhase) * 60);
    endTimeRef.current = null;
  }

  // Update timer when durations change (only if not running)
  useEffect(() => {
    if (!isRunning) {
      setSecondsLeft(getDuration(phase) * 60);
    }
  }, [focusDuration, shortBreakDuration, longBreakDuration, phase, isRunning, getDuration]);

  const config = PHASE_CONFIG[phase];

  // SVG circle params
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pomodoro Timer</h1>
            <p className="text-sm text-gray-500 mt-1">Stay focused, take breaks, get things done</p>
          </div>
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            title="Settings"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
              />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
        </div>

        {/* Settings Panel */}
        {showSettings && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Timer Settings</h2>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label htmlFor="focus-dur" className="block text-sm font-medium text-gray-700 mb-1">
                  Focus (min)
                </label>
                <input
                  id="focus-dur"
                  type="number"
                  min={1}
                  max={120}
                  value={focusDuration}
                  onChange={(e) => setFocusDuration(Math.max(1, Math.min(120, Number(e.target.value) || 1)))}
                  disabled={isRunning}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label htmlFor="short-dur" className="block text-sm font-medium text-gray-700 mb-1">
                  Short Break (min)
                </label>
                <input
                  id="short-dur"
                  type="number"
                  min={1}
                  max={60}
                  value={shortBreakDuration}
                  onChange={(e) => setShortBreakDuration(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                  disabled={isRunning}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
                />
              </div>
              <div>
                <label htmlFor="long-dur" className="block text-sm font-medium text-gray-700 mb-1">
                  Long Break (min)
                </label>
                <input
                  id="long-dur"
                  type="number"
                  min={1}
                  max={60}
                  value={longBreakDuration}
                  onChange={(e) => setLongBreakDuration(Math.max(1, Math.min(60, Number(e.target.value) || 1)))}
                  disabled={isRunning}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-center focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none disabled:opacity-50"
                />
              </div>
            </div>
          </div>
        )}

        {/* Phase Selector Tabs */}
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1 mb-8">
          {(["focus", "shortBreak", "longBreak"] as Phase[]).map((p) => (
            <button
              key={p}
              onClick={() => switchPhase(p)}
              disabled={isRunning}
              className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-colors disabled:cursor-not-allowed ${
                phase === p ? `bg-white shadow-sm ${PHASE_CONFIG[p].color}` : "text-gray-600 hover:text-gray-900"
              }`}
            >
              {PHASE_CONFIG[p].label}
            </button>
          ))}
        </div>

        {/* Timer Display */}
        <div className={`${config.bg} rounded-2xl p-8 mb-6 flex flex-col items-center ring-1 ${config.ring}`}>
          {/* Circular Timer */}
          <div className="relative w-64 h-64 mb-6">
            <svg className="w-full h-full -rotate-90" viewBox="0 0 280 280">
              {/* Background circle */}
              <circle cx="140" cy="140" r={radius} fill="none" stroke="#e5e7eb" strokeWidth="8" />
              {/* Progress circle */}
              <circle
                cx="140"
                cy="140"
                r={radius}
                fill="none"
                stroke={config.stroke}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-[stroke-dashoffset] duration-300"
              />
            </svg>
            {/* Time text */}
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className={`text-5xl font-mono font-bold ${config.color}`}>{formatTime(secondsLeft)}</span>
              <span className={`text-sm font-medium mt-1 ${config.color} opacity-75`}>{config.label}</span>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center gap-3">
            {!isRunning ? (
              <button
                onClick={handleStart}
                className="px-8 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
              >
                {secondsLeft < getDuration(phase) * 60 ? "Resume" : "Start"}
              </button>
            ) : (
              <button
                onClick={handlePause}
                className="px-8 py-3 bg-gray-900 text-white text-sm font-semibold rounded-xl hover:bg-gray-800 transition-colors"
              >
                Pause
              </button>
            )}
            <button
              onClick={handleReset}
              className="px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium rounded-xl hover:bg-white transition-colors"
            >
              Reset
            </button>
          </div>
        </div>

        {/* Session Counter */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Session Progress</h3>
              <p className="text-xs text-gray-500 mt-0.5">
                {sessionsCompleted % 4} of 4 focus sessions until long break
              </p>
            </div>
            <div className="flex gap-1.5">
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  className={`w-4 h-4 rounded-full ${
                    i < sessionsCompleted % 4 ? "bg-red-500" : "bg-gray-200"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Assignment Linking */}
        {assignments.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
            <label htmlFor="assignment-link" className="block text-sm font-semibold text-gray-900 mb-2">
              Link to Assignment
            </label>
            <select
              id="assignment-link"
              value={selectedAssignmentId}
              onChange={(e) => setSelectedAssignmentId(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
            >
              <option value="">No assignment (free focus)</option>
              {assignments.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Today's Stats */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">Today&apos;s Stats</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{todayStats.totalFocusMinutes}</p>
              <p className="text-xs text-gray-500 mt-1">Focus Minutes</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-4 text-center">
              <p className="text-2xl font-bold text-gray-900">{todayStats.sessionsCompleted}</p>
              <p className="text-xs text-gray-500 mt-1">Sessions Completed</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
