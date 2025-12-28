'use client'

import { useTheme } from './ThemeProvider'
import { Sun, Moon, Monitor } from 'lucide-react'

export function ThemeToggle() {
    const { theme, setTheme } = useTheme()

    const options = [
        { value: 'light' as const, icon: Sun, label: 'Light' },
        { value: 'dark' as const, icon: Moon, label: 'Dark' },
        { value: 'system' as const, icon: Monitor, label: 'System' },
    ]

    return (
        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 rounded-full p-1">
            {options.map(({ value, icon: Icon, label }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`p-2 rounded-full transition-colors ${theme === value
                            ? 'bg-white dark:bg-gray-700 text-red-600 shadow-sm'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                    title={label}
                >
                    <Icon size={16} />
                </button>
            ))}
        </div>
    )
}
