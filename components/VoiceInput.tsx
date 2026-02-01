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
    recordingDuration,
    startListening,
    stopListening,
  } = useVoiceInput({
    context,
    availableThemes,
    onResult,
    onError,
    triggerRecording,
  });

  const isRecording = state === 'recording';

  // Format recording duration as MM:SS
  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col items-center gap-2">
      <VoiceButton
        state={state}
        onClick={isRecording ? stopListening : startListening}
        disabled={disabled}
        buttonText={buttonText}
        buttonClassName={buttonClassName}
      />

      {/* Recording hint with timer */}
      {state === 'recording' && (
        <div className="flex flex-col items-center gap-1">
          <div className="text-sm text-red-600 font-semibold animate-pulse">
            🔴 Recording... {formatDuration(recordingDuration)}
          </div>
          <div className="text-xs text-gray-500">
            Click the button to stop (max 2:00)
          </div>
        </div>
      )}

      {/* Uploading state */}
      {state === 'uploading' && (
        <div className="text-sm text-blue-600 max-w-md text-center">
          ⬆️ Uploading audio...
        </div>
      )}

      {/* Transcribing state */}
      {state === 'transcribing' && (
        <div className="text-sm text-blue-600 max-w-md text-center">
          ✍️ Transcribing with Whisper...
        </div>
      )}

      {/* Processing state with transcript */}
      {state === 'processing' && (
        <div className="flex flex-col items-center gap-1">
          <div className="text-sm text-blue-600">
            🤖 Extracting data...
          </div>
          {transcript && (
            <div className="text-xs text-gray-600 italic max-w-md text-center">
              "{transcript.substring(0, 100)}{transcript.length > 100 ? '...' : ''}"
            </div>
          )}
        </div>
      )}

      {/* Error message */}
      {errorMessage && state === 'error' && (
        <div className="text-sm text-red-600 max-w-md text-center">
          ❌ {errorMessage}
        </div>
      )}

      {/* Browser not supported message */}
      {!isSupported && state === 'idle' && (
        <div className="text-sm text-orange-600 max-w-md text-center">
          ⚠️ Voice input is not supported in this browser. Please use a modern browser.
        </div>
      )}
    </div>
  );
}
