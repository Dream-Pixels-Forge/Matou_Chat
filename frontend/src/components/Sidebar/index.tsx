import { Stack, NavLink, Select, Text, ScrollArea, Box } from '@mantine/core';
import { useState, useEffect } from 'react';
import { IconRobot, IconMessage, IconSettings } from '@tabler/icons-react';
import type { Model } from '../../types/chat';

interface SidebarProps {
  selectedModel: string;
  onModelChange: (model: string) => void;
  mobileOpened: boolean;
  desktopOpened: boolean;
}

export default function Sidebar({
  selectedModel,
  onModelChange,
  mobileOpened,
  desktopOpened,
}: SidebarProps) {
  const [models, setModels] = useState<Model[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchModels = async () => {
      try {
        const response = await fetch('http://localhost:8000/api/tags');
        if (!response.ok) {
          throw new Error('Failed to fetch models');
        }
        const data = await response.json();
        setModels(data.models || []);
        
        // Set the first model as selected if none is selected
        if (data.models?.length > 0 && !selectedModel) {
          onModelChange(data.models[0].name);
        }
      } catch (error) {
        console.error('Error fetching models:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchModels();
  }, [selectedModel, onModelChange]);

  return (
    <Box
      style={{
        display: mobileOpened ? 'block' : desktopOpened ? 'block' : 'none',
        height: '100%',
      }}
    >
      <Stack h="100%" gap="md" p="md">
        <Select
          label="Select Model"
          placeholder="Choose a model"
          value={selectedModel}
          onChange={(value) => value && onModelChange(value)}
          data={models.map((model) => ({
            value: model.name,
            label: model.name,
            description: model.details?.parameter_size || 'Unknown size',
          }))}
          leftSection={<IconRobot size={20} />}
          searchable
          nothingFoundMessage="No models found"
          disabled={isLoading}
        />

        <Text size="sm" fw={500} mt="md">
          Chat History
        </Text>
        <ScrollArea style={{ flex: 1 }}>
          <Stack gap={0}>
            <NavLink
              href="#"
              label="New Chat"
              leftSection={<IconMessage size={20} />}
              variant="subtle"
              active
              onClick={(e) => {
                e.preventDefault();
                // Handle new chat
              }}
            />
            {/* Add more chat history items here */}
          </Stack>
        </ScrollArea>

        <NavLink
          href="#"
          label="Settings"
          leftSection={<IconSettings size={20} />}
          variant="subtle"
          onClick={(e) => {
            e.preventDefault();
            // Handle settings
          }}
        />
      </Stack>
    </Box>
  );
}
