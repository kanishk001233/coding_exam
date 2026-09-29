// Synthesizes a crisp, pleasant chime / "ting" bell sound using Web Audio API
// Fully browser-native: zero external audio assets or network requests needed.

let audioCtx: AudioContext | null = null;
let lastPlayedAt = 0;

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  try {
    if (!audioCtx || audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        audioCtx = new AudioContextClass();
      }
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  } catch {
    return null;
  }
}

/**
 * Plays a pleasant, bright dual-tone bell chime ("ting!")
 * Automatically debounced to avoid rapid double-triggers.
 */
export function playTingNotification(): void {
  try {
    const nowMs = Date.now();
    if (nowMs - lastPlayedAt < 350) {
      return; // prevent ear-fatiguing duplicate triggers
    }
    lastPlayedAt = nowMs;

    const ctx = getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;

    // Master volume gain
    const masterGain = ctx.createGain();
    masterGain.gain.setValueAtTime(0.45, now);
    masterGain.connect(ctx.destination);

    // Primary fundamental tone (C6: ~1046.5 Hz)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(1046.5, now);
    // Slight pitch drop for physical chime resonance
    osc1.frequency.exponentialRampToValueAtTime(1035, now + 0.85);

    gain1.gain.setValueAtTime(0, now);
    gain1.gain.linearRampToValueAtTime(0.85, now + 0.01); // crisp bell attack
    gain1.gain.exponentialRampToValueAtTime(0.0001, now + 0.9); // smooth ringing decay

    osc1.connect(gain1);
    gain1.connect(masterGain);

    // Overtone harmonic (E7: ~2637 Hz) for a bright, glassy crystal "ting" sparkle
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(2637, now);
    osc2.frequency.exponentialRampToValueAtTime(2600, now + 0.45);

    gain2.gain.setValueAtTime(0, now);
    gain2.gain.linearRampToValueAtTime(0.4, now + 0.008);
    gain2.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);

    osc2.connect(gain2);
    gain2.connect(masterGain);

    // Start and stop oscillators
    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.95);
    osc2.stop(now + 0.5);
  } catch (err) {
    // Non-blocking fallback
    console.debug('Audio notification playback ignored:', err);
  }
}
