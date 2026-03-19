import { useState, useCallback, useRef } from 'react';
import RecordRTC from 'recordrtc';

interface UseTranslationOptions {
  targetLang?: string;
  channel?: string;
  userId?: string;
  onTranscription?: (text: string) => void;
  onTranslation?: (text: string) => void;
  onError?: (error: string) => void;
}

interface UseTranslationReturn {
  isRecording: boolean;
  isProcessing: boolean;
  transcribedText: string;
  translatedText: string;
  startRecording: () => Promise<void>;
  stopRecording: () => Promise<void>;
  processAudioFile: (file: File) => Promise<void>;
  clearTexts: () => void;
}

export const useTranslation = (options: UseTranslationOptions = {}): UseTranslationReturn => {
  const {
    targetLang = 'en',
    channel,
    userId,
    onTranscription,
    onTranslation,
    onError
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [transcribedText, setTranscribedText] = useState('');
  const [translatedText, setTranslatedText] = useState('');

  const recorderRef = useRef<RecordRTC | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const processAudio = useCallback(async (audioBlob: Blob) => {
    setIsProcessing(true);
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.mp3');
      formData.append('targetLang', targetLang);
      if (channel) formData.append('channel', channel);
      if (userId) formData.append('userId', userId);

      const response = await fetch('https://viptravel-backend.erdneebatulzii23.workers.dev/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Transcription failed: ${errorText}`);
      }

      const result = await response.json() as any;
      
      if (result.success) {
        setTranscribedText(result.transcribed);
        setTranslatedText(result.translated);
        
        if (onTranscription) onTranscription(result.transcribed);
        if (onTranslation) onTranslation(result.translated);
      } else {
        throw new Error(result.error || 'Transcription failed');
      }
    } catch (error: any) {
      console.error('Translation error:', error);
      if (onError) onError(error.message || 'Failed to process audio');
    } finally {
      setIsProcessing(false);
    }
  }, [targetLang, channel, userId, onTranscription, onTranslation, onError]);

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const recorder = new RecordRTC(stream, {
        type: 'audio',
        mimeType: 'audio/webm',
        recorderType: RecordRTC.StereoAudioRecorder,
        desiredSampRate: 16000,
        numberOfAudioChannels: 1,
        // Remove timeSlice and ondataavailable to prevent real-time chunk processing
        // We'll only process the final audio when recording stops
      });

      recorderRef.current = recorder;
      recorder.startRecording();
      setIsRecording(true);
    } catch (error: any) {
      console.error('Recording error:', error);
      if (onError) onError(error.message || 'Failed to start recording');
    }
  }, [onError]);

  const stopRecording = useCallback(async () => {
    if (!recorderRef.current || !streamRef.current) return;

    return new Promise<void>((resolve) => {
      recorderRef.current!.stopRecording(() => {
        const blob = recorderRef.current!.getBlob();
        
        // Stop all tracks
        streamRef.current!.getTracks().forEach(track => track.stop());
        
        setIsRecording(false);
        
        // Process the final recording
        if (blob.size > 0) {
          processAudio(blob);
        }
        
        resolve();
      });
    });
  }, [processAudio]);

  const processAudioFile = useCallback(async (file: File) => {
    await processAudio(file);
  }, [processAudio]);

  const clearTexts = useCallback(() => {
    setTranscribedText('');
    setTranslatedText('');
  }, []);

  return {
    isRecording,
    isProcessing,
    transcribedText,
    translatedText,
    startRecording,
    stopRecording,
    processAudioFile,
    clearTexts
  };
};

export default useTranslation;