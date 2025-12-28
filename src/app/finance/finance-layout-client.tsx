'use client'

import React from 'react'
import { useRouter, usePathname } from 'next/navigation'
import {
    LayoutDashboard,
    CreditCard,
    Wallet,
    Banknote,
    LogOut,
    Menu,
    X,
    BarChart3,
    FileText
} from 'lucide-react'
import MobileSidebarWrapper from '@/components/MobileSidebarWrapper'
import { MobileMenu } from '@/components/MobileMenu'
import { RolePermissions } from '@/lib/permissions'

interface FinanceLayoutClientProps {
    children: React.ReactNode
    userRole: string
    permissions: RolePermissions | null
}

export default function FinanceLayoutClient({ children, userRole, permissions }: FinanceLayoutClientProps) {
    const router = useRouter()
    const pathname = usePathname()

    const menuItems = [
        { name: 'Dashboard', icon: LayoutDashboard, path: '/finance' },
        { name: 'Transactions', icon: CreditCard, path: '/finance/transactions' },
        { name: 'Fee Structure', icon: Banknote, path: '/finance/fees' },
        { name: 'Benefit Payouts', icon: Wallet, path: '/finance/payouts' },
    ]

    // Conditionally add modules based on permissions
    if (permissions?.analytics?.access) {
        menuItems.push({ name: 'Analytics', icon: BarChart3, path: '/admin?view=analytics' })
    }

    if (permissions?.reports?.access) {
        menuItems.push({ name: 'Reports', icon: FileText, path: '/finance/reports' })
    }

    const isActive = (path: string) => {
        if (path === '/finance' && pathname === '/finance') return true
        if (path !== '/finance' && pathname?.startsWith(path)) return true
        return false
    }

    // Only show "Back to Admin" for Super Admin and regular Admins (excluding Finance Admin)
    const showBackToAdmin = userRole === 'Super Admin' || (userRole.includes('Admin') && userRole !== 'Finance Admin' && userRole !== 'Admission Admin')
    // Actually simplicity: If Finance Admin, hide it. Everyone else (who has access to Super Admin) sees it.
    // The user request specifically says "when login to finance admin, back to admin should not be visible"
    // So if role === 'Finance Admin', hide it.
    // Use a more robust check: if role contains 'Finance', it's a Finance Admin.
    // Also trim and lowercase to be safe.
    const isFinanceAdmin = userRole && userRole.toLowerCase().trim().includes('finance')

    return (
        <div className="flex h-screen font-sans overflow-hidden text-black relative"
            style={{
                backgroundImage: "url('/bg-pattern.png')",
                backgroundSize: 'cover',
                backgroundAttachment: 'fixed',
                backgroundPosition: 'center',
                backgroundColor: '#f3f4f6',
                maxWidth: '100vw',
                overflowX: 'hidden'
            }}>
            {/* White overlay for readability */}
            <div className="absolute inset-0 pointer-events-none" style={{
                backgroundColor: 'rgba(255,255,255,0.85)',
                zIndex: 0,
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
            }}></div>

            {/* Desktop Sidebar */}
            <aside
                className="desktop-sidebar flex-col w-64 border-r border-white/20 p-4 sticky top-0 h-screen relative z-10"
                style={{
                    background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.7) 0%, rgba(255, 255, 255, 0.4) 100%)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    boxShadow: '4px 0 24px rgba(0,0,0,0.02)'
                }}
            >
                <div className="mb-8 p-2 flex justify-center">
                    <img
                        src="/achariya_25_logo.jpg"
                        alt="Achariya 25th Year"
                        className="w-auto h-auto object-contain rounded-xl shadow-sm"
                        style={{ maxHeight: '120px', border: '2px solid rgba(255,255,255,0.5)' }}
                    />
                </div>

                <nav className="flex-1 space-y-2 overflow-y-auto px-2 custom-scrollbar">
                    {menuItems.map((item) => (
                        <button
                            key={item.path}
                            onClick={() => router.push(item.path)}
                            className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all group ${isActive(item.path)
                                ? 'bg-red-50'
                                : 'hover:bg-gray-50'
                                }`}
                            style={{
                                color: isActive(item.path) ? '#CC0000' : '#4B5563',
                                border: 'none',
                                background: isActive(item.path) ? '#FEF2F2' : 'transparent',
                                cursor: 'pointer',
                                textAlign: 'left'
                            }}
                        >
                            <item.icon size={20} color={isActive(item.path) ? '#CC0000' : '#9CA3AF'} />
                            <span>{item.name}</span>
                        </button>
                    ))}
                </nav>

                <div className="border-t border-gray-200 pt-4 mt-auto space-y-2">
                    {!isFinanceAdmin && (
                        <button
                            onClick={() => router.push('/superadmin')}
                            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all hover:bg-gray-50"
                            style={{ color: '#4B5563', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                        >
                            <LayoutDashboard size={20} />
                            Back to Super Admin
                        </button>
                    )}
                    <button
                        onClick={() => router.push('/')}
                        className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all"
                        style={{ color: '#CC0000', border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
                    >
                        <LogOut size={20} />
                        Sign Out
                    </button>
                </div>
            </aside>

            {/* Mobile Top Bar */}
            <div className="mobile-topbar fixed top-0 left-0 right-0 h-16 border-b border-white/20 z-50 flex items-center justify-between px-4"
                style={{
                    background: 'rgba(255, 255, 255, 0.85)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
                }}>
                <div className="flex items-center gap-3">
                    {/* Hamburger Menu Trigger */}
                    <MobileSidebarWrapper>
                        <MobileMenu
                            navItems={[
                                ...menuItems.map(item => ({
                                    label: item.name,
                                    href: item.path,
                                    icon: <item.icon />
                                })),
                                // Add Back to Admin for non-Finance Admin users
                                ...(!isFinanceAdmin ? [{
                                    label: 'Back to Super Admin',
                                    href: '/superadmin',
                                    icon: <LayoutDashboard />
                                }] : [])
                            ]}
                            user={{
                                fullName: 'Finance Admin',
                                role: userRole
                            }}
                            logoutAction={async () => {
                                router.push('/')
                            }}
                            viewMode="mobile-grid"
                            hideLogo={true}
                        />
                    </MobileSidebarWrapper>

                    <img
                        src="/achariya_25_logo.jpg"
                        alt="Achariya 25th Year"
                        className="rounded-lg shadow-sm"
                        style={{ height: '40px', width: 'auto' }}
                    />
                </div>
            </div>

            {/* Main Content */}
            <main className="flex-1 flex flex-col h-full overflow-hidden relative z-10 xl:pt-0 pb-4 xl:pb-0" style={{ paddingTop: 'max(80px, env(safe-area-inset-top, 80px))', overflowX: 'hidden' }}>
                <div className="flex-1 overflow-y-auto overflow-x-hidden w-full" style={{ maxWidth: '100vw' }}>
                    <div className="max-w-7xl mx-auto p-4 xl:p-8" style={{ maxWidth: '100%' }}>
                        {children}
                    </div>
                </div>
            </main>


            <style jsx global>{`
                /* Default: Mobile Style */
                .desktop-sidebar { display: none; }
                .mobile-topbar { display: flex; }

                /* Force no horizontal scroll on mobile */
                @media (max-width: 1279px) {
                    html, body {
                        overflow-x: hidden !important;
                        max-width: 100vw !important;
                    }
                    main, main * {
                        max-width: 100% !important;
                    }
                    .page-container {
                        width: 100% !important;
                        max-width: 100% !important;
                        overflow-x: hidden !important;
                    }
                }

                /* Desktop Style (>= 1280px) */
                @media (min-width: 1280px) {
                    .desktop-sidebar { display: flex; }
                    .mobile-topbar { display: none; }
                }
            `}</style>
        </div>
    )
}
