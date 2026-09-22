import React, { useState, useRef, useEffect } from 'react';
import {
  Layers,
  Sparkles,
  Play,
  Pause,
  Download,
  Volume2,
  Copy,
  Check,
  Film,
  Camera,
  RotateCw,
  Plus,
  Trash2,
  Loader2,
  ExternalLink,
  X,
} from 'lucide-react';
import { BatchPromptItem, SupportedLanguage, CameraMotionType } from '../types';
import { SUPPORTED_50_LANGUAGES, VISUAL_STYLES, CAMERA_MOTIONS } from '../data/languages';
import { renderCinematicFrame, recordCanvasToVideo } from '../utils/videoRenderer';
import { SpeechEngine } from '../utils/speechEngine';

interface BatchGenViewProps {
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
}

export const BatchGenView: React.FC<BatchGenViewProps> = ({
  selectedLanguage,
  onLanguageChange,
}) => {
  const [concept, setConcept] = useState<string>(
    'The rise and fall of an ancient Mughal civilization, from golden palaces to desert ruins'
  );
  const [promptCount, setPromptCount] = useState<number>(10); // 5, 10, 25, 50
  const [selectedStyle, setSelectedStyle] = useState<string>('cinematic');
  const [isGeneratingBatch, setIsGeneratingBatch] = useState<boolean>(false);
  const [isGeneratingImages, setIsGeneratingImages] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Active playing card / video player modal
  const [activePreviewCard, setActivePreviewCard] = useState<BatchPromptItem | null>(null);
  const [isPlayingPreview, setIsPlayingPreview] = useState<boolean>(false);
  const [previewProgress, setPreviewProgress] = useState<number>(0);

  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const previewImgRef = useRef<HTMLImageElement | null>(null);
  const speechEngine = useRef(SpeechEngine.getInstance());

  // Render card preview onto canvas whenever activePreviewCard or previewProgress updates
  useEffect(() => {
    if (!activePreviewCard || !previewCanvasRef.current) return;

    const renderCard = (img: HTMLImageElement | null) => {
      if (!previewCanvasRef.current) return;
      renderCinematicFrame({
        canvas: previewCanvasRef.current,
        image: img as HTMLImageElement,
        progress: previewProgress,
        cameraMotion: activePreviewCard.cameraDirection as CameraMotionType,
        captionText: activePreviewCard.voiceoverScript,
        isRtl: selectedLanguage.rtl,
      });
    };

    if (activePreviewCard.imageUrl) {
      if (previewImgRef.current && previewImgRef.current.src === activePreviewCard.imageUrl && previewImgRef.current.complete) {
        renderCard(previewImgRef.current);
      } else {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.src = activePreviewCard.imageUrl;
        img.onload = () => {
          previewImgRef.current = img;
          renderCard(img);
        };
        img.onerror = () => {
          renderCard(null);
        };
      }
    } else {
      renderCard(null);
    }
  }, [activePreviewCard, previewProgress, selectedLanguage.rtl]);

  // Default seeded items (so user sees realistic batch prompt cards immediately)
  const [batchItems, setBatchItems] = useState<BatchPromptItem[]>([
    {
      id: 1,
      title: 'The Golden Empire Sunrise',
      imagePrompt: 'Ancient majestic Mughal palace with carved white marble domes reflected in a tranquil lotus pool at misty sunrise, 8k cinematic lighting',
      voiceoverScript: 'صبح کی پہلی کرنوں کے ساتھ، شاہی محل کے گنبد سونے کی طرح چمک اٹھے۔',
      cameraDirection: 'Cinematic Zoom In',
      durationSeconds: 10,
      imageUrl: 'https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1000&q=80',
      status: 'completed',
    },
    {
      id: 2,
      title: 'Emperor Royal Court',
      imagePrompt: 'Opulent royal throne room adorned with silk Persian rugs, ruby lanterns, armored royal guards standing vigilant, 35mm film',
      voiceoverScript: 'دربارِ عام میں انصاف اور ہیبت کا وہ جاہ و جلال تھا جس پر دنیا رشک کرتی تھی۔',
      cameraDirection: 'Pan Left to Right',
      durationSeconds: 10,
      imageUrl: 'https://images.unsplash.com/photo-1599839575945-a9e5af0c3fa5?auto=format&fit=crop&w=1000&q=80',
      status: 'completed',
    },
    {
      id: 3,
      title: 'Battle Across the Plains',
      imagePrompt: 'Epic cavalry charging across dusty golden plains under a dark stormy sky, banners waving in the tempest, cinematic slow motion',
      voiceoverScript: 'لیکن پھر جنگ کے بادل گرجے اور تلواروں کی جھنکار سے دھرتی لرز اٹھی۔',
      cameraDirection: 'Dynamic Drone Sweep',
      durationSeconds: 10,
      imageUrl: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=1000&q=80',
      status: 'completed',
    },
    {
      id: 4,
      title: 'Whispers in the Desert Ruins',
      imagePrompt: 'Weathered stone ruins half buried in Sahara sand dunes under twilight stars, lonely torch burning, evocative documentary look',
      voiceoverScript: 'آج وقت کی ریت کے نیچے صرف وہ کہانیاں باقی ہیں جو ہوائیں دہراتی ہیں۔',
      cameraDirection: 'Dramatic Zoom Out',
      durationSeconds: 10,
      imageUrl: 'https://images.unsplash.com/photo-1509316975850-ff9c5deb0cd9?auto=format&fit=crop&w=1000&q=80',
      status: 'completed',
    },
  ]);

  // Generate batch prompts with Gemini AI
  const handleGenerateBatch = async () => {
    if (!concept.trim()) return;

    setIsGeneratingBatch(true);
    try {
      const res = await fetch('/api/generate-batch-prompts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          concept,
          count: promptCount,
          language: selectedLanguage.name,
          languageCode: selectedLanguage.code,
          style: VISUAL_STYLES.find((s) => s.id === selectedStyle)?.name || 'Cinematic Movie',
          aspectRatio: '16:9',
        }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.prompts && data.prompts.length > 0) {
          const formatted: BatchPromptItem[] = data.prompts.map((p: any, idx: number) => ({
            id: p.id || idx + 1,
            title: p.title || `Scene ${idx + 1}`,
            imagePrompt: p.imagePrompt,
            voiceoverScript: p.voiceoverScript || '',
            cameraDirection: p.cameraDirection || 'Cinematic Zoom In',
            durationSeconds: p.durationSeconds || 10,
            imageUrl: undefined,
            status: 'idle',
          }));
          setBatchItems(formatted);
        }
      }
    } catch (err) {
      console.error('Batch generation error:', err);
    } finally {
      setIsGeneratingBatch(false);
    }
  };

  // Generate All Images in Batch
  const handleGenerateAllImages = async () => {
    setIsGeneratingImages(true);

    for (let i = 0; i < batchItems.length; i++) {
      const item = batchItems[i];
      if (item.imageUrl) continue; // Skip already generated

      // Mark as generating
      setBatchItems((prev) =>
        prev.map((it, idx) => (idx === i ? { ...it, status: 'generating' } : it))
      );

      try {
        const res = await fetch('/api/generate-image', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt: item.imagePrompt,
            aspectRatio: '16:9',
            style: VISUAL_STYLES.find((s) => s.id === selectedStyle)?.promptModifier || 'cinematic 8k',
            seed: Math.floor(Math.random() * 999999) + i * 100,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          setBatchItems((prev) =>
            prev.map((it, idx) =>
              idx === i
                ? {
                    ...it,
                    imageUrl: data.imageUrl,
                    status: 'completed',
                  }
                : it
            )
          );
        }
      } catch (e) {
        console.error(`Failed to generate image for item ${i + 1}:`, e);
      }
    }

    setIsGeneratingImages(false);
  };

  // Play single card animation & voice
  const handlePlayCard = (item: BatchPromptItem) => {
    setActivePreviewCard(item);
    setIsPlayingPreview(true);
    setPreviewProgress(0);

    // Speak narration
    if (item.voiceoverScript) {
      speechEngine.current.speak(item.voiceoverScript, selectedLanguage.code);
    }

    const startTime = performance.now();
    const duration = (item.durationSeconds || 10) * 1000;

    const interval = setInterval(() => {
      const elapsed = performance.now() - startTime;
      const prog = Math.min(elapsed / duration, 1.0);
      setPreviewProgress(prog);

      if (prog >= 1.0) {
        clearInterval(interval);
        setIsPlayingPreview(false);
      }
    }, 100);
  };

  const handleCopyPrompts = () => {
    const text = batchItems
      .map(
        (b) =>
          `[Scene ${b.id}: ${b.title}]\nPrompt: ${b.imagePrompt}\nCamera: ${b.cameraDirection} (${b.durationSeconds}s)\nVoiceover (${selectedLanguage.name}): ${b.voiceoverScript}\n`
      )
      .join('\n');
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-neutral-100 flex items-center gap-2.5">
            <Layers className="w-6 h-6 text-amber-400" />
            <span>Batch Prompt & Mass Video Generator (Up to 50x)</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Produce up to 50 sequential image prompts and matching{' '}
            <span className="text-amber-400 font-medium">{selectedLanguage.name}</span> voiceovers in a single click.
          </p>
        </div>

        {/* Action button bar */}
        <div className="flex items-center gap-2">
          <button
            id="btn-copy-batch"
            onClick={handleCopyPrompts}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 border border-neutral-800 text-xs font-semibold text-neutral-300 hover:text-amber-300 transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            <span>{copied ? 'Copied 50 Prompts!' : 'Copy All Prompts'}</span>
          </button>

          <button
            id="btn-generate-all-images"
            disabled={isGeneratingImages || batchItems.length === 0}
            onClick={handleGenerateAllImages}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-xs shadow-md transition-all disabled:opacity-50"
          >
            {isGeneratingImages ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-neutral-950" />
                <span>Generating All Images...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-neutral-950" />
                <span>Generate All Batch Images</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Control Configuration Bar */}
      <div className="bg-neutral-900/90 border border-neutral-800/90 rounded-2xl p-5 shadow-xl space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-end">
          <div className="md:col-span-6 space-y-1.5">
            <label htmlFor="batch-concept-input" className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Master Narrative or Series Concept:
            </label>
            <input
              id="batch-concept-input"
              type="text"
              value={concept}
              onChange={(e) => setConcept(e.target.value)}
              placeholder="e.g. Journey across galaxy, or Sultan Salahuddin historical battle story in 50 scenes..."
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-100 placeholder-neutral-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="batch-count-select" className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Prompt Count:
            </label>
            <select
              id="batch-count-select"
              value={promptCount}
              onChange={(e) => setPromptCount(Number(e.target.value))}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs font-semibold text-amber-300 focus:outline-none focus:border-amber-500"
            >
              <option value={5}>5 Prompts (Mini Series)</option>
              <option value={10}>10 Prompts (Full Story)</option>
              <option value={20}>20 Prompts (Documentary)</option>
              <option value={30}>30 Prompts (Featurette)</option>
              <option value={50}>⚡ 50 Prompts (Max Unlimited)</option>
            </select>
          </div>

          <div className="md:col-span-2 space-y-1.5">
            <label htmlFor="batch-style-select" className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Visual Style:
            </label>
            <select
              id="batch-style-select"
              value={selectedStyle}
              onChange={(e) => setSelectedStyle(e.target.value)}
              className="w-full bg-neutral-950 border border-neutral-800 rounded-xl px-3 py-2.5 text-xs text-neutral-200 focus:outline-none focus:border-amber-500"
            >
              {VISUAL_STYLES.map((st) => (
                <option key={st.id} value={st.id}>
                  {st.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-2">
            <button
              id="btn-generate-batch-prompts"
              disabled={isGeneratingBatch}
              onClick={handleGenerateBatch}
              className="w-full py-2.5 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs shadow-md transition-all flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {isGeneratingBatch ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Drafting {promptCount}x...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Draft {promptCount} Prompts</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Prompts Cards Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-neutral-300">
              Generated Batch Queue ({batchItems.length} Scenes)
            </span>
            <span className="text-xs text-neutral-500">
              • Each scene renders 10s to 30s with {selectedLanguage.flag} {selectedLanguage.name} voiceover
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {batchItems.map((item, index) => (
            <div
              key={item.id}
              className="bg-neutral-900/90 border border-neutral-800/90 hover:border-neutral-700 rounded-2xl overflow-hidden shadow-lg transition-all flex flex-col justify-between group"
            >
              {/* Image Preview / Thumbnail */}
              <div className="relative aspect-video bg-neutral-950 overflow-hidden border-b border-neutral-800">
                {item.imageUrl ? (
                  <img
                    src={item.imageUrl}
                    alt={item.title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center p-4 text-center bg-neutral-950/60">
                    <Film className="w-8 h-8 text-neutral-700 mb-1" />
                    <span className="text-[11px] text-neutral-500">Image not generated yet</span>
                    <button
                      id={`btn-gen-single-${item.id}`}
                      onClick={async () => {
                        setBatchItems((prev) =>
                          prev.map((it) => (it.id === item.id ? { ...it, status: 'generating' } : it))
                        );
                        try {
                          const res = await fetch('/api/generate-image', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                              prompt: item.imagePrompt,
                              aspectRatio: '16:9',
                              style: VISUAL_STYLES.find((s) => s.id === selectedStyle)?.promptModifier || 'cinematic 8k',
                            }),
                          });
                          if (res.ok) {
                            const data = await res.json();
                            setBatchItems((prev) =>
                              prev.map((it) =>
                                it.id === item.id ? { ...it, imageUrl: data.imageUrl, status: 'completed' } : it
                              )
                            );
                          }
                        } catch (e) {
                          console.error(e);
                        }
                      }}
                      className="mt-2 text-[10px] px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-medium border border-amber-500/30"
                    >
                      Generate Image
                    </button>
                  </div>
                )}

                {/* Badge ID & Camera Direction */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-950/80 text-amber-400 backdrop-blur-sm border border-neutral-700">
                    #{item.id}
                  </span>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-neutral-900/80 text-neutral-300 backdrop-blur-sm border border-neutral-700">
                    {item.cameraDirection}
                  </span>
                </div>

                {/* Play preview icon */}
                {item.imageUrl && (
                  <button
                    id={`btn-play-card-${item.id}`}
                    onClick={() => handlePlayCard(item)}
                    className="absolute inset-0 m-auto w-10 h-10 rounded-full bg-neutral-950/80 text-amber-400 hover:text-neutral-950 hover:bg-amber-400 border border-amber-500/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all shadow-xl"
                    title="Play 10s Clip with Voiceover"
                  >
                    <Play className="w-5 h-5 ml-0.5 fill-current" />
                  </button>
                )}
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3 flex-1 flex flex-col justify-between">
                <div>
                  <h3 className="text-xs font-bold text-neutral-100 line-clamp-1">{item.title}</h3>
                  <p className="text-[11px] text-neutral-400 mt-1 line-clamp-2 leading-relaxed">
                    {item.imagePrompt}
                  </p>
                </div>

                {/* Voiceover Script box */}
                <div className="bg-neutral-950 p-2.5 rounded-xl border border-neutral-800 space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-neutral-500">
                    <span>Voiceover ({selectedLanguage.name}):</span>
                    <button
                      id={`btn-card-tts-${item.id}`}
                      onClick={() => {
                        speechEngine.current.speak(item.voiceoverScript, selectedLanguage.code);
                      }}
                      className="text-amber-400 hover:text-amber-300 flex items-center gap-0.5"
                    >
                      <Volume2 className="w-3 h-3" />
                      <span>Hear</span>
                    </button>
                  </div>
                  <p
                    dir={selectedLanguage.rtl ? 'rtl' : 'ltr'}
                    className={`text-[11px] text-neutral-300 line-clamp-2 ${
                      selectedLanguage.rtl ? 'font-serif' : ''
                    }`}
                  >
                    {item.voiceoverScript}
                  </p>
                </div>

                {/* Card footer */}
                <div className="flex items-center justify-between text-[10px] text-neutral-500 pt-1 border-t border-neutral-800">
                  <span>Duration: {item.durationSeconds || 10}s clip</span>
                  <span className="text-amber-400 font-medium">Veo 3 Frame</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Card Preview Modal Player */}
      {activePreviewCard && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4">
          <div className="bg-neutral-900 border border-neutral-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-neutral-100 flex items-center gap-2">
                  <Film className="w-5 h-5 text-amber-400" />
                  <span>{activePreviewCard.title}</span>
                </h3>
                <p className="text-xs text-neutral-400 mt-0.5">
                  Camera: <span className="text-amber-400">{activePreviewCard.cameraDirection}</span> | Language:{' '}
                  <span className="text-amber-400">{selectedLanguage.name}</span>
                </p>
              </div>
              <button
                id="btn-close-batch-preview"
                onClick={() => {
                  speechEngine.current.stop();
                  setActivePreviewCard(null);
                  setIsPlayingPreview(false);
                }}
                className="w-9 h-9 rounded-xl bg-neutral-800 hover:bg-neutral-700 flex items-center justify-center text-neutral-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Video Canvas Container */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-neutral-950 border border-neutral-800 shadow-inner flex items-center justify-center">
              <canvas
                ref={previewCanvasRef}
                width={854}
                height={480}
                className="w-full h-full object-contain"
              />

              {/* Progress bar overlay */}
              <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-neutral-800/80">
                <div
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-100"
                  style={{ width: `${Math.round(previewProgress * 100)}%` }}
                />
              </div>
            </div>

            {/* Voiceover text display */}
            {activePreviewCard.voiceoverScript && (
              <div className="bg-neutral-950 p-3.5 rounded-xl border border-neutral-800">
                <p
                  dir={selectedLanguage.rtl ? 'rtl' : 'ltr'}
                  className={`text-sm text-neutral-200 ${selectedLanguage.rtl ? 'font-serif text-right' : ''}`}
                >
                  "{activePreviewCard.voiceoverScript}"
                </p>
              </div>
            )}

            {/* Modal Controls */}
            <div className="flex items-center justify-between pt-2">
              <button
                id="btn-replay-batch-card"
                onClick={() => handlePlayCard(activePreviewCard)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs transition-colors"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Replay Animation & Voice</span>
              </button>
              <button
                id="btn-dismiss-batch-modal"
                onClick={() => {
                  speechEngine.current.stop();
                  setActivePreviewCard(null);
                  setIsPlayingPreview(false);
                }}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-semibold transition-colors"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
