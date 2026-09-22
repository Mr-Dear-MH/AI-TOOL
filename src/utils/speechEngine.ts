/**
 * Speech Engine supporting 50+ languages with Web Speech API and Gemini TTS audio
 */

export class SpeechEngine {
  private static instance: SpeechEngine;
  private synth: SpeechSynthesis | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;
  private currentAudio: HTMLAudioElement | null = null;

  private constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
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
    if (this.synth) {
      this.synth.cancel();
    }
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  public speak(
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
  ): void {
    this.stop();

    // If we have Gemini generated audio base64:
    if (options?.audioBase64) {
      try {
        const audio = new Audio(`data:audio/mp3;base64,${options.audioBase64}`);
        this.currentAudio = audio;
        if (options.onStart) audio.onplay = options.onStart;
        if (options.onEnd) audio.onended = options.onEnd;
        if (options.onError) audio.onerror = options.onError;
        audio.play().catch((e) => {
          console.warn('Audio play failed, falling back to Web Speech:', e);
          this.speakWithWebSpeech(text, languageCode, options);
        });
        return;
      } catch (e) {
        console.warn('Fallback to Web Speech API', e);
      }
    }

    this.speakWithWebSpeech(text, languageCode, options);
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

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = languageCode;
    utterance.pitch = options?.pitch ?? 1.0;
    utterance.rate = options?.rate ?? 0.95;

    // Pick best matching voice
    const voices = this.synth.getVoices();
    const primaryCode = languageCode.split('-')[0].toLowerCase();
    const matchingVoice =
      voices.find((v) => v.lang.toLowerCase() === languageCode.toLowerCase()) ||
      voices.find((v) => v.lang.toLowerCase().startsWith(primaryCode));

    if (matchingVoice) {
      utterance.voice = matchingVoice;
    }

    if (options?.onStart) utterance.onstart = options.onStart;
    if (options?.onEnd) utterance.onend = options.onEnd;
    if (options?.onError) utterance.onerror = options.onError;

    this.currentUtterance = utterance;
    this.synth.speak(utterance);
  }
}
