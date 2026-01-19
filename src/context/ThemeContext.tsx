import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Available Google Fonts for the font picker
export const AVAILABLE_FONTS = [
    { name: 'System Default', value: 'system-ui, -apple-system, sans-serif' },
    { name: 'Inter', value: 'Inter' },
    { name: 'Roboto', value: 'Roboto' },
    { name: 'Open Sans', value: 'Open Sans' },
    { name: 'Lato', value: 'Lato' },
    { name: 'Poppins', value: 'Poppins' },
    { name: 'Montserrat', value: 'Montserrat' },
    { name: 'Nunito', value: 'Nunito' },
    { name: 'Raleway', value: 'Raleway' },
    { name: 'Source Sans Pro', value: 'Source Sans 3' },
] as const;

// Theme configuration interface
export interface ThemeConfig {
    mode: 'light' | 'dark';
    primaryColor: string;
    accentColor: string;
    fontFamily: string;
    logoUrl: string | null;
    backgroundImage: string | null;
    backgroundOverlay: number; // 0-100 opacity percentage
}

// Default theme values
export const DEFAULT_THEME: ThemeConfig = {
    mode: 'light',
    primaryColor: '#EE4137', // Current default primary
    accentColor: '#e9ebef',
    fontFamily: 'system-ui, -apple-system, sans-serif',
    logoUrl: null,
    backgroundImage: null,
    backgroundOverlay: 50,
};

// Context value interface
interface ThemeContextValue {
    theme: ThemeConfig;
    updateTheme: (updates: Partial<ThemeConfig>) => void;
    resetTheme: () => void;
    isCustomized: boolean;
}

const STORAGE_KEY = 'usability-test-theme';

// Create the context
const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

// Load theme from localStorage
function loadTheme(): ThemeConfig {
    try {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) {
            const parsed = JSON.parse(stored);
            return { ...DEFAULT_THEME, ...parsed };
        }
    } catch (e) {
        console.warn('Failed to load theme from localStorage:', e);
    }
    return DEFAULT_THEME;
}

// Save theme to localStorage
function saveTheme(theme: ThemeConfig): void {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(theme));
    } catch (e) {
        console.warn('Failed to save theme to localStorage:', e);
    }
}

// Load Google Font dynamically
function loadGoogleFont(fontFamily: string): void {
    // Skip if it's a system font
    if (fontFamily.includes('system-ui') || fontFamily.includes('sans-serif')) {
        return;
    }

    const fontName = fontFamily.replace(/\s+/g, '+');
    const linkId = `google-font-${fontName}`;

    // Check if already loaded
    if (document.getElementById(linkId)) {
        return;
    }

    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${fontName}:wght@300;400;500;600;700&display=swap`;
    document.head.appendChild(link);
}

// Apply theme to CSS variables
function applyThemeToDOM(theme: ThemeConfig): void {
    const root = document.documentElement;

    // Apply mode
    if (theme.mode === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }

    // Apply custom CSS variables
    root.style.setProperty('--custom-primary', theme.primaryColor);
    root.style.setProperty('--custom-accent', theme.accentColor);
    root.style.setProperty('--custom-font', theme.fontFamily);

    // Override the primary color in both light and dark modes
    root.style.setProperty('--primary', theme.primaryColor);

    // Apply font family
    if (theme.fontFamily) {
        loadGoogleFont(theme.fontFamily);
        root.style.setProperty('--default-font-family', theme.fontFamily);
        document.body.style.fontFamily = theme.fontFamily;
    }

    // Apply background image if set
    if (theme.backgroundImage) {
        root.style.setProperty('--custom-bg-image', `url(${theme.backgroundImage})`);
        root.style.setProperty('--custom-bg-overlay', `${theme.backgroundOverlay / 100}`);
    } else {
        root.style.removeProperty('--custom-bg-image');
        root.style.removeProperty('--custom-bg-overlay');
    }
}

// Provider component
interface CustomThemeProviderProps {
    children: ReactNode;
}

export function CustomThemeProvider({ children }: CustomThemeProviderProps) {
    const [theme, setTheme] = useState<ThemeConfig>(() => loadTheme());

    // Apply theme on mount and when it changes
    useEffect(() => {
        applyThemeToDOM(theme);
        saveTheme(theme);
    }, [theme]);

    const updateTheme = (updates: Partial<ThemeConfig>) => {
        setTheme((prev: ThemeConfig) => ({ ...prev, ...updates }));
    };

    const resetTheme = () => {
        setTheme(DEFAULT_THEME);
        localStorage.removeItem(STORAGE_KEY);
    };

    const isCustomized = JSON.stringify(theme) !== JSON.stringify(DEFAULT_THEME);

    return (
        <ThemeContext.Provider value={{ theme, updateTheme, resetTheme, isCustomized }}>
            {children}
        </ThemeContext.Provider>
    );
}

// Hook to use the theme context
export function useCustomTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useCustomTheme must be used within a CustomThemeProvider');
    }
    return context;
}
