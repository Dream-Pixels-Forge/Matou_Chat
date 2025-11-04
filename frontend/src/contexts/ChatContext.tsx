import React, { createContext, useContext, useState, useRef, useCallback } from 'react';
import type { ReactNode } from 'react';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import { api } from '../services/api';
import type { Message as APIMessage } from '../services/api';
import { useSettings } from './SettingsContext';

interface ChatMessage extends Omit<APIMessage, 'timestamp'> {
  timestamp: number;
  isGenerating?: boolean;
  error?: string;
}

interface ChatContextType {
  // State
  messages: ChatMessage[];
  currentModel: string;
  availableModels: string[];
  isLoading: boolean;
  isGenerating: boolean;
  isSidebarOpen: boolean;
  
  // Actions
  sendMessage: (content: string) => Promise<void>;
  clearChat: () => void;
  setCurrentModel: (model: string) => void;
  toggleSidebar: () => void;
  refreshModels: () => Promise<void>;
  
  // UI State
  isSettingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;
}

const ChatContext = createContext<ChatContextType | undefined>(undefined);

export const ChatProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { settings } = useSettings();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentModel, setCurrentModel] = useState<string>(settings.model);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isSidebarOpen, { toggle: toggleSidebar }] = useDisclosure(true);
  const [isSettingsOpen, { open: openSettings, close: closeSettings }] = useDisclosure(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      await Promise.all([
        refreshModels(),
        // Load any saved chat history here
      ]);
    } catch (error) {
      console.error('Failed to load initial data:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load initial data',
        color: 'red',
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load available models
  const refreshModels = useCallback(async () => {
    try {
      const response = await api.getModels();
      const models = response.models.map((m: any) => m.name);
      setAvailableModels(models);
      
      // If current model is not in available models, select the first one
      if (models.length > 0 && !models.includes(currentModel)) {
        setCurrentModel(models[0]);
      }
    } catch (error) {
      console.error('Failed to load models:', error);
      notifications.show({
        title: 'Error',
        message: 'Failed to load models',
        color: 'red',
      });
    }
  }, [currentModel]);

  // Send a message to the API
  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isGenerating) return;
    
    // Create user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: content.trim(),
      timestamp: Date.now(),
    };
    
    // Create placeholder for assistant's response
    const assistantMessage: ChatMessage = {
      id: `temp-${Date.now()}`,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      isGenerating: true,
    };
    
    // Add messages to the chat
    setMessages(prev => [...prev, userMessage, assistantMessage]);
    
    // Prepare the request
    const request = {
      model: currentModel,
      messages: [
        ...messages.map(m => ({
          role: m.role,
          content: m.content,
        })),
        { role: 'user', content: content.trim() },
      ],
      stream: settings.stream,
      temperature: settings.temperature,
      max_tokens: settings.maxTokens,
    };
    
    // Handle streaming response
    if (settings.stream) {
      try {
        setIsGenerating(true);
        abortControllerRef.current = new AbortController();
        
        let fullResponse = '';
        
        for await (const chunk of api.streamChat(request)) {
          if (chunk.done) break;
          
          // Update the assistant's message with the new content
          fullResponse = chunk.message?.content || '';
          
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.content = fullResponse;
              lastMessage.isGenerating = true;
            }
            
            return newMessages;
          });
        }
        
        // Mark generation as complete
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.isGenerating = false;
            lastMessage.id = `msg-${Date.now()}`;
          }
          
          return newMessages;
        });
      } catch (error: any) {
        if (error.name !== 'AbortError') {
          console.error('Error in streaming chat:', error);
          
          // Update the message with the error
          setMessages(prev => {
            const newMessages = [...prev];
            const lastMessage = newMessages[newMessages.length - 1];
            
            if (lastMessage && lastMessage.role === 'assistant') {
              lastMessage.isGenerating = false;
              lastMessage.error = error.message || 'Failed to generate response';
            }
            
            return newMessages;
          });
          
          notifications.show({
            title: 'Error',
            message: 'Failed to generate response',
            color: 'red',
          });
        }
      } finally {
        setIsGenerating(false);
        abortControllerRef.current = null;
      }
    } else {
      // Non-streaming response
      try {
        setIsGenerating(true);
        
        const response = await api.chat(request);
        
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.content = response.message?.content || '';
            lastMessage.isGenerating = false;
            lastMessage.id = response.id;
          }
          
          return newMessages;
        });
      } catch (error: any) {
        console.error('Error in chat:', error);
        
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          
          if (lastMessage && lastMessage.role === 'assistant') {
            lastMessage.isGenerating = false;
            lastMessage.error = error.message || 'Failed to generate response';
          }
          
          return newMessages;
        });
        
        notifications.show({
          title: 'Error',
          message: 'Failed to generate response',
          color: 'red',
        });
      } finally {
        setIsGenerating(false);
      }
    }
  }, [currentModel, isGenerating, messages, settings]);
  
  // Clear the chat
  const clearChat = useCallback(() => {
    // Abort any ongoing generation
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    
    setMessages([]);
    setIsGenerating(false);
  }, []);
  
  // Load initial data on mount
  React.useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);
  
  // Clean up on unmount
  React.useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);
  
  return (
    <ChatContext.Provider
      value={{
        messages,
        currentModel,
        availableModels,
        isLoading,
        isGenerating,
        isSidebarOpen,
        sendMessage,
        clearChat,
        setCurrentModel,
        toggleSidebar,
        refreshModels,
        isSettingsOpen,
        openSettings,
        closeSettings,
      }}
    >
      {children}
    </ChatContext.Provider>
  );
};

export const useChat = (): ChatContextType => {
  const context = useContext(ChatContext);
  if (context === undefined) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export default ChatContext;
