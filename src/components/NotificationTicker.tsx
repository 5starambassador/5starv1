'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Megaphone, Bell, Info, AlertTriangle, XCircle, CheckCircle, ChevronLeft, ChevronRight } from 'lucide-react'
import { getNotifications, markAsRead } from '@/app/notification-actions'
import { NotificationDetailModal } from './NotificationDetailModal'

interface Notification {
    id: number
    title: string
    message: string
    type: string
    link?: string | null
    isRead?: boolean
    createdAt: Date | string
}

export function NotificationTicker({ userName, referralCode }: { userName?: string, referralCode?: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isVisible, setIsVisible] = useState(false)
    const [isPaused, setIsPaused] = useState(false)
    const [timerResetKey, setTimerResetKey] = useState(0)
    const [selectedNotificationForModal, setSelectedNotificationForModal] = useState<Notification | null>(null)

    const fetchLatestNotifications = async () => {
        const res = await getNotifications(1, 10)
        if (res.success && res.notifications && res.notifications.length > 0) {
            // Only scroll the latest 5 messages
            setNotifications((res.notifications as any[]).slice(0, 5))
        } else {
            setNotifications([
                { id: 0, title: "Welcome!", message: "Explore the dashboard and start referring to earn rewards.", type: "info", createdAt: new Date().toISOString() }
            ])
        }
        setIsVisible(true)
    }

    useEffect(() => {
        fetchLatestNotifications()
        const interval = setInterval(fetchLatestNotifications, 60000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        if (notifications.length > 1 && !isPaused) {
            const timer = setInterval(() => {
                setCurrentIndex((prev) => (prev + 1) % notifications.length)
            }, 5000) // 5 seconds per message
            return () => clearInterval(timer)
        }
    }, [notifications.length, isPaused, timerResetKey])

    // Reset index if notifications change and current index is out of bounds
    useEffect(() => {
        if (currentIndex >= notifications.length && notifications.length > 0) {
            setCurrentIndex(0)
        }
    }, [notifications.length])

    const handleNext = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        setCurrentIndex((prev) => (prev + 1) % notifications.length)
        setTimerResetKey(k => k + 1)
    }

    const handlePrev = (e?: React.MouseEvent) => {
        e?.stopPropagation()
        setCurrentIndex((prev) => (prev - 1 + notifications.length) % notifications.length)
        setTimerResetKey(k => k + 1)
    }

    const handleTickerClick = async () => {
        const current = notifications[currentIndex]
        if (current) {
            setSelectedNotificationForModal(current)
            if (!current.isRead) {
                await markAsRead(current.id)
                setNotifications(prev => prev.map(n =>
                    n.id === current.id ? { ...n, isRead: true } : n
                ))
            }
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle size={14} className="text-green-400" />
            case 'warning': return <AlertTriangle size={14} className="text-amber-400" />
            case 'error': return <XCircle size={14} className="text-red-400" />
            default: return <Info size={14} className="text-blue-400" />
        }
    }

    if (!isVisible || notifications.length === 0) return null

    const current = notifications[currentIndex]
    if (!current) return null // Final safety guard

    return (
        <div className="w-full fixed top-16 left-0 right-0 xl:sticky xl:top-0 z-[110]">
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                className="relative overflow-hidden bg-gradient-to-r from-[var(--radiant-indigo)] via-[var(--radiant-sapphire)] to-[var(--radiant-indigo)] border-b border-white/20 backdrop-blur-2xl cursor-pointer group shadow-[0_4px_20px_rgba(79,70,229,0.3)]"
                onClick={handleTickerClick}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
            >
                {/* Floating Glow Effects */}
                <div className="absolute top-0 left-1/4 w-1/2 h-full bg-white/10 blur-3xl rounded-full pointer-events-none" />

                <div className="flex items-center h-12 relative z-20">
                    {/* Left Icon Area - Transparent */}
                    <div className="flex items-center gap-3 px-4 shrink-0 h-full">
                        <div className="relative flex items-center justify-center">
                            <Megaphone size={22} className="text-red-500 drop-shadow-[0_0_12px_rgba(239,44,44,0.8)]" />
                            <span className="absolute -top-1 -right-1.5 flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500 shadow-[0_0_8px_rgba(239,44,44,0.6)]"></span>
                            </span>
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/90 hidden md:inline ml-0.5">Live Updates</span>
                    </div>

                    {/* Content Area */}
                    <div className="flex-1 relative overflow-hidden h-full flex items-center">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={current.id}
                                initial={{ x: 20, opacity: 0 }}
                                animate={{ x: 0, opacity: 1 }}
                                exit={{ x: -20, opacity: 0 }}
                                transition={{ duration: 0.5, ease: "easeOut" }}
                                className="flex items-center gap-3 h-full px-2"
                            >
                                <div className="p-1 px-3 bg-white/20 backdrop-blur-md border border-white/20 rounded-full text-[9px] font-black text-white uppercase tracking-tighter">
                                    {current.type || 'info'}
                                </div>
                                <div className="flex items-center">
                                    <span className="text-[11px] font-bold text-white line-clamp-1 drop-shadow-md">
                                        {(current.message || '').replace(/{userName}|{Ambassador}/g, userName || 'Ambassador').replace(/{referralCode}|{code}/g, referralCode || '')}
                                    </span>
                                </div>
                            </motion.div>
                        </AnimatePresence>
                    </div>

                    {/* Right Navigation - Minimalist */}
                    <div className="px-5 shrink-0 flex items-center gap-2 h-full">
                        {notifications.length > 1 && (
                            <>
                                <button
                                    onClick={handlePrev}
                                    className="p-1.5 text-white/60 hover:text-white transition-colors active:scale-95"
                                    title="Previous"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m15 18-6-6 6-6" />
                                    </svg>
                                </button>
                                <button
                                    onClick={handleNext}
                                    className="p-1.5 text-white/60 hover:text-white transition-colors active:scale-95"
                                    title="Next"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="m9 18 6-6-6-6" />
                                    </svg>
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Shimmer Effect */}
                <div className="absolute inset-0 w-full pointer-events-none">
                    <motion.div
                        animate={{ x: ['-200%', '200%'] }}
                        transition={{ repeat: Infinity, duration: 4, ease: "linear", repeatDelay: 1 }}
                        className="h-full w-1/4 bg-gradient-to-r from-transparent via-white/5 to-transparent skew-x-[35deg]"
                    />
                </div>
            </motion.div>

            {/* Detail Modal Overlay */}
            <NotificationDetailModal
                isOpen={!!selectedNotificationForModal}
                onClose={() => setSelectedNotificationForModal(null)}
                notification={selectedNotificationForModal}
                userName={userName}
                referralCode={referralCode}
                getIcon={getIcon}
            />
        </div>
    )
}
