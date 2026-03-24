// High-quality Web Audio API ambient sound generators.
// Uses sophisticated layered synthesis with careful filtering and modulation.

export interface AmbientSound {
  name: string;
  emoji: string;
  create: (ctx: AudioContext, out: GainNode) => { start: () => void; stop: () => void };
}

// --- Noise buffer generators (stereo, long buffers for natural variation) ---

function whiteNoise(ctx: AudioContext, sec: number): AudioBuffer {
  const sr = ctx.sampleRate, len = sr * sec;
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }
  return buf;
}

function pinkNoise(ctx: AudioContext, sec: number): AudioBuffer {
  const sr = ctx.sampleRate, len = sr * sec;
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let b0=0,b1=0,b2=0,b3=0,b4=0,b5=0,b6=0;
    for (let i = 0; i < len; i++) {
      const w = Math.random() * 2 - 1;
      b0=0.99886*b0+w*0.0555179; b1=0.99332*b1+w*0.0750759;
      b2=0.96900*b2+w*0.1538520; b3=0.86650*b3+w*0.3104856;
      b4=0.55000*b4+w*0.5329522; b5=-0.7616*b5-w*0.0168980;
      d[i]=(b0+b1+b2+b3+b4+b5+b6+w*0.5362)*0.11;
      b6=w*0.115926;
    }
  }
  return buf;
}

function brownNoise(ctx: AudioContext, sec: number): AudioBuffer {
  const sr = ctx.sampleRate, len = sr * sec;
  const buf = ctx.createBuffer(2, len, sr);
  for (let ch = 0; ch < 2; ch++) {
    const d = buf.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < len; i++) {
      d[i] = (last + 0.02 * (Math.random()*2-1)) / 1.02;
      last = d[i]; d[i] *= 3.5;
    }
  }
  return buf;
}

function src(ctx: AudioContext, buf: AudioBuffer) {
  const s = ctx.createBufferSource(); s.buffer = buf; s.loop = true; return s;
}

type Node = AudioBufferSourceNode | OscillatorNode;
function safestop(nodes: Node[]) {
  return () => nodes.forEach(n => { try { n.stop(); } catch {} });
}

// ===== RAIN: Gentle light rain with soft pattering =====
function makeRain(ctx: AudioContext, out: GainNode) {
  const nodes: Node[] = [];

  // Soft rain bed - pink noise, gentle bandpass
  const bed = src(ctx, pinkNoise(ctx, 6));
  const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 2000; bp.Q.value = 0.2;
  const gBed = ctx.createGain(); gBed.gain.value = 0.08;
  bed.connect(bp).connect(gBed).connect(out);
  nodes.push(bed);

  // Very soft low rumble
  const rumble = src(ctx, brownNoise(ctx, 6));
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 250;
  const gR = ctx.createGain(); gR.gain.value = 0.04;
  rumble.connect(lp).connect(gR).connect(out);
  nodes.push(rumble);

  // Gentle high sparkle (individual drops)
  const drops = src(ctx, whiteNoise(ctx, 4));
  const hpD = ctx.createBiquadFilter(); hpD.type = "highpass"; hpD.frequency.value = 6000;
  const gD = ctx.createGain(); gD.gain.value = 0.015;
  // Slow modulation for natural variation
  const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.15;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.01;
  lfo.connect(lfoG).connect(gD.gain);
  drops.connect(hpD).connect(gD).connect(out);
  nodes.push(drops, lfo);

  return { start: () => nodes.forEach(n => n.start()), stop: safestop(nodes) };
}

// ===== WIND: Gentle breeze with slow sweeping =====
function makeWind(ctx: AudioContext, out: GainNode) {
  const nodes: Node[] = [];

  const wind = src(ctx, brownNoise(ctx, 10));
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 350; lp.Q.value = 0.8;
  const g = ctx.createGain(); g.gain.value = 0.2;
  // Very slow sweep for natural wind gusts
  const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.06;
  const lfoG = ctx.createGain(); lfoG.gain.value = 200;
  lfo.connect(lfoG).connect(lp.frequency);
  wind.connect(lp).connect(g).connect(out);
  nodes.push(wind, lfo);

  // Soft whistle
  const whistle = src(ctx, pinkNoise(ctx, 8));
  const bpW = ctx.createBiquadFilter(); bpW.type = "bandpass"; bpW.frequency.value = 1000; bpW.Q.value = 4;
  const gW = ctx.createGain(); gW.gain.value = 0.012;
  const lfo2 = ctx.createOscillator(); lfo2.type = "sine"; lfo2.frequency.value = 0.04;
  const lfo2G = ctx.createGain(); lfo2G.gain.value = 300;
  lfo2.connect(lfo2G).connect(bpW.frequency);
  whistle.connect(bpW).connect(gW).connect(out);
  nodes.push(whistle, lfo2);

  return { start: () => nodes.forEach(n => n.start()), stop: safestop(nodes) };
}

// ===== WAVES: Slow rhythmic ocean with long 8-12s cycles =====
function makeWaves(ctx: AudioContext, out: GainNode) {
  const nodes: Node[] = [];

  // Deep ocean rumble
  const deep = src(ctx, brownNoise(ctx, 10));
  const lpD = ctx.createBiquadFilter(); lpD.type = "lowpass"; lpD.frequency.value = 200;
  const gD = ctx.createGain(); gD.gain.value = 0.2;
  // Very slow swell - ~10 second cycle
  const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.05;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.12;
  lfo.connect(lfoG).connect(gD.gain);
  deep.connect(lpD).connect(gD).connect(out);
  nodes.push(deep, lfo);

  // Mid wash
  const wash = src(ctx, pinkNoise(ctx, 8));
  const bpW = ctx.createBiquadFilter(); bpW.type = "bandpass"; bpW.frequency.value = 600; bpW.Q.value = 0.3;
  const gW = ctx.createGain(); gW.gain.value = 0.06;
  // Slightly offset cycle for complexity
  const lfo2 = ctx.createOscillator(); lfo2.type = "sine"; lfo2.frequency.value = 0.055;
  const lfo2G = ctx.createGain(); lfo2G.gain.value = 0.04;
  lfo2.connect(lfo2G).connect(gW.gain);
  wash.connect(bpW).connect(gW).connect(out);
  nodes.push(wash, lfo2);

  // Foam hiss (only at wave peaks, very subtle)
  const foam = src(ctx, whiteNoise(ctx, 4));
  const hpF = ctx.createBiquadFilter(); hpF.type = "highpass"; hpF.frequency.value = 4000;
  const gF = ctx.createGain(); gF.gain.value = 0.0;
  const lfo3 = ctx.createOscillator(); lfo3.type = "sine"; lfo3.frequency.value = 0.05;
  const lfo3G = ctx.createGain(); lfo3G.gain.value = 0.025;
  lfo3.connect(lfo3G).connect(gF.gain);
  foam.connect(hpF).connect(gF).connect(out);
  nodes.push(foam, lfo3);

  return { start: () => nodes.forEach(n => n.start()), stop: safestop(nodes) };
}

// ===== FOREST: Ambient bed with realistic bird chirps =====
function makeForest(ctx: AudioContext, out: GainNode) {
  const nodes: Node[] = [];

  // Gentle ambient bed (wind through leaves)
  const bed = src(ctx, pinkNoise(ctx, 8));
  const bpBed = ctx.createBiquadFilter(); bpBed.type = "bandpass"; bpBed.frequency.value = 1500; bpBed.Q.value = 0.3;
  const gBed = ctx.createGain(); gBed.gain.value = 0.03;
  bed.connect(bpBed).connect(gBed).connect(out);
  nodes.push(bed);

  // Low rustle
  const rustle = src(ctx, brownNoise(ctx, 6));
  const lpR = ctx.createBiquadFilter(); lpR.type = "lowpass"; lpR.frequency.value = 200;
  const gR = ctx.createGain(); gR.gain.value = 0.06;
  rustle.connect(lpR).connect(gR).connect(out);
  nodes.push(rustle);

  // Bird chirps - multiple oscillators with frequency sweeps and rhythmic gating
  // Bird 1: High tweet (robin-like) - rapid frequency sweep
  const bird1 = ctx.createOscillator(); bird1.type = "sine"; bird1.frequency.value = 3200;
  const bird1G = ctx.createGain(); bird1G.gain.value = 0;
  // Gate with slow irregular rhythm
  const gate1 = ctx.createOscillator(); gate1.type = "square"; gate1.frequency.value = 0.4;
  const gateG1 = ctx.createGain(); gateG1.gain.value = 0.015;
  gate1.connect(gateG1).connect(bird1G.gain);
  // Frequency warble
  const warble1 = ctx.createOscillator(); warble1.type = "sine"; warble1.frequency.value = 8;
  const warbleG1 = ctx.createGain(); warbleG1.gain.value = 300;
  warble1.connect(warbleG1).connect(bird1.frequency);
  bird1.connect(bird1G).connect(out);
  nodes.push(bird1, gate1, warble1);

  // Bird 2: Lower warbler - different rhythm
  const bird2 = ctx.createOscillator(); bird2.type = "sine"; bird2.frequency.value = 2400;
  const bird2G = ctx.createGain(); bird2G.gain.value = 0;
  const gate2 = ctx.createOscillator(); gate2.type = "square"; gate2.frequency.value = 0.25;
  const gateG2 = ctx.createGain(); gateG2.gain.value = 0.012;
  gate2.connect(gateG2).connect(bird2G.gain);
  const warble2 = ctx.createOscillator(); warble2.type = "sine"; warble2.frequency.value = 5;
  const warbleG2 = ctx.createGain(); warbleG2.gain.value = 200;
  warble2.connect(warbleG2).connect(bird2.frequency);
  bird2.connect(bird2G).connect(out);
  nodes.push(bird2, gate2, warble2);

  // Bird 3: High trill
  const bird3 = ctx.createOscillator(); bird3.type = "triangle"; bird3.frequency.value = 4500;
  const bird3G = ctx.createGain(); bird3G.gain.value = 0;
  const gate3 = ctx.createOscillator(); gate3.type = "square"; gate3.frequency.value = 0.15;
  const gateG3 = ctx.createGain(); gateG3.gain.value = 0.008;
  gate3.connect(gateG3).connect(bird3G.gain);
  const warble3 = ctx.createOscillator(); warble3.type = "sine"; warble3.frequency.value = 12;
  const warbleG3 = ctx.createGain(); warbleG3.gain.value = 500;
  warble3.connect(warbleG3).connect(bird3.frequency);
  bird3.connect(bird3G).connect(out);
  nodes.push(bird3, gate3, warble3);

  return { start: () => nodes.forEach(n => n.start()), stop: safestop(nodes) };
}

// ===== ZEN: Tibetan singing bowl with slow fade and rhythmic return =====
function makeZen(ctx: AudioContext, out: GainNode) {
  const nodes: Node[] = [];

  // Singing bowl fundamentals with slow beating
  const bowlFreqs = [261.6, 392, 523.25]; // C4, G4, C5
  bowlFreqs.forEach((freq, i) => {
    const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = 0;

    // Rhythmic envelope: swell up slowly, ring, fade out, pause, repeat
    // Use a very slow triangle wave (~0.05 Hz = 20 second cycle)
    const env = ctx.createOscillator(); env.type = "sine";
    env.frequency.value = 0.04 + i * 0.005; // Slightly different rates for beating
    const envG = ctx.createGain(); envG.gain.value = 0.025 - i * 0.005;
    env.connect(envG).connect(g.gain);

    osc.connect(g).connect(out);
    nodes.push(osc, env);
  });

  // Soft pad drone underneath
  const pad = src(ctx, pinkNoise(ctx, 8));
  const padLP = ctx.createBiquadFilter(); padLP.type = "lowpass"; padLP.frequency.value = 150;
  const padG = ctx.createGain(); padG.gain.value = 0.04;
  pad.connect(padLP).connect(padG).connect(out);
  nodes.push(pad);

  return { start: () => nodes.forEach(n => n.start()), stop: safestop(nodes) };
}

// ===== CAFE: Background murmur with subtle chatter texture =====
function makeCafe(ctx: AudioContext, out: GainNode) {
  const nodes: Node[] = [];

  // Base murmur - brown noise through vocal-range bandpass
  const murmur1 = src(ctx, brownNoise(ctx, 8));
  const bp1 = ctx.createBiquadFilter(); bp1.type = "bandpass"; bp1.frequency.value = 350; bp1.Q.value = 0.6;
  const g1 = ctx.createGain(); g1.gain.value = 0.12;
  murmur1.connect(bp1).connect(g1).connect(out);
  nodes.push(murmur1);

  // Higher chatter layer - multiple formant-like bandpasses for voice-like quality
  const chatter1 = src(ctx, pinkNoise(ctx, 6));
  const bpC1 = ctx.createBiquadFilter(); bpC1.type = "bandpass"; bpC1.frequency.value = 800; bpC1.Q.value = 2;
  const gC1 = ctx.createGain(); gC1.gain.value = 0.0;
  // Irregular modulation (simulates conversation rhythm)
  const chatLfo1 = ctx.createOscillator(); chatLfo1.type = "sine"; chatLfo1.frequency.value = 0.7;
  const chatLfoG1 = ctx.createGain(); chatLfoG1.gain.value = 0.02;
  chatLfo1.connect(chatLfoG1).connect(gC1.gain);
  chatter1.connect(bpC1).connect(gC1).connect(out);
  nodes.push(chatter1, chatLfo1);

  // Second chatter at different frequency (different "voice")
  const chatter2 = src(ctx, pinkNoise(ctx, 6));
  const bpC2 = ctx.createBiquadFilter(); bpC2.type = "bandpass"; bpC2.frequency.value = 1200; bpC2.Q.value = 2.5;
  const gC2 = ctx.createGain(); gC2.gain.value = 0.0;
  const chatLfo2 = ctx.createOscillator(); chatLfo2.type = "sine"; chatLfo2.frequency.value = 0.5;
  const chatLfoG2 = ctx.createGain(); chatLfoG2.gain.value = 0.015;
  chatLfo2.connect(chatLfoG2).connect(gC2.gain);
  chatter2.connect(bpC2).connect(gC2).connect(out);
  nodes.push(chatter2, chatLfo2);

  // Distant clinking (cup/spoon)
  const clink = src(ctx, whiteNoise(ctx, 2));
  const hpCl = ctx.createBiquadFilter(); hpCl.type = "highpass"; hpCl.frequency.value = 5000;
  const gCl = ctx.createGain(); gCl.gain.value = 0.0;
  const clinkLfo = ctx.createOscillator(); clinkLfo.type = "square"; clinkLfo.frequency.value = 0.3;
  const clinkG = ctx.createGain(); clinkG.gain.value = 0.004;
  clinkLfo.connect(clinkG).connect(gCl.gain);
  clink.connect(hpCl).connect(gCl).connect(out);
  nodes.push(clink, clinkLfo);

  // Occasional low rumble (traffic/door)
  const traffic = src(ctx, brownNoise(ctx, 10));
  const lpT = ctx.createBiquadFilter(); lpT.type = "lowpass"; lpT.frequency.value = 120;
  const gT = ctx.createGain(); gT.gain.value = 0.0;
  const tLfo = ctx.createOscillator(); tLfo.type = "sine"; tLfo.frequency.value = 0.08;
  const tLfoG = ctx.createGain(); tLfoG.gain.value = 0.04;
  tLfo.connect(tLfoG).connect(gT.gain);
  traffic.connect(lpT).connect(gT).connect(out);
  nodes.push(traffic, tLfo);

  return { start: () => nodes.forEach(n => n.start()), stop: safestop(nodes) };
}

// ===== FIREPLACE: Warm base with realistic crackling =====
function makeFireplace(ctx: AudioContext, out: GainNode) {
  const nodes: Node[] = [];

  // Warm low fire base
  const base = src(ctx, brownNoise(ctx, 6));
  const lpB = ctx.createBiquadFilter(); lpB.type = "lowpass"; lpB.frequency.value = 200;
  const gB = ctx.createGain(); gB.gain.value = 0.15;
  // Slow breathing of fire
  const fireLfo = ctx.createOscillator(); fireLfo.type = "sine"; fireLfo.frequency.value = 0.07;
  const fireLfoG = ctx.createGain(); fireLfoG.gain.value = 0.05;
  fireLfo.connect(fireLfoG).connect(gB.gain);
  base.connect(lpB).connect(gB).connect(out);
  nodes.push(base, fireLfo);

  // Crackle layer 1 - irregular pops (slow rate)
  const crack1 = src(ctx, whiteNoise(ctx, 3));
  const bpCr1 = ctx.createBiquadFilter(); bpCr1.type = "bandpass"; bpCr1.frequency.value = 3000; bpCr1.Q.value = 1.5;
  const gCr1 = ctx.createGain(); gCr1.gain.value = 0.0;
  // Irregular crackling rhythm
  const crLfo1 = ctx.createOscillator(); crLfo1.type = "sawtooth"; crLfo1.frequency.value = 2;
  const crLfoG1 = ctx.createGain(); crLfoG1.gain.value = 0.035;
  crLfo1.connect(crLfoG1).connect(gCr1.gain);
  crack1.connect(bpCr1).connect(gCr1).connect(out);
  nodes.push(crack1, crLfo1);

  // Crackle layer 2 - higher, sparser (wood snapping)
  const crack2 = src(ctx, whiteNoise(ctx, 2));
  const bpCr2 = ctx.createBiquadFilter(); bpCr2.type = "bandpass"; bpCr2.frequency.value = 6000; bpCr2.Q.value = 2;
  const gCr2 = ctx.createGain(); gCr2.gain.value = 0.0;
  const crLfo2 = ctx.createOscillator(); crLfo2.type = "square"; crLfo2.frequency.value = 0.5;
  const crLfoG2 = ctx.createGain(); crLfoG2.gain.value = 0.015;
  crLfo2.connect(crLfoG2).connect(gCr2.gain);
  crack2.connect(bpCr2).connect(gCr2).connect(out);
  nodes.push(crack2, crLfo2);

  // Mid-range warmth
  const mid = src(ctx, pinkNoise(ctx, 4));
  const bpM = ctx.createBiquadFilter(); bpM.type = "bandpass"; bpM.frequency.value = 500; bpM.Q.value = 0.5;
  const gM = ctx.createGain(); gM.gain.value = 0.04;
  mid.connect(bpM).connect(gM).connect(out);
  nodes.push(mid);

  return { start: () => nodes.forEach(n => n.start()), stop: safestop(nodes) };
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
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
    const g = ctx.createGain();
    const t = ctx.currentTime + i * 0.15;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.15, t + 0.03);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);
    osc.connect(g).connect(ctx.destination);
    osc.start(t); osc.stop(t + 1.2);
  });
}

// --- Meditation calm music generators ---
export interface MeditationMusic {
  name: string;
  emoji: string;
  create: (ctx: AudioContext, out: GainNode) => { start: () => void; stop: () => void };
}

// Meditation Music 1: Soft drone pad
function makeDronePad(ctx: AudioContext, out: GainNode) {
  const nodes: Node[] = [];
  // Warm C major chord drone
  [130.81, 164.81, 196].forEach((freq, i) => {
    const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = 0.04 - i * 0.008;
    // Very slow vibrato
    const vib = ctx.createOscillator(); vib.type = "sine"; vib.frequency.value = 0.02 + i * 0.01;
    const vibG = ctx.createGain(); vibG.gain.value = 1;
    vib.connect(vibG).connect(osc.frequency);
    osc.connect(g).connect(out);
    nodes.push(osc, vib);
  });
  // Soft noise bed
  const bed = src(ctx, pinkNoise(ctx, 8));
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 100;
  const gB = ctx.createGain(); gB.gain.value = 0.03;
  bed.connect(lp).connect(gB).connect(out);
  nodes.push(bed);
  return { start: () => nodes.forEach(n => n.start()), stop: safestop(nodes) };
}

// Meditation Music 2: Singing bowls
function makeSingingBowls(ctx: AudioContext, out: GainNode) {
  const nodes: Node[] = [];
  const bowls = [174, 285, 396, 528]; // Solfeggio frequencies
  bowls.forEach((freq, i) => {
    const osc = ctx.createOscillator(); osc.type = "sine"; osc.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = 0;
    // Each bowl rings at different slow rhythms
    const env = ctx.createOscillator(); env.type = "sine";
    env.frequency.value = 0.03 + i * 0.008;
    const envG = ctx.createGain(); envG.gain.value = 0.02 - i * 0.003;
    env.connect(envG).connect(g.gain);
    osc.connect(g).connect(out);
    nodes.push(osc, env);
  });
  return { start: () => nodes.forEach(n => n.start()), stop: safestop(nodes) };
}

// Meditation Music 3: Ocean drone (binaural-like)
function makeOceanDrone(ctx: AudioContext, out: GainNode) {
  const nodes: Node[] = [];
  // Binaural-like tones (close frequencies create beating)
  const osc1 = ctx.createOscillator(); osc1.type = "sine"; osc1.frequency.value = 200;
  const osc2 = ctx.createOscillator(); osc2.type = "sine"; osc2.frequency.value = 204; // 4Hz theta beat
  const g1 = ctx.createGain(); g1.gain.value = 0.03;
  const g2 = ctx.createGain(); g2.gain.value = 0.03;
  osc1.connect(g1).connect(out);
  osc2.connect(g2).connect(out);
  nodes.push(osc1, osc2);
  // Slow ocean wash underneath
  const wash = src(ctx, brownNoise(ctx, 10));
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 150;
  const gW = ctx.createGain(); gW.gain.value = 0.06;
  const lfo = ctx.createOscillator(); lfo.type = "sine"; lfo.frequency.value = 0.04;
  const lfoG = ctx.createGain(); lfoG.gain.value = 0.03;
  lfo.connect(lfoG).connect(gW.gain);
  wash.connect(lp).connect(gW).connect(out);
  nodes.push(wash, lfo);
  return { start: () => nodes.forEach(n => n.start()), stop: safestop(nodes) };
}

export const MEDITATION_MUSIC: MeditationMusic[] = [
  { name: "Drone Pad", emoji: "\u{1F3B6}", create: makeDronePad },
  { name: "Singing Bowls", emoji: "\u{1F514}", create: makeSingingBowls },
  { name: "Ocean Drone", emoji: "\u{1F30A}", create: makeOceanDrone },
];
