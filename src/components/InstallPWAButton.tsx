import React, { useState } from 'react';
import { Download, Monitor, CheckCircle, X, ExternalLink, Sparkles, FileText, ArrowRight } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const InstallPWAButton: React.FC = () => {
  const { isInstallable, isInstalled, installApp } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);
  const [downloadedShortcut, setDownloadedShortcut] = useState(false);

  const getAppUrl = () => {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return window.location.origin;
    }
    return 'https://ais-dev-erfjt4xzqkilkeh5x57re4-955689940223.asia-southeast1.run.app';
  };

  const handleInstallClick = async () => {
    if (isInstallable) {
      const success = await installApp();
      if (!success) {
        setShowModal(true);
      }
    } else {
      setShowModal(true);
    }
  };

  // 1-Click: Download Standard Desktop Shortcut (.url)
  const handleDownloadUrlShortcut = () => {
    const appUrl = getAppUrl();
    const fileContent = `[InternetShortcut]
URL=${appUrl}
IconFile=${appUrl}/icon.svg
IconIndex=0
`;
    const blob = new Blob([fileContent], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VeoStudio AI.url';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedShortcut(true);
  };

  // 1-Click: Download Windows Desktop Launcher (.bat)
  const handleDownloadAppLauncherBat = () => {
    const appUrl = getAppUrl();
    const batContent = `@echo off
title Launching VeoStudio AI...
echo Opening VeoStudio AI in Standalone Desktop Window...
start chrome --app="${appUrl}" 2>nul || start msedge --app="${appUrl}" 2>nul || start "" "${appUrl}"
exit
`;
    const blob = new Blob([batContent], { type: 'application/x-bat' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VeoStudio AI Desktop Launcher.bat';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setDownloadedShortcut(true);
  };

  return (
    <>
      <button
        id="btn-install-desktop-app"
        onClick={handleInstallClick}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-amber-400 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-neutral-950 font-bold text-xs shadow-md transition-all cursor-pointer transform hover:scale-105 shrink-0"
        title="PC Desktop par Icon banayein"
      >
        <Monitor className="w-3.5 h-3.5 text-neutral-950" />
        <span className="whitespace-nowrap">🖥️ Desktop Icon Banayein</span>
      </button>

      {/* Guide & 1-Click Download Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
          <div className="bg-neutral-900 border border-neutral-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-5 text-neutral-100 relative max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-neutral-400 hover:text-neutral-100 hover:bg-neutral-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-neutral-950 border border-amber-500/40 flex items-center justify-center p-1.5 shadow-lg shadow-amber-500/10">
                <img src="/icon.svg" alt="VeoStudio Icon" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="font-extrabold text-base text-neutral-100 flex items-center gap-1.5">
                  <span>PC Desktop Par Icon Lagane Ke 2 Asaan Tareeqay</span>
                </h3>
                <p className="text-xs text-amber-400">Computer on karne par desktop se direct open karein</p>
              </div>
            </div>

            {/* Method 1: Instant File Download (Guaranteed 100% Works on Any Windows PC) */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-amber-500/30 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-amber-500 text-neutral-950 text-xs font-black flex items-center justify-center">1</span>
                <h4 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">
                  Sab Se Asaan: 1-Click Desktop Shortcut File Download Karein
                </h4>
              </div>
              <p className="text-xs text-neutral-400 leading-relaxed">
                Neeche diye gaye button par click karke shortcut file download karein aur use apne <strong>Desktop</strong> par drag/move kar dein. Uske baad double click karke jab chahein chalaein!
              </p>

              <div className="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  id="btn-download-url-shortcut"
                  onClick={handleDownloadUrlShortcut}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-neutral-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-neutral-950" />
                  <span>Download Desktop Shortcut (.url)</span>
                </button>

                <button
                  id="btn-download-bat-launcher"
                  onClick={handleDownloadAppLauncherBat}
                  className="flex-1 py-2.5 px-3 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-amber-300 font-semibold text-xs border border-neutral-700 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="Opens as a standalone desktop window without browser bars"
                >
                  <Monitor className="w-3.5 h-3.5 text-amber-400" />
                  <span>Standalone App (.bat)</span>
                </button>
              </div>

              {downloadedShortcut && (
                <div className="flex items-center gap-1.5 text-[11px] text-emerald-400 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                  <CheckCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>File download ho chuki hai! Use Downloads folder se Desktop par rakh lein.</span>
                </div>
              )}
            </div>

            {/* Method 2: Browser Chrome / Edge "Create Shortcut" */}
            <div className="p-4 rounded-xl bg-neutral-950 border border-neutral-800 space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-neutral-700 text-neutral-200 text-xs font-bold flex items-center justify-center">2</span>
                <h4 className="text-xs font-bold text-neutral-100 uppercase tracking-wider">
                  Google Chrome ya Microsoft Edge Se Shortcut Banayein
                </h4>
              </div>
              
              <div className="text-xs text-neutral-300 space-y-2 leading-relaxed">
                <p>
                  Kyunke abhi aap AI Studio ki choti screen (iframe) ke andar hain, isliye browser ka install option yahan nahi dikhta. 
                  Iska tareeqa yeh hai:
                </p>

                <div className="p-2.5 rounded-lg bg-neutral-900 border border-neutral-800 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-neutral-400 font-medium">Pehle is link ko new tab mein open karein:</span>
                    <a
                      href={getAppUrl()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 text-xs font-bold border border-amber-500/40"
                    >
                      <span>New Tab Kholein</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>

                  <div className="text-[11px] text-neutral-400 space-y-1">
                    <p>• New tab kholne ke baad Browser ke right corner par <strong>3 Dots (⋮)</strong> dabayein.</p>
                    <p>• <strong>"Save and share"</strong> ya <strong>"More tools"</strong> par jayein.</p>
                    <p>• <strong>"Create shortcut..."</strong> par click karein aur <strong>"Open as window"</strong> par tick laga kar <strong>Create</strong> dabayein!</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-1">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-200 text-xs font-semibold transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
