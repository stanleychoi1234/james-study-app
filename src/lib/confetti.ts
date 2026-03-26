// eslint-disable-next-line @typescript-eslint/no-explicit-any
let confettiModule: any = null;

async function getConfetti() {
  if (!confettiModule) {
    const mod = await import("canvas-confetti");
    confettiModule = mod.default || mod;
  }
  return confettiModule as (opts?: Record<string, unknown>) => void;
}

export async function fireSmallConfetti() {
  const confetti = await getConfetti();
  confetti({
    particleCount: 30,
    spread: 60,
    origin: { y: 0.7 },
    colors: ["#3b82f6", "#10b981", "#8b5cf6"],
    scalar: 0.8,
  });
}

export async function fireBigConfetti() {
  const confetti = await getConfetti();
  const duration = 2000;
  const end = Date.now() + duration;

  const frame = () => {
    confetti({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
      colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
    });
    confetti({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
      colors: ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"],
    });
    if (Date.now() < end) requestAnimationFrame(frame);
  };
  frame();

  // Play completion chime
  try {
    const ctx = new AudioContext();
    const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + i * 0.15);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.15 + 0.8);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime + i * 0.15);
      osc.stop(ctx.currentTime + i * 0.15 + 0.8);
    });
  } catch {}
}
