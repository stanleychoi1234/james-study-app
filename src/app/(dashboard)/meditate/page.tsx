"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";

type BreathPhase = "inhale" | "hold" | "exhale" | "holdOut";
type SessionState = "idle" | "countdown" | "active" | "finished";

interface Pattern {
  name: string;
  desc: string;
  inhale: number;
  hold: number;
  exhale: number;
  holdOut: number;
}

const PATTERNS: Pattern[] = [
  { name: "Box Breathing", desc: "Equal rhythm for calm and focus", inhale: 4, hold: 4, exhale: 4, holdOut: 4 },
  { name: "4-7-8 Relaxation", desc: "Dr. Weil's technique for deep calm", inhale: 4, hold: 7, exhale: 8, holdOut: 0 },
  { name: "Simple Calm", desc: "Gentle rhythm, no holding", inhale: 4, hold: 0, exhale: 6, holdOut: 0 },
  { name: "Energizing", desc: "Quick inhale, slow exhale", inhale: 2, hold: 0, exhale: 6, holdOut: 2 },
];

const DURATIONS = [
  { label: "2 min", seconds: 120 },
  { label: "5 min", seconds: 300 },
  { label: "10 min", seconds: 600 },
  { label: "15 min", seconds: 900 },
];

const PHASE_COLORS: Record<BreathPhase, string> = {
  inhale: "from-blue-600/30 to-cyan-600/30",
  hold: "from-purple-600/30 to-indigo-600/30",
  exhale: "from-teal-600/30 to-emerald-600/30",
  holdOut: "from-gray-600/30 to-slate-600/30",
};

const PHASE_LABELS: Record<BreathPhase, string> = {
  inhale: "Breathe In",
  hold: "Hold",
  exhale: "Breathe Out",
  holdOut: "Hold",
};

function formatTime(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

// Build the phase sequence for a pattern (skip phases with 0 duration)
function buildSequence(p: Pattern): { phase: BreathPhase; dur: number }[] {
  const all: { phase: BreathPhase; dur: number }[] = [
    { phase: "inhale", dur: p.inhale },
    { phase: "hold", dur: p.hold },
    { phase: "exhale", dur: p.exhale },
    { phase: "holdOut", dur: p.holdOut },
  ];
  return all.filter(s => s.dur > 0);
}

export default function MeditatePage() {
  const [selectedPattern, setSelectedPattern] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(1);
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [countdown, setCountdown] = useState(3);
  const [cycleCount, setCycleCount] = useState(0);

  // Audio guide
  const [audioGuide, setAudioGuide] = useState(true);
  const [volume, setVolume] = useState(40);
  const audioCtxRef = useRef<AudioContext | null>(null);
  // Track active guide oscillator so we can stop it on phase change
  const guideOscRef = useRef<{ osc: OscillatorNode; gain: GainNode } | null>(null);

  // Use refs for the timer state to avoid stale closures
  const timeRemainingRef = useRef(0);
  const phaseIndexRef = useRef(0);
  const phaseTimeRef = useRef(0);
  const cycleCountRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // These are for rendering only — updated from the refs each tick
  const [displayTimeRemaining, setDisplayTimeRemaining] = useState(0);
  const [displayPhase, setDisplayPhase] = useState<BreathPhase>("inhale");
  const [displayPhaseTime, setDisplayPhaseTime] = useState(0);
  const [displayPhaseDuration, setDisplayPhaseDuration] = useState(4);
  const [displayCycleCount, setDisplayCycleCount] = useState(0);

  const pattern = PATTERNS[selectedPattern];
  const totalDuration = DURATIONS[selectedDuration].seconds;
  const sequence = buildSequence(pattern);

  function getOrCreateAudioCtx(): AudioContext {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    return audioCtxRef.current;
  }

  // Continuous audio guide tone that plays for the duration of each phase
  // Inhale: rising tone (C5 to E5), gradually louder
  // Hold: steady gentle tone (G4), constant soft volume
  // Exhale: falling tone (E5 to C5), gradually softer
  const startGuideTone = useCallback((phase: BreathPhase, duration: number) => {
    if (!audioGuide) return;
    const ctx = getOrCreateAudioCtx();
    const vol = volume / 100;

    // Stop previous tone smoothly
    if (guideOscRef.current) {
      const prev = guideOscRef.current;
      prev.gain.gain.linearRampToValueAtTime(0.001, ctx.currentTime + 0.15);
      setTimeout(() => { try { prev.osc.stop(); } catch {} }, 200);
      guideOscRef.current = null;
    }

    const osc = ctx.createOscillator();
    osc.type = "sine";
    const gain = ctx.createGain();
    osc.connect(gain).connect(ctx.destination);

    const now = ctx.currentTime;
    const maxVol = 0.06 * vol;

    if (phase === "inhale") {
      // Gentle rising tone, volume fades in
      osc.frequency.setValueAtTime(262, now); // C4
      osc.frequency.linearRampToValueAtTime(330, now + duration); // E4
      gain.gain.setValueAtTime(0.005, now);
      gain.gain.linearRampToValueAtTime(maxVol, now + duration);
    } else if (phase === "exhale") {
      // Gentle falling tone, volume fades out
      osc.frequency.setValueAtTime(330, now); // E4
      osc.frequency.linearRampToValueAtTime(262, now + duration); // C4
      gain.gain.setValueAtTime(maxVol, now);
      gain.gain.linearRampToValueAtTime(0.005, now + duration);
    } else {
      // Hold: steady soft tone
      osc.frequency.setValueAtTime(196, now); // G3 - lower, calmer
      gain.gain.setValueAtTime(maxVol * 0.4, now);
    }

    osc.start(now);
    osc.stop(now + duration + 0.2);
    guideOscRef.current = { osc, gain };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioGuide, volume]);

  const stopGuideTone = useCallback(() => {
    if (guideOscRef.current) {
      try { guideOscRef.current.osc.stop(); } catch {}
      guideOscRef.current = null;
    }
  }, []);

  // Countdown
  useEffect(() => {
    if (sessionState !== "countdown") return;
    if (countdown <= 0) {
      // Initialize session using refs
      timeRemainingRef.current = totalDuration;
      phaseIndexRef.current = 0;
      phaseTimeRef.current = 0;
      cycleCountRef.current = 0;

      const firstPhase = sequence[0];
      setDisplayTimeRemaining(totalDuration);
      setDisplayPhase(firstPhase.phase);
      setDisplayPhaseTime(0);
      setDisplayPhaseDuration(firstPhase.dur);
      setDisplayCycleCount(0);
      setCycleCount(0);

      setSessionState("active");
      startGuideTone(firstPhase.phase, firstPhase.dur);
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState, countdown]);

  // Main timer - uses refs to avoid stale closures
  useEffect(() => {
    if (sessionState !== "active") return;

    const seq = buildSequence(PATTERNS[selectedPattern]);

    timerRef.current = setInterval(() => {
      // Decrement time remaining
      timeRemainingRef.current -= 1;
      if (timeRemainingRef.current <= 0) {
        setSessionState("finished");
        stopGuideTone();
        // Play completion chime
        const ctx = getOrCreateAudioCtx();
        [523.25, 659.25, 783.99].forEach((f, i) => {
          const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
          const g = ctx.createGain();
          g.gain.setValueAtTime(0, ctx.currentTime + i * 0.2);
          g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i * 0.2 + 0.05);
          g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 1.5);
          o.connect(g).connect(ctx.destination);
          o.start(ctx.currentTime + i * 0.2); o.stop(ctx.currentTime + i * 0.2 + 1.5);
        });
        return;
      }

      // Advance phase time
      phaseTimeRef.current += 1;
      const currentIdx = phaseIndexRef.current;
      const currentPhaseDur = seq[currentIdx].dur;

      if (phaseTimeRef.current >= currentPhaseDur) {
        // Move to next phase
        const nextIdx = (currentIdx + 1) % seq.length;
        phaseIndexRef.current = nextIdx;
        phaseTimeRef.current = 0;

        if (nextIdx === 0) {
          cycleCountRef.current += 1;
        }

        // Start new guide tone
        startGuideTone(seq[nextIdx].phase, seq[nextIdx].dur);
      }

      // Update display state
      const pi = phaseIndexRef.current;
      setDisplayTimeRemaining(timeRemainingRef.current);
      setDisplayPhase(seq[pi].phase);
      setDisplayPhaseTime(phaseTimeRef.current);
      setDisplayPhaseDuration(seq[pi].dur);
      setDisplayCycleCount(cycleCountRef.current);
      setCycleCount(cycleCountRef.current);
    }, 1000);

    return () => {
      if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState, selectedPattern]);

  function handleStart() {
    setCountdown(3);
    setSessionState("countdown");
  }

  function handleStop() {
    setSessionState("idle");
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
    stopGuideTone();
  }

  // Visual: breathing circle scale
  const breathProgress = displayPhaseDuration > 0 ? displayPhaseTime / displayPhaseDuration : 0;
  let circleScale = 0.5;
  if (sessionState === "active") {
    if (displayPhase === "inhale") circleScale = 0.5 + breathProgress * 0.5;
    else if (displayPhase === "exhale") circleScale = 1 - breathProgress * 0.5;
    else if (displayPhase === "hold") circleScale = 1;
    else circleScale = 0.5; // holdOut
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col">
      <style>{`
        @keyframes countIn {
          0% { transform: scale(2); opacity: 0; }
          50% { opacity: 1; }
          100% { transform: scale(1); opacity: 0; }
        }
      `}</style>

      <Navbar />

      <main className="flex-1 relative">
        <div className={`absolute inset-0 bg-gradient-to-b ${
          sessionState === "active" ? PHASE_COLORS[displayPhase] : "from-indigo-950/50 to-gray-950"
        } transition-all duration-1000`} />

        <div className="relative z-10 max-w-xl mx-auto px-4 sm:px-6 py-8">
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-white">Breathe & Meditate</h1>
            <p className="text-sm text-gray-400 mt-1">De-stress, refocus, find your calm</p>
          </div>

          {/* Countdown overlay */}
          {sessionState === "countdown" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
              <div key={countdown} className="text-9xl font-bold text-white" style={{ animation: "countIn 1s ease-out forwards" }}>
                {countdown > 0 ? countdown : "Begin"}
              </div>
            </div>
          )}

          {/* Finished overlay */}
          {sessionState === "finished" && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
              <div className="text-center">
                <div className="text-6xl mb-4">{"\u{1F9D8}"}</div>
                <h2 className="text-3xl font-bold text-white mb-2">Session Complete</h2>
                <p className="text-gray-300 mb-2">{cycleCount} breath cycles completed</p>
                <p className="text-gray-400 text-sm mb-6">Take a moment before returning.</p>
                <button onClick={() => setSessionState("idle")}
                  className="px-8 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold rounded-xl hover:from-indigo-500 hover:to-purple-500 transition-all">
                  Done
                </button>
              </div>
            </div>
          )}

          {sessionState === "idle" ? (
            <>
              {/* Pattern selector */}
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-300 mb-3">Breathing Pattern</h2>
                <div className="grid grid-cols-2 gap-2">
                  {PATTERNS.map((p, i) => (
                    <button key={p.name} onClick={() => setSelectedPattern(i)}
                      className={`p-3 rounded-xl text-left transition-all ${
                        selectedPattern === i
                          ? "bg-indigo-600/30 border-indigo-500/50 border ring-1 ring-indigo-500/30"
                          : "bg-white/5 border border-white/10 hover:bg-white/10"
                      }`}>
                      <p className="text-sm font-semibold text-white">{p.name}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{p.desc}</p>
                      <p className="text-xs text-indigo-400 mt-1">
                        {p.inhale}s in{p.hold ? ` · ${p.hold}s hold` : ""} · {p.exhale}s out{p.holdOut ? ` · ${p.holdOut}s hold` : ""}
                      </p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div className="mb-6">
                <h2 className="text-sm font-semibold text-gray-300 mb-3">Duration</h2>
                <div className="flex gap-2">
                  {DURATIONS.map((d, i) => (
                    <button key={d.label} onClick={() => setSelectedDuration(i)}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-all ${
                        selectedDuration === i ? "bg-indigo-600 text-white" : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio guide toggle */}
              <div className="bg-white/5 rounded-xl border border-white/10 p-4 mb-6">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Audio Guide</h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Continuous tones guide each phase — close your eyes and follow the sound
                    </p>
                  </div>
                  <button onClick={() => setAudioGuide(!audioGuide)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium ${audioGuide ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-500"}`}>
                    {audioGuide ? "ON" : "OFF"}
                  </button>
                </div>
                {audioGuide && (
                  <div className="mt-3 space-y-2">
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="w-2 h-2 rounded-full bg-blue-400 inline-block" /> Inhale — rising tone, gradually louder
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" /> Hold — soft steady tone
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400">
                      <span className="w-2 h-2 rounded-full bg-teal-400 inline-block" /> Exhale — falling tone, gradually softer
                    </div>
                  </div>
                )}
              </div>

              {/* Volume */}
              {audioGuide && (
                <div className="flex items-center gap-2 mb-8 px-1">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6l-4 4H4v4h4l4 4V6z" />
                  </svg>
                  <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-lg" />
                  <span className="text-xs text-gray-400 w-8 text-right">{volume}%</span>
                </div>
              )}

              {/* Start */}
              <div className="text-center">
                <button onClick={handleStart}
                  className="px-12 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-lg font-bold rounded-2xl shadow-lg shadow-indigo-600/25 hover:from-indigo-500 hover:to-purple-500 transition-all hover:scale-105">
                  Begin Session
                </button>
              </div>
            </>
          ) : sessionState === "active" ? (
            <div className="flex flex-col items-center">
              <div className="text-sm text-gray-400 mb-2">{formatTime(displayTimeRemaining)} remaining</div>

              {/* Breathing circle */}
              <div className="relative w-72 h-72 flex items-center justify-center mb-8">
                <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10" />
                <div
                  className="rounded-full bg-gradient-to-br from-indigo-500/40 to-cyan-500/40 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all duration-1000 ease-in-out"
                  style={{ width: `${circleScale * 100}%`, height: `${circleScale * 100}%` }}
                >
                  <div className="text-center">
                    <p className="text-2xl font-bold text-white">{PHASE_LABELS[displayPhase]}</p>
                    <p className="text-4xl font-mono font-bold text-white/80 mt-1">
                      {displayPhaseDuration - displayPhaseTime}
                    </p>
                  </div>
                </div>
              </div>

              <p className="text-sm text-gray-400 mb-2">
                {pattern.name} · Cycle {displayCycleCount + 1}
              </p>

              <button onClick={handleStop}
                className="px-8 py-3 border border-white/20 text-gray-300 text-sm font-medium rounded-xl hover:bg-white/10 transition-all">
                End Session
              </button>
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
