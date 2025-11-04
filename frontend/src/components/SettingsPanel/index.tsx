import { Stack, Text, Box, Select, Slider, Divider, Tabs } from '@mantine/core';
import { IconSettings, IconMoon, IconSun, IconTemperature, IconSpeakerphone } from '@tabler/icons-react';
import { useLocalStorage } from '@mantine/hooks';
import TTSSettings from '../settings/TTSSettings';

import { Settings } from '../../contexts/SettingsContext';

interface SettingsPanelProps {
  isOpen: boolean;
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  availableModels: Array<{ value: string; label: string }>;
}

export default function SettingsPanel({
  isOpen,
  settings,
  onSettingsChange,
  availableModels,
}: SettingsPanelProps) {
  const [localSettings, setLocalSettings] = useLocalStorage<Settings>({
    key: 'ollama-chat-settings',
    defaultValue: settings,
  });

  const handleSettingChange = (key: keyof Settings, value: any) => {
    const newSettings = { ...localSettings, [key]: value };
    setLocalSettings(newSettings);
    onSettingsChange(newSettings);
  };

  if (!isOpen) return null;

  return (
    <Box
      style={{
        width: '300px',
        height: '100%',
        borderRight: '1px solid var(--mantine-color-gray-3)',
        padding: '1rem',
        overflowY: 'auto',
      }}
    >
      <Text size="lg" fw={600} mb="md">
        <IconSettings size={20} style={{ marginRight: '0.5rem' }} />
        Settings
      </Text>

      <Tabs defaultValue="general">
        <Tabs.List>
          <Tabs.Tab value="general" leftSection={<IconSettings size={14} />}>
            General
          </Tabs.Tab>
          <Tabs.Tab value="tts" leftSection={<IconSpeakerphone size={14} />}>
            Text-to-Speech
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="general" pt="md">
          <Stack gap="md">
            <div>
              <Text size="sm" fw={500} mb="xs">
                Theme
              </Text>
              <Select
                data={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ]}
                value={localSettings.theme}
                onChange={(value) => handleSettingChange('theme', value as 'light' | 'dark' | 'system')}
                leftSection={localSettings.theme === 'dark' ? <IconMoon size={16} /> : <IconSun size={16} />}
              />
            </div>

            <div>
              <Text size="sm" fw={500} mb="xs">
                Model
              </Text>
              <Select
                data={availableModels}
                value={localSettings.model}
                onChange={(value) => handleSettingChange('model', value || '')}
                placeholder="Select a model"
              />
            </div>

            <div>
              <Text size="sm" fw={500} mb="xs">
                Temperature: {localSettings.temperature.toFixed(1)}
              </Text>
              <Slider
                value={localSettings.temperature}
                onChange={(value) => handleSettingChange('temperature', value)}
                min={0}
                max={2}
                step={0.1}
                marks={[
                  { value: 0, label: '0' },
                  { value: 0.5, label: '0.5' },
                  { value: 1, label: '1' },
                  { value: 1.5, label: '1.5' },
                  { value: 2, label: '2' },
                ]}
                mb="md"
              />
            </div>

            <div>
              <Text size="sm" fw={500} mb="xs">
                Max Tokens: {localSettings.maxTokens}
              </Text>
              <Slider
                value={localSettings.maxTokens}
                onChange={(value) => handleSettingChange('maxTokens', value)}
                min={100}
                max={4000}
                step={100}
                marks={[
                  { value: 100, label: '100' },
                  { value: 1000, label: '1k' },
                  { value: 2000, label: '2k' },
                  { value: 3000, label: '3k' },
                  { value: 4000, label: '4k' },
                ]}
              />
              <Text size="xs" c="dimmed" mt={4}>
                Maximum number of tokens to generate in the response.
              </Text>
            </div>
          </Stack>
        </Tabs.Panel>

        <Tabs.Panel value="tts" pt="md">
          <TTSSettings />
        </Tabs.Panel>
      </Tabs>
    </Box>
  );
}
