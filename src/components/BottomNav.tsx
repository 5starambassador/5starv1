'use client'

import { Home, UserPlus, BarChart3, List, User, IndianRupee } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export function BottomNav({ role }: { role?: string }) {
    const pathname = usePathname()

    const isActive = (path: string) => {
        if (path === '/' || path === '/dashboard' || path === '/campus' || path === '/superadmin' || path === '/admin' || path === '/finance') {
            // Match any root dashboard path
            return pathname === path || (pathname === '/' && path === '/dashboard')
        }
        return pathname.startsWith(path)
    }

    const isFinanceAccess = role === 'Finance Admin' || role === 'Super Admin'

    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 pb-[env(safe-area-inset-bottom)] z-50 xl:hidden">
            <div className={`flex justify-around items-center h-16 ${isFinanceAccess ? 'px-2' : ''}`}>
                <Link
                    href="/dashboard"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${pathname.includes('dashboard') || pathname === '/' || pathname.includes('admin') || pathname.includes('campus') || pathname.includes('superadmin') ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <Home size={24} strokeWidth={pathname.includes('dashboard') || pathname.includes('admin') || pathname.includes('campus') || pathname.includes('superadmin') ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Home</span>
                </Link>

                {isFinanceAccess && (
                    <Link
                        href="/finance"
                        className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/finance') ? 'text-emerald-600' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                        <IndianRupee size={24} strokeWidth={isActive('/finance') ? 2.5 : 2} />
                        <span className="text-[10px] font-medium">Finance</span>
                    </Link>
                )}

                <Link
                    href="/refer"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/refer') ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <UserPlus size={24} strokeWidth={isActive('/refer') ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Refer</span>
                </Link>

                <Link
                    href="/analytics"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/analytics') ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <BarChart3 size={24} strokeWidth={isActive('/analytics') ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Analytics</span>
                </Link>

                <Link
                    href="/profile"
                    className={`flex flex-col items-center justify-center w-full h-full space-y-1 ${isActive('/profile') ? 'text-red-600' : 'text-gray-500 dark:text-gray-400'}`}
                >
                    <User size={24} strokeWidth={isActive('/profile') ? 2.5 : 2} />
                    <span className="text-[10px] font-medium">Profile</span>
                </Link>
            </div>
        </div>
    )
}
