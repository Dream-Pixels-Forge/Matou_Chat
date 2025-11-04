import { useState, useRef, useEffect } from 'react';
import { 
  MantineProvider, 
  AppShell, 
  createTheme, 
  Text, 
  TextInput, 
  Button,
  Paper,
  Container,
  Group,
  Stack,
  Title,
  ScrollArea,
  ActionIcon,
  useMantineColorScheme,
  useComputedColorScheme,
  Box,
  NavLink,
  Burger,
  Menu,
  Divider
} from '@mantine/core';
import { useLocalStorage } from '@mantine/hooks';
import { useSettings } from './contexts/SettingsContext';
import { useTTS } from './hooks/useTTS';
import { IconSend, IconVolume, IconVolumeOff } from '@tabler/icons-react';
import type { Message } from './types/chat';
import { api } from './services/api';

// Custom theme configuration
const theme = createTheme({
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  colors: {
    primary: [
      '#e6f7ff',
      '#bae7ff',
      '#91d5ff',
      '#69c0ff',
      '#40a9ff',
      '#1890ff',
      '#096dd9',
      '#0050b3',
      '#003a8c',
      '#002766',
    ],
  },
  primaryColor: 'primary',
  defaultRadius: 'md',
  components: {
    Button: {
      defaultProps: {
        size: 'sm',
      },
    },
    Input: {
      defaultProps: {
        size: 'md',
      },
    },
    TextInput: {
      defaultProps: {
        size: 'md',
      },
    },
  },
});

function App() {
  const { settings, updateSettings } = useSettings();
  const { setColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light');
  const [mobileOpened, setMobileOpened] = useState(false);
  
  // Don't render until settings are loaded
  if (!settings) {
    return (
      <MantineProvider theme={theme} defaultColorScheme={computedColorScheme}>
        <Container size="md" h="100vh" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Text>Loading...</Text>
        </Container>
      </MantineProvider>
    );
  }
  
  const [isLoading, setIsLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [messages, setMessages] = useLocalStorage<Message[]>({
    key: 'chat-messages',
    defaultValue: [{
      id: '1',
      role: 'assistant',
      content: 'Hello! How can I assist you today?',
      timestamp: new Date().toISOString()
    }],
  });
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Initialize TTS with safe defaults
  const { speak, isSpeaking } = useTTS({
    voice: settings?.tts?.voice || 'en-US-AriaNeural',
    rate: settings?.tts?.rate || '+0%',
    volume: settings?.tts?.volume || '+0%',
  });

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input on load
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
      // Use backend API service
      const response = await api.chat({
        model: settings?.model || 'gemma3:1b',
        messages: updatedMessages.map(({ id, timestamp, ...rest }) => rest),
        temperature: settings?.temperature || 0.7,
        max_tokens: settings?.maxTokens || 2000,
      });
      
      // Handle API response format
      let assistantContent = '';
      
      if (response.message?.content) {
        assistantContent = response.message.content;
      } else if (response.choices?.[0]?.message?.content) {
        assistantContent = response.choices[0].message.content;
      } else if (response.response) {
        assistantContent = response.response;
      } else {
        console.error('Unexpected API response format:', response);
        throw new Error('Received malformed response from server');
      }

      const assistantMessage: Message = {
        id: Date.now().toString(),
        content: assistantContent,
        role: 'assistant',
        timestamp: new Date().toISOString(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      
      // Auto-speak assistant responses if enabled
      if (settings?.tts?.enabled && settings?.tts?.autoSpeak === 'assistant-only') {
        speak(assistantMessage.content);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'assistant',
        content: `Sorry, an error occurred: ${error instanceof Error ? error.message : 'Unknown error'}. Please check your connection and try again.`,
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage(inputValue);
    }
  };

  return (
    <MantineProvider theme={theme} defaultColorScheme={computedColorScheme}>
      <AppShell
        header={{ height: 60 }}
        navbar={{
          width: 300,
          breakpoint: 'sm',
          collapsed: { mobile: !mobileOpened },
        }}
        padding="md"
        withBorder={false}
      >
        <AppShell.Header p="md">
          <Group justify="space-between" align="center" h="100%">
            <Group>
              <Burger
                opened={mobileOpened}
                onClick={() => setMobileOpened((o) => !o)}
                hiddenFrom="sm"
                size="sm"
                mr="xl"
              />
              <Title order={3}>Ollama Chat</Title>
            </Group>
            <Group>
              <ActionIcon 
                variant="light" 
                onClick={() => setColorScheme(computedColorScheme === 'dark' ? 'light' : 'dark')}
                aria-label="Toggle color scheme"
              >
                {computedColorScheme === 'dark' ? '🌞' : '🌙'}
              </ActionIcon>
            </Group>
          </Group>
        </AppShell.Header>

        <AppShell.Navbar p="md" withBorder={false}>
          <AppShell.Section grow>
            <Stack gap="xs">
              <Text fw={500} size="sm" c="dimmed">Models</Text>
              <Menu shadow="md" width={200}>
                <Menu.Target>
                  <Button variant="light" fullWidth>
                    {settings?.model || 'Loading...'}
                  </Button>
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
                      bg={settings?.model === model ? 'var(--mantine-color-blue-light)' : undefined}
                    >
                      {model}
                    </Menu.Item>
                  ))}
                </Menu.Dropdown>
              </Menu>
              
              <Divider my="sm" />
              
              <Text fw={500} size="sm" c="dimmed" mt="md">Chat History</Text>
              <NavLink
                label="New Chat"
                onClick={() => setMessages([{
                  id: '1',
                  role: 'assistant',
                  content: 'Hello! How can I assist you today?',
                  timestamp: new Date().toISOString()
                }])}
                active
              />
              <NavLink
                label="Previous Chat"
                disabled
                description="Coming soon"
              />
            </Stack>
          </AppShell.Section>
          
          <AppShell.Section>
            <Divider my="sm" />
            <Group justify="space-between" p="sm">
              <Text size="sm" c="dimmed">Settings</Text>
              <ActionIcon variant="subtle" size="sm">
                ⚙️
              </ActionIcon>
            </Group>
          </AppShell.Section>
        </AppShell.Navbar>
        
        <AppShell.Main>
          <Container size="md" h="calc(100vh - 200px)" p={0} pl={{ base: 0, sm: '300px' }}>
            <ScrollArea h="100%" p="md">
              <Stack gap="md" pb="xl">
                {messages.map((message) => (
                  <Paper 
                    key={message.id}
                    p="md"
                    shadow="xs"
                    withBorder
                    bg={message.role === 'assistant' ? 
                      (computedColorScheme === 'dark' ? 'dark.6' : 'gray.0') : 
                      'transparent'}
                  >
                    <Group justify="space-between" mb="xs">
                      <Text fw={500} c={message.role === 'assistant' ? 'blue' : 'green'}>
                        {message.role === 'assistant' ? 'Assistant' : 'You'}
                      </Text>
                      {message.role === 'assistant' && settings?.tts?.enabled && (
                        <ActionIcon 
                          variant="subtle" 
                          size="sm"
                          onClick={() => speak(message.content)}
                          disabled={isSpeaking}
                          aria-label={isSpeaking ? 'Speaking...' : 'Speak message'}
                        >
                          {isSpeaking ? <IconVolumeOff size={18} /> : <IconVolume size={18} />}
                        </ActionIcon>
                      )}
                    </Group>
                    <Text style={{ whiteSpace: 'pre-line' }}>{message.content}</Text>
                  </Paper>
                ))}
                <div ref={messagesEndRef} />
              </Stack>
            </ScrollArea>
          </Container>

          <Box 
            style={{
              position: 'fixed',
              bottom: 0,
              left: 0,
              right: 0,
              padding: '1rem',
              backgroundColor: 'var(--mantine-color-body)',
              borderTop: '1px solid var(--mantine-color-gray-3)'
            }}
            pl={{ base: 0, sm: '300px' }}
            pr="md"
            pb={{ base: 'env(safe-area-inset-bottom, 1rem)', sm: '1rem' }}
          >
            <Container size="md" p={0}>
              <form onSubmit={handleSubmit}>
                <Group gap="sm" wrap="nowrap">
                  <TextInput
                    ref={inputRef}
                    placeholder="Type your message..."
                    value={inputValue}
                    onChange={(e) => setInputValue(e.currentTarget.value)}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading}
                    style={{ flex: 1 }}
                    radius="md"
                    autoComplete="off"
                  />
                  <Button 
                    type="submit" 
                    loading={isLoading}
                    leftSection={!isLoading && <IconSend size={18} />}
                    radius="md"
                  >
                    {isLoading ? 'Sending...' : 'Send'}
                  </Button>
                </Group>
              </form>
            </Container>
          </Box>
        </AppShell.Main>
      </AppShell>
    </MantineProvider>
  );
}

export default App;
