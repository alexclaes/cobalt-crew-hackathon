"use client";

export function FloatingStickers() {
  return (
    <>
      {/* Smiley sticker - top right */}
      <div className="absolute top-20 right-8 z-20 rotate-12">
        <div className="w-16 h-16 bg-[#ffe135] rounded-full border-[3px] border-black flex items-center justify-center shadow-[3px_3px_0px_0px_rgba(0,0,0,1)]">
          <svg viewBox="0 0 24 24" className="w-10 h-10">
            <circle cx="8" cy="9" r="1.5" fill="black" />
            <circle cx="16" cy="9" r="1.5" fill="black" />
            <path d="M8 14 Q12 18 16 14" stroke="black" strokeWidth="2" fill="none" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      {/* Mint circle - top left */}
      <div className="absolute top-32 left-8 z-20 -rotate-6">
        <div className="w-12 h-12 bg-[#7DF9FF] rounded-full border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
      </div>

      {/* Yellow zigzag/lightning */}
      <div className="absolute top-48 left-16 z-20 rotate-12 hidden md:block">
        <svg viewBox="0 0 30 50" className="w-8 h-12">
          <path d="M15 0 L5 20 L15 20 L5 50 L25 25 L15 25 L25 0 Z" fill="#ffe135" stroke="black" strokeWidth="2" />
        </svg>
      </div>

      {/* Lavender blob - left side */}
      <div className="absolute top-1/3 left-4 z-20 hidden lg:block">
        <div className="w-14 h-14 bg-[#E0B0FF] rounded-full border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
      </div>

      {/* Green star - top center-right */}
      <div className="absolute top-16 right-1/3 z-20 hidden md:block">
        <svg viewBox="0 0 24 24" className="w-10 h-10 fill-[#c8ff00] stroke-black stroke-[2px]">
          <path d="M12 0 L14.5 9 L24 12 L14.5 15 L12 24 L9.5 15 L0 12 L9.5 9 Z" />
        </svg>
      </div>

      {/* Hot pink circle - right middle */}
      <div className="absolute top-1/2 right-6 z-20 rotate-6">
        <div className="w-10 h-10 bg-[#ff1493] rounded-full border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
      </div>

      {/* Dotted circle decoration - bottom left */}
      <div className="absolute bottom-40 left-12 z-20 hidden md:block">
        <div className="w-20 h-20 rounded-full border-[3px] border-dashed border-black/40" />
      </div>

      {/* Blue dot small */}
      <div className="absolute bottom-60 right-16 z-20">
        <div className="w-6 h-6 bg-[#4361ee] rounded-full border-2 border-black" />
      </div>

      {/* Orange/peach blob - bottom right */}
      <div className="absolute bottom-32 right-8 z-20 -rotate-12 hidden md:block">
        <div className="w-12 h-12 bg-[#ffb347] rounded-full border-[3px] border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]" />
      </div>

      {/* Tiny yellow star - scattered */}
      <div className="absolute bottom-48 left-1/4 z-20">
        <svg viewBox="0 0 24 24" className="w-6 h-6 fill-[#ffe135] stroke-black stroke-2">
          <path d="M12 0 L14 10 L24 12 L14 14 L12 24 L10 14 L0 12 L10 10 Z" />
        </svg>
      </div>

      {/* Pink heart - bottom */}
      <div className="absolute bottom-20 left-20 z-20 rotate-12 hidden lg:block">
        <svg viewBox="0 0 24 24" className="w-8 h-8 fill-[#ff69b4] stroke-black stroke-2">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
        </svg>
      </div>

      {/* Mint squiggle - top */}
      <div className="absolute top-28 left-1/3 z-20 hidden md:block">
        <svg viewBox="0 0 40 20" className="w-12 h-6">
          <path d="M0 10 Q10 0 20 10 T40 10" stroke="#7DF9FF" strokeWidth="4" fill="none" strokeLinecap="round" />
          <path d="M0 10 Q10 0 20 10 T40 10" stroke="black" strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
      </div>

      {/* Small magenta blob */}
      <div className="absolute top-2/3 left-8 z-20 hidden lg:block">
        <div className="w-8 h-8 bg-[#ff00ff] rounded-full border-2 border-black" />
      </div>

      {/* Sparkle top right */}
      <div className="absolute top-40 right-24 z-20 hidden md:block">
        <svg viewBox="0 0 20 20" className="w-5 h-5">
          <path d="M10 0 L11 8 L10 10 L9 8 Z" fill="black" />
          <path d="M10 20 L11 12 L10 10 L9 12 Z" fill="black" />
          <path d="M0 10 L8 9 L10 10 L8 11 Z" fill="black" />
          <path d="M20 10 L12 9 L10 10 L12 11 Z" fill="black" />
        </svg>
      </div>
    </>
  );
}
