import React, { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export const PwaInstallPrompt: React.FC<{ appTitle?: string }> = ({ appTitle = 'EntriFa' }) => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isIos, setIsIos] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      return;
    }

    // Check if previously dismissed within the last 7 days
    const dismissedUntil = localStorage.getItem('entrifa_pwa_dismissed_until');
    if (dismissedUntil && Date.now() < parseInt(dismissedUntil, 10)) {
      return;
    }

    // iOS detection
    const isIosDevice = /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
    const isSafari = /^((?!chrome|android).)*safari/i.test(window.navigator.userAgent);
    if (isIosDevice && isSafari) {
      setIsIos(true);
      setIsVisible(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    // Dismiss for 7 days
    const nextWeek = Date.now() + 7 * 24 * 60 * 60 * 1000;
    localStorage.setItem('entrifa_pwa_dismissed_until', nextWeek.toString());
  };

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsVisible(false);
    }
    setDeferredPrompt(null);
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:right-auto sm:left-6 sm:bottom-6 z-50 max-w-sm w-auto bg-white/95 backdrop-blur-md p-3.5 rounded-2xl shadow-xl border border-gray-200 text-gray-900 transition-all animate-fadeIn">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="p-2 bg-brand-50 text-brand-600 rounded-xl mt-0.5">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-gray-900">Install {appTitle}</h4>
            <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
              {isIos ? (
                <span>
                  Tap <Share className="w-3 h-3 inline text-brand-600" /> <strong>Share</strong> then <strong>Add to Home Screen</strong>
                </span>
              ) : (
                'Install app for fast offline access and quick launcher on your device.'
              )}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          className="text-gray-400 hover:text-gray-600 p-1"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {!isIos && (
        <div className="mt-3 flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={handleDismiss}
            className="px-2.5 py-1 text-[11px] font-semibold text-gray-500 hover:text-gray-800"
          >
            Not now
          </button>
          <button
            type="button"
            onClick={handleInstall}
            className="px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl text-xs font-bold shadow-sm shadow-brand-500/20 inline-flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Install App
          </button>
        </div>
      )}
    </div>
  );
};
