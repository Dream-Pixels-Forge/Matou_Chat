import { Group, Burger, Title, ActionIcon, useMantineColorScheme, Tooltip } from '@mantine/core';
import { IconSun, IconMoonStars, IconSettings } from '@tabler/icons-react';

interface HeaderProps {
  mobileOpened: boolean;
  desktopOpened: boolean;
  toggleMobile: () => void;
  toggleDesktop: () => void;
  toggleSettings: () => void;
  settingsOpen: boolean;
}

export default function Header({
  mobileOpened,
  desktopOpened,
  toggleMobile,
  toggleDesktop,
  toggleSettings,
  settingsOpen,
}: HeaderProps) {
  const { colorScheme, toggleColorScheme } = useMantineColorScheme();
  const dark = colorScheme === 'dark';

  return (
    <Group h="100%" px="md" justify="space-between">
      <Group>
        <Burger
          opened={mobileOpened}
          onClick={toggleMobile}
          hiddenFrom="sm"
          size="sm"
        />
        <Burger
          opened={desktopOpened}
          onClick={toggleDesktop}
          visibleFrom="sm"
          size="sm"
        />
        <Title order={4} c={dark ? 'white' : 'dark'}>
          Ollama Chat
        </Title>
      </Group>
      <Group gap="xs">
        <Tooltip label={dark ? 'Light mode' : 'Dark mode'} position="bottom">
          <ActionIcon
            variant="outline"
            color={dark ? 'yellow' : 'blue'}
            onClick={() => toggleColorScheme()}
            aria-label="Toggle color scheme"
          >
            {dark ? <IconSun size="1.1rem" /> : <IconMoonStars size="1.1rem" />}
          </ActionIcon>
        </Tooltip>
        
        <Tooltip label={settingsOpen ? 'Close settings' : 'Open settings'} position="bottom">
          <ActionIcon
            variant={settingsOpen ? 'filled' : 'outline'}
            color={settingsOpen ? 'blue' : 'gray'}
            onClick={toggleSettings}
            aria-label="Toggle settings"
          >
            <IconSettings size="1.1rem" />
          </ActionIcon>
        </Tooltip>
      </Group>
    </Group>
  );
}
