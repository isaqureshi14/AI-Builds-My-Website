import React, { useEffect, useState } from 'react';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '' }: { className?: string }) {
    const [theme, setTheme] = useState<'light' | 'dark'>('dark');

    useEffect(() => {
        const stored = localStorage.getItem('theme');
        if (stored === 'light' || stored === 'dark') {
            setTheme(stored);
            if (stored === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        } else {
            // Default to dark or check system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            const initial = prefersDark ? 'dark' : 'light';
            setTheme(initial);
            if (initial === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        }
    }, []);

    const toggleTheme = () => {
        const nextTheme = theme === 'dark' ? 'light' : 'dark';
        setTheme(nextTheme);
        localStorage.setItem('theme', nextTheme);
        if (nextTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    };

    return (
        <button
            type="button"
            onClick={toggleTheme}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            className={`inline-flex items-center gap-2 px-3 py-1.5 text-xs font-mono uppercase tracking-wider border border-neutral-300 dark:border-neutral-700 bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-900 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 transition-colors rounded-none ${className}`}
        >
            {theme === 'dark' ? (
                <>
                    <Sun className="w-3.5 h-3.5 text-neutral-400" />
                    <span>Light</span>
                </>
            ) : (
                <>
                    <Moon className="w-3.5 h-3.5 text-neutral-600" />
                    <span>Dark</span>
                </>
            )}
        </button>
    );
}
