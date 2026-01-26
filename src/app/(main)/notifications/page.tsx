'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { ChevronLeft, CheckCheck, Wallet, Shield, Milestone, Bell, Info, X, Loader2, Share2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { PageAnimate, PageItem } from '@/components/PageAnimate'
import { getNotifications, markAllAsRead, markAsRead } from '@/app/notification-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface Notification {
    id: number
    title: string
    message: string
    type: string
    link?: string | null
    isRead: boolean
    createdAt: Date
}

export default function NotificationsPage() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
    const router = useRouter()

    const fetchNotifications = async () => {
        try {
            const res = await getNotifications(1, 20) // Fetch top 20
            if (res.success && res.notifications) {
                // Transform dates from string to Date object if needed
                const parsed = res.notifications.map((n: any) => ({
                    ...n,
                    createdAt: new Date(n.createdAt)
                }))
                setNotifications(parsed)
            }
        } catch (error) {
            console.error(error)
            toast.error("Failed to load notifications")
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchNotifications()
    }, [])

    const handleMarkAllRead = async () => {
        // Optimistic update
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        await markAllAsRead()
        toast.success("All notifications marked as read")
    }

    const removeNotification = async (id: number) => {
        // Optimistic remove (just visual for now, or we could add a delete action if backend supported it)
        // Since backend might not have delete, we'll mark as read and hide it from view if desired, or just hide it locally
        // Based on typical behavior, we might just hide it locally or mark read. 
        // Let's assume 'Dismiss' just hides it from the list for this session or marks read.
        // For better UX, let's mark as read if not read, and hide it.
        await markAsRead(id)
        setNotifications(prev => prev.filter(n => n.id !== id))
    }

    const handleNotificationClick = async (n: Notification) => {
        setSelectedNotification(n)
        if (!n.isRead) {
            await markAsRead(n.id)
            setNotifications(prev => prev.map(item => item.id === n.id ? { ...item, isRead: true } : item))
        }
        if (n.link) {
            router.push(n.link)
        }
    }

    const getIconInfo = (type: string) => {
        switch (type) {
            case 'success': return { icon: CheckCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
            case 'warning': return { icon: Shield, color: 'text-amber-400', bg: 'bg-amber-500/10' }
            case 'error': return { icon: X, color: 'text-red-400', bg: 'bg-red-500/10' }
            case 'CREDIT': return { icon: Wallet, color: 'text-emerald-400', bg: 'bg-emerald-500/10' }
            case 'SECURITY': return { icon: Shield, color: 'text-blue-400', bg: 'bg-blue-500/10' }
            case 'UPDATE': return { icon: Milestone, color: 'text-purple-400', bg: 'bg-purple-500/10' }
            default: return { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' }
        }
    }

    const getTimeAgo = (date: Date) => {
        const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000)
        let interval = seconds / 31536000
        if (interval > 1) return Math.floor(interval) + " years ago"
        interval = seconds / 2592000
        if (interval > 1) return Math.floor(interval) + " months ago"
        interval = seconds / 86400
        if (interval > 1) return Math.floor(interval) + " days ago"
        interval = seconds / 3600
        if (interval > 1) return Math.floor(interval) + " hours ago"
        interval = seconds / 60
        if (interval > 1) return Math.floor(interval) + " minutes ago"
        return "Just now"
    }

    return (
        <div className="relative min-h-screen text-white font-[family-name:var(--font-outfit)] pb-24 pt-4">
            {/* Force Dark Background Overlay to override global layout */}
            <div className="absolute inset-0 bg-[#0f172a] z-0"></div>

            {/* Ambient Background Effects */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-pink-600/5 rounded-full blur-[120px]" />
            </div>

            <div className="relative z-10 max-w-md mx-auto min-h-screen flex flex-col">

                {/* Header */}
                <header className="px-6 pt-6 pb-6 flex items-center justify-between sticky top-0 z-20 bg-[#0f172a]/80 backdrop-blur-md">
                    <div className="flex items-center gap-4">
                        <Link href="/dashboard" className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center hover:bg-white/10 transition-colors">
                            <ChevronLeft size={20} className="text-white/80" />
                        </Link>
                        <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
                    </div>
                    <button
                        onClick={handleMarkAllRead}
                        className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-bold uppercase tracking-wider hover:bg-amber-500/20 transition-all"
                    >
                        <CheckCheck size={14} />
                        Mark all read
                    </button>
                </header>

                {/* List */}
                <div className="px-6 space-y-4 flex-1">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20">
                            <Loader2 className="animate-spin text-white/30" size={32} />
                        </div>
                    ) : (
                        <AnimatePresence mode="popLayout">
                            {notifications.length === 0 ? (
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    className="flex flex-col items-center justify-center py-20 text-center opacity-50"
                                >
                                    <Bell size={48} className="mb-4 text-white/20" />
                                    <p className="text-sm font-medium">No new notifications</p>
                                </motion.div>
                            ) : (
                                notifications.map((n) => {
                                    const { icon: Icon, color, bg } = getIconInfo(n.type)
                                    return (
                                        <motion.div
                                            key={n.id}
                                            layout
                                            initial={{ opacity: 0, scale: 0.9 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            onClick={() => handleNotificationClick(n)}
                                            className={`relative group overflow-hidden rounded-[24px] border transition-all cursor-pointer ${!n.isRead
                                                ? 'bg-white/10 border-white/20 shadow-lg shadow-indigo-500/10'
                                                : 'bg-white/5 border-white/5 opacity-80'
                                                }`}
                                        >
                                            <div className="p-5 flex gap-4">
                                                {/* Icon */}
                                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 ${bg} ${color}`}>
                                                    <Icon size={20} />
                                                </div>

                                                {/* Content */}
                                                <div className="flex-1 min-w-0 pt-0.5">
                                                    <div className="flex justify-between items-start mb-1">
                                                        <h3 className={`text-base font-bold truncate pr-6 ${!n.isRead ? 'text-white' : 'text-white/70'}`}>
                                                            {n.title}
                                                        </h3>
                                                        <span className="text-[10px] font-medium text-white/40 whitespace-nowrap">{getTimeAgo(n.createdAt)}</span>
                                                    </div>
                                                    <p className="text-sm text-white/60 leading-relaxed line-clamp-2">
                                                        {n.message
                                                            .replace(/{userName}|{Ambassador}/g, 'Ambassador')
                                                            .replace(/{referralCode}|{code}/g, '')}
                                                    </p>
                                                </div>

                                                {/* Unread Dot */}
                                                {!n.isRead && (
                                                    <div className="absolute top-6 right-4 w-2 h-2 rounded-full bg-pink-500 shadow-[0_0_8px_rgba(236,72,153,0.8)] animate-pulse" />
                                                )}

                                                {/* Dismiss Button (Hover - preventing click propagation) */}
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        removeNotification(n.id)
                                                    }}
                                                    className="absolute top-2 right-2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center text-white/40 hover:bg-red-500 hover:text-white opacity-0 group-hover:opacity-100 transition-all z-10"
                                                >
                                                    <X size={12} />
                                                </div>
                                            </div>
                                        </motion.div>
                                    )
                                })
                            )}
                        </AnimatePresence>
                    )}
                </div>
            </div>

            {/* Notification Detail Modal */}
            <AnimatePresence>
                {selectedNotification && (
                    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setSelectedNotification(null)}
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                        />
                        <motion.div
                            initial={{ y: "100%" }}
                            animate={{ y: 0 }}
                            exit={{ y: "100%" }}
                            transition={{ type: "spring", damping: 30, stiffness: 300 }}
                            className="relative w-full max-w-lg bg-[#1e293b] border-t sm:border border-white/10 rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl mb-[env(safe-area-inset-bottom)] pb-8 sm:pb-0"
                        >
                            {/* Mobile Drag Handle */}
                            <div className="sm:hidden w-12 h-1.5 bg-white/20 rounded-full mx-auto mt-4 mb-2" />

                            <div className="p-8">
                                <div className="flex justify-between items-start mb-6">
                                    <div className="flex items-center gap-4">
                                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border border-white/5 ${getIconInfo(selectedNotification.type).bg} ${getIconInfo(selectedNotification.type).color}`}>
                                            {(() => {
                                                const Icon = getIconInfo(selectedNotification.type).icon
                                                return <Icon size={24} />
                                            })()}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black text-white leading-tight">{selectedNotification.title}</h2>
                                            <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest mt-1">
                                                {selectedNotification.createdAt.toLocaleString()}
                                            </p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedNotification(null)}
                                        className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all shadow-lg"
                                        aria-label="Close"
                                    >
                                        <img
                                            src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 6 6 18'/%3E%3Cpath d='m6 6 18 12'/%3E%3C/svg%3E"
                                            alt="Close"
                                            width={24}
                                            height={24}
                                            className="block"
                                        />
                                    </button>
                                </div>

                                <div className="space-y-6">
                                    <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-2">
                                        <p className="text-base text-white/80 leading-relaxed font-medium">
                                            {selectedNotification.message
                                                .replace(/{userName}|{Ambassador}/g, 'Ambassador')
                                                .replace(/{referralCode}|{code}/g, '')}
                                        </p>
                                    </div>

                                    <div className="flex flex-col gap-3">
                                        <button
                                            onClick={() => {
                                                const text = `${selectedNotification.title}\n\n${selectedNotification.message
                                                    .replace(/{userName}|{Ambassador}/g, 'Ambassador')
                                                    .replace(/{referralCode}|{code}/g, '')}`
                                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                                            }}
                                            className="w-full py-4 rounded-2xl bg-[#25D366] text-white font-black uppercase tracking-widest shadow-lg shadow-[#25D366]/20 hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                        >
                                            <img
                                                src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='18' cy='5' r='3'/%3E%3Ccircle cx='6' cy='12' r='3'/%3E%3Ccircle cx='18' cy='19' r='3'/%3E%3Cline x1='8.59' x2='15.42' y1='13.51' y2='17.49'/%3E%3Cline x1='15.41' x2='8.59' y1='6.51' y2='10.49'/%3E%3C/svg%3E"
                                                alt="Share"
                                                width={18}
                                                height={18}
                                                className="block"
                                            />
                                            Share on WhatsApp
                                        </button>

                                        {selectedNotification.link && (
                                            <button
                                                onClick={() => {
                                                    router.push(selectedNotification.link!)
                                                    setSelectedNotification(null)
                                                }}
                                                className="w-full py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
                                            >
                                                Take Action
                                                <ChevronLeft size={16} className="rotate-180" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
