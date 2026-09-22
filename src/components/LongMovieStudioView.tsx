import React, { useState, useRef, useEffect } from 'react';
import {
  Film,
  Sparkles,
  Play,
  Pause,
  RotateCcw,
  Download,
  Volume2,
  Clock,
  ChevronRight,
  Layers,
  Wand2,
  Loader2,
  CheckCircle2,
  ListOrdered,
  Maximize2,
  Upload,
  Camera,
  RefreshCw,
  Sliders,
} from 'lucide-react';
import { SceneItem, SupportedLanguage, CameraMotionType } from '../types';
import { SUPPORTED_50_LANGUAGES, DURATION_OPTIONS, VISUAL_STYLES, CAMERA_MOTIONS } from '../data/languages';
import { renderCinematicFrame, recordCanvasToVideo } from '../utils/videoRenderer';
import { SpeechEngine } from '../utils/speechEngine';

interface LongMovieStudioViewProps {
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
}

export const LongMovieStudioView: React.FC<LongMovieStudioViewProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  const [movieTitle, setMovieTitle] = useState<string>('The Lost Civilization of Indus Valley');
  const [movieStoryline, setMovieStoryline] = useState<string>(
    'An epic historical documentary exploring the majestic bronze age metropolis of Mohenjo-daro and Harappa, their advanced architecture, mysterious script, and eventual vanishing beneath the desert sands.'
  );
  const [targetDuration, setTargetDuration] = useState<string>('20m'); // '10m', '20m', '30m'
  const [selectedStyle, setSelectedStyle] = useState<string>('cinematic');
  const [isGeneratingStory, setIsGeneratingStory] = useState<boolean>(false);
  const [isGeneratingVisuals, setIsGeneratingVisuals] = useState<boolean>(false);

  // Scenes list
  const [scenes, setScenes] = useState<SceneItem[]>([
    {
      id: 'scene-1',
      sceneNumber: 1,
      title: 'Chapter 1: The Bronze Age Dawn',
      durationSeconds: 12,
      visualPrompt: 'Expansive aerial cinematic drone flyover of the ancient brick city of Mohenjo-daro at dawn, great bath and granaries, 8k documentary style',
      voiceoverText: 'پانچ ہزار سال پہلے، دریائے سندھ کے زرخیز کنارے دنیا کی سب سے منظم اور پرامن تہذیب کا گہوارہ بنے۔',
      captionText: 'پانچ ہزار سال پہلے، دریائے سندھ کے زرخیز کنارے...',
      cameraMotion: 'Dynamic Drone Sweep',
      imageUrl: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=1280&q=80',
      status: 'ready',
    },
    {
      id: 'scene-2',
      sceneNumber: 2,
      title: 'Chapter 2: Master Engineers of the Citadel',
      durationSeconds: 14,
      visualPrompt: 'Close up tracking shot through ancient paved brick streets with covered drainage systems, citizens in terracotta robes, soft natural dust lighting',
      voiceoverText: 'یہاں کے معماروں نے بغیر کسی شاہی محل یا جبر کے، دنیا کا سب سے پہلا پختہ نکاسیِ آب کا نظام قائم کیا۔',
      captionText: 'دنیا کا سب سے پہلا پختہ نکاسیِ آب کا نظام قائم کیا...',
      cameraMotion: 'Pan Left to Right',
      imageUrl: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1280&q=80',
      status: 'ready',
    },
    {
      id: 'scene-3',
      sceneNumber: 3,
      title: 'Chapter 3: The Enigmatic Dancing Girl & Priest King',
      durationSeconds: 12,
      visualPrompt: 'Museum quality macro lighting revealing the bronze statue of the dancing girl and the steatite priest-king, 35mm shallow depth of field',
      voiceoverText: 'کانسی کی رقاصہ اور پروقار کاہن کا مجسمہ آج بھی ان کے فن اور اعتماد کی ابدی گواہی دیتے ہیں۔',
      captionText: 'کانسی کی رقاصہ اور پروقار کاہن کا مجسمہ...',
      cameraMotion: 'Cinematic Zoom In',
      imageUrl: 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=1280&q=80',
      status: 'ready',
    },
    {
      id: 'scene-4',
      sceneNumber: 4,
      title: 'Chapter 4: The Vanishing Waters & Silence of the Sands',
      durationSeconds: 15,
      visualPrompt: 'Dramatic sunset over cracked dry riverbed of ancient Sarasvati / Hakra, wind blowing dust across lonely ruins, cinematic twilight',
      voiceoverText: 'جب دریاؤں نے اپنا راستہ بدلا تو وقت کے ساتھ یہ عظیم شہر خاموش ہو گیا، مگر اس کی روح آج بھی زندہ ہے۔',
      captionText: 'جب دریاؤں نے اپنا راستہ بدلا تو عظیم شہر خاموش ہو گیا...',
      cameraMotion: 'Dramatic Zoom Out',
      imageUrl: 'https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=1280&q=80',
      status: 'ready',
    },
  ]);

  // Active scene & player state
  const [currentSceneIndex, setCurrentSceneIndex] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [sceneProgress, setSceneProgress] = useState<number>(0);
  const [showSubtitles, setShowSubtitles] = useState<boolean>(true);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const sceneStartTimeRef = useRef<number>(0);
  const cachedImages = useRef<Map<string, HTMLImageElement>>(new Map());
  const speechEngine = useRef(SpeechEngine.getInstance());
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const currentScene = scenes[currentSceneIndex] || scenes[0];

  // Preload scene images
  useEffect(() => {
    scenes.forEach((sc) => {
      if (sc.imageUrl && !cachedImages.current.has(sc.imageUrl)) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = sc.imageUrl;
        img.onload = () => {
          cachedImages.current.set(sc.imageUrl!, img);
          if (sc.id === currentScene.id) {
            drawSceneFrame(sc, 0);
          }
        };
        img.onerror = () => {
          console.warn('Failed to load scene image, fallback enabled:', sc.imageUrl);
        };
      }
    });
  }, [scenes]);

  const drawSceneFrame = (scene: SceneItem, progress: number) => {
    if (!canvasRef.current) return;
    const img = scene.imageUrl ? cachedImages.current.get(scene.imageUrl) : undefined;

    renderCinematicFrame({
      canvas: canvasRef.current,
      image: img as HTMLImageElement,
      progress,
      cameraMotion: scene.cameraMotion,
      captionText: showSubtitles ? scene.voiceoverText : undefined,
      isRtl: selectedLanguage.rtl,
    });
  };

  // Immediate redraw whenever active scene or visual settings change
  useEffect(() => {
    if (currentScene.imageUrl) {
      const existing = cachedImages.current.get(currentScene.imageUrl);
      if (existing && existing.complete) {
        drawSceneFrame(currentScene, sceneProgress);
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = currentScene.imageUrl;
        img.onload = () => {
          cachedImages.current.set(currentScene.imageUrl!, img);
          drawSceneFrame(currentScene, sceneProgress);
        };
        img.onerror = () => {
          drawSceneFrame(currentScene, sceneProgress);
        };
      }
    } else {
      drawSceneFrame(currentScene, sceneProgress);
    }
  }, [currentSceneIndex, currentScene.imageUrl, currentScene.cameraMotion, currentScene.voiceoverText, showSubtitles]);

  // Playback control
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      speechEngine.current.stop();
      return;
    }

    // Speak active scene
    if (currentScene.voiceoverText) {
      speechEngine.current.speak(currentScene.voiceoverText, selectedLanguage.code, {
        audioBase64: currentScene.audioBase64,
      });
    }

    sceneStartTimeRef.current = performance.now() - sceneProgress * currentScene.durationSeconds * 1000;

    const tick = (now: number) => {
      const elapsedSec = (now - sceneStartTimeRef.current) / 1000;
      const prog = elapsedSec / currentScene.durationSeconds;

      if (prog >= 1.0) {
        // Move to next scene if available
        if (currentSceneIndex < scenes.length - 1) {
          setCurrentSceneIndex((prev) => prev + 1);
          setSceneProgress(0);
        } else {
          setIsPlaying(false);
          setSceneProgress(1.0);
        }
      } else {
        setSceneProgress(prog);
        drawSceneFrame(currentScene, prog);
        animationFrameRef.current = requestAnimationFrame(tick);
      }
    };

    animationFrameRef.current = requestAnimationFrame(tick);

    return () => {
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
    };
  }, [isPlaying, currentSceneIndex]);

  const handlePlayToggle = () => {
    if (isPlaying) {
      setIsPlaying(false);
    } else {
      if (sceneProgress >= 1.0) {
        setSceneProgress(0);
      }
      setIsPlaying(true);
    }
  };

  // Upload Custom Image for Active Scene
  const handleUploadSceneImage = (sceneIndex: number, file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = result;
        img.onload = () => {
          cachedImages.current.set(result, img);
          setScenes((prev) =>
            prev.map((s, idx) =>
              idx === sceneIndex
                ? {
                    ...s,
                    imageUrl: result,
                    status: 'ready',
                  }
                : s
            )
          );
          if (sceneIndex === currentSceneIndex) {
            drawSceneFrame({ ...scenes[sceneIndex], imageUrl: result }, sceneProgress);
          }
        };
      }
    };
    reader.readAsDataURL(file);
  };

  // Generate / Regenerate AI Visual for Single Scene
  const handleGenerateSingleSceneVisual = async (sceneIndex: number) => {
    const sc = scenes[sceneIndex];
    if (!sc) return;

    setScenes((prev) =>
      prev.map((s, idx) => (idx === sceneIndex ? { ...s, isGenerating: true } : s))
    );

    try {
      const res = await fetch('/api/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: sc.visualPrompt,
          aspectRatio: '16:9',
          style: VISUAL_STYLES.find((s) => s.id === selectedStyle)?.promptModifier || 'cinematic 8k',
          seed: Math.floor(Math.random() * 999999) + sceneIndex * 19,
        }),
      });

      if (res.ok) {
        const imgData = await res.json();
        const imgUrl = imgData.imageUrl;
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = imgUrl;
        img.onload = () => {
          cachedImages.current.set(imgUrl, img);
          setScenes((prev) =>
            prev.map((s, idx) =>
              idx === sceneIndex
                ? { ...s, imageUrl: imgUrl, status: 'ready', isGenerating: false }
                : s
            )
          );
          if (sceneIndex === currentSceneIndex) {
            drawSceneFrame({ ...sc, imageUrl: imgUrl }, sceneProgress);
          }
        };
      }
    } catch (err) {
      console.error(`Error generating visual for scene ${sceneIndex + 1}:`, err);
    } finally {
      setScenes((prev) =>
        prev.map((s, idx) => (idx === sceneIndex ? { ...s, isGenerating: false } : s))
      );
    }
  };

  // Test Scene Voice with Real TTS
  const handleTestSceneVoice = async (sceneIndex: number) => {
    const sc = scenes[sceneIndex];
    if (!sc || !sc.voiceoverText) return;

    if (!sc.audioBase64) {
      try {
        const res = await fetch('/api/generate-tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: sc.voiceoverText,
            language: selectedLanguage.name,
            languageCode: selectedLanguage.code,
          }),
        });
        if (res.ok) {
          const data = await res.json();
          if (data.audioBase64) {
            setScenes((prev) =>
              prev.map((s, idx) =>
                idx === sceneIndex ? { ...s, audioBase64: data.audioBase64 } : s
              )
            );
            speechEngine.current.speak(sc.voiceoverText, selectedLanguage.code, {
              audioBase64: data.audioBase64,
            });
            return;
          }
        }
      } catch (e) {
        console.warn('Scene TTS fetch error', e);
      }
    }

    speechEngine.current.speak(sc.voiceoverText, selectedLanguage.code, {
      audioBase64: sc.audioBase64,
    });
  };

  // Generate Long Storyboard with Gemini
  const handleGenerateLongStory = async () => {
    if (!movieStoryline.trim()) return;

    setIsGeneratingStory(true);
    setIsPlaying(false);
    speechEngine.current.stop();

    const selectedDurObj = DURATION_OPTIONS.find((d) => d.id === targetDuration);
    const sceneCount = selectedDurObj?.scenes || 8;

    try {
      const res = await fetch('/api/generate-script', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${movieTitle}: ${movieStoryline}`,
          duration: targetDuration,
          sceneCount: Math.min(sceneCount, 16), // Generate cohesive scenes
          language: selectedLanguage.name,
          languageCode: selectedLanguage.code,
          style: VISUAL_STYLES.find((s) => s.id === selectedStyle)?.name || 'Cinematic Movie',
          aspectRatio: '16:9',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.scenes && data.scenes.length > 0) {
          const newScenes: SceneItem[] = data.scenes.map((sc: any, idx: number) => ({
            id: `scene-${idx + 1}`,
            sceneNumber: sc.sceneNumber || idx + 1,
            title: sc.title || `Chapter ${idx + 1}`,
            durationSeconds: sc.durationSeconds || 12,
            visualPrompt: sc.visualPrompt,
            voiceoverText: sc.voiceoverText,
            captionText: sc.captionText || sc.voiceoverText,
            cameraMotion: (sc.cameraMotion as CameraMotionType) || 'Cinematic Zoom In',
            imageUrl: undefined,
            status: 'pending',
          }));

          setScenes(newScenes);
          setCurrentSceneIndex(0);
          setSceneProgress(0);
        }
      }
    } catch (err) {
      console.error('Long story generation error:', err);
    } finally {
      setIsGeneratingStory(false);
    }
  };

  // Generate All Visuals for Scenes
  const handleGenerateAllSceneVisuals = async () => {
    setIsGeneratingVisuals(true);

    for (let i = 0; i < scenes.length; i++) {
      const sc = scenes[i];
      if (sc.imageUrl) continue;

      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: sc.visualPrompt,
            aspectRatio: '16:9',
            style: VISUAL_STYLES.find((s) => s.id === selectedStyle)?.promptModifier || 'cinematic 8k',
            seed: Math.floor(Math.random() * 999999) + i * 20,
          }),
        });

        if (res.ok) {
          const imgData = await res.json();
          setScenes((prev) =>
            prev.map((s, idx) =>
              idx === i
                ? {
                    ...s,
                    imageUrl: imgData.imageUrl,
                    status: 'ready',
                  }
                : s
            )
          );
        }
      } catch (err) {
        console.error(`Error generating scene ${i + 1} image:`, err);
      }
    }

    setIsGeneratingVisuals(false);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2.5">
            <Film className="w-6 h-6 text-amber-400" />
            <span>Long AI Movie Studio (10s – 30 Minutes)</span>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
              Unlimited Movie Chapters
            </span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Build feature-length AI films, multi-part documentaries, or 20–30 min video episodes with automatic scene transitions and synchronized{' '}
            <span className="text-amber-400 font-medium">{selectedLanguage.name}</span> narration.
          </p>
        </div>

        {/* Duration Select buttons */}
        <div className="flex items-center gap-1.5 p-1 bg-neutral-900 border border-neutral-800 rounded-xl">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.id}
              id={`btn-movie-duration-${opt.id}`}
              onClick={() => setTargetDuration(opt.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                targetDuration === opt.id
                  ? 'bg-amber-500 text-neutral-950 shadow-sm'
                  : 'text-neutral-400 hover:text-neutral-200'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Movie Config & Story Prompt Card */}
      <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 space-y-2">
            <label htmlFor="movie-title-input" className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Film / Episode Title:
            </label>
            <input
              id="movie-title-input"
              type="text"
              value={movieTitle}
              onChange={(e) => setMovieTitle(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-sm font-semibold text-neutral-100 focus:outline-none focus:border-amber-500"
              placeholder="e.g. Chronicles of the Silk Road"
            />
          </div>

          <div className="lg:col-span-8 space-y-2">
            <div className="flex items-center justify-between">
              <label htmlFor="movie-storyline-input" className="text-xs font-bold uppercase tracking-wider text-neutral-300">
                Storyline, Plot & Historical Premise:
              </label>
              <span className="text-[11px] text-neutral-500">Supports Urdu, Hindi, Roman Urdu, English</span>
            </div>
            <div className="flex gap-2">
              <textarea
                id="movie-storyline-input"
                rows={2}
                value={movieStoryline}
                onChange={(e) => setMovieStoryline(e.target.value)}
                className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl p-2.5 text-xs text-neutral-100 focus:outline-none focus:border-amber-500 resize-none"
                placeholder="Describe your 20-30 min movie idea..."
              />
              <button
                id="btn-generate-long-story"
                disabled={isGeneratingStory}
                onClick={handleGenerateLongStory}
                className="px-5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 shrink-0"
              >
                {isGeneratingStory ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                    <span>Directing...</span>
                  </>
                ) : (
                  <>
                    <Wand2 className="w-4 h-4 text-neutral-950" />
                    <span>Generate Storyboard</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Director Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Master Video Canvas Player (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  {currentScene.title}
                </span>
                <span className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 font-medium">
                  Scene {currentScene.sceneNumber} of {scenes.length}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  id="btn-toggle-movie-subs"
                  onClick={() => setShowSubtitles(!showSubtitles)}
                  className={`text-xs px-2.5 py-1 rounded-lg border font-medium transition-colors ${
                    showSubtitles
                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                      : 'bg-neutral-800 border-neutral-700 text-neutral-400'
                  }`}
                >
                  CC {selectedLanguage.flag}
                </button>
              </div>
            </div>

            {/* Video Canvas */}
            <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-inner flex items-center justify-center">
              <canvas
                id="movie-player-canvas"
                ref={canvasRef}
                width={1280}
                height={720}
                className="w-full h-full object-contain cursor-pointer"
                onClick={handlePlayToggle}
              />

              {!isPlaying && (
                <button
                  id="movie-play-overlay-btn"
                  onClick={handlePlayToggle}
                  className="absolute w-16 h-16 rounded-full bg-neutral-900/80 hover:bg-amber-500 text-neutral-100 hover:text-neutral-950 border border-neutral-700 hover:border-amber-400 flex items-center justify-center shadow-2xl backdrop-blur-sm transition-all transform hover:scale-105"
                  title="Play Episode"
                >
                  <Play className="w-7 h-7 ml-1 fill-current" />
                </button>
              )}
            </div>

            {/* Playback Controls & Progress */}
            <div className="space-y-3 bg-neutral-950 p-4 rounded-xl border border-neutral-800">
              <div className="space-y-1">
                <input
                  id="movie-scene-progress-slider"
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={sceneProgress}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setSceneProgress(val);
                    drawSceneFrame(currentScene, val);
                  }}
                  className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-amber-500"
                />
                <div className="flex justify-between text-[11px] font-mono text-neutral-400">
                  <span>Scene {currentSceneIndex + 1}/{scenes.length}</span>
                  <span>{currentScene.durationSeconds}s Scene Length</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    id="btn-movie-play-pause"
                    onClick={handlePlayToggle}
                    className="p-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold transition-all shadow-md"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 ml-0.5 fill-current" />}
                  </button>

                  <button
                    id="btn-movie-prev-scene"
                    disabled={currentSceneIndex === 0}
                    onClick={() => {
                      setCurrentSceneIndex((prev) => Math.max(0, prev - 1));
                      setSceneProgress(0);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs disabled:opacity-30"
                  >
                    Previous Scene
                  </button>

                  <button
                    id="btn-movie-next-scene"
                    disabled={currentSceneIndex === scenes.length - 1}
                    onClick={() => {
                      setCurrentSceneIndex((prev) => Math.min(scenes.length - 1, prev + 1));
                      setSceneProgress(0);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border border-neutral-800 text-xs disabled:opacity-30"
                  >
                    Next Scene
                  </button>
                </div>

                <button
                  id="btn-movie-export"
                  onClick={async () => {
                    if (!canvasRef.current || !currentScene.imageUrl) return;
                    const blob = await recordCanvasToVideo(
                      canvasRef.current,
                      (prog) => drawSceneFrame(currentScene, prog),
                      currentScene.durationSeconds,
                      30
                    );
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `${movieTitle}_Scene${currentScene.sceneNumber}.webm`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                  }}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-400 font-semibold text-xs border border-neutral-700 transition-colors cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Export Scene Video</span>
                </button>
              </div>
            </div>
          </div>

          {/* Active Chapter Visual & Voice Direct Controls */}
          <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 shadow-xl space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-neutral-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-amber-400" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Chapter {currentScene.sceneNumber}: Visual & Narration Controls
                </h3>
              </div>

              {/* Hidden File Input for uploading custom image */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUploadSceneImage(currentSceneIndex, file);
                }}
              />

              <div className="flex items-center gap-2">
                <button
                  id="btn-chapter-upload-image"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 hover:border-amber-500/80 text-xs font-semibold text-neutral-300 hover:text-amber-300 transition-all cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5 text-amber-400" />
                  <span>Upload Image</span>
                </button>

                <button
                  id="btn-chapter-generate-visual"
                  disabled={currentScene.isGenerating}
                  onClick={() => handleGenerateSingleSceneVisual(currentSceneIndex)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                >
                  {currentScene.isGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-neutral-950" />
                      <span>Generating Visual...</span>
                    </>
                  ) : (
                    <>
                      <Wand2 className="w-3.5 h-3.5 text-neutral-950" />
                      <span>Generate AI Visual</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Camera Motion & Voiceover Controls */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label htmlFor="chapter-camera-motion" className="text-[11px] font-semibold text-neutral-400 flex items-center gap-1">
                  <Camera className="w-3 h-3 text-neutral-400" />
                  <span>Camera Motion (including Static):</span>
                </label>
                <select
                  id="chapter-camera-motion"
                  value={currentScene.cameraMotion}
                  onChange={(e) => {
                    const newMotion = e.target.value as CameraMotionType;
                    setScenes((prev) =>
                      prev.map((s, idx) => (idx === currentSceneIndex ? { ...s, cameraMotion: newMotion } : s))
                    );
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs font-medium text-neutral-200 focus:outline-none focus:border-amber-500"
                >
                  {CAMERA_MOTIONS.map((cm) => (
                    <option key={cm.id} value={cm.id}>
                      {cm.icon} {cm.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-400">
                  <span>Voiceover Narration ({selectedLanguage.name}):</span>
                  <button
                    id="btn-test-chapter-voice"
                    onClick={() => handleTestSceneVoice(currentSceneIndex)}
                    className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium"
                  >
                    <Volume2 className="w-3 h-3" />
                    <span>Test Voice</span>
                  </button>
                </div>
                <input
                  type="text"
                  dir={selectedLanguage.rtl ? 'rtl' : 'ltr'}
                  value={currentScene.voiceoverText}
                  onChange={(e) => {
                    const newText = e.target.value;
                    setScenes((prev) =>
                      prev.map((s, idx) =>
                        idx === currentSceneIndex
                          ? { ...s, voiceoverText: newText, captionText: newText, audioBase64: undefined }
                          : s
                      )
                    );
                  }}
                  className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-100 focus:outline-none focus:border-amber-500"
                  placeholder="Enter narration in native script..."
                />
              </div>
            </div>

            {/* Visual Prompt Input */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-neutral-400">
                Visual Prompt for AI Rendering:
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={currentScene.visualPrompt}
                  onChange={(e) => {
                    const newPrompt = e.target.value;
                    setScenes((prev) =>
                      prev.map((s, idx) => (idx === currentSceneIndex ? { ...s, visualPrompt: newPrompt } : s))
                    );
                  }}
                  className="flex-1 bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
                  placeholder="Describe scene visual details, lighting, camera lens..."
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right: Scene Storyboard Timeline Inspector (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListOrdered className="w-4 h-4 text-amber-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-200">
                  Episode Storyboard ({scenes.length} Chapters)
                </span>
              </div>

              <button
                id="btn-generate-all-visuals"
                disabled={isGeneratingVisuals}
                onClick={handleGenerateAllSceneVisuals}
                className="text-[11px] font-bold px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-neutral-950 transition-all disabled:opacity-50"
              >
                {isGeneratingVisuals ? 'Rendering Scenes...' : 'Render All Scenes'}
              </button>
            </div>

            {/* Scrollable scene list */}
            <div className="space-y-2.5 max-h-[560px] overflow-y-auto pr-1">
              {scenes.map((sc, index) => {
                const isActive = index === currentSceneIndex;
                return (
                  <div
                    key={sc.id}
                    id={`movie-scene-card-${index}`}
                    onClick={() => {
                      setCurrentSceneIndex(index);
                      setSceneProgress(0);
                    }}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex gap-3 ${
                      isActive
                        ? 'bg-amber-500/10 border-amber-500/50 shadow-md'
                        : 'bg-neutral-950/60 hover:bg-neutral-950 border-neutral-800/80'
                    }`}
                  >
                    {/* Thumbnail */}
                    <div className="w-20 h-14 rounded-lg bg-neutral-900 overflow-hidden shrink-0 relative border border-neutral-800">
                      {sc.imageUrl ? (
                        <img src={sc.imageUrl} alt={sc.title} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-neutral-600 text-[10px] p-1 text-center">
                          {sc.isGenerating ? (
                            <Loader2 className="w-4 h-4 animate-spin text-amber-400" />
                          ) : (
                            <span>No Visual</span>
                          )}
                        </div>
                      )}
                      <span className="absolute bottom-0.5 right-0.5 text-[9px] font-bold px-1 rounded bg-neutral-950/80 text-amber-300">
                        {sc.durationSeconds}s
                      </span>
                    </div>

                    {/* Scene details */}
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-neutral-100 truncate">{sc.title}</h4>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-amber-400 font-medium shrink-0">
                            {sc.cameraMotion.split(' ')[0]}
                          </span>
                        </div>
                      </div>
                      <p
                        dir={selectedLanguage.rtl ? 'rtl' : 'ltr'}
                        className={`text-[11px] text-neutral-300 line-clamp-2 ${
                          selectedLanguage.rtl ? 'font-serif' : ''
                        }`}
                      >
                        {sc.voiceoverText}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
