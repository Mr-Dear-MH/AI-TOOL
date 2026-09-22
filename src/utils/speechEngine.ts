/**
 * Speech Engine supporting 50+ languages with Gemini TTS / Google Neural Audio + Web Speech API fallback
 */

export class SpeechEngine {
  private static instance: SpeechEngine;
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;
  private voicesLoaded: boolean = false;
  private isSpeakingAudio: boolean = false;

  private constructor() {
    try {
      if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
        this.synth = window.speechSynthesis;
        if (this.synth && 'onvoiceschanged' in this.synth) {
          this.synth.onvoiceschanged = () => {
            this.voicesLoaded = true;
          };
        }
      }
    } catch (e) {
      console.warn('SpeechSynthesis initialization bypassed in restricted iframe:', e);
    }
  }

  public static getInstance(): SpeechEngine {
    if (!SpeechEngine.instance) {
      SpeechEngine.instance = new SpeechEngine();
    }
    return SpeechEngine.instance;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    return this.synth.getVoices();
  }

  public stop(): void {
    if (this.currentAudio) {
      try {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
      } catch (e) {
        // ignore
      }
      this.currentAudio = null;
    }
    if (this.synth) {
      try {
        this.synth.cancel();
      } catch (e) {
        // ignore
      }
    }
    this.isSpeakingAudio = false;
  }

  public async speak(
    text: string,
    languageCode: string = 'ur-PK',
    options?: {
      pitch?: number;
      rate?: number;
      audioBase64?: string;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): Promise<void> {
    this.stop();

    if (!text || !text.trim()) return;

    // Case 1: AudioBase64 provided (from Gemini or Google TTS)
    if (options?.audioBase64) {
      const played = await this.playBase64Audio(options.audioBase64, options);
      if (played) return;
    }

    // Case 2: Fetch audio directly from server /api/generate-tts
    try {
      const res = await fetch('/api/generate-tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          languageCode,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.audioBase64) {
          const played = await this.playBase64Audio(data.audioBase64, options);
          if (played) return;
        }
      }
    } catch (apiErr) {
      console.warn('Direct TTS fetch failed, fallback to Web Speech:', apiErr);
    }

    // Case 3: Fallback to Browser Web Speech API
    this.speakWithWebSpeech(text, languageCode, options);
  }

  private playBase64Audio(
    audioData: string,
    options?: {
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        let src = audioData;
        if (!audioData.startsWith('data:')) {
          // If starts with RIFF / wav signature or raw audio
          src = `data:audio/wav;base64,${audioData}`;
        }

        const audio = new Audio(src);
        this.currentAudio = audio;
        this.isSpeakingAudio = true;

        audio.onplay = () => {
          if (options?.onStart) options.onStart();
        };

        audio.onended = () => {
          this.isSpeakingAudio = false;
          if (options?.onEnd) options.onEnd();
          resolve(true);
        };

        audio.onerror = (e) => {
          console.warn('Audio playback error, trying fallback:', e);
          this.isSpeakingAudio = false;
          resolve(false);
        };

        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => resolve(true))
            .catch((playErr) => {
              console.warn('Audio play rejection:', playErr);
              resolve(false);
            });
        }
      } catch (err) {
        console.warn('Audio constructor failure:', err);
        resolve(false);
      }
    });
  }

  private speakWithWebSpeech(
    text: string,
    languageCode: string,
    options?: {
      pitch?: number;
      rate?: number;
      onStart?: () => void;
      onEnd?: () => void;
      onError?: (err: any) => void;
    }
  ) {
    if (!this.synth) {
      if (options?.onError) options.onError(new Error('Speech Synthesis not supported in this browser.'));
      return;
    }

    try {
      this.synth.cancel();
      if (this.synth.paused) {
        this.synth.resume();
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = languageCode;
      utterance.pitch = options?.pitch ?? 1.0;
      utterance.rate = options?.rate ?? 0.92;

      // Match best voice
      const voices = this.synth.getVoices();
      const primary = languageCode.split('-')[0].toLowerCase();
      const matchingVoice =
        voices.find((v) => v.lang.toLowerCase() === languageCode.toLowerCase()) ||
        voices.find((v) => v.lang.toLowerCase().replace('_', '-').startsWith(primary)) ||
        voices.find((v) => v.lang.toLowerCase().includes(primary));

      if (matchingVoice) {
        utterance.voice = matchingVoice;
      }

      utterance.onstart = () => {
        if (options?.onStart) options.onStart();
      };
      utterance.onend = () => {
        if (options?.onEnd) options.onEnd();
      };
      utterance.onerror = (err) => {
        if (options?.onError) options.onError(err);
      };

      this.currentUtterance = utterance;
      this.synth.speak(utterance);
    } catch (e) {
      console.warn('Web speech speak failure:', e);
    }
  }
}
