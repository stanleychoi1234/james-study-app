"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { AMBIENT_SOUNDS, playCompletionChime } from "@/lib/ambient-audio";

type Phase = "focus" | "shortBreak" | "longBreak";
type CountdownState = "idle" | "breathing" | "running" | "paused";

interface Assignment {
  id: string;
  title: string;
}

interface TodayStats {
  totalFocusMinutes: number;
  sessionsCompleted: number;
}

// Anime scenes - CSS-only particle animations
const SCENES = [
  { name: "Snow", emoji: "\u{2744}\u{FE0F}", particle: "\u{2744}", color: "from-slate-900 to-blue-950", count: 30 },
  { name: "Rain", emoji: "\u{1F327}\u{FE0F}", particle: "|", color: "from-gray-900 to-slate-800", count: 40 },
  { name: "Cherry", emoji: "\u{1F338}", particle: "\u{1F338}", color: "from-pink-950 to-purple-950", count: 20 },
  { name: "Stars", emoji: "\u{2B50}", particle: "\u{2728}", color: "from-indigo-950 to-black", count: 25 },
  { name: "Leaves", emoji: "\u{1F343}", particle: "\u{1F343}", color: "from-green-950 to-emerald-950", count: 20 },
  { name: "Fire", emoji: "\u{1F525}", particle: "\u{1F525}", color: "from-orange-950 to-red-950", count: 15 },
];

const PHASE_CONFIG: Record<Phase, { label: string; gradient: string; ring: string; textColor: string }> = {
  focus: {
    label: "Focus",
    gradient: "from-red-500 to-orange-500",
    ring: "ring-red-500/30",
    textColor: "text-red-400",
  },
  shortBreak: {
    label: "Short Break",
    gradient: "from-green-500 to-emerald-500",
    ring: "ring-green-500/30",
    textColor: "text-green-400",
  },
  longBreak: {
    label: "Long Break",
    gradient: "from-blue-500 to-cyan-500",
    ring: "ring-blue-500/30",
    textColor: "text-blue-400",
  },
};

function formatTime(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

// Particle component for background animation
function Particles({ scene, visible }: { scene: typeof SCENES[number]; visible: boolean }) {
  if (!visible) return null;

  const particles = Array.from({ length: scene.count }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 8;
    const duration = 4 + Math.random() * 6;
    const size = 10 + Math.random() * 16;
    const drift = (Math.random() - 0.5) * 40;

    return (
      <span
        key={i}
        className="absolute opacity-0 pointer-events-none select-none"
        style={{
          left: `${left}%`,
          top: "-5%",
          fontSize: `${size}px`,
          animation: `particleFall ${duration}s ${delay}s linear infinite`,
          "--drift": `${drift}px`,
        } as React.CSSProperties}
      >
        {scene.particle}
      </span>
    );
  });

  return <div className="absolute inset-0 overflow-hidden">{particles}</div>;
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
  const [countdownState, setCountdownState] = useState<CountdownState>("idle");
  const [breathCount, setBreathCount] = useState(3);
  const [sessionsCompleted, setSessionsCompleted] = useState(0);

  // Timestamp-delta tracking
  const endTimeRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Assignment linking
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string>("");

  // Today's stats
  const [todayStats, setTodayStats] = useState<TodayStats>({ totalFocusMinutes: 0, sessionsCompleted: 0 });

  // Ambient sound
  const [selectedSound, setSelectedSound] = useState<number | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const soundInstanceRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  // Scene animation
  const [selectedScene, setSelectedScene] = useState(0);
  const [sceneEnabled, setSceneEnabled] = useState(true);

  const isRunning = countdownState === "running";

  const getDuration = useCallback(
    (p: Phase): number => {
      switch (p) {
        case "focus": return focusDuration;
        case "shortBreak": return shortBreakDuration;
        case "longBreak": return longBreakDuration;
      }
    },
    [focusDuration, shortBreakDuration, longBreakDuration]
  );

  const totalDurationSeconds = getDuration(phase) * 60;
  const progress = totalDurationSeconds > 0 ? 1 - secondsLeft / totalDurationSeconds : 0;

  // Fetch assignments
  useEffect(() => {
    fetch("/api/assignments?status=pending")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setAssignments(d.assignments || []); })
      .catch(() => {});
  }, []);

  // Log session
  async function logSession(durationMinutes: number) {
    try {
      await fetch("/api/pomodoro/log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assignmentId: selectedAssignmentId || null, durationMinutes, type: "focus" }),
      });
    } catch {}
  }

  // Stop ambient sound
  function stopAmbientSound() {
    if (soundInstanceRef.current) {
      soundInstanceRef.current.stop();
      soundInstanceRef.current = null;
    }
  }

  // Start ambient sound
  function startAmbientSound() {
    if (!soundEnabled || selectedSound === null) return;
    stopAmbientSound();
    if (!audioCtxRef.current) audioCtxRef.current = new AudioContext();
    const sound = AMBIENT_SOUNDS[selectedSound];
    const instance = sound.create(audioCtxRef.current);
    instance.start();
    soundInstanceRef.current = instance;
  }

  // Handle timer completion
  const handleTimerComplete = useCallback(async () => {
    stopAmbientSound();
    if (audioCtxRef.current) playCompletionChime(audioCtxRef.current);

    if (phase === "focus") {
      const newSessions = sessionsCompleted + 1;
      setSessionsCompleted(newSessions);
      setTodayStats((prev) => ({
        totalFocusMinutes: prev.totalFocusMinutes + focusDuration,
        sessionsCompleted: prev.sessionsCompleted + 1,
      }));
      await logSession(focusDuration);

      if (newSessions % 4 === 0) {
        setPhase("longBreak");
        setSecondsLeft(longBreakDuration * 60);
      } else {
        setPhase("shortBreak");
        setSecondsLeft(shortBreakDuration * 60);
      }
    } else {
      setPhase("focus");
      setSecondsLeft(focusDuration * 60);
    }

    setCountdownState("idle");
    endTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, sessionsCompleted, focusDuration, shortBreakDuration, longBreakDuration, selectedAssignmentId]);

  // Core tick
  useEffect(() => {
    if (countdownState !== "running") return;
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
  }, [countdownState, handleTimerComplete]); // eslint-disable-line react-hooks/exhaustive-deps

  // Breathing countdown (3, 2, 1)
  useEffect(() => {
    if (countdownState !== "breathing") return;
    if (breathCount <= 0) {
      setCountdownState("running");
      endTimeRef.current = Date.now() + secondsLeft * 1000;
      startAmbientSound();
      return;
    }
    const timer = setTimeout(() => setBreathCount((c) => c - 1), 1000);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [countdownState, breathCount]);

  function handleStart() {
    setBreathCount(3);
    setCountdownState("breathing");
  }

  function handlePause() {
    setCountdownState("paused");
    endTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    stopAmbientSound();
  }

  function handleResume() {
    setCountdownState("running");
    endTimeRef.current = Date.now() + secondsLeft * 1000;
    startAmbientSound();
  }

  function handleReset() {
    setCountdownState("idle");
    endTimeRef.current = null;
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setSecondsLeft(getDuration(phase) * 60);
    stopAmbientSound();
  }

  function switchPhase(newPhase: Phase) {
    if (isRunning || countdownState === "breathing") return;
    setPhase(newPhase);
    setSecondsLeft(getDuration(newPhase) * 60);
    setCountdownState("idle");
    endTimeRef.current = null;
  }

  // Update timer when durations change
  useEffect(() => {
    if (countdownState === "idle") setSecondsLeft(getDuration(phase) * 60);
  }, [focusDuration, shortBreakDuration, longBreakDuration, phase, countdownState, getDuration]);

  // Sound toggle
  useEffect(() => {
    if (!soundEnabled) stopAmbientSound();
    else if (isRunning) startAmbientSound();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [soundEnabled, selectedSound]);

  // Randomize scene on mount
  useEffect(() => {
    setSelectedScene(Math.floor(Math.random() * SCENES.length));
  }, []);

  const config = PHASE_CONFIG[phase];
  const radius = 120;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);
  const currentScene = SCENES[selectedScene];

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <style>{`
        @keyframes particleFall {
          0% { opacity: 0; transform: translateY(0) translateX(0); }
          10% { opacity: 0.7; }
          90% { opacity: 0.5; }
          100% { opacity: 0; transform: translateY(100vh) translateX(var(--drift, 0)); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); opacity: 0.7; }
          50% { transform: scale(1.15); opacity: 1; }
        }
        @keyframes countIn {
          0% { transform: scale(2); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.8); opacity: 0.8; }
          100% { transform: scale(1.3); opacity: 0; }
        }
      `}</style>

      <Navbar />

      <main className="flex-1 relative">
        {/* Background scene */}
        <div className={`absolute inset-0 bg-gradient-to-b ${currentScene.color} transition-colors duration-1000`}>
          <Particles scene={currentScene} visible={sceneEnabled && countdownState !== "idle"} />
        </div>

        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold text-white">Focus Timer</h1>
              <p className="text-sm text-gray-400 mt-1">Deep work, one session at a time</p>
            </div>
            <button
              onClick={() => setShowSettings(!showSettings)}
              className="p-2 text-gray-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>

          {/* Settings */}
          {showSettings && (
            <div className="bg-white/10 backdrop-blur-md rounded-xl border border-white/10 p-6 mb-6">
              <h2 className="text-lg font-semibold text-white mb-4">Timer Settings</h2>
              <div className="grid grid-cols-3 gap-4">
                {[
                  { id: "focus-dur", label: "Focus (min)", value: focusDuration, set: setFocusDuration, max: 120 },
                  { id: "short-dur", label: "Short Break", value: shortBreakDuration, set: setShortBreakDuration, max: 60 },
                  { id: "long-dur", label: "Long Break", value: longBreakDuration, set: setLongBreakDuration, max: 60 },
                ].map((s) => (
                  <div key={s.id}>
                    <label htmlFor={s.id} className="block text-sm font-medium text-gray-300 mb-1">{s.label}</label>
                    <input
                      id={s.id}
                      type="number"
                      min={1}
                      max={s.max}
                      value={s.value}
                      onChange={(e) => s.set(Math.max(1, Math.min(s.max, Number(e.target.value) || 1)))}
                      disabled={isRunning}
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white text-center focus:ring-2 focus:ring-blue-500 outline-none disabled:opacity-50"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Phase Tabs */}
          <div className="flex space-x-1 bg-white/10 rounded-lg p-1 mb-8 backdrop-blur-sm">
            {(["focus", "shortBreak", "longBreak"] as Phase[]).map((p) => (
              <button
                key={p}
                onClick={() => switchPhase(p)}
                disabled={isRunning || countdownState === "breathing"}
                className={`flex-1 px-3 py-2 text-sm font-medium rounded-md transition-all disabled:cursor-not-allowed ${
                  phase === p
                    ? `bg-gradient-to-r ${PHASE_CONFIG[p].gradient} text-white shadow-lg`
                    : "text-gray-400 hover:text-white"
                }`}
              >
                {PHASE_CONFIG[p].label}
              </button>
            ))}
          </div>

          {/* Timer Display */}
          <div className="flex flex-col items-center mb-8">
            {/* Breathing countdown overlay */}
            {countdownState === "breathing" && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/60 backdrop-blur-sm">
                <div
                  key={breathCount}
                  className="text-9xl font-bold text-white"
                  style={{ animation: "countIn 1s ease-out forwards" }}
                >
                  {breathCount > 0 ? breathCount : "GO"}
                </div>
              </div>
            )}

            {/* Circular Timer */}
            <div className="relative w-72 h-72 mb-8">
              {/* Pulsing ring behind timer when running */}
              {isRunning && (
                <div
                  className={`absolute inset-0 rounded-full ring-4 ${config.ring}`}
                  style={{ animation: "breathe 4s ease-in-out infinite" }}
                />
              )}

              <svg className="w-full h-full -rotate-90 drop-shadow-2xl" viewBox="0 0 280 280">
                <circle cx="140" cy="140" r={radius} fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="8" />
                <circle
                  cx="140"
                  cy="140"
                  r={radius}
                  fill="none"
                  stroke="url(#timer-gradient)"
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-[stroke-dashoffset] duration-300"
                />
                <defs>
                  <linearGradient id="timer-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor={phase === "focus" ? "#ef4444" : phase === "shortBreak" ? "#22c55e" : "#3b82f6"} />
                    <stop offset="100%" stopColor={phase === "focus" ? "#f97316" : phase === "shortBreak" ? "#10b981" : "#06b6d4"} />
                  </linearGradient>
                </defs>
              </svg>

              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-6xl font-mono font-bold text-white tracking-wider drop-shadow-lg">
                  {formatTime(secondsLeft)}
                </span>
                <span className={`text-sm font-medium mt-2 ${config.textColor}`}>{config.label}</span>
              </div>
            </div>

            {/* Controls */}
            <div className="flex items-center gap-3">
              {countdownState === "idle" ? (
                <button
                  onClick={handleStart}
                  className={`px-10 py-3.5 bg-gradient-to-r ${config.gradient} text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105`}
                >
                  Start
                </button>
              ) : countdownState === "running" ? (
                <button
                  onClick={handlePause}
                  className="px-10 py-3.5 bg-white/20 backdrop-blur-sm text-white text-sm font-bold rounded-xl hover:bg-white/30 transition-all"
                >
                  Pause
                </button>
              ) : countdownState === "paused" ? (
                <button
                  onClick={handleResume}
                  className={`px-10 py-3.5 bg-gradient-to-r ${config.gradient} text-white text-sm font-bold rounded-xl shadow-lg hover:shadow-xl transition-all hover:scale-105`}
                >
                  Resume
                </button>
              ) : null}
              {countdownState !== "idle" && countdownState !== "breathing" && (
                <button
                  onClick={handleReset}
                  className="px-6 py-3.5 border border-white/20 text-gray-300 text-sm font-medium rounded-xl hover:bg-white/10 transition-all"
                >
                  Reset
                </button>
              )}
            </div>
          </div>

          {/* Session dots */}
          <div className="flex justify-center gap-2 mb-8">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3 h-3 rounded-full transition-all ${
                  i < sessionsCompleted % 4
                    ? `bg-gradient-to-r ${config.gradient} shadow-lg`
                    : "bg-white/10"
                }`}
              />
            ))}
            <span className="text-xs text-gray-500 ml-2">
              {sessionsCompleted % 4}/4 to long break
            </span>
          </div>

          {/* Ambient + Scene Controls */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            {/* Scene selector */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Visual Scene</h3>
                <button
                  onClick={() => setSceneEnabled(!sceneEnabled)}
                  className={`text-xs px-2 py-1 rounded-full ${
                    sceneEnabled ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-500"
                  }`}
                >
                  {sceneEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {SCENES.map((s, i) => (
                  <button
                    key={s.name}
                    onClick={() => setSelectedScene(i)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg transition-all ${
                      selectedScene === i
                        ? "bg-white/20 text-white ring-1 ring-white/30"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {s.emoji} {s.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Sound selector */}
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-white">Ambient Sound</h3>
                <button
                  onClick={() => setSoundEnabled(!soundEnabled)}
                  className={`text-xs px-2 py-1 rounded-full ${
                    soundEnabled ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-500"
                  }`}
                >
                  {soundEnabled ? "ON" : "OFF"}
                </button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {AMBIENT_SOUNDS.map((s, i) => (
                  <button
                    key={s.name}
                    onClick={() => setSelectedSound(i)}
                    className={`px-2.5 py-1.5 text-xs rounded-lg transition-all ${
                      selectedSound === i
                        ? "bg-white/20 text-white ring-1 ring-white/30"
                        : "bg-white/5 text-gray-400 hover:bg-white/10"
                    }`}
                  >
                    {s.emoji} {s.name}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Assignment linking */}
          {assignments.length > 0 && (
            <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 mb-6">
              <label htmlFor="assignment-link" className="block text-sm font-semibold text-white mb-2">
                Link to Assignment
              </label>
              <select
                id="assignment-link"
                value={selectedAssignmentId}
                onChange={(e) => setSelectedAssignmentId(e.target.value)}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-sm text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="" className="bg-gray-900">No assignment (free focus)</option>
                {assignments.map((a) => (
                  <option key={a.id} value={a.id} className="bg-gray-900">{a.title}</option>
                ))}
              </select>
            </div>
          )}

          {/* Stats */}
          <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-5">
            <h3 className="text-sm font-semibold text-white mb-3">Today&apos;s Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{todayStats.totalFocusMinutes}</p>
                <p className="text-xs text-gray-400 mt-1">Focus Minutes</p>
              </div>
              <div className="bg-white/5 rounded-lg p-4 text-center">
                <p className="text-3xl font-bold text-white">{todayStats.sessionsCompleted}</p>
                <p className="text-xs text-gray-400 mt-1">Sessions Done</p>
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer dark />
    </div>
  );
}
