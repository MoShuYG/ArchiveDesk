import { create } from 'zustand';

type Theme = 'light' | 'dark' | 'system';

interface ThemeState {
    theme: Theme;
    setTheme: (theme: Theme) => void;
    initTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set) => ({
    theme: (localStorage.getItem('theme') as Theme) || 'system',

    setTheme: (theme: Theme) => {
        localStorage.setItem('theme', theme);
        set({ theme });
        applyTheme(theme);
    },

    initTheme: () => {
        const savedTheme = (localStorage.getItem('theme') as Theme) || 'system';
        set({ theme: savedTheme });
        applyTheme(savedTheme);

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
            const currentTheme = localStorage.getItem('theme') as Theme || 'system';
            if (currentTheme === 'system') {
                if (e.matches) {
                    document.documentElement.classList.add('dark');
                } else {
                    document.documentElement.classList.remove('dark');
                }
            }
        });
    },
}));

function applyTheme(theme: Theme) {
    const root = window.document.documentElement;

    root.classList.remove('light', 'dark');

    if (theme === 'system') {
        const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light';
        root.classList.add(systemTheme);
        return;
    }

    root.classList.add(theme);
}
