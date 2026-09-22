import React, { useState, useRef } from 'react';
import {
  Mic,
  Volume2,
  Play,
  Square,
  Sparkles,
  Globe2,
  Sliders,
  Download,
  Copy,
  Check,
  Languages,
  Wand2,
  RotateCcw,
} from 'lucide-react';
import { SupportedLanguage } from '../types';
import { SUPPORTED_50_LANGUAGES } from '../data/languages';
import { SpeechEngine } from '../utils/speechEngine';

interface VoiceDubbingViewProps {
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
}

export const VoiceDubbingView: React.FC<VoiceDubbingViewProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  const [inputText, setInputText] = useState<string>(
    'یہ ویو تھری اور جدید مصنوعی ذہانت کا دور ہے، جہاں آپ اپنے خیالات کو شاندار تصاویر اور ویڈیو میں بدل سکتے ہیں۔'
  );
  const [pitch, setPitch] = useState<number>(1.0);
  const [rate, setRate] = useState<number>(0.95);
  const [voiceGender, setVoiceGender] = useState<string>('Kore'); // Kore, Puck, Zephyr, Fenrir, Charon
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const speechEngine = useRef(SpeechEngine.getInstance());

  const handleSpeak = () => {
    if (!inputText.trim()) return;

    setIsPlaying(true);
    speechEngine.current.speak(inputText, selectedLanguage.code, {
      pitch,
      rate,
      onStart: () => setIsPlaying(true),
      onEnd: () => setIsPlaying(false),
      onError: () => setIsPlaying(false),
    });
  };

  const handleStop = () => {
    speechEngine.current.stop();
    setIsPlaying(false);
  };

  // AI Auto-translate & Enhance Narration Script in Selected Language
  const handleAITranslate = async () => {
    if (!inputText.trim()) return;

    setIsTranslating(true);
    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `Translate and polish this narration for a cinematic video in ${selectedLanguage.name}: "${inputText}"`,
          duration: '15s',
          sceneCount: 1,
          language: selectedLanguage.name,
          languageCode: selectedLanguage.code,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.scenes?.[0]?.voiceoverText) {
          setInputText(data.scenes[0].voiceoverText);
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(inputText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Preset sample scripts for quick testing in various languages
  const sampleLanguageTexts: { [code: string]: string } = {
    'ur-PK': 'یہ ویو تھری اور جدید مصنوعی ذہانت کا دور ہے، جہاں آپ کے الفاظ حقیقت بنتے ہیں۔',
    'hi-IN': 'यह वियो 3 और आधुनिक कृत्रिम बुद्धिमत्ता का युग है, जहाँ आपके शब्द जीवंत दृश्यों में बदल जाते हैं।',
    'en-US': 'Welcome to Veo 3 Studio, where the boundary between imagination and cinema dissolves.',
    'ar-SA': 'مرحبًا بكم في استوديو فيو 3، حيث تلتقي الكلمات بأحدث تقنيات الذكاء الاصطناعي لتصنع المعجزات.',
    'pa-IN': 'ਇਹ ਏਆਈ ਦਾ ਨਵਾਂ ਦੌਰ ਹੈ, ਜਿੱਥੇ ਤੁਹਾਡੀ ਸੋਚ ਸ਼ਾਨਦਾਰ ਵੀਡੀਓ ਬਣ ਜਾਂਦੀ ਹੈ।',
    'tr-TR': 'Veo 3 stüdyosuna hoş geldiniz; hayal gücünüzün sinematik bir başyapıta dönüştüğü yer.',
    'es-ES': 'Bienvenidos a la nueva era de generación de video e inteligencia artificial con Veo 3.',
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2.5">
          <Mic className="w-6 h-6 text-amber-400" />
          <span>50+ Languages Multilingual Voice Dubbing Lab</span>
        </h1>
        <p className="text-sm text-neutral-400 mt-1">
          Auto-synthesize natural narration scripts in Urdu, Hindi, Punjabi, Arabic, and 50+ languages with emotion and cadence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Input Text & Language Selector (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="voice-lab-lang-select" className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                <Globe2 className="w-4 h-4 text-amber-400" />
                <span>Active Narration Language:</span>
              </label>
              <span className="text-xs text-amber-400 font-semibold">
                {selectedLanguage.flag} {selectedLanguage.name} ({selectedLanguage.nativeName})
              </span>
            </div>

            {/* Language grid picker */}
            <div className="space-y-1.5">
              <select
                id="voice-lab-lang-select"
                value={selectedLanguage.code}
                onChange={(e) => {
                  const found = SUPPORTED_50_LANGUAGES.find((l) => l.code === e.target.value);
                  if (found) {
                    onLanguageChange(found);
                    if (sampleLanguageTexts[found.code]) {
                      setInputText(sampleLanguageTexts[found.code]);
                    }
                  }
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-xs font-medium text-neutral-200 focus:outline-none focus:border-amber-500"
              >
                {SUPPORTED_50_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code}>
                    {lang.flag} {lang.name} — {lang.nativeName} ({lang.code})
                  </option>
                ))}
              </select>
            </div>

            {/* Narration Script Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="narration-script-textarea" className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                  Voiceover Script Text:
                </label>
                <div className="flex items-center gap-2">
                  <button
                    id="btn-ai-translate"
                    disabled={isTranslating}
                    onClick={handleAITranslate}
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1 disabled:opacity-50"
                  >
                    <Wand2 className="w-3 h-3" />
                    <span>{isTranslating ? 'Polishing...' : `AI Translate to ${selectedLanguage.name}`}</span>
                  </button>

                  <button
                    id="btn-copy-voice-text"
                    onClick={handleCopy}
                    className="text-[11px] text-neutral-400 hover:text-neutral-200 font-medium flex items-center gap-1"
                  >
                    {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              <textarea
                id="narration-script-textarea"
                rows={5}
                dir={selectedLanguage.rtl ? 'rtl' : 'ltr'}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                className={`w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors ${
                  selectedLanguage.rtl ? 'font-serif text-base' : ''
                }`}
                placeholder={`Type or paste speech in ${selectedLanguage.name}...`}
              />
            </div>

            {/* Action buttons */}
            <div className="flex items-center gap-3">
              <button
                id="btn-voice-play-main"
                onClick={isPlaying ? handleStop : handleSpeak}
                className={`flex-1 py-3 px-6 rounded-xl font-bold text-xs shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  isPlaying
                    ? 'bg-rose-500 hover:bg-rose-400 text-neutral-950 shadow-rose-500/20'
                    : 'bg-amber-500 hover:bg-amber-400 text-neutral-950 shadow-amber-500/20'
                }`}
              >
                {isPlaying ? (
                  <>
                    <Square className="w-4 h-4 fill-current" />
                    <span>Stop Speech</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Voice ({selectedLanguage.name})</span>
                  </>
                )}
              </button>

              <button
                id="btn-reset-voice-text"
                onClick={() => {
                  setInputText(sampleLanguageTexts[selectedLanguage.code] || 'Veo 3 AI Studio Voice Test');
                }}
                className="p-3 rounded-xl bg-neutral-950 hover:bg-neutral-800 text-neutral-400 hover:text-neutral-200 border border-neutral-800 transition-colors"
                title="Reset to Default"
              >
                <RotateCcw className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Right: Audio Tuner & Voice Models (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 shadow-xl space-y-5">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Voice Character & Acoustics</span>
            </h2>

            {/* Voice Model Preset */}
            <div className="space-y-1.5">
              <label htmlFor="voice-model-preset-select" className="text-xs text-neutral-400">Voice Profile Preset:</label>
              <select
                id="voice-model-preset-select"
                value={voiceGender}
                onChange={(e) => setVoiceGender(e.target.value)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-semibold text-neutral-200 focus:outline-none focus:border-amber-500"
              >
                <option value="Kore">Kore — Epic & Balanced Cinematic Narrator (Recommended)</option>
                <option value="Puck">Puck — Energetic, Modern & Warm Storyteller</option>
                <option value="Zephyr">Zephyr — Deep, Atmospheric & Documentary Voice</option>
                <option value="Fenrir">Fenrir — Powerful, Intense & Dramatic</option>
                <option value="Charon">Charon — Resonant, Calm & Authoritative</option>
              </select>
            </div>

            {/* Pitch slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Voice Pitch:</span>
                <span className="font-mono text-amber-400">{pitch.toFixed(2)}x</span>
              </div>
              <input
                id="pitch-slider"
                type="range"
                min="0.5"
                max="1.5"
                step="0.05"
                value={pitch}
                onChange={(e) => setPitch(parseFloat(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* Speech Rate slider */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400">Speaking Cadence / Speed:</span>
                <span className="font-mono text-amber-400">{rate.toFixed(2)}x</span>
              </div>
              <input
                id="rate-slider"
                type="range"
                min="0.6"
                max="1.4"
                step="0.05"
                value={rate}
                onChange={(e) => setRate(parseFloat(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
              />
            </div>

            {/* 50 Language Support Badge List */}
            <div className="pt-3 border-t border-neutral-800 space-y-2">
              <span className="text-xs text-neutral-400 font-medium">All 50+ Languages Included:</span>
              <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto pr-1">
                {SUPPORTED_50_LANGUAGES.map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      onLanguageChange(lang);
                      if (sampleLanguageTexts[lang.code]) {
                        setInputText(sampleLanguageTexts[lang.code]);
                      }
                    }}
                    className={`text-[11px] px-2 py-0.5 rounded-md border transition-colors ${
                      selectedLanguage.code === lang.code
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {lang.flag} {lang.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
