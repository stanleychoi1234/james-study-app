export interface AmbientSound {
  name: string;
  emoji: string;
  create: (ctx: AudioContext) => { start: () => void; stop: () => void };
}

function createNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * seconds, sr);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function createBrownNoiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const buf = ctx.createBuffer(1, sr * seconds, sr);
  const data = buf.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    const white = Math.random() * 2 - 1;
    data[i] = (last + 0.02 * white) / 1.02;
    last = data[i];
    data[i] *= 3.5;
  }
  return buf;
}

function makeRain(ctx: AudioContext) {
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 4);
  noise.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1800;
  bp.Q.value = 0.5;
  const gain = ctx.createGain();
  gain.gain.value = 0.15;
  const drip = ctx.createBufferSource();
  drip.buffer = createBrownNoiseBuffer(ctx, 4);
  drip.loop = true;
  const dripBP = ctx.createBiquadFilter();
  dripBP.type = "bandpass";
  dripBP.frequency.value = 800;
  dripBP.Q.value = 2;
  const dripGain = ctx.createGain();
  dripGain.gain.value = 0.05;
  noise.connect(bp).connect(gain).connect(ctx.destination);
  drip.connect(dripBP).connect(dripGain).connect(ctx.destination);
  return {
    start: () => { noise.start(); drip.start(); },
    stop: () => { try { noise.stop(); } catch {} try { drip.stop(); } catch {} },
  };
}

function makeWind(ctx: AudioContext) {
  const noise = ctx.createBufferSource();
  noise.buffer = createBrownNoiseBuffer(ctx, 8);
  noise.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 400;
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.15;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 200;
  lfo.connect(lfoGain).connect(lp.frequency);
  const gain = ctx.createGain();
  gain.gain.value = 0.2;
  noise.connect(lp).connect(gain).connect(ctx.destination);
  return {
    start: () => { noise.start(); lfo.start(); },
    stop: () => { try { noise.stop(); } catch {} try { lfo.stop(); } catch {} },
  };
}

function makeWaves(ctx: AudioContext) {
  const noise = ctx.createBufferSource();
  noise.buffer = createBrownNoiseBuffer(ctx, 8);
  noise.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 300;
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.08;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.12;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.25;
  lfo.connect(lfoGain).connect(masterGain.gain);
  noise.connect(lp).connect(masterGain).connect(ctx.destination);
  return {
    start: () => { noise.start(); lfo.start(); },
    stop: () => { try { noise.stop(); } catch {} try { lfo.stop(); } catch {} },
  };
}

function makeForest(ctx: AudioContext) {
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 4);
  noise.loop = true;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 3000;
  bp.Q.value = 1.5;
  const gain = ctx.createGain();
  gain.gain.value = 0.04;
  const chirpOsc = ctx.createOscillator();
  chirpOsc.type = "sine";
  chirpOsc.frequency.value = 2200;
  const chirpGain = ctx.createGain();
  chirpGain.gain.value = 0;
  const chirpLfo = ctx.createOscillator();
  chirpLfo.type = "square";
  chirpLfo.frequency.value = 3;
  const chirpLfoGain = ctx.createGain();
  chirpLfoGain.gain.value = 0.02;
  chirpLfo.connect(chirpLfoGain).connect(chirpGain.gain);
  noise.connect(bp).connect(gain).connect(ctx.destination);
  chirpOsc.connect(chirpGain).connect(ctx.destination);
  return {
    start: () => { noise.start(); chirpOsc.start(); chirpLfo.start(); },
    stop: () => { try { noise.stop(); } catch {} try { chirpOsc.stop(); } catch {} try { chirpLfo.stop(); } catch {} },
  };
}

function makeZen(ctx: AudioContext) {
  const osc1 = ctx.createOscillator();
  osc1.type = "sine";
  osc1.frequency.value = 174;
  const osc2 = ctx.createOscillator();
  osc2.type = "sine";
  osc2.frequency.value = 261;
  const lfo = ctx.createOscillator();
  lfo.type = "sine";
  lfo.frequency.value = 0.05;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.03;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.06;
  lfo.connect(lfoGain).connect(masterGain.gain);
  osc1.connect(masterGain);
  osc2.connect(masterGain);
  masterGain.connect(ctx.destination);
  return {
    start: () => { osc1.start(); osc2.start(); lfo.start(); },
    stop: () => { try { osc1.stop(); } catch {} try { osc2.stop(); } catch {} try { lfo.stop(); } catch {} },
  };
}

function makeCafe(ctx: AudioContext) {
  const noise = ctx.createBufferSource();
  noise.buffer = createBrownNoiseBuffer(ctx, 6);
  noise.loop = true;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 600;
  const gain = ctx.createGain();
  gain.gain.value = 0.12;
  noise.connect(lp).connect(gain).connect(ctx.destination);
  return {
    start: () => { noise.start(); },
    stop: () => { try { noise.stop(); } catch {} },
  };
}

function makeFireplace(ctx: AudioContext) {
  const noise = ctx.createBufferSource();
  noise.buffer = createNoiseBuffer(ctx, 4);
  noise.loop = true;
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1000;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 4000;
  const lfo = ctx.createOscillator();
  lfo.type = "sawtooth";
  lfo.frequency.value = 8;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.08;
  const masterGain = ctx.createGain();
  masterGain.gain.value = 0.1;
  lfo.connect(lfoGain).connect(masterGain.gain);
  noise.connect(hp).connect(lp).connect(masterGain).connect(ctx.destination);
  return {
    start: () => { noise.start(); lfo.start(); },
    stop: () => { try { noise.stop(); } catch {} try { lfo.stop(); } catch {} },
  };
}

export const AMBIENT_SOUNDS: AmbientSound[] = [
  { name: "Rain", emoji: "\u{1F327}\u{FE0F}", create: makeRain },
  { name: "Wind", emoji: "\u{1F32C}\u{FE0F}", create: makeWind },
  { name: "Waves", emoji: "\u{1F30A}", create: makeWaves },
  { name: "Forest", emoji: "\u{1F333}", create: makeForest },
  { name: "Zen", emoji: "\u{1F9D8}", create: makeZen },
  { name: "Cafe", emoji: "\u{2615}", create: makeCafe },
  { name: "Fireplace", emoji: "\u{1F525}", create: makeFireplace },
];

export function playCompletionChime(ctx: AudioContext): void {
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, ctx.currentTime + i * 0.2);
    gain.gain.linearRampToValueAtTime(0.2, ctx.currentTime + i * 0.2 + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.2 + 0.8);
    osc.connect(gain).connect(ctx.destination);
    osc.start(ctx.currentTime + i * 0.2);
    osc.stop(ctx.currentTime + i * 0.2 + 0.8);
  });
}
