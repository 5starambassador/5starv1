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
                className="xl:hidden p-2 text-white hover:bg-white/10 rounded-full transition-colors"
                aria-label="Open Menu"
            >
                <Menu size={24} />
            </button>

            {/* Portal to Body */}
            {mounted && isOpen && createPortal(
                <div className="fixed inset-0 xl:hidden" style={{ zIndex: 99999 }}>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 bg-black/60 backdrop-blur-md transition-opacity"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Top Dropdown Drawer - Royal Glass Theme */}
                    <div
                        className="fixed top-2 left-2 right-2 bg-gradient-to-br from-indigo-900 via-blue-900 to-slate-900 shadow-2xl max-h-[90vh] overflow-hidden flex flex-col rounded-2xl border border-white/20 ring-1 ring-white/10"
                        style={{ zIndex: 100000 }}
                    >
                        {/* decorative glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-400/20 blur-[60px] rounded-full pointer-events-none" />
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-500/20 blur-[60px] rounded-full pointer-events-none" />

                        {/* Header with Close Button */}
                        {/* Header with Close Button & Branding */}
                        <div className="relative border-b border-white/10 bg-black/20 backdrop-blur-xl z-10 pb-0">
                            <div className="flex justify-end p-2">
                                <button
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-full transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="flex items-center gap-2 px-3 pb-3 overflow-hidden">
                                <div className="relative group shrink-0">
                                    <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-amber-500 rounded-xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
                                    <img
                                        src="/achariya_25_logo.jpg"
                                        alt="Achariya 25th Year"
                                        className="relative object-contain shadow-2xl h-12 w-auto"
                                    />
                                </div>

                                <div className="flex flex-col min-w-0 justify-center flex-1">
                                    <h2 className="text-white text-[13px] font-black tracking-tight drop-shadow-lg uppercase leading-tight text-left">
                                        Achariya
                                    </h2>
                                    <p className="text-[10px] text-blue-100/60 font-bold uppercase tracking-widest">
                                        Partnership Program
                                    </p>
                                    <p className="text-[9px] uppercase tracking-[0.2em] font-black text-amber-500/90 drop-shadow-md mt-0.5">
                                        25<sup className="text-[0.6em] ml-0.5">th</sup> <span className="ml-3">Year Celebration</span>
                                    </p>
                                </div>
                            </div>

                        </div>

                        {/* Content Area - Flex-1 to fill remaining space */}
                        <div className="flex-1 min-h-0 relative z-10 overflow-hidden">
                            {children}
                        </div>

                    </div>
                </div>,
                document.body
            )
            }
        </SidebarContext.Provider >
    )
}
