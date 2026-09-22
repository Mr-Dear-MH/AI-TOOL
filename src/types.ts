export interface SupportedLanguage {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl?: boolean;
}

export interface SceneItem {
  id: string;
  sceneNumber: number;
  title: string;
  durationSeconds: number;
  visualPrompt: string;
  imageUrl?: string;
  videoUrl?: string;
  voiceoverText: string;
  captionText?: string;
  cameraMotion: CameraMotionType;
  audioBase64?: string;
  isGenerating?: boolean;
  status?: 'pending' | 'ready' | 'error';
}

export interface VideoProject {
  id: string;
  title: string;
  logline: string;
  targetDuration: string; // "10s", "30s", "1m", "5m", "15m", "30m"
  language: SupportedLanguage;
  voiceStyle: string;
  visualStyle: string;
  aspectRatio: '16:9' | '9:16' | '1:1';
  scenes: SceneItem[];
  createdAt: number;
}

export type CameraMotionType =
  | 'Cinematic Zoom In'
  | 'Dramatic Zoom Out'
  | 'Pan Left to Right'
  | 'Pan Right to Left'
  | 'Dynamic Drone Sweep'
  | 'Slow Orbiting 360'
  | 'Low Angle Tilt Up'
  | 'Slow Motion 120fps'
  | 'Static Focused Depth';

export interface BatchPromptItem {
  id: number;
  title: string;
  imagePrompt: string;
  voiceoverScript: string;
  cameraDirection: string;
  durationSeconds: number;
  imageUrl?: string;
  status: 'idle' | 'generating' | 'completed' | 'error';
}

export type ActiveStudioTab =
  | 'quick-gen'        // Text to Image & Image to Video single click with auto voice
  | 'batch-gen'        // Up to 50 prompts batch generation & mass video render
  | 'long-movie-studio'// 10s-30s up to 20-30 min multi-scene movie & chapter creator
  | 'voice-dubbing';   // Multilingual 50+ languages TTS studio & audio sync

export interface VisualStyleOption {
  id: string;
  name: string;
  description: string;
  promptModifier: string;
  previewBg: string;
}
