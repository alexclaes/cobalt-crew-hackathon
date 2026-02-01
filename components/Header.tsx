"use client";

export function Header() {
  return (
    <header className="relative z-20 px-4 py-4 sm:py-6 md:py-8">
      <div className="max-w-2xl mx-auto text-center">
        {/* Logo and Title with sparkle on the left */}
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold text-black tracking-tight font-sans relative inline-block">
          {/* Sparkle sticker on the left side of app name */}
          <span className="absolute -left-6 sm:-left-8 md:-left-10 top-1/2 -translate-y-1/2 z-0 pointer-events-none">
            <svg viewBox="0 0 20 20" className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6">
              <path d="M10 0 L11 8 L10 10 L9 8 Z" fill="black" />
              <path d="M10 20 L11 12 L10 10 L9 12 Z" fill="black" />
              <path d="M0 10 L8 9 L10 10 L8 11 Z" fill="black" />
              <path d="M20 10 L12 9 L10 10 L12 11 Z" fill="black" />
            </svg>
          </span>
          MidWay
        </h1>
        <p className="text-black/70 font-mono text-xs sm:text-sm mt-2">
          Automagically plan a trip with your mates
        </p>
      </div>
    </header>
  );
}
