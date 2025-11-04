import React, { useState, useEffect } from 'react';
import { Select, Switch, Slider, Stack, Text, Group, Paper, Title, Divider } from '@mantine/core';
import { useSettings } from '../../contexts/SettingsContext';
import { TTSSettings as TTSSettingsType } from '../../contexts/SettingsContext';

interface Voice {
  Name: string;
  ShortName: string;
  Gender: string;
  Locale: string;
}

const TTSSettings: React.FC = () => {
  const { settings, updateSettings } = useSettings();
  const [voices, setVoices] = useState<Voice[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchVoices = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${settings.apiEndpoint}/api/tts/voices`);
        if (!response.ok) throw new Error('Failed to fetch voices');
        const data = await response.json();
        setVoices(data.voices || []);
      } catch (error) {
        console.error('Error fetching voices:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (settings.tts.enabled) {
      fetchVoices();
    }
  }, [settings.tts.enabled, settings.apiEndpoint]);

  const handleTTSSettingChange = (key: keyof TTSSettingsType, value: any) => {
    updateSettings({
      tts: {
        ...settings.tts,
        [key]: value
      }
    });
  };

  const voiceOptions = React.useMemo(() => {
    const grouped = voices.reduce<Record<string, { group: string; items: { value: string; label: string }[] }>>((acc, voice) => {
      const locale = voice.Locale;
      if (!acc[locale]) {
        acc[locale] = {
          group: new Intl.DisplayNames(['en'], { type: 'language' }).of(locale) || locale,
          items: []
        };
      }
      acc[locale].items.push({
        value: voice.ShortName,
        label: `${voice.Name} (${voice.Gender})`
      });
      return acc;
    }, {});

    return Object.entries(grouped).map(([_, { group, items }]) => ({
      group,
      items: items.sort((a, b) => a.label.localeCompare(b.label))
    }));
  }, [voices]);

  return (
    <Paper p="md" withBorder>
      <Title order={4} mb="md">Text-to-Speech Settings</Title>
      
      <Stack spacing="md">
        <Switch
          label="Enable Text-to-Speech"
          checked={settings.tts.enabled}
          onChange={(e) => handleTTSSettingChange('enabled', e.currentTarget.checked)}
        />

        {settings.tts.enabled && (
          <>
            <Select
              label="Voice"
              placeholder="Select a voice"
              value={settings.tts.voice}
              onChange={(value) => handleTTSSettingChange('voice', value || 'en-US-AriaNeural')}
              data={voiceOptions}
              disabled={isLoading}
              searchable
              clearable
              withinPortal
            />

            <div>
              <Text size="sm" mb={4}>
                Speech Rate: {settings.tts.rate}
              </Text>
              <Slider
                value={parseInt(settings.tts.rate) || 0}
                onChange={(value) => handleTTSSettingChange('rate', `${value >= 0 ? '+' : ''}${value}%`)}
                min={-50}
                max={100}
                step={5}
                marks={[
                  { value: -50, label: '-50%' },
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                  { value: 100, label: '100%' },
                ]}
              />
            </div>

            <div>
              <Text size="sm" mb={4}>
                Volume: {settings.tts.volume}
              </Text>
              <Slider
                value={parseInt(settings.tts.volume) || 0}
                onChange={(value) => handleTTSSettingChange('volume', `${value >= 0 ? '+' : ''}${value}%`)}
                min={-50}
                max={50}
                step={5}
                marks={[
                  { value: -50, label: '-50%' },
                  { value: 0, label: '0%' },
                  { value: 50, label: '50%' },
                ]}
              />
            </div>

            <Select
              label="Auto-speak responses"
              value={settings.tts.autoSpeak}
              onChange={(value) => handleTTSSettingChange('autoSpeak', value as 'off' | 'assistant-only' | 'all')}
              data={[
                { value: 'off', label: 'Off' },
                { value: 'assistant-only', label: 'Assistant Only' },
                { value: 'all', label: 'All Messages' },
              ]}
              withinPortal
            />
          </>
        )}
      </Stack>
    </Paper>
  );
};

export default TTSSettings;
