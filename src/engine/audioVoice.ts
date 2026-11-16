/**
 * Sound Physics Remastered (Web Audio API ConvolverNode + BiquadFilterNode occlusion)
 * & Simple Voice Chat (3D PannerNode proximity audio + microphone loopback test)
 */

export class SoundPhysicsAndVoiceEngine {
  private ctx: AudioContext | null = null;
  private reverbNode: ConvolverNode | null = null;
  private lowpassFilter: BiquadFilterNode | null = null;
  private masterGain: GainNode | null = null;

  masterVolume = 0.8;
  soundPhysicsEnabled = true;
  inCaveEnclosure = 0.15; // 0 = open sky, 1 = deep cave reverb
  voicePttActive = false;
  voiceMuted = false;
  voiceLoopbackTest = false;
  private micStream: MediaStream | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;
  private voicePanner: PannerNode | null = null;

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.masterVolume;

      this.lowpassFilter = this.ctx.createBiquadFilter();
      this.lowpassFilter.type = 'lowpass';
      this.lowpassFilter.frequency.value = 16000;

      this.reverbNode = this.createCaveImpulseConvolver(this.ctx);

      this.lowpassFilter.connect(this.masterGain);
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private createCaveImpulseConvolver(ctx: AudioContext): ConvolverNode {
    const convolver = ctx.createConvolver();
    const rate = ctx.sampleRate;
    const length = Math.floor(rate * 1.4);
    const impulse = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
      const data = impulse.getChannelData(ch);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2.4);
      }
    }
    convolver.buffer = impulse;
    return convolver;
  }

  setEnclosureAndOcclusion(enclosureRatio: number, isStormMuffled: boolean): void {
    this.inCaveEnclosure = Math.max(0, Math.min(1, enclosureRatio));
    if (this.lowpassFilter && this.ctx) {
      const targetFreq =
        this.soundPhysicsEnabled && isStormMuffled
          ? 2400
          : this.soundPhysicsEnabled && this.inCaveEnclosure > 0.6
          ? 5200
          : 16500;
      this.lowpassFilter.frequency.setTargetAtTime(targetFreq, this.ctx.currentTime, 0.08);
    }
  }

  playSoundEffect(
    type: 'dig' | 'place' | 'step' | 'jump' | 'explode' | 'tnt_fuse' | 'lucky' | 'thunder',
    pitchJitter = 1.0
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || !this.masterGain || !this.lowpassFilter) return;

    const now = ctx.currentTime;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    const pitch = pitchJitter * (0.94 + Math.random() * 0.12);

    switch (type) {
      case 'dig':
      case 'place': {
        osc.type = type === 'dig' ? 'triangle' : 'square';
        osc.frequency.setValueAtTime((type === 'dig' ? 190 : 145) * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(65, now + 0.08);
        gain.gain.setValueAtTime(0.22 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);
        osc.connect(gain);
        gain.connect(this.lowpassFilter);
        osc.start(now);
        osc.stop(now + 0.095);
        break;
      }
      case 'step':
      case 'jump': {
        osc.type = 'sine';
        osc.frequency.setValueAtTime((type === 'jump' ? 240 : 110) * pitch, now);
        osc.frequency.exponentialRampToValueAtTime(type === 'jump' ? 360 : 55, now + 0.07);
        gain.gain.setValueAtTime(0.12 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);
        osc.connect(gain);
        gain.connect(this.lowpassFilter);
        osc.start(now);
        osc.stop(now + 0.08);
        break;
      }
      case 'tnt_fuse': {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.linearRampToValueAtTime(880, now + 0.35);
        gain.gain.setValueAtTime(0.18 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);
        osc.connect(gain);
        gain.connect(this.lowpassFilter);
        osc.start(now);
        osc.stop(now + 0.37);
        break;
      }
      case 'lucky': {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, now);
        osc.frequency.setValueAtTime(554.37, now + 0.08);
        osc.frequency.setValueAtTime(659.25, now + 0.16);
        gain.gain.setValueAtTime(0.24 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.32);
        osc.connect(gain);
        gain.connect(this.lowpassFilter);
        osc.start(now);
        osc.stop(now + 0.34);
        break;
      }
      case 'explode':
      case 'thunder': {
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(type === 'explode' ? 95 : 70, now);
        osc.frequency.exponentialRampToValueAtTime(22, now + 0.55);
        gain.gain.setValueAtTime(0.45 * this.masterVolume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
        osc.connect(gain);
        gain.connect(this.lowpassFilter);
        if (this.soundPhysicsEnabled && this.reverbNode) {
          const wetGain = ctx.createGain();
          wetGain.gain.value = 0.35 + this.inCaveEnclosure * 0.5;
          gain.connect(this.reverbNode);
          this.reverbNode.connect(wetGain);
          wetGain.connect(this.masterGain);
        }
        osc.start(now);
        osc.stop(now + 0.62);
        break;
      }
    }
  }

  async toggleMicrophoneLoopback(enable: boolean): Promise<boolean> {
    this.voiceLoopbackTest = enable;
    if (!enable) {
      this.micSource?.disconnect();
      this.micStream?.getTracks().forEach((t) => t.stop());
      this.micStream = null;
      this.micSource = null;
      return false;
    }
    try {
      const ctx = this.ensureContext();
      if (!ctx || !this.masterGain) return false;
      this.micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      this.micSource = ctx.createMediaStreamSource(this.micStream);
      this.voicePanner = ctx.createPanner();
      this.voicePanner.panningModel = 'HRTF';
      this.voicePanner.distanceModel = 'inverse';
      this.voicePanner.refDistance = 2;
      this.voicePanner.maxDistance = 32;
      this.micSource.connect(this.voicePanner);
      this.voicePanner.connect(this.masterGain);
      return true;
    } catch {
      this.voiceLoopbackTest = false;
      return false;
    }
  }
}
