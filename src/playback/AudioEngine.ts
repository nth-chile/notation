/**
 * AudioEngine wraps the Web Audio API.
 * Uses oscillators for sound synthesis (triangle for melody, sine for bass).
 */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  if (audioCtx.state === "suspended") {
    audioCtx.resume();
  }
  return audioCtx;
}

const activeNodes: OscillatorNode[] = [];

/**
 * Convert MIDI pitch number to frequency in Hz.
 */
function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/**
 * Schedule a note to play at a specific audio-context time.
 */
export function noteOn(
  midiPitch: number,
  startTime: number,
  durationSec: number,
  velocity = 0.5
): void {
  const ctx = getAudioContext();
  const freq = midiToFrequency(midiPitch);

  // Use triangle wave for higher pitches, sine for bass
  const waveType: OscillatorType = midiPitch < 48 ? "sine" : "triangle";

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = waveType;
  osc.frequency.setValueAtTime(freq, startTime);

  // Velocity-based volume with soft attack/release
  const vol = velocity * 0.3;
  gain.gain.setValueAtTime(0, startTime);
  gain.gain.linearRampToValueAtTime(vol, startTime + 0.01);
  gain.gain.setValueAtTime(vol, startTime + durationSec - 0.02);
  gain.gain.linearRampToValueAtTime(0, startTime + durationSec);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(startTime);
  osc.stop(startTime + durationSec);

  activeNodes.push(osc);
  osc.onended = () => {
    const idx = activeNodes.indexOf(osc);
    if (idx >= 0) activeNodes.splice(idx, 1);
    osc.disconnect();
    gain.disconnect();
  };
}

/**
 * Stop all currently playing/scheduled notes.
 */
export function stop(): void {
  const now = audioCtx?.currentTime ?? 0;
  for (const osc of activeNodes) {
    try {
      osc.stop(now);
    } catch {
      // Already stopped
    }
  }
  activeNodes.length = 0;
}

/**
 * Get the current audio context time (seconds).
 */
export function currentTime(): number {
  return getAudioContext().currentTime;
}

/**
 * Ensure audio context is created and resumed (call on user gesture).
 */
export function ensureContext(): AudioContext {
  return getAudioContext();
}
