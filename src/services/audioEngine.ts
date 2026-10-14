/**
 * Professional Web Audio Engine for AutoTube Studio
 * Features:
 * - Dual-track audio mixing (Voiceover track + Background music track)
 * - Real-time auto-ducking (smoothly dips background music when voiceover is talking)
 * - Procedural synthesis for 6 trending YouTube niches:
 *   1. Dark Mystery / True Crime (deep bass pulse + eerie resonant drone)
 *   2. Lofi Chillhop (warm chords + soft vinyl-like texture + mellow bass)
 *   3. Phonk / Fast Bass (aggressive minor progression + rolling beat)
 *   4. Epic Cinematic Ambient (inspirational evolving pads + harmonic chime)
 *   5. Tech Corporate Explainer (clean plucks + modern pulse)
 *   6. Suspense Ticking & Pulse (clockwork rhythm + rising heartbeats)
 * - MediaStream destination node capture for seamless video export
 */

import { MusicTrack } from '../types/editor';

export const TRENDING_MUSIC_TRACKS: MusicTrack[] = [
  {
    id: 'track-dark-mystery',
    title: 'Dark Reality & True Crime',
    genre: 'Mystery / Documentary',
    mood: 'Tense, Investigating, Secretive',
    bpm: 85,
    synthPreset: 'dark_mystery',
    description: 'Deep resonant bass pulse and atmospheric suspense drones. Ideal for mysteries, dark truths, and expose videos.',
  },
  {
    id: 'track-lofi-chill',
    title: 'Late Night Coffee Lofi',
    genre: 'Lofi Chillhop',
    mood: 'Calm, Thoughtful, Focused',
    bpm: 78,
    synthPreset: 'lofi_chill',
    description: 'Mellow electric piano chords with smooth relaxed rhythm. Perfect for educational, storytelling, and study videos.',
  },
  {
    id: 'track-phonk-bass',
    title: 'Sigma Phonk & Drive Pulse',
    genre: 'Phonk / High Energy',
    mood: 'Aggressive, Powerful, Motivated',
    bpm: 120,
    synthPreset: 'phonk_bass',
    description: 'Punchy 808-style bass slides and rhythmic driving synth arpeggio. Perfect for business hustle and motivation shorts.',
  },
  {
    id: 'track-cinematic-ambient',
    title: 'Interstellar Horizons',
    genre: 'Cinematic Ambient',
    mood: 'Epic, Ethereal, Inspiring',
    bpm: 90,
    synthPreset: 'cinematic_ambient',
    description: 'Evolving orchestral synth pads and cosmic reverberations. Ideal for science, future AI, and inspiring biographies.',
  },
  {
    id: 'track-tech-corporate',
    title: 'Silicon Valley Pulse',
    genre: 'Modern Tech / Corporate',
    mood: 'Smart, Crisp, Forward-looking',
    bpm: 110,
    synthPreset: 'tech_corporate',
    description: 'Pristine plucks and rhythmic heartbeat bass. Perfect for finance, SaaS, tech tutorials, and market breakdowns.',
  },
  {
    id: 'track-suspense-pulse',
    title: 'Ticking Clock Countdown',
    genre: 'Thriller / Countdown',
    mood: 'Urgent, High Stakes, Ticking',
    bpm: 130,
    synthPreset: 'suspense_pulse',
    description: 'Metronomic tension tick and escalating dark chords. Keeps viewers locked in to maximize watch retention.',
  },
];

export class AudioEngine {
  private ctx: AudioContext | null = null;
  private voiceGainNode: GainNode | null = null;
  private musicGainNode: GainNode | null = null;
  private masterGainNode: GainNode | null = null;
  private streamDestination: MediaStreamAudioDestinationNode | null = null;

  // Voiceover audio element
  private voiceAudio: HTMLAudioElement | null = null;
  private voiceSourceNode: MediaElementAudioSourceNode | null = null;

  // Custom music audio element
  private customMusicAudio: HTMLAudioElement | null = null;
  private customMusicSourceNode: MediaElementAudioSourceNode | null = null;

  // Procedural music synth state
  private activeSynthTimer: number | null = null;
  private activeSynthNodes: AudioNode[] = [];
  private isSynthPlaying = false;
  private currentPreset: MusicTrack['synthPreset'] = 'dark_mystery';

  // Settings
  private voiceoverVolume = 1.0;
  private musicVolume = 0.35;
  private autoDucking = true;
  private duckingAmount = 0.25; // drop to 25% during voiceover

  /**
   * CapCut-style Procedural Sound Effects (SFX)
   */
  public playSFX(type: 'whoosh' | 'impact' | 'shutter' | 'pop' | 'ding') {
    this.initContext();
    if (!this.ctx) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    switch (type) {
      case 'whoosh': {
        // Filtered white noise sweep
        const bufferSize = ctx.sampleRate * 0.4;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const output = noiseBuffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
          output[i] = Math.random() * 2 - 1;
        }
        const whiteNoise = ctx.createBufferSource();
        whiteNoise.buffer = noiseBuffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.Q.value = 3.0;
        filter.frequency.setValueAtTime(250, now);
        filter.frequency.exponentialRampToValueAtTime(3200, now + 0.2);
        filter.frequency.exponentialRampToValueAtTime(350, now + 0.4);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(0.4, now + 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

        whiteNoise.connect(filter);
        filter.connect(gain);
        gain.connect(this.masterGainNode || ctx.destination);
        whiteNoise.start(now);
        break;
      }
      case 'impact': {
        // Deep sub-bass boom + transient punch
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(160, now);
        osc.frequency.exponentialRampToValueAtTime(35, now + 0.5);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.6, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.7);

        osc.connect(gain);
        gain.connect(this.masterGainNode || ctx.destination);
        osc.start(now);
        osc.stop(now + 0.7);
        break;
      }
      case 'shutter': {
        // Camera click mechanical transient
        const osc = ctx.createOscillator();
        osc.type = 'square';
        osc.frequency.setValueAtTime(1800, now);
        osc.frequency.exponentialRampToValueAtTime(200, now + 0.08);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.3, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

        osc.connect(gain);
        gain.connect(this.masterGainNode || ctx.destination);
        osc.start(now);
        osc.stop(now + 0.1);
        break;
      }
      case 'pop': {
        // Playful bubble pop
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(400, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.08);

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.35, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        osc.connect(gain);
        gain.connect(this.masterGainNode || ctx.destination);
        osc.start(now);
        osc.stop(now + 0.09);
        break;
      }
      case 'ding': {
        // Bell chime
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, now); // C6

        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0.4, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.8);

        osc.connect(gain);
        gain.connect(this.masterGainNode || ctx.destination);
        osc.start(now);
        osc.stop(now + 0.8);
        break;
      }
    }
  }

  constructor() {
    // Lazily init AudioContext upon user gesture
  }

  private initContext() {
    if (!this.ctx) {
      try {
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (!AudioCtx) return;
        this.ctx = new AudioCtx();

        this.masterGainNode = this.ctx.createGain();
        this.voiceGainNode = this.ctx.createGain();
        this.musicGainNode = this.ctx.createGain();

        this.voiceGainNode.gain.value = this.voiceoverVolume;
        this.musicGainNode.gain.value = this.musicVolume;
        this.masterGainNode.gain.value = 1.0;

        // Stream destination for video export
        this.streamDestination = this.ctx.createMediaStreamDestination();

        // Route both to master & stream
        this.voiceGainNode.connect(this.masterGainNode);
        this.musicGainNode.connect(this.masterGainNode);

        this.voiceGainNode.connect(this.streamDestination);
        this.musicGainNode.connect(this.streamDestination);

        this.masterGainNode.connect(this.ctx.destination);
      } catch (err) {
        console.warn('AudioContext initialization deferred or restricted:', err);
      }
    }

    if (this.ctx && this.ctx.state === 'suspended') {
      try {
        this.ctx.resume().catch(() => {});
      } catch {}
    }
  }

  public getMediaStreamDestination(): MediaStreamAudioDestinationNode {
    this.initContext();
    return this.streamDestination!;
  }

  public getAudioContext(): AudioContext {
    this.initContext();
    return this.ctx!;
  }

  public setVoiceoverSource(urlOrBase64: string | null) {
    this.initContext();
    if (!urlOrBase64) {
      if (this.voiceAudio) {
        this.voiceAudio.pause();
        this.voiceAudio.src = '';
      }
      return;
    }

    if (!this.voiceAudio) {
      this.voiceAudio = new Audio();
      this.voiceAudio.crossOrigin = 'anonymous';
      this.voiceSourceNode = this.ctx!.createMediaElementSource(this.voiceAudio);
      this.voiceSourceNode.connect(this.voiceGainNode!);
    }

    this.voiceAudio.src = urlOrBase64;
    this.voiceAudio.load();
  }

  public setCustomMusicSource(url: string | null) {
    this.initContext();
    if (!url) {
      if (this.customMusicAudio) {
        this.customMusicAudio.pause();
        this.customMusicAudio.src = '';
      }
      return;
    }

    if (!this.customMusicAudio) {
      this.customMusicAudio = new Audio();
      this.customMusicAudio.crossOrigin = 'anonymous';
      this.customMusicAudio.loop = true;
      this.customMusicSourceNode = this.ctx!.createMediaElementSource(this.customMusicAudio);
      this.customMusicSourceNode.connect(this.musicGainNode!);
    }

    this.customMusicAudio.src = url;
    this.customMusicAudio.load();
  }

  public setMusicTrackPreset(preset: MusicTrack['synthPreset']) {
    this.currentPreset = preset;
    if (this.isSynthPlaying) {
      this.stopProceduralMusic();
      this.startProceduralMusic();
    }
  }

  public setVoiceoverVolume(vol: number) {
    this.voiceoverVolume = Math.max(0, Math.min(1, vol));
    if (this.voiceGainNode && this.ctx) {
      this.voiceGainNode.gain.setValueAtTime(this.voiceoverVolume, this.ctx.currentTime);
    }
  }

  public setMusicVolume(vol: number) {
    this.musicVolume = Math.max(0, Math.min(1, vol));
    this.applyDucking();
  }

  public setAutoDucking(enabled: boolean, amount: number = 0.25) {
    this.autoDucking = enabled;
    this.duckingAmount = amount;
    this.applyDucking();
  }

  private applyDucking(isSpeaking = false) {
    if (!this.musicGainNode || !this.ctx) return;
    const targetVol = isSpeaking && this.autoDucking
      ? this.musicVolume * this.duckingAmount
      : this.musicVolume;

    this.musicGainNode.gain.setTargetAtTime(targetVol, this.ctx.currentTime, 0.2);
  }

  public play(currentTimeSec: number, hasCustomMusic: boolean = false) {
    this.initContext();

    // Voiceover audio
    if (this.voiceAudio && this.voiceAudio.src && !isNaN(this.voiceAudio.duration)) {
      if (currentTimeSec < this.voiceAudio.duration) {
        this.voiceAudio.currentTime = currentTimeSec;
        this.voiceAudio.play().catch(() => {});
        this.applyDucking(true);
      } else {
        this.voiceAudio.pause();
        this.applyDucking(false);
      }
    } else {
      this.applyDucking(false);
    }

    // Music
    if (hasCustomMusic && this.customMusicAudio && this.customMusicAudio.src) {
      this.customMusicAudio.currentTime = currentTimeSec % (this.customMusicAudio.duration || 60);
      this.customMusicAudio.play().catch(() => {});
    } else {
      this.startProceduralMusic();
    }
  }

  public pause() {
    if (this.voiceAudio) {
      this.voiceAudio.pause();
    }
    if (this.customMusicAudio) {
      this.customMusicAudio.pause();
    }
    this.stopProceduralMusic();
    this.applyDucking(false);
  }

  public seek(timeSec: number, isPlaying: boolean, hasCustomMusic: boolean = false) {
    if (this.voiceAudio && this.voiceAudio.src) {
      if (!isNaN(this.voiceAudio.duration) && timeSec < this.voiceAudio.duration) {
        this.voiceAudio.currentTime = timeSec;
      }
    }

    if (hasCustomMusic && this.customMusicAudio && this.customMusicAudio.src) {
      if (!isNaN(this.customMusicAudio.duration)) {
        this.customMusicAudio.currentTime = timeSec % (this.customMusicAudio.duration || 60);
      }
    }

    if (isPlaying) {
      this.play(timeSec, hasCustomMusic);
    }
  }

  /**
   * Procedural Web Audio Synth for Trending Background Music
   */
  private startProceduralMusic() {
    if (this.isSynthPlaying) return;
    this.initContext();
    this.isSynthPlaying = true;

    const ctx = this.ctx!;
    const dest = this.musicGainNode!;

    // Chords and scales for different presets
    const PRESET_CONFIGS: Record<MusicTrack['synthPreset'], {
      chords: number[][]; // Frequencies (Hz)
      bpm: number;
      type: OscillatorType;
      filterFreq: number;
      q: number;
    }> = {
      dark_mystery: {
        chords: [
          [55, 110, 164.81, 196.0], // A1, A2, E3, G3
          [51.91, 103.83, 155.56, 185.0], // G#1, G#2, D#3, F#3
          [49, 98, 146.83, 174.61], // G1, G2, D3, F3
          [46.25, 92.5, 138.59, 164.81], // F#1, F#2, C#3, E3
        ],
        bpm: 80,
        type: 'sawtooth',
        filterFreq: 450,
        q: 4,
      },
      lofi_chill: {
        chords: [
          [130.81, 196.0, 246.94, 293.66], // C3, G3, B3, D4 (Cmaj9)
          [110.0, 164.81, 196.0, 261.63], // A2, E3, G3, C4 (Am7)
          [146.83, 220.0, 261.63, 329.63], // D3, A3, C4, E4 (Dm9)
          [98.0, 146.83, 174.61, 246.94], // G2, D3, F3, B3 (G7)
        ],
        bpm: 78,
        type: 'triangle',
        filterFreq: 750,
        q: 1.5,
      },
      phonk_bass: {
        chords: [
          [55, 110, 220, 261.63], // A minor heavy
          [49, 98, 196, 246.94], // G minor
          [43.65, 87.31, 174.61, 220], // F
          [41.2, 82.41, 164.81, 207.65], // E
        ],
        bpm: 120,
        type: 'sawtooth',
        filterFreq: 600,
        q: 6,
      },
      cinematic_ambient: {
        chords: [
          [65.41, 130.81, 196.0, 293.66, 392.0], // C
          [73.42, 146.83, 220.0, 329.63, 440.0], // D
          [82.41, 164.81, 246.94, 329.63, 493.88], // Em
          [58.27, 116.54, 174.61, 261.63, 349.23], // Bb
        ],
        bpm: 70,
        type: 'sine',
        filterFreq: 1100,
        q: 2,
      },
      tech_corporate: {
        chords: [
          [130.81, 164.81, 196.0, 261.63],
          [146.83, 174.61, 220.0, 293.66],
          [164.81, 196.0, 246.94, 329.63],
          [174.61, 220.0, 261.63, 349.23],
        ],
        bpm: 110,
        type: 'triangle',
        filterFreq: 950,
        q: 2,
      },
      suspense_pulse: {
        chords: [
          [43.65, 87.31, 130.81],
          [46.25, 92.5, 138.59],
          [49, 98, 146.83],
          [51.91, 103.83, 155.56],
        ],
        bpm: 128,
        type: 'sawtooth',
        filterFreq: 380,
        q: 5,
      },
    };

    const config = PRESET_CONFIGS[this.currentPreset] || PRESET_CONFIGS.dark_mystery;
    let chordIndex = 0;
    const beatIntervalMs = (60 / config.bpm) * 1000 * 4; // 1 chord per bar (4 beats)

    const playChordStep = () => {
      if (!this.isSynthPlaying || !this.ctx) return;

      const chord = config.chords[chordIndex % config.chords.length];
      chordIndex++;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = config.filterFreq;
      filter.Q.value = config.q;

      const chordGain = ctx.createGain();
      chordGain.gain.setValueAtTime(0.001, ctx.currentTime);
      chordGain.gain.linearRampToValueAtTime(0.18, ctx.currentTime + 0.6);
      chordGain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + (beatIntervalMs / 1000) - 0.1);

      filter.connect(chordGain);
      chordGain.connect(dest);

      const oscs = chord.map((freq) => {
        const osc = ctx.createOscillator();
        osc.type = config.type;
        osc.frequency.value = freq;
        osc.connect(filter);
        osc.start();
        osc.stop(ctx.currentTime + (beatIntervalMs / 1000));
        return osc;
      });

      this.activeSynthNodes.push(...oscs, filter, chordGain);

      // Clean up after note expires
      setTimeout(() => {
        oscs.forEach((o) => {
          try { o.disconnect(); } catch {}
        });
      }, beatIntervalMs + 200);

      this.activeSynthTimer = window.setTimeout(playChordStep, beatIntervalMs);
    };

    playChordStep();
  }

  private stopProceduralMusic() {
    this.isSynthPlaying = false;
    if (this.activeSynthTimer) {
      clearTimeout(this.activeSynthTimer);
      this.activeSynthTimer = null;
    }

    this.activeSynthNodes.forEach((node) => {
      try {
        if ('stop' in node) (node as any).stop();
        node.disconnect();
      } catch {}
    });
    this.activeSynthNodes = [];
  }

  public destroy() {
    this.pause();
    if (this.voiceAudio) {
      this.voiceAudio.pause();
      this.voiceAudio.src = '';
    }
    if (this.customMusicAudio) {
      this.customMusicAudio.pause();
      this.customMusicAudio.src = '';
    }
    if (this.ctx && this.ctx.state !== 'closed') {
      this.ctx.close();
    }
  }
}
