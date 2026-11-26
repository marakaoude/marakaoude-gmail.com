import React from 'react';
import {
  Volume2,
  VolumeX,
  Sparkles,
  Video,
  Flame,
  Smartphone,
  Globe,
  QrCode,
  Crown,
  LayoutDashboard,
  Zap,
} from 'lucide-react';
import { AspectRatio } from '../types';

interface HeaderProps {
  aspectRatio: AspectRatio;
  onAspectRatioChange: (ratio: AspectRatio) => void;
  activeCount: number;
  genreName?: string;
  crowdVolume: number;
  onCrowdVolumeChange: (vol: number) => void;
  soundActive: boolean;
  onToggleSound: () => void;
  isAndroidMode?: boolean;
  onToggleAndroidMode?: () => void;
  onOpenScanner?: () => void;
  onOpenDashboard?: () => void;
  onOpenArchitecture?: () => void;
  onOpenSplash?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  aspectRatio,
  onAspectRatioChange,
  activeCount,
  genreName,
  crowdVolume,
  onCrowdVolumeChange,
  soundActive,
  onToggleSound,
  isAndroidMode = false,
  onToggleAndroidMode,
  onOpenScanner,
  onOpenDashboard,
  onOpenArchitecture,
  onOpenSplash,
}) => {
  return (
    <header className="header sticky top-0 z-40 backdrop-blur-xl bg-[#0b0d14]/90 border-b border-zinc-800/80 px-3 sm:px-6 lg:px-8 py-3 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand identity: BGla Mac */}
        <div className="flex items-center gap-3">
          <div
            onClick={onOpenSplash}
            className="relative flex items-center justify-center shrink-0 cursor-pointer hover:scale-105 transition-transform"
            title="Afficher l'écran de démarrage BGla Mac"
          >
            <img
              src="/images/bgla-mac-logo.png"
              alt="BGla Mac"
              className="logo bgla-logo w-11 h-11 object-cover rounded-xl border-1.5 border-[#D4AF37]/80 shadow-lg shadow-[#D4AF37]/20"
              onError={(e) => {
                // Fallback if image fails to load
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#D4AF37] opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-[#D4AF37]"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-black tracking-wider text-white uppercase font-['Syne',sans-serif]">
                BGla Mac
              </h1>
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-[#D4AF37] text-black tracking-wider uppercase">
                OFFICIEL
              </span>
            </div>
            <p className="text-[11px] text-[#D4AF37] font-semibold italic flex flex-wrap items-center gap-1.5">
              <span>Ton univers, ton artiste !</span>
              <span className="w-1 h-1 rounded-full bg-zinc-600 hidden sm:inline-block"></span>
              <span className="text-zinc-400 font-normal not-italic hidden sm:inline">Musique, Clips & Billetterie</span>
              <span className="w-1 h-1 rounded-full bg-zinc-600 hidden md:inline-block"></span>
              <span className="text-[#D4AF37] font-normal not-italic hidden md:inline-flex items-center gap-1">
                <Crown className="w-3 h-3" /> Artiste : 10 000 FCFA/mois
              </span>
            </p>
          </div>
        </div>

        {/* Center / Right controls */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Dual Mode Switcher: Android App vs Site Web */}
          {onToggleAndroidMode && (
            <div className="flex items-center bg-[#181818] p-0.5 rounded-xl border border-[#2a2a2a]">
              <button
                type="button"
                onClick={onToggleAndroidMode}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  !isAndroidMode
                    ? 'bg-[#2a2a2a] text-white shadow-sm'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Affichage normal Site Web responsive"
              >
                <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
                <span className="hidden sm:inline">Site Web</span>
              </button>
              <button
                type="button"
                onClick={onToggleAndroidMode}
                className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  isAndroidMode
                    ? 'bg-[#D4AF37] text-black shadow-md shadow-[#D4AF37]/20'
                    : 'text-zinc-400 hover:text-white'
                }`}
                title="Mode simulation Application Android (Scaffold, Barre d'état, Material 3)"
              >
                <Smartphone className={`w-3.5 h-3.5 ${isAndroidMode ? 'text-black' : 'text-[#D4AF37]'}`} />
                <span>App Android</span>
              </button>
            </div>
          )}

          {/* Quick Scanner Shortcut */}
          {onOpenScanner && (
            <button
              type="button"
              onClick={onOpenScanner}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-xs font-bold transition-all cursor-pointer"
              title="Ouvrir le scanner de vérification des billets à l'entrée"
            >
              <QrCode className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline">Scanner Entrée</span>
            </button>
          )}

          {/* Quick Dashboard Artiste Shortcut */}
          {onOpenDashboard && (
            <button
              type="button"
              onClick={onOpenDashboard}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#D4AF37] border border-[#D4AF37]/30 text-xs font-bold transition-all cursor-pointer"
              title="Accéder au tableau de bord artiste"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span className="hidden md:inline">Dashboard Artiste</span>
            </button>
          )}

          {/* Quick Architecture & Split 95/5 button */}
          {onOpenArchitecture && (
            <button
              type="button"
              onClick={onOpenArchitecture}
              className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
              title="Visualiser le flux architecture backend, base de données et split 95/5"
            >
              <Zap className="w-3.5 h-3.5 text-purple-400" />
              <span className="hidden lg:inline">Flux Split 95/5</span>
            </button>
          )}

          {/* Aspect ratio switcher */}
          <div className="hidden lg:flex items-center bg-[#1D1D1D] p-0.5 rounded-xl border border-[#2C2C2C]">
            <button
              type="button"
              onClick={() => onAspectRatioChange('9:16')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                aspectRatio === '9:16'
                  ? 'bg-[#D4AF37] text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>9:16 Reel</span>
            </button>
            <button
              type="button"
              onClick={() => onAspectRatioChange('16:9')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                aspectRatio === '16:9'
                  ? 'bg-[#D4AF37] text-black font-bold shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              <span>16:9 HD</span>
            </button>
          </div>

          {/* Stadium ambient sound button */}
          <div className="flex items-center bg-zinc-900/90 rounded-xl border border-zinc-800 p-0.5 gap-1">
            <button
              type="button"
              onClick={onToggleSound}
              title={soundActive ? "Désactiver l'ambiance sonore du stade" : "Activer l'ambiance sonore du stade"}
              className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                soundActive
                  ? 'bg-emerald-500/20 text-emerald-300 shadow-sm'
                  : 'text-zinc-400 hover:text-white'
              }`}
            >
              {soundActive ? (
                <>
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="hidden sm:inline text-[11px]">Ambiance</span>
                </>
              ) : (
                <>
                  <VolumeX className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline text-[11px]">Silencieux</span>
                </>
              )}
            </button>
          </div>

          {activeCount > 0 && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-semibold animate-pulse">
              <Video className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Rendu en cours...</span>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
