import { TextInput, ScrollArea, ActionIcon, Box, Paper, Text, Avatar, Group } from '@mantine/core';
import { useForm } from '@mantine/form';
import { IconSend, IconPlayerStop, IconCopy, IconCheck } from '@tabler/icons-react';
import { useClipboard } from '@mantine/hooks';
import { useEffect, useRef } from 'react';
import 'highlight.js/styles/github-dark.css';
import styles from './ChatInterface.module.css';

interface MessageProps {
  message: {
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  };
  isOwnMessage: boolean;
}

const Message = ({ message, isOwnMessage }: MessageProps) => {
  const { copied, copy } = useClipboard();
  
  return (
    <Box
      style={{
        display: 'flex',
        flexDirection: isOwnMessage ? 'row-reverse' : 'row',
        marginBottom: '1rem',
      }}
    >
      <Avatar
        radius="xl"
        size="md"
        style={{
          marginRight: isOwnMessage ? 0 : '0.5rem',
          marginLeft: isOwnMessage ? '0.5rem' : 0,
        }}
      >
        {isOwnMessage ? 'You' : 'AI'}
      </Avatar>
      <Paper
        p="md"
        style={{
          maxWidth: '80%',
          backgroundColor: isOwnMessage ? '#228be6' : '#f1f3f5',
          color: isOwnMessage ? 'white' : 'black',
          borderRadius: '0.5rem',
        }}
      >
        <Text style={{ whiteSpace: 'pre-wrap' }}>
          {message.content}
        </Text>
        <Group justify="flex-end" mt="xs">
          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={() => copy(message.content)}
            color={isOwnMessage ? 'white' : 'gray'}
          >
            {copied ? <IconCheck size={16} /> : <IconCopy size={16} />}
          </ActionIcon>
        </Group>
      </Paper>
    </Box>
  );
};

interface ChatInterfaceProps {
  messages: Array<{
    id: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    timestamp: string;
  }>;
  onSendMessage: (message: string) => Promise<void>;
  isLoading: boolean;
  settings: {
    model: string;
    temperature: number;
    maxTokens: number;
  };
  onSettingsChange: (settings: any) => void;
  availableModels: Array<{ value: string; label: string }>;
  isListening?: boolean;
  onStartSpeaking?: () => void;
  onStopSpeaking?: () => void;
}

export default function ChatInterface({
  messages = [],
  onSendMessage,
  isLoading = false,
  isListening = false,
  onStartSpeaking,
  onStopSpeaking,
}: ChatInterfaceProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const form = useForm({
    initialValues: {
      message: '',
    },
    validate: {
      message: (value: string) => (value.trim().length === 0 ? 'Message cannot be empty' : null),
    },
  });

  const handleSubmit = async (values: { message: string }) => {
    try {
      await onSendMessage(values.message);
      form.reset();
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const toggleVoiceInput = () => {
    if (isListening) {
      onStopSpeaking?.();
    } else {
      onStartSpeaking?.();
    }
  };

  return (
    <div className={styles.chatContainer}>
      <ScrollArea className={styles.messagesContainer}>
        {messages.map((message) => (
          <Message key={message.id} message={message} isOwnMessage={message.role === 'user'} />
        ))}
        <div ref={messagesEndRef} />
      </ScrollArea>

      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Group gap="xs" align="flex-end">
          <TextInput
            placeholder="Type your message..."
            className={styles.messageInput}
            {...form.getInputProps('message')}
            disabled={isLoading}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                form.onSubmit(handleSubmit)();
              }
            }}
            rightSection={
              <ActionIcon
                type="submit"
                loading={isLoading}
                variant="filled"
                color="blue"
                disabled={!form.isValid()}
              >
                <IconSend size={20} />
              </ActionIcon>
            }
            rightSectionWidth={42}
          />
          <ActionIcon
            variant="outline"
            color={isListening ? 'red' : 'blue'}
            onClick={toggleVoiceInput}
            size="lg"
          >
            {isListening ? <IconPlayerStop size={20} /> : '🎤'}
          </ActionIcon>
        </Group>
      </form>
    </div>
  );
}

