import { createContext, useContext, useEffect } from 'react';
import type { ReactNode } from 'react';
import { useLocalStorage } from '@mantine/hooks';

export interface TTSSettings {
  enabled: boolean;
  voice: string;
  rate: string;
  volume: string;
  autoSpeak: 'off' | 'assistant-only' | 'all';
}

export interface Settings {
  // Model settings
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  repeatPenalty: number;
  
  // UI settings
  theme: 'light' | 'dark' | 'system';
  fontSize: 'small' | 'normal' | 'large';
  compactMode: boolean;
  
  // Chat settings
  autoScroll: boolean;
  showTimestamps: boolean;
  markdown: boolean;
  systemPrompt: string;
  
  // TTS settings
  tts: TTSSettings;
  
  // Advanced settings
  apiEndpoint: string;
  stream: boolean;
}

interface SettingsContextType {
  settings: Settings;
  updateSettings: (newSettings: Partial<Settings>) => void;
  resetSettings: () => void;
}

const defaultSettings: Settings = {
  // Model defaults
  model: 'gemma3:270m',
  temperature: 0.3,
  maxTokens: 2000,
  topP: 0.9,
  topK: 40,
  repeatPenalty: 1.1,
  
  // UI defaults
  theme: 'system',
  fontSize: 'normal',
  compactMode: false,
  
  // Chat defaults
  autoScroll: true,
  showTimestamps: true,
  markdown: true,
  systemPrompt: 'You are a helpful AI assistant.',
  
  // TTS defaults
  tts: {
    enabled: true,
    voice: 'en-US-AriaNeural',
    rate: '+0%',
    volume: '+0%',
    autoSpeak: 'assistant-only',
  },
  
  // Advanced defaults
  apiEndpoint: 'http://localhost:8000',
  stream: true,
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useLocalStorage<Settings>({
    key: 'ollama-chat-settings',
    defaultValue: defaultSettings,
    getInitialValueInEffect: true,
  });
  
  // Apply theme on load and when it changes
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Remove any existing theme classes
    root.classList.remove('light', 'dark');
    
    // Apply the current theme
    if (settings.theme === 'system') {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      root.classList.add(prefersDark ? 'dark' : 'light');
    } else {
      root.classList.add(settings.theme);
    }
  }, [settings.theme]);
  
  // Apply font size
  useEffect(() => {
    const root = window.document.documentElement;
    root.style.fontSize = {
      small: '14px',
      normal: '16px',
      large: '18px',
    }[settings.fontSize];
  }, [settings.fontSize]);
  
  const updateSettings = (newSettings: Partial<Settings>) => {
    setSettings(prev => ({
      ...prev,
      ...newSettings,
    }));
  };
  
  const resetSettings = () => {
    setSettings(defaultSettings);
  };
  
  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = (): SettingsContextType => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

export default SettingsContext;
