"use client";

import { Mic } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import VoiceInput, { type VoiceResult } from "./VoiceInput";
import { useVoiceInput } from "@/hooks/useVoiceInput";
import VoiceButton from "./ui/VoiceButton";

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
  const [hasRecordedOnce, setHasRecordedOnce] = useState(false);
  const [lastSuccessfulTranscript, setLastSuccessfulTranscript] = useState("");

  const {
    state,
    transcript,
    errorMessage,
    isSupported,
    recordingDuration,
    startListening,
    stopListening,
  } = useVoiceInput({
    context: "bulk",
    availableThemes: themes,
    onResult: onVoiceResult,
    onError,
    triggerRecording,
  });

  // Track when recording starts
  useEffect(() => {
    if (state === "recording" && !hasRecordedOnce) {
      setHasRecordedOnce(true);
    }
  }, [state, hasRecordedOnce]);

  // Save successful transcript
  useEffect(() => {
    if (state === "success" && transcript) {
      setLastSuccessfulTranscript(transcript);
    }
  }, [state, transcript]);

  const isRecording = state === "recording";

  // Format recording duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Get status message based on state
  const getStatusMessage = () => {
    switch (state) {
      case "recording":
        return `🔴 Recording... ${formatDuration(recordingDuration)}`;
      case "uploading":
        return "⬆️ Uploading audio...";
      case "transcribing":
        return "✍️ Transcribing with Whisper...";
      case "processing":
        return transcript
          ? `🤖 Processing: "${transcript.substring(0, 60)}${transcript.length > 60 ? "..." : ""}"`
          : "🤖 Extracting data...";
      case "success":
        return transcript
          ? `✅ Detected: "${transcript}"`
          : "✅ Success!";
      case "error":
        return `❌ ${errorMessage || "Error occurred"}`;
      case "idle":
        // Once recorded, show last successful transcript or ready message
        if (hasRecordedOnce) {
          return lastSuccessfulTranscript
            ? `✅ Detected: "${lastSuccessfulTranscript}"`
            : "Ready for next voice input";
        }
        // Show example only if never recorded before
        return 'Example: "Add Sarah, Michael from Munich, and Alex. I want a food and drink trip."';
      default:
        return hasRecordedOnce
          ? "Ready for next voice input"
          : 'Example: "Add Sarah, Michael from Munich, and Alex. I want a food and drink trip."';
    }
  };

  return (
    <section className="relative z-10 mb-8 py-6">
      <div className="max-w-2xl mx-auto px-4 flex flex-col items-center gap-4">
        {/* Voice CTA Button */}
        <VoiceButton
          state={state}
          onClick={isRecording ? stopListening : startListening}
          disabled={false}
          buttonText="Quick Start with Voice"
          buttonClassName="bg-[#4361ee] text-white font-sans font-bold text-base px-8 py-4 rounded-full border-[3px] border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] hover:shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:translate-x-[2px] hover:translate-y-[2px] transition-all flex items-center gap-3"
        />

        {/* Dynamic status message */}
        <p
          className={`font-mono text-xs text-center italic min-h-[32px] flex items-center justify-center ${
            state === "error"
              ? "text-red-600 font-semibold"
              : "text-black/70"
          }`}
        >
          {getStatusMessage()}
        </p>

        {/* Browser compatibility warning */}
        {!isSupported && state === "idle" && (
          <p className="text-xs text-orange-600 text-center">
            ⚠️ Voice input not supported in this browser
          </p>
        )}
      </div>
    </section>
  );
}
