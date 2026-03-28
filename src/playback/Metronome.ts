/**
 * Metronome generates click sounds on beat boundaries.
 */

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

/**
 * Schedule a metronome click at the given audio context time.
 * @param time - AudioContext time to play the click
 * @param isDownbeat - If true, plays a higher pitch accent
 */
export function scheduleClick(time: number, isDownbeat: boolean): void {
  const ctx = getContext();

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "square";
  osc.frequency.setValueAtTime(isDownbeat ? 1200 : 800, time);

  const vol = isDownbeat ? 0.15 : 0.08;
  const clickDuration = 0.03;

  gain.gain.setValueAtTime(vol, time);
  gain.gain.exponentialRampToValueAtTime(0.001, time + clickDuration);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(time);
  osc.stop(time + clickDuration);

  osc.onended = () => {
    osc.disconnect();
    gain.disconnect();
  };
}

/**
 * Set the audio context to use (shares with AudioEngine).
 */
export function setAudioContext(ctx: AudioContext): void {
  audioCtx = ctx;
}
