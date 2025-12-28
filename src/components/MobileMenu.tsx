'use client'

import React from 'react'
import Link from 'next/link'
import { LogOut, User } from 'lucide-react'
import { useSidebar } from './MobileSidebarWrapper'

// Force rebuild to ensure logo removal persists

interface NavItem {
    label: string
    href: string
    icon: React.ReactNode
}

interface UserProfile {
    fullName: string
    role: string
}

interface SidebarUIProps {
    navItems: NavItem[]
    user: UserProfile
    logoutAction: () => Promise<void>
    // onNavigate and viewMode are now optional/deprecated as they come from context
    onNavigate?: () => void
    viewMode?: 'mobile-grid' | 'desktop-list'
    hideLogo?: boolean
}

export function MobileMenu({ navItems, user, logoutAction, onNavigate: propOnNavigate, viewMode: propViewMode, hideLogo = false }: SidebarUIProps) {
    const sidebarContext = useSidebar()

    // Priority: Context -> Props -> Default
    const viewMode = sidebarContext?.viewMode || propViewMode || 'desktop-list'
    const isMobile = viewMode === 'mobile-grid'

    const handleNavigate = () => {
        if (sidebarContext) {
            sidebarContext.setIsOpen(false)
        }
        if (propOnNavigate) {
            propOnNavigate()
        }
    }

    return (
        <div className="flex flex-col h-full bg-transparent">
            {/* Navigation Items - Premium Compact */}
            <nav className={`flex-1 overflow-y-auto px-2 pt-2 pb-2 ${isMobile ? 'grid grid-cols-2 gap-2' : 'space-y-1'}`}>
                {navItems.map((item) => (
                    <Link
                        key={item.label}
                        href={item.href}
                        onClick={handleNavigate}
                        className={isMobile
                            // Mobile: Premium horizontal pill style
                            ? "flex items-center gap-2 px-3 py-2 rounded-full bg-gradient-to-r from-gray-50 to-white border border-gray-100 shadow-sm hover:shadow-md hover:border-red-200 hover:from-red-50 hover:to-white text-gray-700 hover:text-[#CC0000] transition-all duration-200 group no-underline"
                            // Desktop List Item Styles (Premium Sidebar)
                            : "flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-white/5 text-gray-300 hover:text-white transition-all group relative overflow-hidden no-underline"
                        }
                    >
                        {!isMobile && (
                            <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-amber-400 rounded-r-full scale-y-0 group-hover:scale-y-100 transition-transform duration-300" style={{ backgroundColor: '#FBBF24' }} />
                        )}
                        {/* Icon */}
                        {React.isValidElement(item.icon) ? React.cloneElement(item.icon as React.ReactElement<any>, {
                            size: isMobile ? 14 : 18,
                            style: { color: isMobile ? '#CC0000' : '#9CA3AF' },
                            className: `flex-shrink-0 transition-colors ${(item.icon as React.ReactElement<any>).props.className || ''}`
                        }) : item.icon}
                        <span style={{
                            fontSize: isMobile ? '10px' : '13px',
                            fontWeight: '700',
                            letterSpacing: '-0.01em',
                            marginLeft: '12px'
                        }}>{item.label}</span>
                    </Link>
                ))}
            </nav>

            {/* Compact Footer (Profile + Logout) */}
            <div className={`mt-auto px-4 py-6 border-t border-white/5 ${isMobile ? 'bg-white' : 'bg-black/20'}`}>
                <div className={`flex items-center justify-between gap-4 ${isMobile ? '' : 'flex-col items-stretch'}`}>
                    <Link href="/profile" onClick={handleNavigate} className={`flex items-center gap-3 hover:bg-white/5 rounded-2xl p-2 transition-all no-underline text-inherit ${isMobile ? 'flex-1' : ''}`}>
                        <div
                            style={{
                                width: '42px',
                                height: '42px',
                                background: 'linear-gradient(135deg, #CC0000 0%, #F59E0B 100%)',
                                borderRadius: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '16px',
                                fontWeight: '950',
                                color: 'white',
                                boxShadow: '0 8px 16px -4px rgba(204, 0, 0, 0.4)',
                                flexShrink: 0
                            }}
                        >
                            {user.fullName[0].toUpperCase()}
                        </div>
                        <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                            <span
                                className={`font-black truncate ${isMobile ? 'text-xs text-gray-700' : 'text-sm text-white'}`}
                                style={{ maxWidth: '160px' }}
                            >
                                {user.fullName}
                            </span>
                            <span className={`text-[10px] font-bold uppercase tracking-wider ${isMobile ? 'text-gray-400' : 'text-gray-500'}`}>{user.role}</span>
                        </div>
                    </Link>
                    <form action={logoutAction} className={isMobile ? '' : 'mt-4'}>
                        <button
                            type="submit"
                            style={{ cursor: 'pointer' }}
                            className="w-full flex items-center justify-center gap-3 px-6 py-3 rounded-xl bg-white/5 text-gray-400 hover:text-white hover:bg-red-600/20 border border-white/5 transition-all text-[11px] font-black uppercase tracking-[0.2em] group"
                        >
                            <LogOut size={18} className="group-hover:translate-x-[-2px] transition-transform" />
                            <span>Logout</span>
                        </button>
                    </form>
                </div>
            </div>
        </div>
    )
}
