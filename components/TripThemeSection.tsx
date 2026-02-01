"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { TripTheme } from "@/types/trip";

interface TripThemeSectionProps {
  themes: TripTheme[];
  selectedThemeId: string | null;
  onThemeSelect: (themeId: string) => void;
  onCreateTrip: () => void;
  canCreateTrip: boolean;
  isCreating: boolean;
  validationMessage?: string;
}

export function TripThemeSection({
  themes,
  selectedThemeId,
  onThemeSelect,
  onCreateTrip,
  canCreateTrip,
  isCreating,
  validationMessage,
}: TripThemeSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedTheme = themes.find(t => t.id === selectedThemeId);

  const handleSelect = (theme: TripTheme) => {
    onThemeSelect(theme.id);
    setIsOpen(false);
  };

  return (
    <section className="relative space-y-4">
      <div className="bg-white border-[3px] border-black rounded-2xl p-4 sm:p-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] overflow-visible relative">
        {/* Decorative stickers in whitespace */}
        {/* Top left corner sticker */}
        <div className="absolute top-2 left-2 sm:top-3 sm:left-3 z-0 pointer-events-none -rotate-12">
          <div className="w-3 h-3 sm:w-4 sm:h-4 bg-[#ff69b4] rounded-full border-[1.5px] sm:border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]" />
        </div>
        
        {/* Bottom right corner sticker */}
        <div className="absolute bottom-2 right-2 sm:bottom-3 sm:right-3 z-0 pointer-events-none rotate-6">
          <svg viewBox="0 0 24 24" className="w-4 h-4 sm:w-5 sm:h-5 fill-[#c8ff00] stroke-black stroke-[1.5px]">
            <path d="M12 0 L14.5 9 L24 12 L14.5 15 L12 24 L9.5 15 L0 12 L9.5 9 Z" />
          </svg>
        </div>

        {/* Half circles peeking behind the card */}
        {/* Left side - half circle - removed to avoid overlap with MatesSection */}
        
        {/* Right side - half circle - medium size */}
        <div className="absolute -right-6 sm:-right-8 md:-right-10 bottom-1/4 z-[-1] pointer-events-none rotate-12">
          <div className="w-10 h-10 sm:w-14 sm:h-14 md:w-18 md:h-18 bg-[#7DF9FF] rounded-full border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
        </div>

        {/* Section Header */}
        <h2 className="text-lg sm:text-xl font-bold text-black font-sans mb-4">
          What are you up for?
        </h2>

        {/* Dropdown */}
        <div className="relative z-50">
          <button
            onClick={() => setIsOpen(!isOpen)}
            disabled={themes.length === 0}
            className="w-full flex items-center justify-between px-4 py-3 bg-white border-[2px] border-black/20 rounded-lg font-mono text-sm text-left hover:border-black/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span className={selectedTheme ? "text-black" : "text-black/40"}>
              {selectedTheme
                ? `${selectedTheme.icon} ${selectedTheme.name}`
                : themes.length === 0
                  ? "Loading themes..."
                  : "Select a theme..."}
            </span>
            <ChevronDown
              className={`w-5 h-5 text-black/40 transition-transform ${isOpen ? "rotate-180" : ""
                }`}
            />
          </button>

          {/* Dropdown Menu */}
          {isOpen && themes.length > 0 && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white border-[3px] border-black rounded-lg overflow-hidden shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] z-50 max-h-[300px] overflow-y-auto">
              {themes.map((theme, index) => {
                const bgColors = [
                  "bg-[#ff69b4]/20",
                  "bg-[#7DF9FF]/30",
                  "bg-[#E0B0FF]/30",
                  "bg-[#c8ff00]/30",
                  "bg-[#ffe135]/30",
                  "bg-[#ffb347]/30",
                ];
                return (
                  <button
                    key={theme.id}
                    onClick={() => handleSelect(theme)}
                    className={`w-full flex items-center gap-3 px-4 py-3 text-left hover:${bgColors[index % bgColors.length]
                      } transition-colors border-b border-black/10 last:border-b-0 font-mono text-sm hover:bg-[#ff69b4]/10`}
                  >
                    <span className="text-black">
                      {theme.icon} {theme.name}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Create Trip Button or Warning - Outside the white card */}
      {canCreateTrip && selectedThemeId ? (
        <button
          onClick={onCreateTrip}
          disabled={isCreating}
          className="w-full bg-[#ff1493] text-white font-mono font-bold text-sm px-5 py-3 rounded-lg border-[3px] border-black shadow-[3px_3px_0px_0px_rgba(0,0,0,1)] hover:shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isCreating && (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {isCreating ? "Creating Trip..." : "Plan your Trip"}
        </button>
      ) : !selectedThemeId ? (
        <div className="bg-[#ffe135]/50 border-[2px] border-[#ffe135] rounded-lg px-4 py-3">
          <p className="text-sm text-amber-900 font-mono">
            Please select a trip theme
          </p>
        </div>
      ) : (
        <div className="bg-[#ffe135]/50 border-[2px] border-[#ffe135] rounded-lg px-4 py-3">
          <p className="text-sm text-amber-900 font-mono">
            {validationMessage || "Add at least two mates with complete information"}
          </p>
        </div>
      )}
    </section>
  );
}
