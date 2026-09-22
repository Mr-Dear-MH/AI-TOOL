import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  Video,
  Upload,
  Play,
  Pause,
  RotateCcw,
  Download,
  Volume2,
  VolumeX,
  Languages,
  Sliders,
  Film,
  Camera,
  Layers,
  Wand2,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { SupportedLanguage, CameraMotionType, VisualStyleOption } from '../types';
import { SUPPORTED_50_LANGUAGES, VISUAL_STYLES, CAMERA_MOTIONS } from '../data/languages';
import { renderCinematicFrame, recordCanvasToVideo } from '../utils/videoRenderer';
import { SpeechEngine } from '../utils/speechEngine';

interface QuickGenViewProps {
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
}

export const QuickGenView: React.FC<QuickGenViewProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  // Mode: 'text-to-image' | 'image-to-video' | 'all-in-one'
  const [subMode, setSubMode] = useState<'all-in-one' | 'text-to-image' | 'image-to-video'>('all-in-one');

  // Input states
  const [prompt, setPrompt] = useState<string>(
    'A majestic snow leopard perched atop the mist-shrouded Himalayan peaks at sunrise, cinematic lighting, 8k documentary'
  );
  const [selectedStyle, setSelectedStyle] = useState<string>('cinematic');
  const [aspectRatio, setAspectRatio] = useState<'16:9' | '9:16' | '1:1'>('16:9');
  const [cameraMotion, setCameraMotion] = useState<CameraMotionType>('Cinematic Zoom In');
  const [duration, setDuration] = useState<number>(10); // 10s default, or 15s, 30s
  const [autoVoiceover, setAutoVoiceover] = useState<boolean>(true);
  const [voiceoverScript, setVoiceoverScript] = useState<string>(
    'ہمیشہ یاد رکھو کہ ہمالیہ کی چوٹیوں پر آزادی کی قیمت خاموشی اور صبر ہے۔'
  );

  // Image state
  const [currentImageSrc, setCurrentImageSrc] = useState<string>(
    'https://images.unsplash.com/photo-1546182990-dffeafbe841d?auto=format&fit=crop&w=1280&q=80'
  );
  const [imageObj, setImageObj] = useState<HTMLImageElement | null>(null);

  // Processing states
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [exportProgress, setExportProgress] = useState<number>(0);

  // Playback state
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [showCaptions, setShowCaptions] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const playbackStartTimeRef = useRef<number>(0);
  const speechEngine = useRef(SpeechEngine.getInstance());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Load image object whenever currentImageSrc changes
  useEffect(() => {
    if (!currentImageSrc) return;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setImageObj(img);
      drawCurrentFrame(0);
    };
    img.src = currentImageSrc;
  }, [currentImageSrc]);

  // Redraw when settings change
  useEffect(() => {
    drawCurrentFrame(currentTime / duration);
  }, [imageObj, cameraMotion, showCaptions, voiceoverScript, selectedLanguage]);

  const drawCurrentFrame = (progress: number) => {
    if (!canvasRef.current || !imageObj) return;
    renderCinematicFrame({
      canvas: canvasRef.current,
      image: imageObj,
      progress: Math.min(Math.max(progress, 0), 1),
      cameraMotion,
      captionText: showCaptions ? voiceoverScript : undefined,
      isRtl: selectedLanguage.rtl,
      aspectRatio,
    });
  };

  // Playback loop
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      speechEngine.current.stop();
      return;
    }

    if (autoVoiceover && !isMuted && voiceoverScript) {
      speechEngine.current.speak(voiceoverScript, selectedLanguage.code, {
        rate: 0.95,
      });
    }

    playbackStartTimeRef.current = performance.now() - currentTime * 1000;

    const tick = (now: number) => {
      const elapsedSec = (now - playbackStartTimeRef.current) / 1000;
      if (elapsedSec >= duration) {
        setCurrentTime(duration);
        setIsPlaying(false);
        drawCurrentFrame(1.0);
      } else {
        setCurrentTime(elapsedSec);
        drawCurrentFrame(elapsedSec / duration);
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying]);

  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (currentTime >= duration) {
        setCurrentTime(0);
      }
      setIsPlaying(true);
    }
  };

  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    playbackStartTimeRef.current = performance.now() - newTime * 1000;
    drawCurrentFrame(newTime / duration);
  };

  // 1-Click Generate Pipeline
  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setIsGenerating(true);
    setIsPlaying(false);
    speechEngine.current.stop();

    try {
      // Step 1: Script & Narration generation in selected language (Urdu / Hindi / 50+)
      setGenerationStep(`Writing cinematic script in ${selectedLanguage.name}...`);
      const scriptRes = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          duration: `${duration}s`,
          sceneCount: 1,
          language: selectedLanguage.name,
          languageCode: selectedLanguage.code,
          style: VISUAL_STYLES.find((s) => s.id === selectedStyle)?.name || 'Cinematic Movie',
          aspectRatio,
        }),
      });

      let generatedVoiceover = voiceoverScript;
      let generatedImagePrompt = prompt;

      if (scriptRes.ok) {
        const scriptData = await scriptRes.json();
        if (scriptData.scenes && scriptData.scenes.length > 0) {
          const scene = scriptData.scenes[0];
          if (scene.voiceoverText) {
            generatedVoiceover = scene.voiceoverText;
            setVoiceoverScript(scene.voiceoverText);
          }
          if (scene.visualPrompt) {
            generatedImagePrompt = scene.visualPrompt;
          }
          if (scene.cameraMotion) {
            setCameraMotion(scene.cameraMotion as CameraMotionType);
          }
        }
      }

      // Step 2: Image Generation (if in all-in-one or text-to-image)
      if (subMode !== 'image-to-video') {
        setGenerationStep('Generating AI Image with 8K Cinematic Lighting...');
        const imgRes = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: generatedImagePrompt,
            aspectRatio,
            style: VISUAL_STYLES.find((s) => s.id === selectedStyle)?.promptModifier || 'cinematic 8k',
            seed: Math.floor(Math.random() * 999999),
          }),
        });

        if (imgRes.ok) {
          const imgData = await imgRes.json();
          if (imgData.imageUrl) {
            setCurrentImageSrc(imgData.imageUrl);
          }
        }
      }

      // Step 3: Audio synthesis preparation
      setGenerationStep(`Synthesizing ${selectedLanguage.name} voiceover...`);
      try {
        await fetch('/api/generate-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: generatedVoiceover,
            language: selectedLanguage.name,
            languageCode: selectedLanguage.code,
            voice: 'Kore',
          }),
        });
      } catch (e) {
        console.warn('TTS fetch fallback', e);
      }

      setGenerationStep('Finalizing video animations & motion vectors...');
      setTimeout(() => {
        setIsGenerating(false);
        setGenerationStep('');
        setCurrentTime(0);
        setIsPlaying(true);
      }, 600);
    } catch (err: any) {
      console.error('Generation error:', err);
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  // Image Upload handler
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setCurrentImageSrc(event.target.result as string);
        setSubMode('image-to-video');
      }
    };
    reader.readAsDataURL(file);
  };

  // Export Video to File
  const handleExportVideo = async () => {
    if (!canvasRef.current || !imageObj) return;

    setIsExporting(true);
    setExportProgress(0);
    setIsPlaying(false);

    try {
      const blob = await recordCanvasToVideo(
        canvasRef.current,
        (progress) => {
          drawCurrentFrame(progress);
        },
        duration,
        30,
        (progress) => {
          setExportProgress(Math.round(progress * 100));
        }
      );

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `VeoStudio_${duration}s_${Date.now()}.webm`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error:', err);
    } finally {
      setIsExporting(false);
      drawCurrentFrame(0);
    }
  };

  const samplePrompts = [
    {
      title: 'Snow Leopard (Urdu)',
      text: 'A majestic snow leopard perched atop the mist-shrouded Himalayan peaks at sunrise, cinematic lighting, 8k documentary',
      lang: 'ur-PK',
      voice: 'ہمیشہ یاد رکھو کہ ہمالیہ کی چوٹیوں پر آزادی کی قیمت خاموشی اور صبر ہے۔',
    },
    {
      title: 'Cyberpunk City (Hindi)',
      text: 'Futuristic Cyberpunk neon city in the rain with holographic signs, flying cars and reflective wet asphalt',
      lang: 'hi-IN',
      voice: 'भविष्य की यह नियॉन नगरी कभी नहीं सोती, यहाँ हर परछाई एक नई दास्तान सुनाती है।',
    },
    {
      title: 'Historical Castle (English)',
      text: 'Ancient medieval stone castle perched dramatically over ocean cliffs during a dramatic thunder storm with lightning',
      lang: 'en-US',
      voice: 'For a thousand years, this fortress stood as an unyielding sentinel against the raging storms of time.',
    },
    {
      title: 'Arabian Desert (Arabic)',
      text: 'Golden desert sand dunes at sunset with a camel caravan traveling under an epic starry Milky Way sky',
      lang: 'ar-SA',
      voice: 'في قلب الصحراء الذهبية، تهمس الرمال بأسرار الحضارات القديمة تحت النجوم.',
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Studio Mode Selector */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2.5">
            <span>Text to Image & Image to Video</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
              Veo 3 Architecture
            </span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Generate images, animate into 10s–30s videos, and auto-attach native voice narration in{' '}
            <span className="text-amber-400 font-medium">{selectedLanguage.name}</span> & 50+ languages.
          </p>
        </div>

        {/* Submode pill */}
        <div className="flex items-center p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
          <button
            id="submode-all-in-one"
            onClick={() => setSubMode('all-in-one')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subMode === 'all-in-one'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            ⚡ 1-Click All-in-One (Image + Video + Voice)
          </button>
          <button
            id="submode-text-to-image"
            onClick={() => setSubMode('text-to-image')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subMode === 'text-to-image'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Text to Image
          </button>
          <button
            id="submode-image-to-video"
            onClick={() => setSubMode('image-to-video')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              subMode === 'image-to-video'
                ? 'bg-amber-500 text-neutral-950 shadow-sm'
                : 'text-neutral-400 hover:text-neutral-200'
            }`}
          >
            Image to Video
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Control Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Prompt Section */}
          <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <label htmlFor="prompt-input" className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
                <Wand2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Text Prompt / Visual Idea</span>
              </label>
              <div className="text-[11px] text-neutral-500">Supports Urdu, Hindi, Roman Urdu, English</div>
            </div>

            <textarea
              id="prompt-input"
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. A futuristic Cyberpunk street in Lahore during rain, or ek jungle mein sher..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl p-3 text-sm text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500 transition-colors resize-none"
            />

            {/* Quick Inspiration Badges */}
            <div className="space-y-1.5">
              <span className="text-[11px] text-neutral-400 font-medium">Quick Presets:</span>
              <div className="flex flex-wrap gap-1.5">
                {samplePrompts.map((s, idx) => (
                  <button
                    key={idx}
                    id={`sample-prompt-${idx}`}
                    onClick={() => {
                      setPrompt(s.text);
                      const targetLang = SUPPORTED_50_LANGUAGES.find((l) => l.code === s.lang);
                      if (targetLang) onLanguageChange(targetLang);
                      setVoiceoverScript(s.voice);
                    }}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-neutral-800/80 hover:bg-neutral-800 text-neutral-300 hover:text-amber-300 border border-neutral-700/50 transition-colors"
                  >
                    {s.title}
                  </button>
                ))}
              </div>
            </div>

            {/* Image to Video Upload Area */}
            {subMode === 'image-to-video' && (
              <div className="pt-2 border-t border-neutral-800">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                  id="image-file-input"
                />
                <button
                  id="btn-upload-image"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 border-dashed border-neutral-700 hover:border-amber-500/80 bg-neutral-950/60 hover:bg-neutral-950 text-xs font-semibold text-neutral-300 hover:text-amber-300 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-amber-400" />
                  <span>Upload Custom Image to Animate into Video</span>
                </button>
              </div>
            )}
          </div>

          {/* Video & Voice Settings Panel */}
          <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 shadow-xl space-y-4">
            <h2 className="text-xs font-bold uppercase tracking-wider text-neutral-300 flex items-center gap-2">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Camera Motion & Auto Voiceover</span>
            </h2>

            {/* Camera Motion Selector */}
            <div className="space-y-1.5">
              <label htmlFor="camera-motion-select" className="text-xs text-neutral-400 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-neutral-400" />
                <span>Camera Motion Preset:</span>
              </label>
              <select
                id="camera-motion-select"
                value={cameraMotion}
                onChange={(e) => setCameraMotion(e.target.value as CameraMotionType)}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-medium text-neutral-200 focus:outline-none focus:border-amber-500"
              >
                {CAMERA_MOTIONS.map((cm) => (
                  <option key={cm.id} value={cm.id}>
                    {cm.icon} {cm.label} — {cm.desc}
                  </option>
                ))}
              </select>
            </div>

            {/* Duration Selector (10s to 30s) */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="text-neutral-400 flex items-center gap-1.5">
                  <Film className="w-3.5 h-3.5 text-neutral-400" />
                  <span>Video Clip Duration:</span>
                </span>
                <span className="font-bold text-amber-400">{duration} Seconds</span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[10, 15, 30].map((sec) => (
                  <button
                    key={sec}
                    id={`btn-duration-${sec}s`}
                    onClick={() => setDuration(sec)}
                    className={`py-2 rounded-xl text-xs font-semibold border transition-all ${
                      duration === sec
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                        : 'bg-neutral-950 border-neutral-800 text-neutral-400 hover:text-neutral-200'
                    }`}
                  >
                    {sec} Seconds
                  </button>
                ))}
              </div>
            </div>

            {/* 50 Language Auto Voiceover */}
            <div className="pt-3 border-t border-neutral-800 space-y-3">
              <div className="flex items-center justify-between">
                <label htmlFor="voice-language-select" className="text-xs font-semibold text-neutral-200 flex items-center gap-2">
                  <Languages className="w-4 h-4 text-amber-400" />
                  <span>Auto Voice Language (50+ Available):</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="auto-voiceover-toggle"
                    checked={autoVoiceover}
                    onChange={(e) => setAutoVoiceover(e.target.checked)}
                    className="w-4 h-4 accent-amber-500 cursor-pointer"
                  />
                  <label htmlFor="auto-voiceover-toggle" className="text-xs text-neutral-400 cursor-pointer">
                    Auto-Dub
                  </label>
                </div>
              </div>

              <select
                id="voice-language-select"
                value={selectedLanguage.code}
                onChange={(e) => {
                  const found = SUPPORTED_50_LANGUAGES.find((l) => l.code === e.target.value);
                  if (found) onLanguageChange(found);
                }}
                className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-medium text-neutral-200 focus:outline-none focus:border-amber-500"
              >
                {SUPPORTED_50_LANGUAGES.map((l) => (
                  <option key={l.code} value={l.code}>
                    {l.flag} {l.name} ({l.nativeName})
                  </option>
                ))}
              </select>

              {/* Editable Voiceover Script */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-neutral-400">
                  <span>Voiceover Script ({selectedLanguage.name}):</span>
                  <button
                    id="btn-preview-speech"
                    onClick={() => {
                      speechEngine.current.speak(voiceoverScript, selectedLanguage.code);
                    }}
                    className="text-amber-400 hover:text-amber-300 font-medium flex items-center gap-1"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Test Voice</span>
                  </button>
                </div>
                <textarea
                  id="voiceover-script-input"
                  rows={2}
                  dir={selectedLanguage.rtl ? 'rtl' : 'ltr'}
                  value={voiceoverScript}
                  onChange={(e) => setVoiceoverScript(e.target.value)}
                  className={`w-full bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500 ${
                    selectedLanguage.rtl ? 'font-serif text-sm' : ''
                  }`}
                  placeholder={`Narration text in ${selectedLanguage.name}...`}
                />
              </div>
            </div>

            {/* Visual Style & Aspect Ratio */}
            <div className="pt-3 border-t border-neutral-800 grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="visual-style-select" className="text-[11px] text-neutral-400 block mb-1">Visual Style:</label>
                <select
                  id="visual-style-select"
                  value={selectedStyle}
                  onChange={(e) => setSelectedStyle(e.target.value)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                >
                  {VISUAL_STYLES.map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label htmlFor="aspect-ratio-select" className="text-[11px] text-neutral-400 block mb-1">Aspect Ratio:</label>
                <select
                  id="aspect-ratio-select"
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as any)}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-2.5 py-1.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                >
                  <option value="16:9">16:9 (Landscape / YouTube)</option>
                  <option value="9:16">9:16 (Portrait / Reels / TikTok)</option>
                  <option value="1:1">1:1 (Square / Instagram)</option>
                </select>
              </div>
            </div>

            {/* Main Action Button */}
            <button
              id="btn-generate-main"
              disabled={isGenerating}
              onClick={handleGenerate}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-neutral-950 font-bold text-sm shadow-lg shadow-amber-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                  <span>{generationStep || 'Generating Multimedia...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-neutral-950" />
                  <span>
                    {subMode === 'text-to-image'
                      ? 'Generate Text to Image'
                      : subMode === 'image-to-video'
                      ? `Convert Image to ${duration}s Video`
                      : `Generate ${duration}s AI Video + Auto ${selectedLanguage.name} Voice`}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Video Canvas & Player (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 shadow-2xl space-y-4">
            {/* Top Player Status Bar */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Veo Cinema Canvas
                </span>
                <span className="text-[11px] text-neutral-400 px-2 py-0.5 rounded-md bg-neutral-800">
                  {cameraMotion}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-toggle-captions"
                  onClick={() => setShowCaptions(!showCaptions)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                    showCaptions
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                  title="Toggle Subtitles / Captions"
                >
                  CC {selectedLanguage.flag}
                </button>

                <button
                  id="btn-toggle-mute"
                  onClick={() => setIsMuted(!isMuted)}
                  className="p-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-neutral-300 border border-neutral-700 transition-colors"
                  title={isMuted ? 'Unmute' : 'Mute Voiceover'}
                >
                  {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-neutral-200" />}
                </button>
              </div>
            </div>

            {/* Video Canvas Container */}
            <div
              className={`relative mx-auto rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-inner flex items-center justify-center ${
                aspectRatio === '9:16'
                  ? 'w-[320px] h-[568px]'
                  : aspectRatio === '1:1'
                  ? 'w-full max-w-[500px] aspect-square'
                  : 'w-full aspect-video'
              }`}
            >
              <canvas
                id="main-video-canvas"
                ref={canvasRef}
                width={aspectRatio === '9:16' ? 720 : aspectRatio === '1:1' ? 1024 : 1280}
                height={aspectRatio === '9:16' ? 1280 : aspectRatio === '1:1' ? 1024 : 720}
                className="w-full h-full object-contain cursor-pointer"
                onClick={handlePlayToggle}
              />

              {/* Center Play Overlay when paused */}
              {!isPlaying && (
                <button
                  id="canvas-play-overlay"
                  onClick={handlePlayToggle}
                  className="absolute w-16 h-16 rounded-full bg-neutral-900/80 hover:bg-amber-500 text-neutral-100 hover:text-neutral-950 border border-neutral-700 hover:border-amber-400 flex items-center justify-center shadow-2xl backdrop-blur-sm transition-all transform hover:scale-105"
                  title="Play Video"
                >
                  <Play className="w-7 h-7 ml-1 fill-current" />
                </button>
              )}

              {/* Generating loading overlay */}
              {isGenerating && (
                <div className="absolute inset-0 bg-neutral-950/80 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center space-y-3 z-20">
                  <div className="relative">
                    <div className="w-14 h-14 rounded-full border-2 border-amber-500/20 border-t-amber-400 animate-spin" />
                    <Sparkles className="w-6 h-6 text-amber-400 absolute inset-0 m-auto animate-pulse" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-semibold text-neutral-100">{generationStep}</p>
                    <p className="text-xs text-neutral-400">Synthesizing frames & audio streams...</p>
                  </div>
                </div>
              )}
            </div>

            {/* Timeline Scrubber & Controls */}
            <div className="space-y-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              {/* Progress Slider */}
              <div className="space-y-1">
                <input
                  id="timeline-slider"
                  type="range"
                  min={0}
                  max={duration}
                  step={0.1}
                  value={currentTime}
                  onChange={(e) => handleSeek(parseFloat(e.target.value))}
                  className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                  <span>00:{Math.floor(currentTime).toString().padStart(2, '0')}</span>
                  <span>00:{duration.toString().padStart(2, '0')}</span>
                </div>
              </div>

              {/* Control Buttons */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    id="btn-play-pause"
                    onClick={handlePlayToggle}
                    className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-all shadow-md shadow-amber-500/20"
                    title={isPlaying ? 'Pause' : 'Play'}
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
                  </button>

                  <button
                    id="btn-restart-video"
                    onClick={() => handleSeek(0)}
                    className="p-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 transition-colors"
                    title="Restart Video"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  <span className="text-xs font-semibold text-neutral-300 ml-2">
                    {selectedLanguage.flag} {selectedLanguage.name} Voiceover Synced
                  </span>
                </div>

                {/* Export & Download Button */}
                <button
                  id="btn-export-video"
                  disabled={isExporting || isGenerating}
                  onClick={handleExportVideo}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 hover:text-amber-300 border border-neutral-700 font-semibold text-xs transition-all shadow-sm cursor-pointer disabled:opacity-50"
                  title="Download actual video file"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Exporting {exportProgress}%</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Export Video (WebM/MP4)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Feature Checklist Tags */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Text to Image 8K</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>Image to Video</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>50+ Lang Voiceover</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-neutral-400 bg-neutral-950/60 p-2 rounded-lg border border-neutral-800/80">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span>10s–30s Video Export</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
