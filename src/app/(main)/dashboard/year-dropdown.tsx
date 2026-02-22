
'use client'

import { ChevronDown } from 'lucide-react'
import { useState, useRef } from 'react'
import { useClickOutside } from '@/hooks/use-click-outside'

export function YearDropdown({ currentYear }: { currentYear: string }) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef<HTMLDivElement>(null)

    useClickOutside(dropdownRef, () => setIsOpen(false))

    return (
        <div className="relative" ref={dropdownRef} style={{ position: 'relative' }}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="btn"
                style={{
                    background: 'white',
                    border: '1px solid var(--border-color)',
                    padding: '8px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    cursor: 'pointer'
                }}
            >
                <span style={{ fontWeight: 500 }}>Academic Year: {currentYear}</span>
                <ChevronDown size={16} style={{ color: 'var(--text-secondary)' }} />
            </button>

            {isOpen && (
                <div
                    style={{
                        position: 'absolute',
                        top: '100%',
                        right: '0',
                        marginTop: '8px',
                        width: '200px',
                        background: 'white',
                        border: '1px solid var(--border-color)',
                        borderRadius: '8px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                        zIndex: 100,
                        padding: '8px 0'
                    }}
                >
                    <div
                        style={{ padding: '8px 16px', color: 'var(--primary-gold)', fontWeight: 'bold', background: 'rgba(212, 175, 55, 0.1)', cursor: 'default' }}
                    >
                        2025-2026
                    </div>
                    <div
                        style={{ padding: '8px 16px', color: 'var(--text-secondary)', cursor: 'not-allowed', opacity: 0.6 }}
                        title="Coming Soon"
                    >
                        2024-2025 (History)
                    </div>
                </div>
            )}
        </div>
    )
}
