'use client'

import { createContext, useContext, useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Menu, X } from 'lucide-react'
import { createPortal } from 'react-dom'

// Context for sidebar state
interface SidebarContextType {
    isOpen: boolean
    setIsOpen: (open: boolean) => void
    viewMode: 'mobile-grid' | 'desktop-list'
}

const SidebarContext = createContext<SidebarContextType | undefined>(undefined)

export function useSidebar() {
    return useContext(SidebarContext)
}

export default function MobileSidebarWrapper({ children }: { children: React.ReactNode }) {
    const [isOpen, setIsOpen] = useState(false)
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()

    // Close sidebar on route change
    useEffect(() => {
        setIsOpen(false)
    }, [pathname])

    // Handle mounting and cleanup
    useEffect(() => {
        setMounted(true)
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    // Close on escape key
    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => {
            if (e.key === 'Escape') setIsOpen(false)
        }
        window.addEventListener('keydown', handleEsc)
        return () => window.removeEventListener('keydown', handleEsc)
    }, [])

    return (
        <SidebarContext.Provider value={{ isOpen, setIsOpen, viewMode: 'mobile-grid' }}>
            {/* Hamburger Button (Mobile Only) */}
            <button
                onClick={() => setIsOpen(true)}
                className="xl:hidden p-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors"
                aria-label="Open Menu"
            >
                <Menu size={24} />
            </button>

            {/* Portal to Body */}
            {mounted && isOpen && createPortal(
                <div className="fixed inset-0 xl:hidden" style={{ zIndex: 99999 }}>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Top Dropdown Drawer - Full Height */}
                    <div
                        className="fixed top-2 left-2 right-2 bg-white dark:bg-gray-900 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-gray-200 dark:border-gray-700"
                        style={{ zIndex: 100000 }}
                    >
                        {/* Header with Close Button */}
                        <div className="flex justify-end p-2 border-b border-gray-100 dark:border-gray-700">
                            <button
                                onClick={() => setIsOpen(false)}
                                className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-full transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content - Scrollable with safe padding */}
                        <div className="flex-1 overflow-y-auto pb-8" style={{ maxHeight: 'calc(90vh - 60px)' }}>
                            {children}
                        </div>
                    </div>


                </div>,
                document.body
            )}
        </SidebarContext.Provider>
    )
}
