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

  const audioContextRef = useRef<AudioContext | null>(null);
  const audioQueueRef = useRef<ArrayBuffer[]>([]);
  const [isSpeaking, setIsSpeaking] = useState(false);

  const initAudioContext = useCallback(() => {
    if (typeof window !== 'undefined' && !audioContextRef.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContextRef.current = new AudioContext();
    }
  }, []);

  const processAudioQueue = useCallback(async () => {
    if (isSpeaking || audioQueueRef.current.length === 0 || !audioContextRef.current) {
      return;
    }

    setIsSpeaking(true);
    const audioData = audioQueueRef.current.shift();

    if (!audioData) {
      setIsSpeaking(false);
      return;
    }

    try {
      const audioBuffer = await audioContextRef.current.decodeAudioData(audioData);
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      
      source.onended = () => {
        setIsSpeaking(false);
        processAudioQueue();
        onEnd?.();
      };

      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to play audio');
      setIsSpeaking(false);
      processAudioQueue();
    }
  }, [onEnd, onError, isSpeaking]);

  const speak = useCallback(async (text: string) => {
    if (!text.trim()) return;

    try {
      onStart?.();
      initAudioContext();

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

      const audioData = await response.arrayBuffer();
      audioQueueRef.current.push(audioData);
      processAudioQueue();
    } catch (error) {
      console.error('Error in TTS:', error);
      onError?.(error instanceof Error ? error.message : 'Failed to convert text to speech');
    }
  }, [initAudioContext, onStart, onError, processAudioQueue, voice, rate, volume]);

  return {
    speak,
    stop: () => {
      // Stop currently playing audio and clear the queue
      if (audioContextRef.current?.state === 'running') {
        audioContextRef.current.suspend();
      }
      audioQueueRef.current = [];
      setIsSpeaking(false);
    },
    isSpeaking,
  };
};
