import { useState, useEffect, useRef } from 'react';

export type VoiceState = 'idle' | 'listening' | 'processing' | 'success' | 'error';

interface UseVoiceInputProps {
  context: 'bulk' | 'mate' | 'theme';
  availableThemes?: string[];
  onResult: (data: any) => void;
  onError?: (error: string) => void;
  triggerRecording?: number;
}

export function useVoiceInput({
  context,
  availableThemes,
  onResult,
  onError,
  triggerRecording,
}: UseVoiceInputProps) {
  const [state, setState] = useState<VoiceState>('idle');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [transcript, setTranscript] = useState<string>('');
  const [isSupported, setIsSupported] = useState<boolean>(true);

  const recognitionRef = useRef<any>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousTriggerRef = useRef<number>(0);

  useEffect(() => {
    // Check browser support for Web Speech API
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

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
        const message =
          error instanceof Error ? error.message : 'Failed to process voice input';
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
          message =
            'Microphone access denied. Please enable microphone permissions in your browser.';
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
    if (
      triggerRecording !== undefined &&
      triggerRecording !== previousTriggerRef.current
    ) {
      previousTriggerRef.current = triggerRecording;

      if (state === 'idle' && isSupported && triggerRecording > 0) {
        console.log('[Voice] Auto-triggering recording from external trigger');
        setTimeout(() => {
          startListening();
        }, 100);
      }
    }
  }, [triggerRecording, state, isSupported]);

  const startListening = () => {
    if (!isSupported) {
      const message =
        'Voice input is not supported in this browser. Please use Chrome or Edge.';
      setErrorMessage(message);
      setState('error');
      onError?.(message);

      setTimeout(() => {
        setState('idle');
        setErrorMessage('');
      }, 3000);
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

  return {
    state,
    transcript,
    errorMessage,
    isSupported,
    startListening,
    stopListening,
  };
}
