// UrbanPulse Web Audio Synthesizer for Tactical Command Feedback

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  private init() {
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
  }

  public getMuted(): boolean {
    return this.isMuted;
  }

  public playBeep(frequency = 880, type: OscillatorType = 'sine', duration = 0.08, gainVal = 0.05) {
    if (this.isMuted) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(frequency, this.ctx.currentTime);
      gain.gain.setValueAtTime(gainVal, this.ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, this.ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();
      osc.stop(this.ctx.currentTime + duration);
    } catch {
      // Audio context might be restricted before first user interaction
    }
  }

  public playClick() {
    this.playBeep(1200, 'sine', 0.04, 0.03);
  }

  public playAlert() {
    this.playBeep(440, 'triangle', 0.15, 0.08);
    setTimeout(() => {
      this.playBeep(660, 'triangle', 0.2, 0.08);
    }, 120);
  }

  public playSuccess() {
    this.playBeep(587.33, 'sine', 0.08, 0.04);
    setTimeout(() => {
      this.playBeep(880, 'sine', 0.12, 0.04);
    }, 80);
  }

  public playCritical() {
    this.playBeep(300, 'sawtooth', 0.25, 0.08);
    setTimeout(() => {
      this.playBeep(250, 'sawtooth', 0.35, 0.08);
    }, 200);
  }
}

export const sounds = new SoundManager();
