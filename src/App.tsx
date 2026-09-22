import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { QuickGenView } from './components/QuickGenView';
import { BatchGenView } from './components/BatchGenView';
import { LongMovieStudioView } from './components/LongMovieStudioView';
import { VoiceDubbingView } from './components/VoiceDubbingView';
import { ActiveStudioTab, SupportedLanguage } from './types';
import { SUPPORTED_50_LANGUAGES } from './data/languages';
import { Sparkles, Video, Layers, Film, Mic, Globe2, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveStudioTab>('quick-gen');
  // Default to Urdu as requested by user
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>(SUPPORTED_50_LANGUAGES[0]);
  const [hasGeminiKey, setHasGeminiKey] = useState<boolean>(true);

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
