import { Button } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';
import { useTheme } from '../../contexts/ThemeContext';

export default function ThemeToggle() {
  const { theme, toggleTheme } = useTheme();

  return (
    <Button
      onClick={toggleTheme}
      variant="subtle"
      color="gray"
      style={{
        position: 'fixed',
        top: '5.5rem', // Position below the header
        right: '1rem',
        zIndex: 100,
        width: '36px',
        height: '36px',
        padding: '0',
        borderRadius: '50%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
      title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
    >
      {theme === 'light' ? <IconMoon size={18} /> : <IconSun size={18} />}
    </Button>
  );
}
