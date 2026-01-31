"use client";

export function Header() {
  return (
    <header className="relative z-20 px-4 py-8">
      <div className="max-w-2xl mx-auto text-center">
        {/* Logo and Title */}
        <h1 className="text-4xl md:text-5xl font-bold text-black tracking-tight font-sans">
          MidWay
        </h1>
        <p className="text-black/70 font-mono text-sm mt-2">
          Automagically plan a trip with your mates
        </p>
      </div>
    </header>
  );
}
