'use client';

import { useState, useEffect, useRef } from 'react';

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
  triggerRecording?: number; // When this number changes, start recording
}

type VoiceState = 'idle' | 'listening' | 'processing' | 'success' | 'error';

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
  const [state, setState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(true);
  
  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousTriggerRef = useRef<number>(0);

  useEffect(() => {
    // Check browser support for Web Speech API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      setIsSupported(false);
      return;
    }

    // Initialize speech recognition
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      console.log('[Voice] Recognition started');
      setState('listening');
      setTranscript('');
      setErrorMessage('');
    };

    recognition.onresult = async (event: any) => {
      const transcribedText = event.results[0][0].transcript;
      console.log('[Voice] Transcription:', transcribedText);
      setTranscript(transcribedText);
      setState('processing');

      try {
        // Send transcription to API for extraction
        const response = await fetch('/api/extract-voice-data', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            transcription: transcribedText,
            context,
            availableThemes,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.error || 'Failed to process voice input');
        }

        const data = await response.json();
        console.log('[Voice] Extraction result:', data);

        setState('success');
        onResult(data);

        // Reset to idle after brief success indication
        setTimeout(() => {
          setState('idle');
          setTranscript('');
        }, 1500);

      } catch (error) {
        console.error('[Voice] Processing error:', error);
        const message = error instanceof Error ? error.message : 'Failed to process voice input';
        setErrorMessage(message);
        setState('error');
        onError?.(message);

        // Reset to idle after showing error
        setTimeout(() => {
          setState('idle');
          setErrorMessage('');
        }, 3000);
      }
    };

    recognition.onerror = (event: any) => {
      console.error('[Voice] Recognition error:', event.error);
      
      let message = 'Voice recognition error';
      switch (event.error) {
        case 'not-allowed':
          message = 'Microphone access denied. Please enable microphone permissions in your browser.';
          break;
        case 'no-speech':
          message = 'No speech detected. Please try again.';
          break;
        case 'audio-capture':
          message = 'No microphone found. Please check your microphone connection.';
          break;
        case 'network':
          message = 'Network error. Please check your connection.';
          break;
        default:
          message = `Voice recognition error: ${event.error}`;
      }

      setErrorMessage(message);
      setState('error');
      onError?.(message);

      setTimeout(() => {
        setState('idle');
        setErrorMessage('');
      }, 3000);
    };

    recognition.onend = () => {
      console.log('[Voice] Recognition ended');
      if (state === 'listening') {
        // If we're still in listening state when it ends, something went wrong
        setState('idle');
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [context, availableThemes, onResult, onError]);

  // Watch for trigger changes to automatically start recording
  useEffect(() => {
    if (triggerRecording !== undefined && triggerRecording !== previousTriggerRef.current) {
      previousTriggerRef.current = triggerRecording;
      
      // Only trigger if we're in idle state and not disabled
      if (state === 'idle' && !disabled && isSupported && triggerRecording > 0) {
        console.log('[Voice] Auto-triggering recording from external trigger');
        // Small delay to ensure UI is ready
        setTimeout(() => {
          startListening();
        }, 100);
      }
    }
  }, [triggerRecording, state, disabled, isSupported]);

  const startListening = () => {
    if (!isSupported) {
      const message = 'Voice input is not supported in this browser. Please use Chrome or Edge.';
      setErrorMessage(message);
      setState('error');
      onError?.(message);
      
      setTimeout(() => {
        setState('idle');
        setErrorMessage('');
      }, 3000);
      return;
    }

    if (disabled) {
      return;
    }

    try {
      recognitionRef.current?.start();
    } catch (error) {
      console.error('[Voice] Failed to start recognition:', error);
      const message = 'Failed to start voice input. Please try again.';
      setErrorMessage(message);
      setState('error');
      onError?.(message);

      setTimeout(() => {
        setState('idle');
        setErrorMessage('');
      }, 3000);
    }
  };

  const stopListening = () => {
    recognitionRef.current?.stop();
  };

  const getButtonContent = () => {
    switch (state) {
      case 'listening':
        return (
          <>
            <div className="relative flex items-center justify-center">
              <div className="absolute w-12 h-12 bg-red-500 rounded-full animate-ping opacity-75"></div>
              <svg className="w-6 h-6 text-white relative z-10" fill="currentColor" viewBox="0 0 20 20">
                <rect x="6" y="6" width="8" height="8" rx="1" />
              </svg>
            </div>
            <span className="ml-3">Recording... Click to Stop</span>
          </>
        );

      case 'processing':
        return (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
            <span className="ml-3">Processing...</span>
          </>
        );

      case 'success':
        return (
          <>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span className="ml-3">Success!</span>
          </>
        );

      case 'error':
        return (
          <>
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span className="ml-3">Error</span>
          </>
        );

      default:
        return (
          <>
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M7 4a3 3 0 016 0v4a3 3 0 11-6 0V4zm4 10.93A7.001 7.001 0 0017 8a1 1 0 10-2 0A5 5 0 015 8a1 1 0 00-2 0 7.001 7.001 0 006 6.93V17H6a1 1 0 100 2h8a1 1 0 100-2h-3v-2.07z" clipRule="evenodd" />
            </svg>
            <span className="ml-3">{buttonText || 'Start Voice Input'}</span>
          </>
        );
    }
  };

  const getButtonColor = () => {
    switch (state) {
      case 'listening':
        return 'bg-red-600 hover:bg-red-700';
      case 'processing':
        return 'bg-blue-600';
      case 'success':
        return 'bg-green-600';
      case 'error':
        return 'bg-red-600';
      default:
        return 'bg-blue-600 hover:bg-blue-700';
    }
  };

  const isButtonDisabled = disabled || state === 'processing' || state === 'success';
  const isListening = state === 'listening';

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        onClick={isListening ? stopListening : startListening}
        disabled={isButtonDisabled}
        className={`
          ${buttonClassName || 'px-6 py-3 rounded-lg font-medium'}
          ${getButtonColor()}
          text-white
          flex items-center justify-center
          transition-all duration-200
          disabled:opacity-50 disabled:cursor-not-allowed
          shadow-lg hover:shadow-xl
          min-w-[200px]
        `}
      >
        {getButtonContent()}
      </button>

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
          Voice input is not supported in this browser. Please use Chrome or Edge for the best experience.
        </div>
      )}
    </div>
  );
}
