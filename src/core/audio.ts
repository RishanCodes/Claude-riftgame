// Procedural Web Audio sound effects and ambient music — no audio files needed.

type SfxName =
  | 'slash' | 'hit' | 'crit' | 'kill' | 'dodge' | 'special' | 'hurt' | 'coin' | 'pickup'
  | 'shoot' | 'boom' | 'zap' | 'freeze' | 'reaction' | 'ui' | 'uiBack' | 'blessing'
  | 'door' | 'chest' | 'legendary' | 'bossRoar' | 'victory' | 'defeat' | 'telegraph' | 'heal' | 'shield';

class AudioEngine {
  ctx: AudioContext | null = null;
  master: GainNode | null = null;
  sfxGain: GainNode | null = null;
  musicGain: GainNode | null = null;
  noiseBuf: AudioBuffer | null = null;
  sfxVol = 0.7;
  musicVol = 0.4;
  private lastPlay: Record<string, number> = {};
  private musicTimer: number | null = null;
  private musicNodes: AudioNode[] = [];

  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    try {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      const comp = this.ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      this.master.connect(comp).connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = this.sfxVol;
      this.sfxGain.connect(this.master);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = this.musicVol * 0.5;
      this.musicGain.connect(this.master);
      const len = this.ctx.sampleRate * 1;
      this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = this.noiseBuf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    } catch {
      this.ctx = null;
    }
  }

  setVolumes(sfx: number, music: number) {
    this.sfxVol = sfx;
    this.musicVol = music;
    if (this.sfxGain) this.sfxGain.gain.value = sfx;
    if (this.musicGain) this.musicGain.gain.value = music * 0.5;
  }

  private tone(freq: number, dur: number, type: OscillatorType, vol: number, slideTo?: number, delay = 0) {
    if (!this.ctx || !this.sfxGain) return;
    const t = this.ctx.currentTime + delay;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(this.sfxGain);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(dur: number, vol: number, filterFreq: number, type: BiquadFilterType = 'bandpass', slideTo?: number, delay = 0) {
    if (!this.ctx || !this.sfxGain || !this.noiseBuf) return;
    const t = this.ctx.currentTime + delay;
    const s = this.ctx.createBufferSource();
    s.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.setValueAtTime(filterFreq, t);
    if (slideTo) f.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
    f.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f).connect(g).connect(this.sfxGain);
    s.start(t, Math.random() * 0.5);
    s.stop(t + dur + 0.02);
  }

  play(name: SfxName, intensity = 1) {
    if (!this.ctx || this.sfxVol <= 0) return;
    const now = performance.now();
    const minGap: Partial<Record<SfxName, number>> = { hit: 35, coin: 40, crit: 50, shoot: 50, kill: 40, zap: 60, telegraph: 120 };
    if (minGap[name] && now - (this.lastPlay[name] ?? 0) < minGap[name]!) return;
    this.lastPlay[name] = now;
    const v = intensity;
    switch (name) {
      case 'slash':
        this.noise(0.12, 0.28 * v, 2400, 'bandpass', 900);
        this.tone(520 + Math.random() * 60, 0.08, 'triangle', 0.05 * v, 260);
        break;
      case 'hit':
        this.noise(0.07, 0.25 * v, 1200, 'lowpass');
        this.tone(160, 0.08, 'square', 0.06 * v, 80);
        break;
      case 'crit':
        this.noise(0.1, 0.32, 3200, 'highpass');
        this.tone(880, 0.12, 'square', 0.06, 440);
        break;
      case 'kill':
        this.tone(300, 0.15, 'triangle', 0.1, 90);
        this.noise(0.18, 0.18, 600, 'lowpass', 150);
        break;
      case 'dodge':
        this.noise(0.18, 0.2, 600, 'bandpass', 2400);
        break;
      case 'special':
        this.noise(0.5, 0.3, 300, 'bandpass', 3000);
        this.tone(220, 0.45, 'sawtooth', 0.06, 660);
        break;
      case 'hurt':
        this.tone(220, 0.2, 'sawtooth', 0.12, 70);
        this.noise(0.15, 0.25, 800, 'lowpass');
        break;
      case 'coin':
        this.tone(1320 + Math.random() * 200, 0.08, 'square', 0.035);
        this.tone(1980, 0.1, 'square', 0.025, undefined, 0.05);
        break;
      case 'pickup':
        this.tone(660, 0.1, 'triangle', 0.08, 1320);
        break;
      case 'heal':
        [523, 659, 784].forEach((f, i) => this.tone(f, 0.25, 'sine', 0.07, undefined, i * 0.06));
        break;
      case 'shield':
        this.tone(900, 0.2, 'sine', 0.08, 300);
        this.noise(0.1, 0.15, 4000, 'highpass');
        break;
      case 'shoot':
        this.tone(700, 0.1, 'square', 0.03, 300);
        break;
      case 'boom':
        this.noise(0.5 * v, 0.5, 900, 'lowpass', 60);
        this.tone(110, 0.35, 'sine', 0.25, 35);
        break;
      case 'zap':
        this.noise(0.15, 0.25, 5000, 'highpass');
        this.tone(1400, 0.12, 'sawtooth', 0.05, 200);
        break;
      case 'freeze':
        this.noise(0.3, 0.2, 6000, 'highpass', 2000);
        this.tone(1800, 0.25, 'sine', 0.05, 2400);
        break;
      case 'reaction':
        this.tone(440, 0.25, 'triangle', 0.1, 880);
        this.tone(660, 0.25, 'triangle', 0.06, 1320, 0.04);
        break;
      case 'ui':
        this.tone(740, 0.06, 'triangle', 0.08, 980);
        break;
      case 'uiBack':
        this.tone(520, 0.07, 'triangle', 0.07, 380);
        break;
      case 'blessing':
        [523, 784, 1046].forEach((f, i) => this.tone(f, 0.35, 'triangle', 0.08, undefined, i * 0.07));
        break;
      case 'door':
        this.noise(0.6, 0.22, 200, 'lowpass', 900);
        this.tone(160, 0.5, 'sine', 0.1, 320);
        break;
      case 'chest':
        this.noise(0.15, 0.2, 500, 'lowpass');
        [392, 523, 659, 784].forEach((f, i) => this.tone(f, 0.3, 'square', 0.04, undefined, 0.1 + i * 0.07));
        break;
      case 'legendary':
        [392, 523, 659, 784, 1046, 1318].forEach((f, i) => this.tone(f, 0.5, 'triangle', 0.08, undefined, i * 0.08));
        this.noise(1.2, 0.12, 5000, 'highpass', 9000, 0.1);
        break;
      case 'bossRoar':
        this.tone(90, 1.2, 'sawtooth', 0.2, 45);
        this.noise(1.2, 0.35, 400, 'lowpass', 90);
        break;
      case 'victory':
        [523, 659, 784, 1046, 784, 1046].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.1, undefined, i * 0.12));
        break;
      case 'defeat':
        [392, 349, 311, 262].forEach((f, i) => this.tone(f, 0.5, 'sine', 0.12, undefined, i * 0.22));
        break;
      case 'telegraph':
        this.tone(330, 0.15, 'sine', 0.04, 500);
        break;
    }
  }

  /** Very light generative ambient: a drone + sparse pentatonic plucks. */
  startMusic(root: number, scale: number[], intense = false) {
    this.stopMusic();
    if (!this.ctx || !this.musicGain) return;
    const ctx = this.ctx;
    const drone = ctx.createOscillator();
    const drone2 = ctx.createOscillator();
    const dg = ctx.createGain();
    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = intense ? 700 : 420;
    drone.type = 'sawtooth';
    drone2.type = 'sawtooth';
    drone.frequency.value = root / 2;
    drone2.frequency.value = (root / 2) * 1.498;
    drone2.detune.value = 6;
    dg.gain.value = 0.05;
    drone.connect(lp);
    drone2.connect(lp);
    lp.connect(dg).connect(this.musicGain);
    drone.start();
    drone2.start();
    this.musicNodes.push(drone, drone2, dg, lp);
    let step = 0;
    const tick = () => {
      if (!this.ctx || !this.musicGain) return;
      const t = this.ctx.currentTime;
      if (Math.random() < (intense ? 0.85 : 0.55)) {
        const deg = scale[Math.floor(Math.random() * scale.length)];
        const oct = Math.random() < 0.3 ? 2 : 1;
        const f = root * Math.pow(2, deg / 12) * oct;
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'triangle';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t);
        g.gain.exponentialRampToValueAtTime(intense ? 0.06 : 0.045, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 1.6);
        o.connect(g).connect(this.musicGain);
        o.start(t);
        o.stop(t + 1.7);
      }
      if (intense && step % 2 === 0) {
        const o = this.ctx.createOscillator();
        const g = this.ctx.createGain();
        o.type = 'sine';
        o.frequency.setValueAtTime(110, t);
        o.frequency.exponentialRampToValueAtTime(40, t + 0.25);
        g.gain.setValueAtTime(0.12, t);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
        o.connect(g).connect(this.musicGain);
        o.start(t);
        o.stop(t + 0.32);
      }
      step++;
    };
    this.musicTimer = window.setInterval(tick, intense ? 300 : 520);
  }

  stopMusic() {
    if (this.musicTimer !== null) window.clearInterval(this.musicTimer);
    this.musicTimer = null;
    for (const n of this.musicNodes) {
      try {
        if (n instanceof OscillatorNode) n.stop();
        n.disconnect();
      } catch {
        /* already stopped */
      }
    }
    this.musicNodes = [];
  }
}

export const audio = new AudioEngine();
export type { SfxName };
