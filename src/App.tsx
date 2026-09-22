import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { InstallPWAButton } from './components/InstallPWAButton';
import { QuickGenView } from './components/QuickGenView';
import { BatchGenView } from './components/BatchGenView';
import { LongMovieStudioView } from './components/LongMovieStudioView';
import { VoiceDubbingView } from './components/VoiceDubbingView';
import { ActiveStudioTab, SupportedLanguage } from './types';
import { SUPPORTED_50_LANGUAGES } from './data/languages';
import { Sparkles, Video, Layers, Film, Mic, Globe2, ShieldCheck, Monitor, ExternalLink } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveStudioTab>('quick-gen');
  // Default to Urdu as requested by user
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(SUPPORTED_50_LANGUAGES[0]);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(true);
  const [dismissBanner, setDismissBanner] = useState<boolean>(false);

  // Check health on load
  useEffect(() => {
    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => {
        if (typeof data.hasGeminiKey === 'boolean') {
          setHasGeminiKey(data.hasGeminiKey);
        }
      })
      .catch((err) => {
        console.warn('API health check error:', err);
      });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Desktop App Promotion Notice Bar */}
      {!dismissBanner && (
        <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-500/15 border-b border-amber-500/25 px-4 py-2 text-xs text-neutral-200">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span className="font-semibold text-amber-300">PC Desktop Shortcut:</span>
              <span className="text-neutral-300">
                Jab PC on karein to desktop par application ka icon show ho, uske liye shortcut save karein:
              </span>
            </div>

            <div className="flex items-center gap-2">
              <InstallPWAButton />
              <button
                onClick={() => setDismissBanner(true)}
                className="text-[11px] text-neutral-400 hover:text-neutral-200 px-1.5 py-0.5 rounded hover:bg-neutral-800 transition-colors"
                title="Dismiss"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <Header
        activeTab={activeTab}
        onTabChange={setActiveTab}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        hasGeminiKey={hasGeminiKey}
      />

      {/* Main Workspace View */}
      <main className="flex-1">
        {activeTab === 'quick-gen' && (
          <QuickGenView
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        )}

        {activeTab === 'batch-gen' && (
          <BatchGenView
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        )}

        {activeTab === 'long-movie-studio' && (
          <LongMovieStudioView
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        )}

        {activeTab === 'voice-dubbing' && (
          <VoiceDubbingView
            selectedLanguage={selectedLanguage}
            onLanguageChange={setSelectedLanguage}
          />
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-neutral-800/80 bg-neutral-950/90 py-6 px-4 sm:px-6 lg:px-8 mt-12">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-neutral-400">VeoStudio AI Architecture</span>
            <span>•</span>
            <span>Powered by Gemini 3 & Veo Multimedia Engine</span>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="flex items-center gap-1 text-emerald-400/90">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Full-Stack Protected Server</span>
            </span>
            <span>•</span>
            <span>50+ Languages (Urdu, Hindi, English, Arabic, Spanish, etc.)</span>
            <span>•</span>
            <span>Batch 50x Prompts</span>
            <span>•</span>
            <span>10s–30s Clips & 20–30m Long Films</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
