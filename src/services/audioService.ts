let audioCtx: AudioContext | null = null;
let masterGain: GainNode | null = null;
let noiseSource: AudioBufferSourceNode | null = null;
let isPlaying = false;

function getContext(): AudioContext {
  if (!audioCtx) audioCtx = new AudioContext();
  return audioCtx;
}

function createBrownNoise(ctx: AudioContext, duration: number): AudioBuffer {
  const sampleRate = ctx.sampleRate;
  const length = sampleRate * duration;
  const buffer = ctx.createBuffer(2, length, sampleRate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = (last + 0.02 * white) / 1.02;
      data[i] = last * 3.5;
    }
  }
  return buffer;
}

export function startAmbience(volume: number = 0.15): void {
  if (isPlaying) {
    setVolume(volume);
    return;
  }

  const ctx = getContext();
  if (ctx.state === 'suspended') ctx.resume();

  masterGain = ctx.createGain();
  masterGain.gain.setValueAtTime(0, ctx.currentTime);
  masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 3);
  masterGain.connect(ctx.destination);

  const lpFilter = ctx.createBiquadFilter();
  lpFilter.type = 'lowpass';
  lpFilter.frequency.setValueAtTime(200, ctx.currentTime);
  lpFilter.connect(masterGain);

  const noiseBuffer = createBrownNoise(ctx, 10);
  noiseSource = ctx.createBufferSource();
  noiseSource.buffer = noiseBuffer;
  noiseSource.loop = true;
  noiseSource.connect(lpFilter);
  noiseSource.start();

  isPlaying = true;
}

export function stopAmbience(): void {
  if (!isPlaying || !masterGain || !audioCtx) return;

  masterGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 2);

  setTimeout(() => {
    noiseSource?.stop();
    noiseSource?.disconnect();
    masterGain?.disconnect();
    noiseSource = null;
    masterGain = null;
    isPlaying = false;
  }, 2500);
}

export function setVolume(v: number): void {
  if (!masterGain || !audioCtx) return;
  masterGain.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, v)), audioCtx.currentTime + 0.3);
}

export function isAmbiencePlaying(): boolean {
  return isPlaying;
}
