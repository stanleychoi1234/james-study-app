"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { MEDITATION_MUSIC } from "@/lib/ambient-audio";

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

export default function MeditatePage() {
  const [selectedPattern, setSelectedPattern] = useState(0);
  const [selectedDuration, setSelectedDuration] = useState(1); // 5 min default
  const [sessionState, setSessionState] = useState<SessionState>("idle");
  const [countdown, setCountdown] = useState(3);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [breathPhase, setBreathPhase] = useState<BreathPhase>("inhale");
  const [phaseTime, setPhaseTime] = useState(0); // seconds into current phase
  const [phaseDuration, setPhaseDuration] = useState(4); // total seconds for current phase
  const [cycleCount, setCycleCount] = useState(0);

  // Audio
  const [audioGuide, setAudioGuide] = useState(true);
  const [selectedMusic, setSelectedMusic] = useState<number | null>(null);
  const [musicEnabled, setMusicEnabled] = useState(false);
  const [volume, setVolume] = useState(40);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const masterGainRef = useRef<GainNode | null>(null);
  const musicInstanceRef = useRef<{ start: () => void; stop: () => void } | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pattern = PATTERNS[selectedPattern];
  const totalDuration = DURATIONS[selectedDuration].seconds;

  function getOrCreateAudioCtx() {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
      masterGainRef.current = audioCtxRef.current.createGain();
      masterGainRef.current.gain.value = volume / 100;
      masterGainRef.current.connect(audioCtxRef.current.destination);
    }
    return { ctx: audioCtxRef.current, gain: masterGainRef.current! };
  }

  // Play a soft tone for phase transitions (audio guide)
  const playPhaseTone = useCallback((phase: BreathPhase) => {
    if (!audioGuide) return;
    const { ctx } = getOrCreateAudioCtx();
    const freq = phase === "inhale" ? 440 : phase === "exhale" ? 330 : 392;
    const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, ctx.currentTime);
    g.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.1);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.6);
    osc.connect(g).connect(ctx.destination);
    osc.start(); osc.stop(ctx.currentTime + 0.6);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioGuide]);

  function stopMusic() {
    if (musicInstanceRef.current) { musicInstanceRef.current.stop(); musicInstanceRef.current = null; }
  }

  function startMusic() {
    if (!musicEnabled || selectedMusic === null) return;
    stopMusic();
    const { ctx, gain } = getOrCreateAudioCtx();
    const m = MEDITATION_MUSIC[selectedMusic];
    const instance = m.create(ctx, gain);
    instance.start();
    musicInstanceRef.current = instance;
  }

  // Update volume
  useEffect(() => {
    if (masterGainRef.current) masterGainRef.current.gain.value = volume / 100;
  }, [volume]);

  // Get the next breath phase
  function getNextPhase(current: BreathPhase): { phase: BreathPhase; duration: number } {
    const p = PATTERNS[selectedPattern];
    const all: { phase: BreathPhase; dur: number }[] = [
      { phase: "inhale" as BreathPhase, dur: p.inhale },
      { phase: "hold" as BreathPhase, dur: p.hold },
      { phase: "exhale" as BreathPhase, dur: p.exhale },
      { phase: "holdOut" as BreathPhase, dur: p.holdOut },
    ];
    const sequence = all.filter(s => s.dur > 0);

    const idx = sequence.findIndex(s => s.phase === current);
    const next = sequence[(idx + 1) % sequence.length];
    return { phase: next.phase, duration: next.dur };
  }

  // Countdown
  useEffect(() => {
    if (sessionState !== "countdown") return;
    if (countdown <= 0) {
      setSessionState("active");
      setTimeRemaining(totalDuration);
      setBreathPhase("inhale");
      setPhaseTime(0);
      setPhaseDuration(pattern.inhale);
      setCycleCount(0);
      playPhaseTone("inhale");
      startMusic();
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState, countdown]);

  // Main timer
  useEffect(() => {
    if (sessionState !== "active") return;

    timerRef.current = setInterval(() => {
      setTimeRemaining(prev => {
        if (prev <= 1) {
          setSessionState("finished");
          stopMusic();
          // Play completion sound
          if (audioCtxRef.current) {
            const ctx = audioCtxRef.current;
            [523.25, 659.25, 783.99].forEach((f, i) => {
              const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = f;
              const g = ctx.createGain();
              g.gain.setValueAtTime(0, ctx.currentTime + i*0.2);
              g.gain.linearRampToValueAtTime(0.1, ctx.currentTime + i*0.2 + 0.05);
              g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i*0.2 + 1.5);
              o.connect(g).connect(ctx.destination);
              o.start(ctx.currentTime + i*0.2); o.stop(ctx.currentTime + i*0.2 + 1.5);
            });
          }
          return 0;
        }
        return prev - 1;
      });

      setPhaseTime(prev => {
        const next = prev + 1;
        setPhaseDuration(dur => {
          if (next >= dur) {
            // Advance to next phase
            setBreathPhase(currentPhase => {
              const np = getNextPhase(currentPhase);
              setPhaseDuration(np.duration);
              playPhaseTone(np.phase);
              if (np.phase === "inhale") setCycleCount(c => c + 1);
              return np.phase;
            });
            return dur; // will be overwritten above
          }
          return dur;
        });
        return next >= phaseDuration ? 0 : next;
      });
    }, 1000);

    return () => { if (timerRef.current) clearInterval(timerRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionState, phaseDuration]);

  function handleStart() {
    setCountdown(3);
    setSessionState("countdown");
  }

  function handleStop() {
    setSessionState("idle");
    if (timerRef.current) clearInterval(timerRef.current);
    stopMusic();
  }

  // Visual breath circle - scale based on phase
  const breathProgress = phaseDuration > 0 ? phaseTime / phaseDuration : 0;
  let circleScale = 1;
  if (sessionState === "active") {
    if (breathPhase === "inhale") circleScale = 0.5 + breathProgress * 0.5; // grow from 50% to 100%
    else if (breathPhase === "exhale") circleScale = 1 - breathProgress * 0.5; // shrink from 100% to 50%
    else if (breathPhase === "hold") circleScale = 1; // full
    else circleScale = 0.5; // hold out - small
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
        {/* Background gradient that shifts with breath */}
        <div className={`absolute inset-0 bg-gradient-to-b ${
          sessionState === "active" ? PHASE_COLORS[breathPhase] : "from-indigo-950/50 to-gray-950"
        } transition-all duration-1000`} />

        <div className="relative z-10 max-w-xl mx-auto px-4 sm:px-6 py-8">
          {/* Header */}
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
                        selectedDuration === i
                          ? "bg-indigo-600 text-white"
                          : "bg-white/5 text-gray-400 hover:bg-white/10"
                      }`}>
                      {d.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Audio options */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
                {/* Voice guide */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">Audio Guide</h3>
                    <button onClick={() => setAudioGuide(!audioGuide)}
                      className={`text-xs px-2 py-1 rounded-full ${audioGuide ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-500"}`}>
                      {audioGuide ? "ON" : "OFF"}
                    </button>
                  </div>
                  <p className="text-xs text-gray-500">Soft tones on phase transitions</p>
                </div>

                {/* Music */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-sm font-semibold text-white">Calm Music</h3>
                    <button onClick={() => setMusicEnabled(!musicEnabled)}
                      className={`text-xs px-2 py-1 rounded-full ${musicEnabled ? "bg-green-500/20 text-green-400" : "bg-white/10 text-gray-500"}`}>
                      {musicEnabled ? "ON" : "OFF"}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {MEDITATION_MUSIC.map((m, i) => (
                      <button key={m.name} onClick={() => { setSelectedMusic(i); setMusicEnabled(true); }}
                        className={`px-2 py-1 text-xs rounded-lg ${
                          selectedMusic === i ? "bg-white/20 text-white ring-1 ring-white/30" : "bg-white/5 text-gray-400 hover:bg-white/10"
                        }`}>
                        {m.emoji} {m.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Volume */}
              {(audioGuide || musicEnabled) && (
                <div className="flex items-center gap-2 mb-8 px-1">
                  <svg className="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072M12 6l-4 4H4v4h4l4 4V6z" />
                  </svg>
                  <input type="range" min={0} max={100} value={volume} onChange={(e) => setVolume(Number(e.target.value))}
                    className="flex-1 h-1.5 bg-white/10 rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white" />
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
            <>
              {/* Active breathing session */}
              <div className="flex flex-col items-center">
                {/* Time remaining */}
                <div className="text-sm text-gray-400 mb-2">{formatTime(timeRemaining)} remaining</div>

                {/* Breathing circle */}
                <div className="relative w-72 h-72 flex items-center justify-center mb-8">
                  {/* Outer glow */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-br from-indigo-500/10 to-purple-500/10" />

                  {/* Breathing circle */}
                  <div
                    className="rounded-full bg-gradient-to-br from-indigo-500/40 to-cyan-500/40 backdrop-blur-sm border border-white/20 flex items-center justify-center transition-all duration-1000 ease-in-out"
                    style={{
                      width: `${circleScale * 100}%`,
                      height: `${circleScale * 100}%`,
                    }}
                  >
                    <div className="text-center">
                      <p className="text-2xl font-bold text-white">{PHASE_LABELS[breathPhase]}</p>
                      <p className="text-4xl font-mono font-bold text-white/80 mt-1">
                        {phaseDuration - phaseTime}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Pattern info */}
                <p className="text-sm text-gray-400 mb-2">
                  {pattern.name} · Cycle {cycleCount + 1}
                </p>

                {/* Stop button */}
                <button onClick={handleStop}
                  className="px-8 py-3 border border-white/20 text-gray-300 text-sm font-medium rounded-xl hover:bg-white/10 transition-all">
                  End Session
                </button>
              </div>
            </>
          ) : null}
        </div>
      </main>
      <Footer dark />
    </div>
  );
}
