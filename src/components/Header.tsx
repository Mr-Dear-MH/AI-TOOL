import React from 'react';
import { Sparkles, Video, Layers, Film, Mic, Globe2 } from 'lucide-react';
import { ActiveStudioTab, SupportedLanguage } from '../types';
import { SUPPORTED_50_LANGUAGES } from '../data/languages';

interface HeaderProps {
  activeTab: ActiveStudioTab;
  onTabChange: (tab: ActiveStudioTab) => void;
  selectedLanguage: SupportedLanguage;
  onLanguageChange: (lang: SupportedLanguage) => void;
  hasGeminiKey: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onTabChange,
  selectedLanguage,
  onLanguageChange,
  hasGeminiKey,
}) => {
  return (
    <header className="border-b border-neutral-800/80 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 gap-4">
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 via-orange-500 to-rose-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-neutral-950 font-black text-xl">
              <Video className="w-5 h-5 text-neutral-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-neutral-100 via-neutral-200 to-neutral-400 bg-clip-text text-transparent">
                  VeoStudio AI
                </span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-300 border border-amber-500/30">
                  Veo 3 & Voice 50+
                </span>
              </div>
              <p className="text-xs text-neutral-400 hidden sm:block">
                Text-to-Image • Image-to-Video • Auto Urdu/Hindi Voice • Batch 50x
              </p>
            </div>
          </div>

          {/* Center Navigation Tabs */}
          <nav className="flex items-center gap-1.5 p-1 bg-neutral-900/90 rounded-xl border border-neutral-800">
            <button
              id="tab-quick-gen"
              onClick={() => onTabChange('quick-gen')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'quick-gen'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Image & Video</span>
            </button>

            <button
              id="tab-batch-gen"
              onClick={() => onTabChange('batch-gen')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'batch-gen'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Batch 50x</span>
            </button>

            <button
              id="tab-long-movie-studio"
              onClick={() => onTabChange('long-movie-studio')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'long-movie-studio'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <Film className="w-3.5 h-3.5" />
              <span>Long Movie (20-30m)</span>
            </button>

            <button
              id="tab-voice-dubbing"
              onClick={() => onTabChange('voice-dubbing')}
              className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'voice-dubbing'
                  ? 'bg-amber-500 text-neutral-950 shadow-md shadow-amber-500/20'
                  : 'text-neutral-400 hover:text-neutral-200 hover:bg-neutral-800/50'
              }`}
            >
              <Mic className="w-3.5 h-3.5" />
              <span>50+ Voices</span>
            </button>
          </nav>

          {/* Right: Language Quick Selector & API Status */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5">
              <Globe2 className="w-4 h-4 text-amber-400 shrink-0" />
              <select
                id="header-language-select"
                value={selectedLanguage.code}
                onChange={(e) => {
                  const found = SUPPORTED_50_LANGUAGES.find((l) => l.code === e.target.value);
                  if (found) onLanguageChange(found);
                }}
                className="bg-transparent text-xs font-medium text-neutral-200 focus:outline-none cursor-pointer"
                title="Select Auto Voiceover Language"
              >
                {SUPPORTED_50_LANGUAGES.map((lang) => (
                  <option key={lang.code} value={lang.code} className="bg-neutral-900 text-neutral-200">
                    {lang.flag} {lang.name} ({lang.nativeName})
                  </option>
                ))}
              </select>
            </div>

            <div
              className={`hidden lg:flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border ${
                hasGeminiKey
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                  : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
              }`}
              title={hasGeminiKey ? 'Gemini AI Connected' : 'Demo / Standby Mode'}
            >
              <span className={`w-2 h-2 rounded-full ${hasGeminiKey ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className="font-medium">{hasGeminiKey ? 'Gemini 3 AI Active' : 'AI Ready'}</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
