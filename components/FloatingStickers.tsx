"use client";

import { MapPin, Train } from "lucide-react";

export function FloatingStickers() {
  return (
    <>
      {/* Smiley sticker - top right - Keep on mobile, smaller size */}
      <div className="absolute top-4 right-2 sm:top-12 sm:right-4 md:top-20 md:right-8 z-0 pointer-events-none rotate-12 animate-float-slow animate-bounce-in hover:animate-pulse-gentle" style={{ animationDelay: '0.1s' }}>
        <div className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 bg-[#ffe135] rounded-full border-[2px] sm:border-[3px] border-black flex items-center justify-center shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] sm:shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10">
            <circle cx="8" cy="9" r="1.5" fill="black" />
            <circle cx="16" cy="9" r="1.5" fill="black" />
            <path d="M8 14 Q12 18 16 14" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Location marker - top left - Keep on mobile, smaller size */}
      <div className="absolute top-12 left-2 sm:top-20 sm:left-4 md:top-32 md:left-8 z-0 pointer-events-none -rotate-6 animate-float animate-rotate-slow animate-bounce-in" style={{ animationDelay: '0.2s' }}>
        <MapPin 
          className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10" 
          fill="#4361ee" 
          stroke="black" 
          strokeWidth={2.5}
        />
      </div>

      {/* Yellow zigzag/lightning - Repositioned to bottom left area, under text on desktop, below buttons on mobile */}
      <div className="absolute bottom-4 left-80 sm:bottom-32 sm:left-8 md:top-4 md:bottom-auto md:left-32 z-0 pointer-events-none rotate-12 animate-float-fast animate-bounce-in" style={{ animationDelay: '0.3s' }}>
        <svg viewBox="0 0 30 50" className="w-5 h-8 sm:w-6 sm:h-10 md:w-8 md:h-12">
          <path d="M15 0 L5 20 L15 20 L5 50 L25 25 L15 25 L25 0 Z" fill="#ffe135" stroke="black" strokeWidth="2" />
        </svg>
      </div>

      {/* Lavender blob - left side - Hide on mobile/tablet */}
      <div className="absolute top-1/3 left-4 z-0 pointer-events-none hidden lg:block animate-float-slow animate-rotate-slow-reverse animate-bounce-in" style={{ animationDelay: '0.4s' }}>
        <div className="w-14 h-14 bg-[#E0B0FF] rounded-full border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
      </div>

      {/* Green star - top center-right - Show on mobile, smaller */}
      <div className="absolute top-8 right-1/4 sm:top-12 sm:right-1/3 md:top-16 z-0 pointer-events-none animate-float animate-rotate-slow animate-bounce-in" style={{ animationDelay: '0.5s' }}>
        <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 fill-[#c8ff00] stroke-black stroke-[2px]">
          <path d="M12 0 L14.5 9 L24 12 L14.5 15 L12 24 L9.5 15 L0 12 L9.5 9 Z" />
        </svg>
      </div>

      {/* Hot pink marker - right middle - Keep on mobile, bigger size */}
      <div className="absolute top-1/2 right-8 sm:right-12 md:right-16 z-0 pointer-events-none rotate-6 animate-float-slow animate-rotate-slow-reverse animate-bounce-in" style={{ animationDelay: '0.6s' }}>
        <MapPin 
          className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12" 
          fill="#ff1493" 
          stroke="black" 
          strokeWidth={2.5}
        />
      </div>

      {/* Dotted circle decoration - bottom left - Hide on mobile */}
      <div className="absolute bottom-4 left-12 z-0 pointer-events-none hidden md:block animate-float animate-rotate-slow animate-bounce-in" style={{ animationDelay: '0.7s' }}>
        <div className="w-20 h-20 rounded-full border-[3px] border-dashed border-black/40" />
      </div>

      {/* Blue dot small - Keep on mobile, smaller size, below buttons on mobile */}
      <div className="absolute bottom-2 right-4 sm:bottom-48 md:bottom-60 sm:right-8 md:right-16 z-0 pointer-events-none animate-float-fast animate-pulse-gentle animate-bounce-in" style={{ animationDelay: '0.8s' }}>
        <div className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 bg-[#4361ee] rounded-full border-[1.5px] sm:border-2 border-black" />
      </div>

      {/* Orange/peach blob - bottom right - Show on mobile, smaller, below buttons on mobile */}
      <div className="absolute bottom-2 right-4 sm:bottom-28 sm:right-6 md:bottom-32 md:right-8 z-0 pointer-events-none -rotate-12 animate-float animate-rotate-slow animate-bounce-in" style={{ animationDelay: '0.9s' }}>
        <div className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 bg-[#ffb347] rounded-full border-[2px] sm:border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
      </div>

      {/* Tiny yellow star - scattered - Show on mobile, below buttons on mobile */}
      <div className="absolute bottom-2 left-1/4 sm:bottom-44 md:bottom-48 z-0 pointer-events-none animate-float-fast animate-rotate-slow animate-bounce-in" style={{ animationDelay: '1s' }}>
        <svg viewBox="0 0 24 24" className="w-5 h-5 sm:w-6 sm:h-6 fill-[#ffe135] stroke-black stroke-2">
          <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />
        </svg>
      </div>

      {/* Pink heart - bottom - Show on mobile, smaller, below buttons on mobile */}
      <div className="absolute bottom-2 left-8 sm:bottom-18 sm:left-12 md:bottom-20 md:left-20 z-0 pointer-events-none rotate-12 animate-float-slow animate-pulse-gentle animate-bounce-in hover:animate-celebrate" style={{ animationDelay: '1.1s' }}>
        <svg viewBox="0 0 24 24" className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8 fill-[#ff69b4] stroke-black stroke-2">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>

      {/* Mint squiggle - top - Above the button, positioned higher on mobile */}
      <div className="absolute top-8 left-1/4 sm:top-12 sm:left-1/5 md:top-20 md:left-1/6 z-0 pointer-events-none animate-float animate-bounce-in" style={{ animationDelay: '1.2s' }}>
        <svg viewBox="0 0 40 20" className="w-8 h-4 sm:w-10 sm:h-5 md:w-12 md:h-6">
          <path d="M0 10 Q10 0 20 10 T40 10" stroke="#7DF9FF" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M0 10 Q10 0 20 10 T40 10" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* Small magenta blob - Hide on mobile/tablet */}
      <div className="absolute top-2/3 left-8 z-0 pointer-events-none hidden lg:block animate-float-fast animate-rotate-slow-reverse animate-bounce-in" style={{ animationDelay: '1.3s' }}>
        <div className="w-8 h-8 bg-[#ff00ff] rounded-full border-2 border-black" />
      </div>

      {/* Sparkle top right - Show on mobile, smaller, closer to wave, below buttons on mobile */}
      <div className="absolute bottom-2 right-12 sm:top-36 sm:bottom-auto sm:right-20 md:top-40 md:right-32 z-0 pointer-events-none animate-float-fast animate-rotate-slow animate-pulse-gentle animate-bounce-in" style={{ animationDelay: '1.4s' }}>
        <svg viewBox="0 0 20 20" className="w-4 h-4 sm:w-5 sm:h-5 md:w-5 md:h-5">
          <path d="M10 0 L11 8 L10 10 L9 8 Z" fill="black" />
          <path d="M10 20 L11 12 L10 10 L9 12 Z" fill="black" />
          <path d="M0 10 L8 9 L10 10 L8 11 Z" fill="black" />
          <path d="M20 10 L12 9 L10 10 L12 11 Z" fill="black" />
        </svg>
      </div>

      {/* Train sticker - top center area */}
      <div className="absolute top-52 left-2/3 sm:top-20 sm:left-2/5 md:top-44 md:left-2/3 md:-translate-x-1/2 z-0 pointer-events-none rotate-[5deg] animate-float animate-rotate-slow-reverse animate-bounce-in" style={{ animationDelay: '1.5s' }}>
        <Train 
          className="w-8 h-8 sm:w-9 sm:h-9 md:w-10 md:h-10" 
          fill="#7DF9FF"
          stroke="black" 
          strokeWidth={2.5}
        />
      </div>

    </>
  );
}
