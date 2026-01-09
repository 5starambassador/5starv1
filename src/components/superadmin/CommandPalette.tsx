'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search,
    Command,
    UserPlus,
    FileText,
    Settings,
    Users,
    Shield,
    LogOut,
    LayoutDashboard,
    GraduationCap,
    Building2,
    Wallet,
    Zap
} from 'lucide-react'

export function CommandPalette() {
    const [open, setOpen] = useState(false)
    const [search, setSearch] = useState('')
    const router = useRouter()

    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                setOpen((open) => !open)
            }
        }
        document.addEventListener('keydown', down)
        return () => document.removeEventListener('keydown', down)
    }, [])

    const commands = [
        {
            category: 'Navigation',
            items: [
                { icon: LayoutDashboard, label: 'Dashboard Overview', path: '/superadmin?view=start' },
                { icon: Users, label: 'Manage Ambassadors', path: '/superadmin?view=users' },
                { icon: GraduationCap, label: 'Manage Students', path: '/superadmin?view=students' },
                { icon: Building2, label: 'Campus Management', path: '/superadmin?view=campus' },
                { icon: Shield, label: 'System Audit Logs', path: '/superadmin?view=audit' },
                { icon: Wallet, label: 'Fee Management', path: '/superadmin?view=fees' },
                { icon: Settings, label: 'Global Notifications', path: '/superadmin?view=settings' },
            ]
        },
        {
            category: 'Quick Actions',
            items: [
                { icon: UserPlus, label: 'Add New Ambassador', action: () => document.getElementById('btn-add-user')?.click() },
                { icon: GraduationCap, label: 'Register New Student', action: () => document.getElementById('btn-add-student')?.click() },
                { icon: Building2, label: 'Add New Campus', action: () => document.getElementById('btn-add-campus')?.click() },
                { icon: Shield, label: 'Add System Admin', action: () => document.getElementById('btn-add-admin')?.click() },
                { icon: Zap, label: 'Generate KPI Report', path: '/superadmin?view=reports&mode=visual' },
            ]
        },
        {
            category: 'Database & Sync',
            items: [
                { icon: FileText, label: 'Bulk Upload Students', path: '/superadmin?view=students&action=bulk' },
                { icon: FileText, label: 'Export Referral Data', path: '/superadmin?view=reports&mode=classic' },
            ]
        }
    ]

    const filteredCommands = commands.map(group => ({
        ...group,
        items: group.items.filter(item =>
            item.label.toLowerCase().includes(search.toLowerCase())
        )
    })).filter(group => group.items.length > 0)

    const execute = (item: any) => {
        setOpen(false)
        setSearch('')
        if (item.action) {
            // Add a small delay for modal transitions
            setTimeout(item.action, 100)
        } else if (item.path) {
            router.push(item.path)
        }
    }

    return (
        <AnimatePresence>
            {open && (
                <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] px-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setOpen(false)}
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                    />

                    {/* Palette */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: -20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: -20 }}
                        transition={{ duration: 0.15, ease: 'easeOut' }}
                        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-100 ring-1 ring-black/5"
                    >
                        {/* Search Input */}
                        <div className="flex items-center gap-3 px-4 py-4 border-b border-gray-100">
                            <Search className="text-gray-400 w-5 h-5" />
                            <input
                                autoFocus
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Type a command or search..."
                                className="flex-1 bg-transparent outline-none text-base placeholder:text-gray-400 text-gray-900"
                            />
                            <div className="flex gap-1">
                                <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded border border-gray-200">ESC</span>
                            </div>
                        </div>

                        {/* Results */}
                        <div className="max-h-[300px] overflow-y-auto py-2">
                            {filteredCommands.length === 0 ? (
                                <div className="px-4 py-8 text-center text-gray-400 text-sm">
                                    No results found.
                                </div>
                            ) : (
                                filteredCommands.map((group, groupIdx) => (
                                    <div key={groupIdx} className="mb-2 last:mb-0">
                                        <div className="px-4 py-1.5 text-[10px] font-bold uppercase tracking-widest text-gray-400">
                                            {group.category}
                                        </div>
                                        {group.items.map((item, itemIdx) => (
                                            <button
                                                key={itemIdx}
                                                onClick={() => execute(item)}
                                                className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-red-50 hover:text-red-700 transition-colors text-left group"
                                            >
                                                <div className={`p-1.5 rounded-lg text-gray-400 group-hover:text-red-600 bg-gray-50 group-hover:bg-red-100 transition-colors`}>
                                                    <item.icon size={16} strokeWidth={2.5} />
                                                </div>
                                                <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900 flex-1">
                                                    {item.label}
                                                </span>
                                                {item.action && (
                                                    <span className="text-[10px] bg-white border border-gray-200 px-1.5 py-0.5 rounded text-gray-400 shadow-sm">Action</span>
                                                )}
                                            </button>
                                        ))}
                                    </div>
                                ))
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-4 py-2 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
                            <div className="flex items-center gap-4 text-[10px] font-medium text-gray-400">
                                <span><strong className="text-gray-600">↑↓</strong> to navigate</span>
                                <span><strong className="text-gray-600">↵</strong> to select</span>
                            </div>
                            <div className="flex items-center gap-1.5 text-[10px] font-medium text-red-600">
                                <Command size={10} />
                                <span>Super Admin</span>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
