"use client";

import { Mic } from "lucide-react";
import VoiceInput, { type VoiceResult } from "./VoiceInput";

interface VoiceSectionProps {
  themes: string[];
  onVoiceResult: (result: VoiceResult) => void;
  onError?: (error: string) => void;
  triggerRecording?: number;
}

export function VoiceSection({
  themes,
  onVoiceResult,
  onError,
  triggerRecording,
}: VoiceSectionProps) {
  return (
    <section className="relative z-10 mb-8 py-6">
      <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-4">
        {/* Voice CTA Button - cobalt blue accent */}
        <VoiceInput
          context="bulk"
          availableThemes={themes}
          onResult={onVoiceResult}
          onError={onError}
          buttonText="Quick Start with Voice"
          buttonClassName="bg-[#4361ee] text-white font-sans font-bold text-base px-8 py-4 rounded-full border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-3"
          triggerRecording={triggerRecording}
        />

        <p className="font-mono text-xs text-black/70 text-center italic">
          Example: {'"'}Add Sarah, Michael from Munich, and Alex. I want a food
          and drink trip.{'"'}
        </p>
      </div>
    </section>
  );
}
