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
} from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { useSettings } from './contexts/SettingsContext';
import { useTTS } from './hooks/useTTS';
import { useVoiceChat } from './hooks/useVoiceChat';
import { IconSend, IconVolume, IconMicrophone, IconMicrophoneOff, IconSun, IconMoon, IconPlus, IconChevronDown, IconDots, IconRobot, IconSettings } from '@tabler/icons-react';
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

function App() {
  const { settings, updateSettings } = useSettings();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light');
  
  if (!settings) {
    return (
      <MantineProvider theme={theme} defaultColorScheme={computedColorScheme}>
        <Flex h="100vh" align="center" justify="center">
          <Text size="lg">Loading...</Text>
        </Flex>
      </MantineProvider>
    );
  }
  
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [settingsOpened, setSettingsOpened] = useState(false);
  const [messages, setMessages] = useLocalStorage<Message[]>({
    key: 'chat-messages',
    defaultValue: [{
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m Matou, your AI assistant. How can I help you today?',
      timestamp: new Date().toISOString()
    }],
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
      handleSendMessage(text);
    },
    onError: (error) => console.error('Voice error:', error),
  });

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

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

    try {
      const response = await api.chat({
        model: settings?.model || 'gemma3:1b',
        messages: updatedMessages.map(({ id, timestamp, ...rest }) => rest),
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
      } else {
        throw new Error('Received malformed response from server');
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: assistantContent,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };

      setMessages([...updatedMessages, assistantMessage]);
      
      // Auto-read assistant responses if enabled
      if (settings?.tts?.enabled && settings?.tts?.autoSpeak === 'assistant-only') {
        setTimeout(() => speak(assistantMessage.content), 500);
      }
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
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSendMessage(inputValue);
  };

  const isDark = computedColorScheme === 'dark';

  return (
    <MantineProvider theme={theme} defaultColorScheme={computedColorScheme}>
      <Flex h="100vh">
        {/* Sidebar */}
        <Box 
          w={60}
          style={{ 
            backgroundColor: isDark ? '#171717' : '#f8f9fa',
            borderRight: `1px solid ${isDark ? '#404040' : '#e5e5e5'}`,
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <Stack gap="xs" p="sm" style={{ flex: 1 }}>
            <Tooltip label="New chat" position="right">
              <ActionIcon
                size="xl"
                variant="subtle"
                onClick={() => setMessages([{
                  id: '1',
                  role: 'assistant',
                  content: 'Hello! I\'m Matou, your AI assistant. How can I help you today?',
                  timestamp: new Date().toISOString()
                }])}
              >
                <IconPlus size={20} />
              </ActionIcon>
            </Tooltip>

            <Menu shadow="md" width={200} position="right-start">
              <Menu.Target>
                <Tooltip label="Select model" position="right">
                  <ActionIcon size="xl" variant="subtle">
                    <IconRobot size={20} />
                  </ActionIcon>
                </Tooltip>
              </Menu.Target>
              <Menu.Dropdown>
                {[
                  'taufiq-ai/qwen2.5-coder-1.5b-instruct-ft-taufiq-04092025:latest',
                  'deepseek-r1:1.5b',
                  'gemma3:1b',
                  'gemma3:270m'
                ].map((model) => (
                  <Menu.Item 
                    key={model} 
                    onClick={() => updateSettings({ model })}
                  >
                    <Text size="sm">
                      {model.split(':')[0].split('/').pop()?.replace(/[^a-zA-Z0-9]/g, ' ')}
                    </Text>
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>


          </Stack>

          <Stack gap="xs" p="sm">
            <Tooltip label="Settings" position="right">
              <ActionIcon size="xl" variant="subtle" onClick={() => setSettingsOpened(true)}>
                <IconSettings size={20} />
              </ActionIcon>
            </Tooltip>

            <Tooltip label={`Switch to ${isDark ? 'light' : 'dark'} mode`} position="right">
              <ActionIcon 
                size="xl" 
                variant="subtle"
                onClick={() => setColorScheme(isDark ? 'light' : 'dark')}
              >
                {isDark ? <IconSun size={20} /> : <IconMoon size={20} />}
              </ActionIcon>
            </Tooltip>
          </Stack>
        </Box>

        {/* Main Content */}
        <Box style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
          {/* Header */}
          <Box 
            px="lg" 
            py="md"
            style={{ 
              borderBottom: `1px solid ${isDark ? '#404040' : '#e5e5e5'}`,
              backgroundColor: isDark ? '#212121' : '#ffffff',
            }}
          >
            <Group justify="space-between" align="center">
              <Box />
              <Text size="lg" fw={700} c={isDark ? '#ffffff' : '#000000'}>
                Matou
              </Text>
              <Text size="sm" c={isDark ? '#a0a0a0' : '#666666'} fw={500}>
                {settings?.model?.split(':')[0]?.split('/').pop()?.replace(/[^a-zA-Z0-9]/g, ' ') || 'Loading...'}
              </Text>
            </Group>
          </Box>

          {/* Chat Area */}
          <Box style={{ flex: 1, overflow: 'hidden', backgroundColor: isDark ? '#212121' : '#ffffff' }}>
            <ScrollArea h="100%">
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
                                <Menu shadow="md" width={200}>
                                  <Menu.Target>
                                    <ActionIcon variant="subtle" size="sm">
                                      <IconDots size={16} />
                                    </ActionIcon>
                                  </Menu.Target>
                                  <Menu.Dropdown>
                                    <Menu.Item onClick={() => navigator.clipboard.writeText(message.content)}>
                                      Copy message
                                    </Menu.Item>
                                    <Menu.Item onClick={() => speak(message.content)} disabled={isSpeaking}>
                                      Read aloud
                                    </Menu.Item>
                                    <Menu.Item color="red">
                                      Report issue
                                    </Menu.Item>
                                  </Menu.Dropdown>
                                </Menu>
                              </>
                            )}
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
                          Matou
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

          {/* Input Area */}
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
                    <TextInput
                      ref={inputRef}
                      placeholder={isListening ? "Listening..." : "Message Matou..."}
                      value={inputValue}
                      onChange={(e) => setInputValue(e.currentTarget.value)}
                      disabled={isLoading || isListening}
                      style={{ flex: 1 }}
                      variant="unstyled"
                      size="md"
                      styles={{
                        input: {
                          border: 'none',
                          background: 'transparent',
                          fontSize: '16px',
                          color: isDark ? '#e5e5e5' : '#374151',
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
                          onClick={() => isListening ? stopListening() : startListening()}
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
          
          <Button onClick={() => setSettingsOpened(false)} fullWidth>
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