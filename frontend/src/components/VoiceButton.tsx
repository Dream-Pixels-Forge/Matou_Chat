import { useState, useRef, useEffect } from 'react';
import { Button, Tooltip } from '@mantine/core';
import { IconMicrophone, IconPlayerStop } from '@tabler/icons-react';
import { useVoiceChat } from '../hooks/useVoiceChat';

interface VoiceButtonProps {
  onTextTranscribed: (text: string) => void;
  onStartSpeaking?: () => void;
  onStopSpeaking?: () => void;
  disabled?: boolean;
}

export const VoiceButton = ({
  onTextTranscribed,
  onStartSpeaking,
  onStopSpeaking,
  disabled = false,
}: VoiceButtonProps) => {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const { sendText, isConnected } = useVoiceChat({
    onError: (error) => {
      console.error('Voice chat error:', error);
      setIsListening(false);
      onStopSpeaking?.();
    },
  });

  useEffect(() => {
    // Initialize speech recognition
    const SpeechRecognition =
      window.SpeechRecognition || (window as any).webkitSpeechRecognition;
    
    if (!SpeechRecognition) {
      console.warn('Speech recognition not supported in this browser');
      return;
    }

    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    recognitionRef.current.lang = 'en-US';

    recognitionRef.current.onresult = (event: SpeechRecognitionEvent) => {
      const transcript = Array.from(event.results)
        .map((result) => result[0]?.transcript || '')
        .join('');
      
      if (event.results[0]?.isFinal) {
        onTextTranscribed(transcript);
      }
    };

    recognitionRef.current.onend = () => {
      if (isListening) {
        // Restart recognition if still supposed to be listening
        recognitionRef.current?.start();
      }
    };

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening, onTextTranscribed, onStopSpeaking]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      console.error('Speech recognition not available');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
      onStopSpeaking?.();
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
        onStartSpeaking?.();
      } catch (error) {
        console.error('Error starting speech recognition:', error);
        onStopSpeaking?.();
      }
    }
  };

  const speakText = (text: string) => {
    if (isConnected && text.trim()) {
      sendText(text);
    }
  };

  return (
    <Tooltip
      label={isListening ? 'Stop Listening' : 'Start Voice Input'}
      position="top"
      withArrow
    >
      <Button
        variant={isListening ? 'filled' : 'outline'}
        color={isListening ? 'red' : 'blue'}
        onClick={toggleListening}
        disabled={disabled || !isConnected}
        loading={isProcessing}
        leftIcon={isListening ? <IconPlayerStop size={20} /> : <IconMicrophone size={20} />}
      >
        {isListening ? 'Listening...' : 'Voice'}
      </Button>
    </Tooltip>
  );
};
