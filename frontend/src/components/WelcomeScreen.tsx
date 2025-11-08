import { Stack, Text, Button, Paper, Group, List } from '@mantine/core';

interface WelcomeScreenProps {
  onGetStarted: () => void;
}

export function WelcomeScreen({ onGetStarted }: WelcomeScreenProps) {
  return (
    <Stack align="center" justify="center" h="100vh" p="xl">
      <Paper p="xl" radius="xl" shadow="lg" maw={600}>
        <Stack align="center" gap="xl">
          <Text size="48px">🤖</Text>
          <Text size="xl" fw={700} ta="center">
            Welcome to Matou
          </Text>
          <Text size="md" c="dimmed" ta="center">
            Your private AI assistant powered by local Ollama models
          </Text>
          
          <List spacing="sm" size="sm" center>
            <List.Item>🔒 <strong>100% Private</strong> - All processing stays on your device</List.Item>
            <List.Item>🎤 <strong>Voice Enabled</strong> - Talk naturally with your AI</List.Item>
            <List.Item>⚡ <strong>Multiple Models</strong> - Choose speed vs quality</List.Item>
            <List.Item>📝 <strong>Chat History</strong> - Never lose your conversations</List.Item>
          </List>
          
          <Group>
            <Button size="lg" radius="xl" onClick={onGetStarted}>
              Get Started
            </Button>
            <Button variant="light" size="lg" radius="xl">
              Learn More
            </Button>
          </Group>
        </Stack>
      </Paper>
    </Stack>
  );
}