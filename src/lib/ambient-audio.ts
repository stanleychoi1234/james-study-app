// High-quality Web Audio API ambient sound generators.
// Each sound uses multiple layered noise sources with careful filtering
// to create rich, natural-sounding environments.
// All sounds route through a returned GainNode for external volume control.

export interface AmbientSound {
  name: string;
  emoji: string;
  create: (ctx: AudioContext, masterGain: GainNode) => { start: () => void; stop: () => void };
}

function whiteNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = sr * seconds;
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function pinkNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = sr * seconds;
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + w * 0.0555179;
      b1 = 0.99332 * b1 + w * 0.0750759;
      b2 = 0.96900 * b2 + w * 0.1538520;
      b3 = 0.86650 * b3 + w * 0.3104856;
      b4 = 0.55000 * b4 + w * 0.5329522;
      b5 = -0.7616 * b5 - w * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
      b6 = w * 0.115926;
    }
  }
  return buf;
}

function brownNoise(ctx: AudioContext, seconds: number): AudioBuffer {
  const sr = ctx.sampleRate;
  const len = sr * seconds;
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const data = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      data[i] = (last + 0.02 * w) / 1.02;
      last = data[i];
      data[i] *= 3.5;
    }
  }
  return buf;
}

function noiseSrc(ctx: AudioContext, buffer: AudioBuffer): AudioBufferSourceNode {
  const src = ctx.createBufferSource();
  src.buffer = buffer;
  src.loop = true;
  return src;
}

const stops: (() => void)[] = [];
function safestop(nodes: (AudioBufferSourceNode | OscillatorNode)[]) {
  return () => { nodes.forEach((n) => { try { n.stop(); } catch {} }); };
}

// -- RAIN: Layered white + pink noise with bandpass + subtle drip texture --
function makeRain(ctx: AudioContext, out: GainNode) {
  const wBuf = whiteNoise(ctx, 4);
  const pBuf = pinkNoise(ctx, 4);

  // Main rain layer - wide bandpass white noise
  const rain1 = noiseSrc(ctx, wBuf);
  const bp1 = ctx.createBiquadFilter(); bp1.type = "bandpass"; bp1.frequency.value = 2500; bp1.Q.value = 0.3;
  const g1 = ctx.createGain(); g1.gain.value = 0.22;

  // Lower rumble layer
  const rain2 = noiseSrc(ctx, pBuf);
  const lp2 = ctx.createBiquadFilter(); lp2.type = "lowpass"; lp2.frequency.value = 800;
  const g2 = ctx.createGain(); g2.gain.value = 0.15;

  // High sparkle layer (droplets)
  const rain3 = noiseSrc(ctx, wBuf);
  const hp3 = ctx.createBiquadFilter(); hp3.type = "highpass"; hp3.frequency.value = 5000;
  const g3 = ctx.createGain(); g3.gain.value = 0.06;
  // Modulate sparkle
  const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.3;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.04;
  lfo.connect(lfoG).connect(g3.gain);

  rain1.connect(bp1).connect(g1).connect(out);
  rain2.connect(lp2).connect(g2).connect(out);
  rain3.connect(hp3).connect(g3).connect(out);

  return { start: () => { rain1.start(); rain2.start(); rain3.start(); lfo.start(); }, stop: safestop([rain1, rain2, rain3, lfo]) };
}

// -- WIND: Brown noise with slow sweeping filter --
function makeWind(ctx: AudioContext, out: GainNode) {
  const bBuf = brownNoise(ctx, 8);

  const wind1 = noiseSrc(ctx, bBuf);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 500; lp.Q.value = 1;
  const g1 = ctx.createGain(); g1.gain.value = 0.3;

  // Slow sweep
  const lfo1 = ctx.createOscillator(); lfo1.type = "sine"; lfo1.frequency.value = 0.08;
  const lfo1G = ctx.createGain(); lfo1G.gain.value = 300;
  lfo1.connect(lfo1G).connect(lp.frequency);

  // Higher whistling layer
  const wind2 = noiseSrc(ctx, bBuf);
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1200; bp.Q.value = 3;
  const g2 = ctx.createGain(); g2.gain.value = 0.04;
  const lfo2 = ctx.createOscillator(); lfo2.type = "sine"; lfo2.frequency.value = 0.12;
  const lfo2G = ctx.createGain(); lfo2G.gain.value = 400;
  lfo2.connect(lfo2G).connect(bp.frequency);

  wind1.connect(lp).connect(g1).connect(out);
  wind2.connect(bp).connect(g2).connect(out);

  return { start: () => { wind1.start(); wind2.start(); lfo1.start(); lfo2.start(); }, stop: safestop([wind1, wind2, lfo1, lfo2]) };
}

// -- WAVES: Rhythmic brown noise with slow amplitude modulation --
function makeWaves(ctx: AudioContext, out: GainNode) {
  const bBuf = brownNoise(ctx, 8);

  const wave1 = noiseSrc(ctx, bBuf);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 400;
  const g1 = ctx.createGain(); g1.gain.value = 0.3;
  // Rhythmic swell
  const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.1;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.15;
  lfo.connect(lfoG).connect(g1.gain);

  // Foam/hiss layer
  const wave2 = noiseSrc(ctx, whiteNoise(ctx, 4));
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 3000; bp.Q.value = 0.5;
  const g2 = ctx.createGain(); g2.gain.value = 0.0;
  // Only hear foam at wave peak
  const lfo2 = ctx.createOscillator(); lfo2.type = "sine"; lfo2.frequency.value = 0.1;
  const lfo2G = ctx.createGain(); lfo2G.gain.value = 0.08;
  lfo2.connect(lfo2G).connect(g2.gain);

  wave1.connect(lp).connect(g1).connect(out);
  wave2.connect(bp).connect(g2).connect(out);

  return { start: () => { wave1.start(); wave2.start(); lfo.start(); lfo2.start(); }, stop: safestop([wave1, wave2, lfo, lfo2]) };
}

// -- FOREST: Pink noise bed with layered bird-like tones --
function makeForest(ctx: AudioContext, out: GainNode) {
  const pBuf = pinkNoise(ctx, 6);

  // Ambient bed
  const bed = noiseSrc(ctx, pBuf);
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2000; bp.Q.value = 0.4;
  const gBed = ctx.createGain(); gBed.gain.value = 0.08;

  // Low rustle
  const rustle = noiseSrc(ctx, brownNoise(ctx, 4));
  const lpR = ctx.createBiquadFilter(); lpR.type = "lowpass"; lpR.frequency.value = 300;
  const gR = ctx.createGain(); gR.gain.value = 0.1;

  // Bird chirps (multiple oscillators for variety)
  const birds: (AudioBufferSourceNode | OscillatorNode)[] = [];
  const birdFreqs = [2800, 3400, 4200];
  birdFreqs.forEach((freq) => {
    const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
    const gB = ctx.createGain(); gB.gain.value = 0;
    // Rhythmic chirp via LFO
    const chirpLfo = ctx.createOscillator(); chirpLfo.type = "square";
    chirpLfo.frequency.value = 2 + Math.random() * 3;
    const chirpG = ctx.createGain(); chirpG.gain.value = 0.012;
    chirpLfo.connect(chirpG).connect(gB.gain);
    osc.connect(gB).connect(out);
    birds.push(osc, chirpLfo);
  });

  bed.connect(bp).connect(gBed).connect(out);
  rustle.connect(lpR).connect(gR).connect(out);

  return {
    start: () => { bed.start(); rustle.start(); birds.forEach((b) => b.start()); },
    stop: safestop([bed, rustle, ...birds]),
  };
}

// -- ZEN: Soft drone with harmonic overtones --
function makeZen(ctx: AudioContext, out: GainNode) {
  const fundamentals = [174, 261, 348]; // D3, C4, F4 - peaceful chord
  const nodes: OscillatorNode[] = [];

  fundamentals.forEach((freq, i) => {
    const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = 0.04 - i * 0.008;
    osc.connect(g).connect(out);
    nodes.push(osc);
  });

  // Slow vibrato
  const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.03;
  const lfoG = ctx.createGain(); lfoG.gain.value = 2;
  nodes.forEach((osc) => { const lg = ctx.createGain(); lg.gain.value = 2; lfo.connect(lg).connect(osc.frequency); });

  // Soft pad noise bed
  const pad = noiseSrc(ctx, pinkNoise(ctx, 6));
  const padLP = ctx.createBiquadFilter(); padLP.type = "lowpass"; padLP.frequency.value = 200;
  const padG = ctx.createGain(); padG.gain.value = 0.06;
  pad.connect(padLP).connect(padG).connect(out);
  nodes.push(lfo as unknown as OscillatorNode);

  return { start: () => { nodes.forEach((n) => n.start()); pad.start(); }, stop: safestop([...nodes, pad]) };
}

// -- CAFE: Brown noise murmur + subtle clinking --
function makeCafe(ctx: AudioContext, out: GainNode) {
  const bBuf = brownNoise(ctx, 6);

  // Murmur layer
  const murmur = noiseSrc(ctx, bBuf);
  const bp1 = ctx.createBiquadFilter(); bp1.type = "bandpass"; bp1.frequency.value = 400; bp1.Q.value = 0.8;
  const g1 = ctx.createGain(); g1.gain.value = 0.18;

  // Higher murmur
  const murmur2 = noiseSrc(ctx, pinkNoise(ctx, 4));
  const bp2 = ctx.createBiquadFilter(); bp2.type = "bandpass"; bp2.frequency.value = 1200; bp2.Q.value = 1;
  const g2 = ctx.createGain(); g2.gain.value = 0.05;
  const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.2;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.03;
  lfo.connect(lfoG).connect(g2.gain);

  // Subtle clink texture
  const clink = noiseSrc(ctx, whiteNoise(ctx, 2));
  const hpC = ctx.createBiquadFilter(); hpC.type = "highpass"; hpC.frequency.value = 6000;
  const gC = ctx.createGain(); gC.gain.value = 0.0;
  const clinkLfo = ctx.createOscillator(); clinkLfo.type = "square"; clinkLfo.frequency.value = 0.5;
  const clinkG = ctx.createGain(); clinkG.gain.value = 0.008;
  clinkLfo.connect(clinkG).connect(gC.gain);
  clink.connect(hpC).connect(gC).connect(out);

  murmur.connect(bp1).connect(g1).connect(out);
  murmur2.connect(bp2).connect(g2).connect(out);

  return { start: () => { murmur.start(); murmur2.start(); clink.start(); lfo.start(); clinkLfo.start(); }, stop: safestop([murmur, murmur2, clink, lfo, clinkLfo]) };
}

// -- FIREPLACE: Layered crackling with warm low base --
function makeFireplace(ctx: AudioContext, out: GainNode) {
  // Warm base
  const base = noiseSrc(ctx, brownNoise(ctx, 4));
  const lpBase = ctx.createBiquadFilter(); lpBase.type = "lowpass"; lpBase.frequency.value = 250;
  const gBase = ctx.createGain(); gBase.gain.value = 0.2;

  // Crackle layer 1
  const crackle1 = noiseSrc(ctx, whiteNoise(ctx, 2));
  const bp1 = ctx.createBiquadFilter(); bp1.type = "bandpass"; bp1.frequency.value = 2000; bp1.Q.value = 1;
  const g1 = ctx.createGain(); g1.gain.value = 0.0;
  const lfo1 = ctx.createOscillator(); lfo1.type = "sawtooth"; lfo1.frequency.value = 6;
  const lfo1G = ctx.createGain(); lfo1G.gain.value = 0.06;
  lfo1.connect(lfo1G).connect(g1.gain);

  // Crackle layer 2 (higher, sparser)
  const crackle2 = noiseSrc(ctx, whiteNoise(ctx, 2));
  const bp2 = ctx.createBiquadFilter(); bp2.type = "bandpass"; bp2.frequency.value = 5000; bp2.Q.value = 2;
  const g2 = ctx.createGain(); g2.gain.value = 0.0;
  const lfo2 = ctx.createOscillator(); lfo2.type = "square"; lfo2.frequency.value = 3;
  const lfo2G = ctx.createGain(); lfo2G.gain.value = 0.03;
  lfo2.connect(lfo2G).connect(g2.gain);

  base.connect(lpBase).connect(gBase).connect(out);
  crackle1.connect(bp1).connect(g1).connect(out);
  crackle2.connect(bp2).connect(g2).connect(out);

  return { start: () => { base.start(); crackle1.start(); crackle2.start(); lfo1.start(); lfo2.start(); }, stop: safestop([base, crackle1, crackle2, lfo1, lfo2]) };
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
  // Pleasant 4-note ascending chime with reverb-like decay
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5, E5, G5, C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + i * 0.15;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.15, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.connect(g).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + 1.2);
  });
}
