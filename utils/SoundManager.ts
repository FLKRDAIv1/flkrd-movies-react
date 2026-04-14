// ════════════════════════════════════════════════
// 🎭 PREMIUM CONSOLE SOUND ENGINE (V2)
// ════════════════════════════════════════════════
// Overhauled for soft, high-end acoustic synthesis. 
// Mimics PS5/Apple TV "Glassy" and "Filtered" audio profiles.

class SoundManagerV2 {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;

  private init() {
    if (!this.ctx) {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.4, this.ctx.currentTime); // Professional volume scaling
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ── High-End Console Initialization (Crystalline Melody) ──
  playConsoleInit() {
    this.init();
    const now = this.ctx!.currentTime;
    
    // Soft Bass Drone (Sub)
    this.createSoftTone(55, now, 3, 0.15, 200); // 55Hz Low Pass at 200Hz
    
    // Harmonic Layer 1 (Glassy)
    this.createSoftTone(440, now + 0.5, 2, 0.08, 1200);
    this.createSoftTone(659, now + 0.8, 1.5, 0.05, 1500);
    this.createSoftTone(880, now + 1.2, 1.0, 0.03, 2000);
  }

  // ── Navigation "Tap" (Dull, filtered pop - Very subtle) ──
  playNav() {
    this.init();
    // Neutral Low-Pass Pop
    this.createSoftTone(150, this.ctx!.currentTime, 0.08, 0.2, 800, 'triangle');
  }

  // ── Selection "Chime" (Soft rising fifth) ──
  playSelect() {
    this.init();
    const now = this.ctx!.currentTime;
    this.createSoftTone(440, now, 0.15, 0.15, 2000, 'triangle');
    this.createSoftTone(659, now + 0.04, 0.2, 0.1, 2500, 'triangle');
  }

  // ── Back/Cancel (Soft falling third) ──
  playBack() {
    this.init();
    const now = this.ctx!.currentTime;
    this.createSoftTone(330, now, 0.15, 0.15, 1000, 'triangle');
    this.createSoftTone(220, now + 0.04, 0.2, 0.1, 800, 'triangle');
  }

  /**
   * createSoftTone: Uses Subtractive Synthesis
   * Waveform + Low-Pass Filter + Envelope
   */
  private createSoftTone(
    freq: number, 
    start: number, 
    duration: number, 
    volume: number, 
    cutoff: number = 2000,
    type: OscillatorType = 'sine'
  ) {
    const osc = this.ctx!.createOscillator();
    const gain = this.ctx!.createGain();
    const filter = this.ctx!.createBiquadFilter();
    
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    
    // Filter Envelope (Softens the "edge")
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(cutoff, start);
    filter.frequency.exponentialRampToValueAtTime(100, start + duration);
    filter.Q.setValueAtTime(1, start);

    // Gain Envelope (No clicks)
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(volume, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    
    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain!);
    
    osc.start(start);
    osc.stop(start + duration);
  }
}

export const soundManager = new SoundManagerV2();
