'use client'

import React, { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'
import { LogOut, ChevronLeft, ChevronRight } from 'lucide-react'

interface NavItem {
    label: string
    href: string
    icon: React.ReactNode
}

interface CollapsibleSidebarProps {
    navItems: NavItem[]
    user: { fullName: string; role: string }
    logoutAction: () => Promise<void>
}

const STORAGE_KEY = 'sidebar_collapsed'

export function CollapsibleSidebar({ navItems, user, logoutAction }: CollapsibleSidebarProps) {
    const [collapsed, setCollapsed] = useState(false)
    const [mounted, setMounted] = useState(false)
    const [tooltip, setTooltip] = useState<{ label: string; y: number } | null>(null)
    const pathname = usePathname() || ''
    const searchParams = useSearchParams()

    // Read from localStorage on mount
    useEffect(() => {
        const stored = localStorage.getItem(STORAGE_KEY)
        if (stored === 'true') setCollapsed(true)
        setMounted(true)
    }, [])

    const toggle = () => {
        const next = !collapsed
        setCollapsed(next)
        localStorage.setItem(STORAGE_KEY, String(next))
    }

    const isActive = (href: string) => {
        try {
            const itemUrl = new URL(href, 'http://dummy.com')
            const itemPath = itemUrl.pathname
            const itemView = itemUrl.searchParams.get('view')
            const currentView = searchParams?.get('view')
            if (itemView) return pathname === itemPath && currentView === itemView
            return pathname === itemPath && !currentView
        } catch {
            return pathname === href
        }
    }

    const sidebarWidth = collapsed ? '64px' : '280px'

    // Don't flash to wide on first render before localStorage is read
    if (!mounted) return null

    return (
        <>
            {/* Sidebar */}
            <aside
                style={{ width: sidebarWidth, minWidth: sidebarWidth }}
                className="desktop-sidebar hidden xl:flex flex-col border-r border-white/10 p-0 fixed top-0 left-0 bottom-0 z-20 bg-gradient-to-br from-[#0f172a] via-[#111827] to-[#1e1b4b] shadow-[20px_0_80px_rgba(0,0,0,0.8)] transition-[width] duration-300 ease-in-out overflow-hidden"
            >
                {/* Royal accents */}
                <div className="absolute top-0 right-0 w-[1px] h-full bg-gradient-to-b from-transparent via-white/20 to-transparent" />
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-transparent via-amber-500/40 to-transparent" />

                {/* Logo area */}
                <div className={`flex flex-col items-center pt-6 pb-4 transition-all duration-300 ${collapsed ? 'px-1' : 'px-2'}`}>
                    <div className="relative group cursor-pointer hover:scale-105 transition-transform duration-500 mb-3">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-amber-500 to-red-500 rounded-2xl blur opacity-25 group-hover:opacity-60 transition duration-1000" />
                        <img
                            src="/achariya_25_logo.jpg"
                            alt="Achariya"
                            className={`relative object-contain shadow-2xl transition-all duration-300 ${collapsed ? 'h-[40px] w-auto' : 'h-[80px] w-auto max-w-[180px]'}`}
                        />
                    </div>
                    {!collapsed && (
                        <div className="text-center">
                            <h2 className="text-white text-sm font-black tracking-tight uppercase leading-tight">Achariya</h2>
                            <p className="text-[10px] text-indigo-200/70 font-bold uppercase tracking-widest mb-1">Partnership Program</p>
                            <p className="text-[9px] uppercase tracking-[0.25em] font-black text-amber-400">
                                25<sup className="text-[0.6em]">th</sup> Year Celebration
                            </p>
                        </div>
                    )}
                </div>

                {/* Divider */}
                <div className="px-4 mb-4">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/20 to-transparent" />
                </div>

                {/* Nav Items */}
                <nav className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-none px-2 space-y-0.5 pb-2">
                    {navItems.map((item) => {
                        const active = isActive(item.href)
                        return (
                            <div key={item.label} className="relative group/item">
                                <Link
                                    href={item.href}
                                    className={`flex items-center gap-3 rounded-2xl transition-all duration-200 relative overflow-hidden no-underline
                                        ${collapsed ? 'justify-center px-0 py-3' : 'px-4 py-3'}
                                        ${active
                                            ? 'text-amber-500 bg-white/[0.06] font-black shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)]'
                                            : 'text-gray-400 hover:text-white hover:bg-white/[0.05]'
                                        }`}
                                    onMouseEnter={(e) => {
                                        if (collapsed) {
                                            const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                                            setTooltip({ label: item.label, y: rect.top + rect.height / 2 })
                                        }
                                    }}
                                    onMouseLeave={() => setTooltip(null)}
                                >
                                    {/* Active bar */}
                                    {!collapsed && (
                                        <div className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-amber-500 rounded-r-full transition-transform duration-500 shadow-[0_0_15px_rgba(245,158,11,0.8)] ${active ? 'scale-y-100' : 'scale-y-0 group-hover/item:scale-y-100'}`} />
                                    )}
                                    {/* Icon */}
                                    {React.isValidElement(item.icon)
                                        ? React.cloneElement(item.icon as React.ReactElement<any>, {
                                            size: 20,
                                            className: `flex-shrink-0 transition-all duration-300 relative z-10
                                                ${active
                                                    ? 'text-amber-500 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)] scale-110'
                                                    : 'text-gray-500 group-hover/item:text-white group-hover/item:scale-110'}`
                                        })
                                        : item.icon}
                                    {/* Label */}
                                    {!collapsed && (
                                        <span className={`text-[11px] font-bold uppercase tracking-[0.05em] truncate relative z-10 transition-colors duration-200
                                            ${active ? 'text-amber-500' : 'text-slate-400 group-hover/item:text-white'}`}>
                                            {item.label}
                                        </span>
                                    )}
                                </Link>
                            </div>
                        )
                    })}
                </nav>

                {/* Floating tooltip for collapsed mode */}
                {collapsed && tooltip && (
                    <div
                        className="fixed z-[200] pointer-events-none"
                        style={{ left: '72px', top: tooltip.y, transform: 'translateY(-50%)' }}
                    >
                        <div className="bg-gray-900 text-white text-[11px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg shadow-xl border border-white/10 whitespace-nowrap">
                            {tooltip.label}
                        </div>
                        <div className="absolute left-[-5px] top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent border-r-gray-900" />
                    </div>
                )}

                {/* Footer */}
                <div className={`mt-auto border-t border-white/10 bg-black/20 transition-all duration-300 ${collapsed ? 'px-1 py-3' : 'px-4 py-4'}`}>
                    {collapsed ? (
                        // Collapsed footer: avatar only
                        <div className="flex flex-col items-center gap-2">
                            <Link href="/profile" className="no-underline" title={user.fullName}>
                                <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white shadow-xl ring-2 ring-white/10"
                                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)' }}>
                                    {user.fullName[0].toUpperCase()}
                                </div>
                            </Link>
                            <button
                                onClick={async () => { await logoutAction(); window.location.href = '/' }}
                                className="w-full flex items-center justify-center p-2 rounded-xl bg-white/[0.03] text-red-500/60 hover:text-red-500 hover:bg-red-500/10 border border-white/10 transition-all"
                                title="Logout"
                            >
                                <LogOut size={15} />
                            </button>
                        </div>
                    ) : (
                        // Expanded footer
                        <div className="flex flex-col gap-3">
                            <Link href="/profile" className="flex items-center gap-3 bg-white/5 hover:bg-white/10 rounded-2xl p-3 border border-white/5 transition-all no-underline text-inherit">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center text-base font-black text-white shadow-xl flex-shrink-0 ring-2 ring-white/10"
                                    style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #0ea5e9 100%)' }}>
                                    {user.fullName[0].toUpperCase()}
                                </div>
                                <div className="flex flex-col min-w-0 flex-1 overflow-hidden">
                                    <span className="font-black truncate text-white text-sm tracking-tight leading-none">{user.fullName}</span>
                                    <div className="flex items-center gap-1.5 mt-1.5">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">{user.role}</span>
                                        <div className="w-1 h-1 rounded-full bg-slate-700" />
                                        <span className="text-[8px] font-black uppercase tracking-widest text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded-md border border-emerald-500/20">Verified</span>
                                    </div>
                                </div>
                            </Link>
                            <button
                                onClick={async () => { await logoutAction(); window.location.href = '/' }}
                                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-white/[0.03] text-blue-200 hover:text-white hover:bg-red-500/20 border border-white/10 transition-all text-[10px] font-black uppercase tracking-[0.2em] group"
                            >
                                <LogOut size={14} className="text-red-500/60 group-hover:text-red-500 transition-colors" />
                                <span>Logout</span>
                            </button>
                        </div>
                    )}
                </div>

                {/* Toggle Button */}
                <button
                    onClick={toggle}
                    className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-12 bg-[#1e293b] border border-white/20 rounded-r-xl flex items-center justify-center text-gray-400 hover:text-amber-400 hover:bg-[#334155] transition-all shadow-lg z-30"
                    title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                >
                    {collapsed
                        ? <ChevronRight size={14} />
                        : <ChevronLeft size={14} />
                    }
                </button>
            </aside>

            {/* Spacer that matches sidebar width */}
            <div style={{ width: sidebarWidth, minWidth: sidebarWidth, flexShrink: 0 }} className="hidden xl:block transition-[width] duration-300 ease-in-out" />
        </>
    )
}
