// Smart City Web Audio Synthesizer for Tactical Command Feedback

class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenTimer: NodeJS.Timeout | null = null;
  private isSirenRunning: boolean = false;

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
    if (muted && this.isSirenRunning) {
      this.stopPollutionAlarm();
    }
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

  // Sirine Darurat Polusi Tinggi (Two-tone Hazard Wail)
  public startPollutionAlarm() {
    if (this.isMuted || this.isSirenRunning) return;
    try {
      this.init();
      if (!this.ctx) return;
      if (this.ctx.state === 'suspended') {
        this.ctx.resume();
      }

      this.isSirenRunning = true;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(480, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.001, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.08, this.ctx.currentTime + 0.1);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start();

      this.sirenOsc = osc;
      this.sirenGain = gain;

      // Sirine naik turun berkala (Hazard Alert)
      let highTone = true;
      this.sirenTimer = setInterval(() => {
        if (!this.ctx || !this.sirenOsc) return;
        const targetFreq = highTone ? 880 : 440;
        this.sirenOsc.frequency.exponentialRampToValueAtTime(targetFreq, this.ctx.currentTime + 0.4);
        highTone = !highTone;
      }, 450);
    } catch {
      // Audio context error fallback
    }
  }

  public stopPollutionAlarm() {
    if (!this.isSirenRunning) return;
    this.isSirenRunning = false;

    if (this.sirenTimer) {
      clearInterval(this.sirenTimer);
      this.sirenTimer = null;
    }

    try {
      if (this.sirenGain && this.ctx) {
        this.sirenGain.gain.linearRampToValueAtTime(0.0001, this.ctx.currentTime + 0.1);
      }
      setTimeout(() => {
        if (this.sirenOsc) {
          try {
            this.sirenOsc.stop();
            this.sirenOsc.disconnect();
          } catch {}
          this.sirenOsc = null;
        }
        if (this.sirenGain) {
          try {
            this.sirenGain.disconnect();
          } catch {}
          this.sirenGain = null;
        }
      }, 120);
    } catch {
      this.sirenOsc = null;
      this.sirenGain = null;
    }
  }

  public isAlarmPlaying(): boolean {
    return this.isSirenRunning;
  }
}

export const sounds = new SoundManager();
