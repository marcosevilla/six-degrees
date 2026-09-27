let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

/** Short pleasant chime when a card is added */
export function playCardSound() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "sine";
  osc.frequency.setValueAtTime(660, now);
  osc.frequency.exponentialRampToValueAtTime(880, now + 0.08);

  gain.gain.setValueAtTime(0.15, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

  osc.start(now);
  osc.stop(now + 0.25);
}

/** Short descending thud when a card is removed */
export function playRemoveSound() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.type = "triangle";
  osc.frequency.setValueAtTime(400, now);
  osc.frequency.exponentialRampToValueAtTime(180, now + 0.15);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

  osc.start(now);
  osc.stop(now + 0.2);

  // Subtle noise burst for "crumple" texture
  const bufferSize = ctx.sampleRate * 0.08;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * 0.3;
  }
  const noise = ctx.createBufferSource();
  const noiseGain = ctx.createGain();
  noise.buffer = buffer;
  noise.connect(noiseGain);
  noiseGain.connect(ctx.destination);

  noiseGain.gain.setValueAtTime(0.06, now);
  noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

  noise.start(now);
  noise.stop(now + 0.08);
}

/** Whoosh sound for card reveal flips */
export function playFlipSound() {
  const ctx = getCtx();
  const now = ctx.currentTime;
  const duration = 0.3;

  // Noise source — core of the whoosh
  const bufferSize = Math.floor(ctx.sampleRate * duration);
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }
  const noise = ctx.createBufferSource();
  noise.buffer = buffer;

  // Bandpass filter — sweeps for "whoosh" character
  const filter = ctx.createBiquadFilter();
  filter.type = "bandpass";
  filter.Q.value = 2;
  filter.frequency.setValueAtTime(200, now);
  filter.frequency.exponentialRampToValueAtTime(2000, now + duration * 0.6);
  filter.frequency.exponentialRampToValueAtTime(400, now + duration);

  // Gain envelope — quick swell then decay
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0.001, now);
  gain.gain.linearRampToValueAtTime(0.18, now + 0.05);
  gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

  noise.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);
  noise.start(now);
  noise.stop(now + duration);

  // Subtle tonal undertone
  const osc = ctx.createOscillator();
  const oscGain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(150, now);
  osc.frequency.exponentialRampToValueAtTime(300, now + duration * 0.5);
  oscGain.gain.setValueAtTime(0.06, now);
  oscGain.gain.exponentialRampToValueAtTime(0.001, now + duration);
  osc.connect(oscGain);
  oscGain.connect(ctx.destination);
  osc.start(now);
  osc.stop(now + duration);
}

/** Ascending chime sequence when the chain is completed */
export function playWinSound() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  const notes = [523, 659, 784, 1047]; // C5 E5 G5 C6

  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "sine";
    const t = now + i * 0.12;
    osc.frequency.setValueAtTime(freq, t);

    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.15, t + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);

    osc.start(t);
    osc.stop(t + 0.4);
  });
}

/** Low, short double buzz when a pick is rejected */
export function playErrorSound() {
  const ctx = getCtx();
  const now = ctx.currentTime;

  [0, 0.09].forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = "triangle";
    const t = now + offset;
    osc.frequency.setValueAtTime(196, t);
    osc.frequency.exponentialRampToValueAtTime(147, t + 0.08);

    gain.gain.setValueAtTime(0.13, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

    osc.start(t);
    osc.stop(t + 0.08);
  });
}
