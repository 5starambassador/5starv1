'use client'

import { Home, UserPlus, List, User, IndianRupee } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import React from 'react'

export function BottomNav({ role }: { role?: string }) {
    const pathname = usePathname()
    const [pendingLabel, setPendingLabel] = React.useState<string | null>(null)

    // Reset pending state when navigation completes
    React.useEffect(() => {
        setPendingLabel(null)
    }, [pathname])

    const handleNavigate = (label: string) => {
        setPendingLabel(label)
    }

    const isActive = (path: string) => {
        if (path === '/' || path === '/dashboard' || path === '/campus' || path === '/superadmin' || path === '/admin' || path === '/finance') {
            // Match any root dashboard path
            return pathname === path || (pathname === '/' && path === '/dashboard')
        }
        return pathname.startsWith(path)
    }

    const isFinanceAccess = role === 'Finance Admin' || role === 'Super Admin'

    // Royal Glass Theme - Dark Bottom Nav
    return (
        <div className="fixed bottom-0 left-0 right-0 z-50 xl:hidden">
            {/* Gradient Glow at top */}
            <div className="absolute -top-10 left-0 right-0 h-10 bg-gradient-to-t from-black/10 to-transparent pointer-events-none" />

            {/* Main Bar */}
            <div className="bg-[#0f172a]/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-[0_-5px_20px_rgba(0,0,0,0.3)]">
                <div className={`flex justify-around items-center h-16 ${isFinanceAccess ? 'px-2' : ''} px-4`}>
                    <Link
                        href="/dashboard"
                        onClick={() => handleNavigate('Home')}
                        className={`group flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${pathname.includes('dashboard') || pathname === '/' || pathname.includes('admin') || pathname.includes('campus') || pathname.includes('superadmin') ? 'text-white' : 'text-slate-400 hover:text-white'} ${pendingLabel === 'Home' ? 'animate-pulse opacity-70' : ''}`}
                    >
                        <div className={`p-1.5 rounded-full transition-all duration-300 ${pathname.includes('dashboard') || pathname === '/' || pathname.includes('admin') || pathname.includes('campus') || pathname.includes('superadmin') ? 'bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'group-hover:bg-white/5'}`}>
                            <Home size={20} className={pathname.includes('dashboard') || pathname === '/' || pathname.includes('admin') || pathname.includes('campus') || pathname.includes('superadmin') ? 'text-blue-300' : 'text-slate-400 group-hover:text-blue-200'} strokeWidth={pathname.includes('dashboard') ? 2.5 : 2} />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider">Home</span>
                    </Link>

                    {isFinanceAccess && (
                        <Link
                            href="/finance"
                            onClick={() => handleNavigate('Finance')}
                            className={`group flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${isActive('/finance') ? 'text-white' : 'text-slate-400 hover:text-white'} ${pendingLabel === 'Finance' ? 'animate-pulse opacity-70' : ''}`}
                        >
                            <div className={`p-1.5 rounded-full transition-all duration-300 ${isActive('/finance') ? 'bg-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.3)]' : 'group-hover:bg-white/5'}`}>
                                <IndianRupee size={20} className={isActive('/finance') ? 'text-emerald-400' : 'text-slate-400 group-hover:text-emerald-300'} strokeWidth={isActive('/finance') ? 2.5 : 2} />
                            </div>
                            <span className="text-[9px] font-bold uppercase tracking-wider">Finance</span>
                        </Link>
                    )}

                    {/* Prominent Refer Button - Floating */}
                    <div className="relative -top-5">
                        <Link
                            href="/refer"
                            onClick={() => handleNavigate('Refer')}
                            className={`flex flex-col items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 shadow-xl border-4 border-[#0f172a] hover:scale-105 active:scale-95 transition-all duration-300 relative group ${pendingLabel === 'Refer' ? 'animate-pulse scale-95' : ''}`}
                        >
                            <div className="absolute inset-0 rounded-full bg-white/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
                            <UserPlus size={24} className="text-white relative z-10" strokeWidth={2.5} />
                        </Link>
                        <span className="absolute -bottom-5 w-full text-center text-[9px] font-bold uppercase tracking-wider text-slate-400 group-hover:text-white transition-colors">Refer</span>
                    </div>

                    <Link
                        href="/profile"
                        onClick={() => handleNavigate('Profile')}
                        className={`group flex flex-col items-center justify-center w-full h-full space-y-1 transition-all duration-300 ${isActive('/profile') ? 'text-white' : 'text-slate-400 hover:text-white'} ${pendingLabel === 'Profile' ? 'animate-pulse opacity-70' : ''}`}
                    >
                        <div className={`p-1.5 rounded-full transition-all duration-300 ${isActive('/profile') ? 'bg-white/10 shadow-[0_0_10px_rgba(255,255,255,0.2)]' : 'group-hover:bg-white/5'}`}>
                            <User size={20} className={isActive('/profile') ? 'text-blue-300' : 'text-slate-400 group-hover:text-blue-200'} strokeWidth={isActive('/profile') ? 2.5 : 2} />
                        </div>
                        <span className="text-[9px] font-bold uppercase tracking-wider">Profile</span>
                    </Link>
                </div>
            </div>
        </div>
    )
}
