import { useState, useRef, useEffect } from 'react';
import { 
  MantineProvider, 
  createTheme, 
  Text, 
  TextInput, 
  Button,
  Paper,
  Container,
  Group,
  Stack,
  ScrollArea,
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
  Box,
  Menu,
  Tooltip,
  Flex,
  Avatar,
  Modal,
  Slider,
  Switch,
  List,
  Textarea,
  Select,
} from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { useSettings } from './contexts/SettingsContext';
import { useTTS } from './hooks/useTTS';
import { useVoiceChat } from './hooks/useVoiceChat';
import { IconSend, IconVolume, IconMicrophone, IconMicrophoneOff, IconSun, IconMoon, IconPlus, IconChevronDown, IconDots, IconSettings, IconX, IconCopy, IconCheck, IconRefresh, IconDownload, IconSearch, IconThumbUp, IconThumbDown, IconClock, IconKeyboard } from '@tabler/icons-react';
import type { Message } from './types/chat';
import { api } from './services/api';

const theme = createTheme({
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  colors: {
    dark: [
      '#f8f9fa',
      '#f1f3f4',
      '#e9ecef',
      '#dee2e6',
      '#ced4da',
      '#adb5bd',
      '#6c757d',
      '#495057',
      '#343a40',
      '#212529',
    ],
  },
  primaryColor: 'dark',
  defaultRadius: 'md',
});

const systemPrompts = {
  default: 'You are a helpful AI assistant.',
  junior_dev: 'You are a senior software engineer mentoring a junior developer. Explain concepts clearly with practical examples, suggest best practices, help debug code step-by-step, and encourage learning. Always include code examples and explain the reasoning behind solutions.',
  learner: 'You are a patient and encouraging tutor. Break down complex topics into simple, digestible parts. Use analogies and real-world examples. Ask clarifying questions to ensure understanding. Provide step-by-step explanations and suggest additional resources for deeper learning.',
  musician: 'You are an experienced music producer and composer. Help with music theory, composition techniques, production tips, instrument advice, and creative inspiration. Explain concepts in both technical and practical terms. Suggest exercises and provide feedback on musical ideas.',
  artist_3d: 'You are a professional 3D artist and technical director. Assist with modeling, texturing, lighting, animation, and rendering techniques. Provide workflow optimization tips, software-specific guidance (Blender, Maya, etc.), and creative problem-solving for 3D projects.',
  filmmaker: 'You are an experienced film director and cinematographer. Help with storytelling, shot composition, lighting techniques, editing workflows, and production planning. Provide creative feedback, technical solutions, and industry insights for film projects.',
  custom: ''
};

function App() {
  // All hooks must be at the top
  const { settings, updateSettings } = useSettings();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light');
  
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [copiedMessageId, setCopiedMessageId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [helpOpened, setHelpOpened] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [currentChatId, setCurrentChatId] = useLocalStorage<string>({
    key: 'current-chat-id',
    defaultValue: 'chat-1',
  });
  const [chatHistory, setChatHistory] = useLocalStorage<Record<string, {id: string, title: string, messages: Message[], timestamp: string}>>({
    key: 'chat-history',
    defaultValue: {
      'chat-1': {
        id: 'chat-1',
        title: 'New Chat',
        messages: [{
          id: '1',
          role: 'assistant',
          content: 'Hello! I\'m Matou, your AI assistant. How can I help you today?',
          timestamp: new Date().toISOString()
        }],
        timestamp: new Date().toISOString()
      }
    },
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const { speak, isSpeaking } = useTTS({
    voice: settings?.tts?.voice || 'en-US-AriaNeural',
    rate: settings?.tts?.rate || '+0%',
    volume: settings?.tts?.volume || '+0%',
  });

  const { isListening, isSupported, startListening, stopListening } = useVoiceChat({
    onTranscript: (text) => {
      setInputValue(text);
    },
    onError: (error) => {
      if (error !== 'Network error') {
        console.error('Voice error:', error);
      }
    },
  });

  // Early return after all hooks
  if (!settings) {
    return (
      <MantineProvider theme={theme} defaultColorScheme={computedColorScheme}>
        <Flex h="100vh" align="center" justify="center">
          <Text size="lg">Loading...</Text>
        </Flex>
      </MantineProvider>
    );
  }

  const messages = chatHistory[currentChatId]?.messages || [];
  const setMessages = (newMessages: Message[] | ((prev: Message[]) => Message[])) => {
    const updatedMessages = typeof newMessages === 'function' ? newMessages(messages) : newMessages;
    setChatHistory(prev => ({
      ...prev,
      [currentChatId]: {
        ...prev[currentChatId],
        messages: updatedMessages,
        title: updatedMessages.length > 1 ? updatedMessages[1]?.content?.slice(0, 30) + '...' : 'New Chat'
      }
    }));
  };

  const isDark = computedColorScheme === 'dark';
  
  const getModelSpeed = (modelName: string) => {
    if (modelName?.includes('270m')) return '⚡';
    if (modelName?.includes('gemma3:1b')) return '🚀';
    if (modelName?.includes('deepseek-r1:1.5b')) return '⏱️';
    return '🐌';
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
    
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'n':
            e.preventDefault();
            const newChatId = `chat-${Date.now()}`;
            const newChat = {
              id: newChatId,
              title: 'New Chat',
              messages: [{
                id: '1',
                role: 'assistant',
                content: 'Hello! I\'m Matou, your AI assistant. How can I help you today?',
                timestamp: new Date().toISOString()
              }],
              timestamp: new Date().toISOString()
            };
            setChatHistory(prev => ({ ...prev, [newChatId]: newChat }));
            setCurrentChatId(newChatId);
            break;
          case ',':
            e.preventDefault();
            setSettingsOpened(true);
            break;
          case 'k':
            e.preventDefault();
            setSearchQuery('');
            break;
        }
      } else if (e.key === '?' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        setHelpOpened(true);
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setChatHistory, setCurrentChatId, setSettingsOpened]);

  // Auto-save draft
  useEffect(() => {
    const timer = setTimeout(() => {
      if (inputValue.trim()) {
        localStorage.setItem(`draft-${currentChatId}`, inputValue);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [inputValue, currentChatId]);

  // Load draft on chat change
  useEffect(() => {
    const draft = localStorage.getItem(`draft-${currentChatId}`);
    if (draft && !inputValue) {
      setInputValue(draft);
    }
  }, [currentChatId]);

  const handleSendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content,
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);
    setIsTyping(true);
    
    // Clear draft
    localStorage.removeItem(`draft-${currentChatId}`);

    try {
      const systemMessage = settings?.systemPrompt ? [{ role: 'system', content: settings.systemPrompt }] : [];
      const response = await api.chat({
        model: settings?.model || 'gemma3:270m',
        messages: [...systemMessage, ...updatedMessages.map(({ id, timestamp, ...rest }) => rest)],
        temperature: settings?.temperature || 0.7,
        max_tokens: settings?.maxTokens || 2000,
      });
      
      let assistantContent = '';
      
      if (response.message?.content) {
        assistantContent = response.message.content;
      } else if (response.choices?.[0]?.message?.content) {
        assistantContent = response.choices[0].message.content;
      } else if (response.response) {
        assistantContent = response.response;
      } else if (typeof response === 'string') {
        assistantContent = response;
      } else {
        console.log('Unexpected response format:', response);
        assistantContent = JSON.stringify(response);
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: assistantContent,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };

      setMessages([...updatedMessages, assistantMessage]);
      setIsTyping(false);
      
      // Auto-TTS disabled due to backend issues
      // if (settings?.tts?.enabled && settings?.tts?.autoSpeak === 'assistant-only') {
      //   setTimeout(() => speak(assistantMessage.content), 500);
      // }
    } catch (error) {
      let errorText = 'Unknown error';
      
      if (error instanceof Error) {
        if (error.message.includes('timeout')) {
          errorText = 'Request timed out. The model might be slow or unavailable. Try a smaller model like gemma3:270m.';
        } else if (error.message.includes('Network Error') || error.message.includes('fetch')) {
          errorText = 'Cannot connect to the backend. Make sure the backend server is running on port 8001.';
        } else {
          errorText = error.message;
        }
      }
      
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `❌ ${errorText}`,
        timestamp: new Date().toISOString(),
        error: true,
      };
      setMessages([...updatedMessages, errorMessage]);
      setIsTyping(false);
    } finally {
      setIsLoading(false);
      setIsTyping(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const regenerateMessage = async (messageIndex: number) => {
    const messagesToRegenerate = messages.slice(0, messageIndex);
    const lastUserMessage = messagesToRegenerate[messagesToRegenerate.length - 1];
    if (lastUserMessage?.role === 'user') {
      setMessages(messagesToRegenerate);
      await handleSendMessage(lastUserMessage.content);
    }
  };

  const exportChat = () => {
    const chatData = {
      title: chatHistory[currentChatId]?.title || 'Chat Export',
      messages: messages,
      timestamp: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(chatData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${chatData.title.replace(/[^a-z0-9]/gi, '_')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const filteredChats = Object.values(chatHistory).filter(chat => 
    searchQuery ? chat.title.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  return (
    <MantineProvider theme={theme} defaultColorScheme={computedColorScheme}>
      <Flex h="100vh">
        <Box 
          w={sidebarCollapsed ? 0 : 260}
          style={{ 
            backgroundColor: isDark ? '#171717' : '#f8f9fa',
            borderRight: sidebarCollapsed ? 'none' : `1px solid ${isDark ? '#404040' : '#e5e5e5'}`,
            display: 'flex',
            flexDirection: 'column',
            transition: 'width 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <Box p="lg" style={{ borderBottom: `1px solid ${isDark ? '#404040' : '#e5e5e5'}` }}>
            <Text size="xl" fw={700} c={isDark ? '#ffffff' : '#000000'} ta="center">
              Matou Chat
            </Text>
          </Box>
          
          <Stack gap="md" p="lg" style={{ flex: 1 }}>
            <Button
              fullWidth
              leftSection={<IconPlus size={16} />}
              variant="light"
              justify="flex-start"
              onClick={() => {
                const newChatId = `chat-${Date.now()}`;
                const newChat = {
                  id: newChatId,
                  title: 'New Chat',
                  messages: [{
                    id: '1',
                    role: 'assistant',
                    content: 'Hello! I\'m Matou, your AI assistant. How can I help you today?',
                    timestamp: new Date().toISOString()
                  }],
                  timestamp: new Date().toISOString()
                };
                setChatHistory(prev => ({ ...prev, [newChatId]: newChat }));
                setCurrentChatId(newChatId);
              }}
            >
              New Chat
            </Button>
            
            <Stack gap="xs" mt="md">
              <Group justify="space-between" align="center">
                <Text size="sm" fw={600} c="dimmed" pl="xs">Recent Chats</Text>
                <ActionIcon size="sm" variant="subtle" onClick={() => setShowTimestamps(!showTimestamps)}>
                  <IconClock size={14} />
                </ActionIcon>
              </Group>
              
              <TextInput
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.currentTarget.value)}
                size="xs"
                leftSection={<IconSearch size={14} />}
                variant="filled"
              />
              
              {filteredChats.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 10).map((chat) => (
                <Group key={chat.id} gap={0} style={{ position: 'relative' }}>
                  <Button
                    variant={currentChatId === chat.id ? 'light' : 'subtle'}
                    justify="flex-start"
                    onClick={() => setCurrentChatId(chat.id)}
                    style={{ flex: 1, paddingRight: '30px' }}
                  >
                    <Box style={{ flex: 1 }}>
                      <Text size="sm" truncate style={{ textAlign: 'left', width: '100%' }}>
                        {chat.title}
                      </Text>
                      {showTimestamps && (
                        <Text size="xs" c="dimmed" truncate>
                          {new Date(chat.timestamp).toLocaleDateString()}
                        </Text>
                      )}
                    </Box>
                  </Button>
                  {Object.keys(chatHistory).length > 1 && (
                    <ActionIcon
                      size="sm"
                      variant="subtle"
                      color="red"
                      onClick={(e) => {
                        e.stopPropagation();
                        const { [chat.id]: deleted, ...remaining } = chatHistory;
                        setChatHistory(remaining);
                        if (currentChatId === chat.id) {
                          const remainingIds = Object.keys(remaining);
                          setCurrentChatId(remainingIds[0] || 'chat-1');
                        }
                      }}
                      style={{ 
                        position: 'absolute', 
                        right: '4px', 
                        top: '50%', 
                        transform: 'translateY(-50%)'
                      }}
                    >
                      <IconX size={12} />
                    </ActionIcon>
                  )}
                </Group>
              ))}
            </Stack>
          </Stack>

          <Stack gap="xs" p="lg">
            <Button 
              variant="subtle" 
              fullWidth 
              leftSection={<IconSettings size={16} />} 
              justify="flex-start"
              onClick={() => setSettingsOpened(true)}
            >
              Settings
            </Button>
            <Button 
              variant="subtle" 
              fullWidth 
              leftSection={isDark ? <IconSun size={16} /> : <IconMoon size={16} />} 
              justify="flex-start"
              onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
            >
              {isDark ? 'Light' : 'Dark'} Mode
            </Button>
          </Stack>
        </Box>

        <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          <Box 
            px="lg" 
            py="md"
            style={{ 
              borderBottom: `1px solid ${isDark ? '#404040' : '#e5e5e5'}`,
              backgroundColor: isDark ? '#212121' : '#ffffff',
            }}
          >
            <Group align="center">
              <ActionIcon 
                variant="subtle" 
                size="lg"
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              >
                ☰
              </ActionIcon>
              
              <ActionIcon 
                variant="subtle" 
                size="lg"
                onClick={() => setHelpOpened(true)}
              >
                <IconKeyboard size={18} />
              </ActionIcon>
              
              <Menu shadow="md" width={280}>
                <Menu.Target>
                  <Button variant="subtle" rightSection={<IconChevronDown size={14} />}>
                    <Group gap="xs">
                      <Text size="sm" fw={500}>
                        {settings?.model?.split(':')[0]?.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, ' ') || 'Select Model'}
                      </Text>
                      <Text size="sm">{getModelSpeed(settings?.model || '')}</Text>
                    </Group>
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  {[
                    { name: 'gemma3:270m', speed: '⚡ Fastest' },
                    { name: 'gemma3:1b', speed: '🚀 Fast' },
                    { name: 'deepseek-r1:1.5b', speed: '⏱️ Medium' },
                    { name: 'gemma:2b', speed: '🐌 Slow' },
                  ].map((model) => (
                    <Menu.Item 
                      key={model.name} 
                      onClick={() => updateSettings({ model: model.name })}
                    >
                      <Group justify="space-between">
                        <Text size="sm">
                          {model.name.split(':')[0].split('/').pop()?.replace(/[^a-zA-Z0-9]/g, ' ')}
                        </Text>
                        <Text size="xs" c="dimmed">{model.speed}</Text>
                      </Group>
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
            </Group>
          </Box>

          <Box 
            style={{ 
              flex: 1, 
              overflow: 'hidden', 
              background: isDark 
                ? 'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #16213e 75%, #1a1a2e 100%)'
                : 'linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)',
              position: 'relative'
            }}
          >
            <Box 
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                background: isDark 
                  ? 'rgba(33, 33, 33, 0.85)'
                  : 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(10px)'
              }}
            />
            <ScrollArea h="100%" style={{ position: 'relative', zIndex: 1 }}>
              <Container size="md" py="xl">
                <Stack gap="xl">
                  {messages.map((message) => (
                    <Group 
                      key={message.id}
                      align="flex-start"
                      gap="md"
                      wrap="nowrap"
                    >
                      <Avatar 
                        size={32}
                        radius="sm"
                        color={message.role === 'assistant' ? 'blue' : 'gray'}
                        style={{ flexShrink: 0 }}
                      >
                        {message.role === 'assistant' ? 'M' : 'U'}
                      </Avatar>
                      
                      <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group justify="space-between" mb="xs">
                          <Text size="sm" fw={600} c={isDark ? '#e5e5e5' : '#374151'}>
                            {message.role === 'assistant' ? 'Matou' : 'You'}
                          </Text>
                          <Group gap="xs">
                            {showTimestamps && (
                              <Text size="xs" c="dimmed">
                                {new Date(message.timestamp).toLocaleTimeString()}
                              </Text>
                            )}
                            <Tooltip label={copiedMessageId === message.id ? "Copied!" : "Copy message"}>
                              <ActionIcon 
                                variant="subtle" 
                                size="sm"
                                onClick={() => {
                                  navigator.clipboard.writeText(message.content);
                                  setCopiedMessageId(message.id);
                                  setTimeout(() => setCopiedMessageId(null), 2000);
                                }}
                              >
                                {copiedMessageId === message.id ? <IconCheck size={16} /> : <IconCopy size={16} />}
                              </ActionIcon>
                            </Tooltip>
                            {message.role === 'assistant' && (
                              <>
                                <Tooltip label="Read aloud">
                                  <ActionIcon 
                                    variant="subtle" 
                                    size="sm"
                                    onClick={() => speak(message.content)}
                                    disabled={isSpeaking}
                                  >
                                    <IconVolume size={16} />
                                  </ActionIcon>
                                </Tooltip>
                                <Tooltip label="Regenerate">
                                  <ActionIcon 
                                    variant="subtle" 
                                    size="sm"
                                    onClick={() => regenerateMessage(messages.indexOf(message))}
                                    disabled={isLoading}
                                  >
                                    <IconRefresh size={16} />
                                  </ActionIcon>
                                </Tooltip>
                              </>
                            )}
                            <Menu>
                              <Menu.Target>
                                <ActionIcon variant="subtle" size="sm">
                                  <IconDots size={16} />
                                </ActionIcon>
                              </Menu.Target>
                              <Menu.Dropdown>
                                <Menu.Item leftSection={<IconThumbUp size={14} />}>
                                  Good response
                                </Menu.Item>
                                <Menu.Item leftSection={<IconThumbDown size={14} />}>
                                  Poor response
                                </Menu.Item>
                                <Menu.Item leftSection={<IconDownload size={14} />} onClick={exportChat}>
                                  Export chat
                                </Menu.Item>
                              </Menu.Dropdown>
                            </Menu>
                          </Group>
                        </Group>
                        <Text 
                          style={{ 
                            whiteSpace: 'pre-line', 
                            lineHeight: 1.6,
                            color: isDark ? '#e5e5e5' : '#374151',
                          }}
                        >
                          {message.content}
                        </Text>
                      </Box>
                    </Group>
                  ))}
                  
                  {isLoading && (
                    <Group align="flex-start" gap="md" wrap="nowrap">
                      <Avatar size={32} radius="sm" color="blue">M</Avatar>
                      <Box>
                        <Text size="sm" fw={600} c={isDark ? '#e5e5e5' : '#374151'} mb="xs">
                          Matou is typing...
                        </Text>
                        <Box 
                          style={{
                            display: 'flex',
                            gap: '4px',
                            alignItems: 'center',
                          }}
                        >
                          {[0, 1, 2].map((i) => (
                            <Box
                              key={i}
                              w={8}
                              h={8}
                              style={{
                                backgroundColor: isDark ? '#666' : '#ccc',
                                borderRadius: '50%',
                                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
                              }}
                            />
                          ))}
                        </Box>
                      </Box>
                    </Group>
                  )}
                  
                  <div ref={messagesEndRef} />
                </Stack>
              </Container>
            </ScrollArea>
          </Box>

          <Box 
            p="lg"
            style={{ 
              borderTop: `1px solid ${isDark ? '#404040' : '#e5e5e5'}`,
              backgroundColor: isDark ? '#212121' : '#ffffff',
            }}
          >
            <Container size="md">
              <Paper
                p="md"
                radius="xl"
                style={{
                  border: `2px solid ${isDark ? '#404040' : '#e5e5e5'}`,
                  backgroundColor: isDark ? '#2f2f2f' : '#ffffff',
                }}
              >
                <form onSubmit={handleSubmit}>
                  <Group gap="md" wrap="nowrap">
                    <Textarea
                      ref={inputRef}
                      placeholder={isListening ? "🎤 Listening... Speak now" : "Message Matou... (Shift+Enter for new line)"}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.currentTarget.value)}
                      disabled={isLoading || isListening}
                      style={{ flex: 1 }}
                      variant="unstyled"
                      size="md"
                      minRows={1}
                      maxRows={4}
                      autosize
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          handleSendMessage(inputValue);
                        }
                      }}
                      styles={{
                        input: {
                          border: 'none',
                          background: 'transparent',
                          fontSize: '16px',
                          color: isDark ? '#e5e5e5' : '#374151',
                          resize: 'none',
                        }
                      }}
                    />
                    
                    {isSupported && (
                      <Tooltip label={isListening ? "Stop listening" : "Voice input"}>
                        <ActionIcon
                          size="lg"
                          radius="md"
                          variant={isListening ? "filled" : "subtle"}
                          color={isListening ? "red" : "gray"}
                          onClick={() => {
                            if (isListening) {
                              stopListening();
                            } else {
                              startListening();
                            }
                          }}
                        >
                          {isListening ? <IconMicrophoneOff size={18} /> : <IconMicrophone size={18} />}
                        </ActionIcon>
                      </Tooltip>
                    )}
                    
                    <ActionIcon 
                      type="submit" 
                      size="lg"
                      radius="md"
                      variant="filled"
                      color="dark"
                      disabled={!inputValue.trim() || isLoading || isListening}
                      loading={isLoading}
                    >
                      <IconSend size={18} />
                    </ActionIcon>
                  </Group>
                </form>
              </Paper>
            </Container>
          </Box>
        </Box>
      </Flex>
      
      <Modal opened={settingsOpened} onClose={() => setSettingsOpened(false)} title="Settings" size="md">
        <Stack gap="lg">
          <Box>
            <Text size="sm" fw={500} mb="xs">Temperature</Text>
            <Slider
              value={settings?.temperature || 0.7}
              onChange={(value) => updateSettings({ temperature: value })}
              min={0}
              max={2}
              step={0.1}
              marks={[
                { value: 0, label: '0' },
                { value: 1, label: '1' },
                { value: 2, label: '2' },
              ]}
            />
          </Box>
          
          <Box>
            <Text size="sm" fw={500} mb="xs">Max Tokens</Text>
            <Slider
              value={settings?.maxTokens || 2000}
              onChange={(value) => updateSettings({ maxTokens: value })}
              min={100}
              max={4000}
              step={100}
              marks={[
                { value: 100, label: '100' },
                { value: 2000, label: '2K' },
                { value: 4000, label: '4K' },
              ]}
            />
          </Box>
          
          <Box>
            <Group justify="space-between">
              <Text size="sm" fw={500}>Text-to-Speech</Text>
              <Switch
                checked={settings?.tts?.enabled || false}
                onChange={(event) => updateSettings({ 
                  tts: { ...settings?.tts, enabled: event.currentTarget.checked } 
                })}
              />
            </Group>
          </Box>
          
          <Box>
            <Group justify="space-between">
              <Text size="sm" fw={500}>Auto-read responses</Text>
              <Switch
                checked={settings?.tts?.autoSpeak === 'assistant-only'}
                onChange={(event) => updateSettings({ 
                  tts: { 
                    ...settings?.tts, 
                    autoSpeak: event.currentTarget.checked ? 'assistant-only' : 'off' 
                  } 
                })}
                disabled={!settings?.tts?.enabled}
              />
            </Group>
          </Box>
          
          <Box>
            <Text size="sm" fw={500} mb="xs">System Prompt</Text>
            <Select
              placeholder="Choose a preset or custom"
              value={Object.keys(systemPrompts).find(key => systemPrompts[key as keyof typeof systemPrompts] === settings?.systemPrompt) || 'custom'}
              onChange={(value) => {
                if (value && value !== 'custom') {
                  updateSettings({ systemPrompt: systemPrompts[value as keyof typeof systemPrompts] });
                }
              }}
              data={[
                { value: 'default', label: '🤖 Default Assistant' },
                { value: 'junior_dev', label: '👨‍💻 Junior Developer Mentor' },
                { value: 'learner', label: '📚 Learning Tutor' },
                { value: 'musician', label: '🎵 Music Producer' },
                { value: 'artist_3d', label: '🎨 3D Artist' },
                { value: 'filmmaker', label: '🎬 Filmmaker' },
                { value: 'custom', label: '✏️ Custom' },
              ]}
              mb="xs"
            />
            <Textarea
              placeholder="Enter custom system instructions..."
              value={settings?.systemPrompt || ''}
              onChange={(event) => updateSettings({ systemPrompt: event.currentTarget.value })}
              minRows={3}
              maxRows={6}
              autosize
            />
          </Box>
          
          <Button 
            color="red" 
            variant="light"
            fullWidth
            onClick={() => {
              const newChatId = 'chat-1';
              const newChat = {
                id: newChatId,
                title: 'New Chat',
                messages: [{
                  id: '1',
                  role: 'assistant',
                  content: 'Hello! I\'m Matou, your AI assistant. How can I help you today?',
                  timestamp: new Date().toISOString()
                }],
                timestamp: new Date().toISOString()
              };
              setChatHistory({ [newChatId]: newChat });
              setCurrentChatId(newChatId);
            }}
          >
            🗑️ Clear All Chats
          </Button>
          
          <Button onClick={() => setSettingsOpened(false)} fullWidth>
            Close
          </Button>
        </Stack>
      </Modal>
      
      <Modal opened={helpOpened} onClose={() => setHelpOpened(false)} title="Keyboard Shortcuts" size="md">
        <Stack gap="md">
          <Group justify="space-between">
            <Text size="sm">New Chat</Text>
            <Text size="sm" c="dimmed">Ctrl + N</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm">Settings</Text>
            <Text size="sm" c="dimmed">Ctrl + ,</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm">Search Chats</Text>
            <Text size="sm" c="dimmed">Ctrl + K</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm">Send Message</Text>
            <Text size="sm" c="dimmed">Enter</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm">New Line</Text>
            <Text size="sm" c="dimmed">Shift + Enter</Text>
          </Group>
          <Group justify="space-between">
            <Text size="sm">Show Help</Text>
            <Text size="sm" c="dimmed">?</Text>
          </Group>
          <Button onClick={() => setHelpOpened(false)} fullWidth>
            Close
          </Button>
        </Stack>
      </Modal>
      
      <style>{`
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.8); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </MantineProvider>
  );
}

export default App;