import { useState, useEffect, useRef } from 'react';

export type VoiceState = 'idle' | 'recording' | 'uploading' | 'transcribing' | 'processing' | 'success' | 'error';

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
  const [recordingDuration, setRecordingDuration] = useState<number>(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const recordingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const previousTriggerRef = useRef<number>(0);
  const maxRecordingDuration = 120; // 2 minutes in seconds

  // Check browser support for MediaRecorder
  useEffect(() => {
    const checkSupport = () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setIsSupported(false);
        return false;
      }
      if (typeof MediaRecorder === 'undefined') {
        setIsSupported(false);
        return false;
      }
      setIsSupported(true);
      return true;
    };

    checkSupport();

    return () => {
      // Cleanup on unmount
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (recordingIntervalRef.current) {
        clearInterval(recordingIntervalRef.current);
      }
    };
  }, []);

  // Process audio after recording stops
  const processAudio = async (audioBlob: Blob) => {
    console.log(`[Voice] Processing audio blob: ${Math.round(audioBlob.size / 1024)}KB`);
    
    try {
      // Upload and transcribe with Whisper
      setState('uploading');
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      const transcribeResponse = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!transcribeResponse.ok) {
        const errorData = await transcribeResponse.json();
        throw new Error(errorData.error || 'Failed to transcribe audio');
      }

      setState('transcribing');
      const { transcription } = await transcribeResponse.json();
      console.log('[Voice] Transcription:', transcription);
      setTranscript(transcription);

      // Extract data using Gemini
      setState('processing');
      const extractResponse = await fetch('/api/extract-voice-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transcription,
          context,
          availableThemes,
        }),
      });

      if (!extractResponse.ok) {
        const errorData = await extractResponse.json();
        throw new Error(errorData.error || 'Failed to extract data');
      }

      const data = await extractResponse.json();
      console.log('[Voice] Extraction result:', data);

      setState('success');
      onResult(data);

      // Reset to idle after brief success indication
      setTimeout(() => {
        setState('idle');
        setTranscript('');
        setRecordingDuration(0);
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
        setRecordingDuration(0);
      }, 3000);
    }
  };

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

  const startListening = async () => {
    if (!isSupported) {
      const message = 'Voice input is not supported in this browser.';
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
      // Request microphone access
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      // Determine best audio format
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      }

      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];
      setRecordingDuration(0);

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        console.log('[Voice] Recording stopped');
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        
        // Stop all tracks
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }

        // Clear recording interval
        if (recordingIntervalRef.current) {
          clearInterval(recordingIntervalRef.current);
          recordingIntervalRef.current = null;
        }

        // Process the audio
        processAudio(audioBlob);
      };

      mediaRecorder.onerror = (event) => {
        console.error('[Voice] MediaRecorder error:', event);
        const message = 'Recording error occurred';
        setErrorMessage(message);
        setState('error');
        onError?.(message);

        setTimeout(() => {
          setState('idle');
          setErrorMessage('');
        }, 3000);
      };

      // Start recording
      mediaRecorder.start();
      setState('recording');
      console.log('[Voice] Recording started');

      // Start duration counter
      recordingIntervalRef.current = setInterval(() => {
        setRecordingDuration(prev => {
          const newDuration = prev + 1;
          
          // Auto-stop at max duration
          if (newDuration >= maxRecordingDuration) {
            console.log('[Voice] Max recording duration reached, stopping...');
            stopListening();
          }
          
          return newDuration;
        });
      }, 1000);

    } catch (error) {
      console.error('[Voice] Failed to start recording:', error);
      let message = 'Failed to start voice input.';
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
          message = 'Microphone access denied. Please enable microphone permissions in your browser.';
        } else if (error.name === 'NotFoundError') {
          message = 'No microphone found. Please check your microphone connection.';
        } else {
          message = error.message;
        }
      }

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
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
  };

  return {
    state,
    transcript,
    errorMessage,
    isSupported,
    recordingDuration,
    startListening,
    stopListening,
  };
}
