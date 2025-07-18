import React, { createContext, useContext, useEffect, useState } from 'react';
import { Appearance, ColorSchemeName } from 'react-native';
import { MMKV } from 'react-native-mmkv';

interface Theme {
  colors: {
    primary: string;
    primaryVariant: string;
    secondary: string;
    background: string;
    surface: string;
    surfaceVariant: string;
    error: string;
    warning: string;
    success: string;
    info: string;
    text: string;
    textSecondary: string;
    border: string;
    disabled: string;
    overlay: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  borderRadius: {
    sm: number;
    md: number;
    lg: number;
    full: number;
  };
  typography: {
    h1: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    h2: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    h3: {
      fontSize: number;
      fontWeight: string;
      lineHeight: number;
    };
    body1: {
      fontSize: number;
      lineHeight: number;
    };
    body2: {
      fontSize: number;
      lineHeight: number;
    };
    caption: {
      fontSize: number;
      lineHeight: number;
    };
  };
}

const lightTheme: Theme = {
  colors: {
    primary: '#007AFF',
    primaryVariant: '#0051D5',
    secondary: '#5856D6',
    background: '#F2F2F7',
    surface: '#FFFFFF',
    surfaceVariant: '#F9F9F9',
    error: '#FF3B30',
    warning: '#FF9500',
    success: '#34C759',
    info: '#5AC8FA',
    text: '#000000',
    textSecondary: '#8E8E93',
    border: '#E5E5EA',
    disabled: '#C7C7CC',
    overlay: 'rgba(0, 0, 0, 0.4)',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
    xxl: 48,
  },
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 16,
    full: 9999,
  },
  typography: {
    h1: {
      fontSize: 34,
      fontWeight: '700',
      lineHeight: 41,
    },
    h2: {
      fontSize: 28,
      fontWeight: '600',
      lineHeight: 34,
    },
    h3: {
      fontSize: 22,
      fontWeight: '600',
      lineHeight: 28,
    },
    body1: {
      fontSize: 17,
      lineHeight: 22,
    },
    body2: {
      fontSize: 15,
      lineHeight: 20,
    },
    caption: {
      fontSize: 13,
      lineHeight: 18,
    },
  },
};

const darkTheme: Theme = {
  ...lightTheme,
  colors: {
    primary: '#0A84FF',
    primaryVariant: '#0E64D2',
    secondary: '#5E5CE6',
    background: '#000000',
    surface: '#1C1C1E',
    surfaceVariant: '#2C2C2E',
    error: '#FF453A',
    warning: '#FF9F0A',
    success: '#32D74B',
    info: '#64D2FF',
    text: '#FFFFFF',
    textSecondary: '#8E8E93',
    border: '#38383A',
    disabled: '#48484A',
    overlay: 'rgba(0, 0, 0, 0.8)',
  },
};

interface ThemeContextValue {
  theme: Theme;
  colorScheme: ColorSchemeName;
  setColorScheme: (scheme: ColorSchemeName) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

const storage = new MMKV({ id: 'theme-storage' });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [colorScheme, setColorScheme] = useState<ColorSchemeName>(() => {
    const stored = storage.getString('colorScheme');
    return (stored as ColorSchemeName) || Appearance.getColorScheme();
  });

  useEffect(() => {
    const subscription = Appearance.addChangeListener(({ colorScheme }) => {
      const stored = storage.getString('colorScheme');
      if (stored === 'system' || !stored) {
        setColorScheme(colorScheme);
      }
    });

    return () => subscription.remove();
  }, []);

  const handleSetColorScheme = (scheme: ColorSchemeName) => {
    setColorScheme(scheme);
    if (scheme) {
      storage.set('colorScheme', scheme);
    } else {
      storage.delete('colorScheme');
    }
  };

  const theme = colorScheme === 'dark' ? darkTheme : lightTheme;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        colorScheme,
        setColorScheme: handleSetColorScheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}