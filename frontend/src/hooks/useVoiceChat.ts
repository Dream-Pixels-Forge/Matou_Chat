import { useCallback, useEffect, useRef } from 'react';

interface VoiceChatOptions {
  onAudioChunk?: (chunk: Blob) => void;
  onError?: (error: string) => void;
  onConnected?: () => void;
  onDisconnected?: () => void;
}

export const useVoiceChat = (options: VoiceChatOptions = {}) => {
  const ws = useRef<WebSocket | null>(null);
  const clientId = useRef(`client-${Math.random().toString(36).substr(2, 9)}`);
  const audioContext = useRef<AudioContext | null>(null);
  const audioQueue = useRef<ArrayBuffer[]>([]);
  const isPlaying = useRef(false);

  const { onAudioChunk, onError, onConnected, onDisconnected } = options;

  const initAudioContext = useCallback(() => {
    if (typeof window !== 'undefined' && !audioContext.current) {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      audioContext.current = new AudioContext();
    }
  }, []);

  const processAudioQueue = useCallback(async () => {
    if (isPlaying.current || audioQueue.current.length === 0 || !audioContext.current) return;

    isPlaying.current = true;
    const audioData = audioQueue.current.shift();

    if (!audioData) {
      isPlaying.current = false;
      return;
    }

    try {
      const audioBuffer = await audioContext.current.decodeAudioData(audioData);
      const source = audioContext.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.current.destination);
      
      source.onended = () => {
        isPlaying.current = false;
        processAudioQueue();
      };

      source.start();
    } catch (error) {
      console.error('Error playing audio:', error);
      isPlaying.current = false;
      processAudioQueue();
    }
  }, []);

  const connect = useCallback(() => {
    if (ws.current?.readyState === WebSocket.OPEN) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const wsUrl = `${protocol}//${host}/ws/voice/${clientId.current}`;
    
    ws.current = new WebSocket(wsUrl);

    ws.current.binaryType = 'arraybuffer';

    ws.current.onopen = () => {
      console.log('WebSocket connected');
      onConnected?.();
    };

    ws.current.onmessage = (event) => {
      if (event.data instanceof ArrayBuffer) {
        // Handle binary audio data
        audioQueue.current.push(event.data);
        processAudioQueue();
        
        // Notify parent component about the new audio chunk
        if (onAudioChunk) {
          const blob = new Blob([event.data], { type: 'audio/wav' });
          onAudioChunk(blob);
        }
      } else {
        // Handle JSON messages
        try {
          const message = JSON.parse(event.data);
          if (message.type === 'error') {
            console.error('Server error:', message.message);
            onError?.(message.message);
          }
        } catch (e) {
          console.error('Error parsing WebSocket message:', e);
        }
      }
    };

    ws.current.onclose = () => {
      console.log('WebSocket disconnected');
      onDisconnected?.();
      // Attempt to reconnect after a delay
      setTimeout(connect, 3000);
    };

    ws.current.onerror = (error) => {
      console.error('WebSocket error:', error);
      onError?.('Connection error. Trying to reconnect...');
    };
  }, [onAudioChunk, onError, onConnected, onDisconnected, processAudioQueue]);

  const disconnect = useCallback(() => {
    if (ws.current) {
      ws.current.close();
      ws.current = null;
    }
  }, []);

  const sendText = useCallback((text: string) => {
    if (ws.current?.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify({
        type: 'tts',
        text: text
      }));
      return true;
    }
    return false;
  }, []);

  useEffect(() => {
    initAudioContext();
    connect();

    return () => {
      disconnect();
      if (audioContext.current) {
        audioContext.current.close();
      }
    };
  }, [connect, disconnect, initAudioContext]);

  return {
    isConnected: ws.current?.readyState === WebSocket.OPEN,
    sendText,
    connect,
    disconnect,
    clientId: clientId.current
  };
};
