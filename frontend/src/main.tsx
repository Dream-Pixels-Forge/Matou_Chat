import React from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider, createTheme, type MantineColorsTuple } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { ModalsProvider } from '@mantine/modals';
import { SettingsProvider } from './contexts/SettingsContext';
import App from './App';
import './index.css';
import '@mantine/core/styles.layer.css';
import '@mantine/notifications/styles.layer.css';

// Extend Mantine's default theme with our custom colors
declare module '@mantine/core' {
  export interface MantineThemeColorsOverride {
    colors: Record<string, MantineColorsTuple>;
  }
}

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
  cursorType: 'pointer',
});

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="light">
      <SettingsProvider>
        <ModalsProvider>
          <Notifications position="top-right" />
          <App />
        </ModalsProvider>
      </SettingsProvider>
    </MantineProvider>
  </React.StrictMode>,
)
