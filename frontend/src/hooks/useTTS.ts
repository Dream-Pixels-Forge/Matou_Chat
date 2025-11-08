import { useCallback, useRef, useState } from 'react';

interface TTSServiceOptions {
  voice?: string;
  rate?: string;
  volume?: string;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (error: string) => void;
}

export const useTTS = (options: TTSServiceOptions = {}) => {
  const {
    voice = 'en-US-AriaNeural',
    rate = '+0%',
    volume = '+0%',
    onStart,
    onEnd,
    onError,
  } = options;

  const [isSpeaking, setIsSpeaking] = useState(false);
  const currentAudioRef = useRef<HTMLAudioElement | null>(null);

  const speakWithWebAPI = useCallback((text: string) => {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.onstart = () => {
        setIsSpeaking(true);
        onStart?.();
      };
      utterance.onend = () => {
        setIsSpeaking(false);
        onEnd?.();
      };
      utterance.onerror = () => {
        setIsSpeaking(false);
        onError?.('Speech synthesis failed');
      };
      window.speechSynthesis.speak(utterance);
      return true;
    }
    return false;
  }, [onStart, onEnd, onError]);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    if (currentAudioRef.current) {
      currentAudioRef.current.pause();
      currentAudioRef.current = null;
    }
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }

    try {
      onStart?.();
      setIsSpeaking(true);

      const response = await fetch('http://localhost:8001/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice,
          rate,
          volume,
        }),
      });

      if (!response.ok) {
        throw new Error(`TTS request failed with status ${response.status}`);
      }

      const audioBlob = await response.blob();
      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);
      
      currentAudioRef.current = audio;
      
      audio.onended = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        onEnd?.();
      };
      
      audio.onerror = () => {
        setIsSpeaking(false);
        URL.revokeObjectURL(audioUrl);
        currentAudioRef.current = null;
        if (!speakWithWebAPI(text)) {
          onError?.('Audio playback failed');
        }
      };
      
      await audio.play();
      
    } catch (error) {
      setIsSpeaking(false);
      if (!speakWithWebAPI(text)) {
        onError?.(error instanceof Error ? error.message : 'TTS failed');
      }
    }
  }, [onStart, onEnd, onError, speakWithWebAPI, voice, rate, volume]);

  return {
    speak,
    stop: () => {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause();
        currentAudioRef.current = null;
      }
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel();
      }
      setIsSpeaking(false);
    },
    isSpeaking,
  };
};
