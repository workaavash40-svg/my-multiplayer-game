/* ============================================================
   engine/audio.js
   All sound effects are synthesized at runtime with the Web Audio
   API — no external audio files are shipped or loaded. No
   dependencies on other modules.
   ============================================================ */

export const SFX = {
  ctx: null,
  muted: false,

  ensure() { if (!this.ctx) this.ctx = new (window.AudioContext || window.webkitAudioContext)(); },

  play(name) {
    if (this.muted) return;
    this.ensure();
    const ctx = this.ctx;
    const t0 = ctx.currentTime;
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    const osc = ctx.createOscillator();
    osc.connect(gain);

    const presets = {
      gunshot: { type: 'square', f0: 220, f1: 60, dur: 0.08, vol: 0.15 },
      laser: { type: 'sawtooth', f0: 900, f1: 200, dur: 0.15, vol: 0.12 },
      bow: { type: 'triangle', f0: 300, f1: 500, dur: 0.12, vol: 0.12 },
      jump: { type: 'sine', f0: 300, f1: 500, dur: 0.1, vol: 0.1 },
      shield: { type: 'sine', f0: 500, f1: 700, dur: 0.2, vol: 0.1 },
      hit: { type: 'square', f0: 150, f1: 50, dur: 0.08, vol: 0.13 },
      victory: { type: 'triangle', f0: 440, f1: 880, dur: 0.6, vol: 0.15 },
      menu: { type: 'sine', f0: 500, f1: 650, dur: 0.06, vol: 0.08 },
      countdown: { type: 'square', f0: 440, f1: 440, dur: 0.1, vol: 0.13 },
      countdownGo: { type: 'sawtooth', f0: 660, f1: 990, dur: 0.35, vol: 0.16 }
    };
    const p = presets[name] || presets.menu;
    osc.type = p.type;
    osc.frequency.setValueAtTime(p.f0, t0);
    osc.frequency.exponentialRampToValueAtTime(Math.max(p.f1, 1), t0 + p.dur);
    gain.gain.setValueAtTime(p.vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + p.dur);
    osc.start(t0);
    osc.stop(t0 + p.dur + 0.02);
  }
};
