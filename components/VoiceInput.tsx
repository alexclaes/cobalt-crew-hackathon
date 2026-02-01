'use client';

import VoiceButton from './ui/VoiceButton';
import { useVoiceInput } from '@/hooks/useVoiceInput';

interface MateData {
  name: string;
  address: string;
}

export interface BulkVoiceResult {
  type: 'bulk';
  mates: MateData[];
  theme: string | null;
}

export interface MateVoiceResult {
  type: 'mate';
  name: string;
  address: string;
}

export interface ThemeVoiceResult {
  type: 'theme';
  themeName: string;
}

export type VoiceResult = BulkVoiceResult | MateVoiceResult | ThemeVoiceResult;

interface VoiceInputProps {
  context: 'bulk' | 'mate' | 'theme';
  availableThemes?: string[];
  onResult: (data: VoiceResult) => void;
  onError?: (error: string) => void;
  disabled?: boolean;
  buttonText?: string;
  buttonClassName?: string;
  triggerRecording?: number;
}

export default function VoiceInput({
  context,
  availableThemes,
  onResult,
  onError,
  disabled = false,
  buttonText,
  buttonClassName,
  triggerRecording,
}: VoiceInputProps) {
  const {
    state,
    transcript,
    errorMessage,
    isSupported,
    startListening,
    stopListening,
  } = useVoiceInput({
    context,
    availableThemes,
    onResult,
    onError,
    triggerRecording,
  });

  const isListening = state === 'listening';

  return (
    <div className="flex flex-col items-center gap-2">
      <VoiceButton
        state={state}
        onClick={isListening ? stopListening : startListening}
        disabled={disabled}
        buttonText={buttonText}
        buttonClassName={buttonClassName}
      />

      {/* Recording hint */}
      {state === 'listening' && (
        <div className="text-sm text-gray-600 max-w-md text-center animate-pulse">
          🎙️ Speak now or click the button to stop
        </div>
      )}

      {/* Transcript preview */}
      {transcript && state === 'processing' && (
        <div className="text-sm text-gray-600 italic max-w-md text-center">
          "{transcript}"
        </div>
      )}

      {/* Error message */}
      {errorMessage && state === 'error' && (
        <div className="text-sm text-red-600 max-w-md text-center">
          {errorMessage}
        </div>
      )}

      {/* Browser not supported message */}
      {!isSupported && state === 'idle' && (
        <div className="text-sm text-orange-600 max-w-md text-center">
          Voice input is not supported in this browser. Please use Chrome or Edge
          for the best experience.
        </div>
      )}
    </div>
  );
}
