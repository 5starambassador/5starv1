'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Check, Info, AlertTriangle, XCircle, CheckCircle, X, ChevronLeft, Share2 } from 'lucide-react'
import { getNotifications, markAllAsRead, markAsRead } from '@/app/notification-actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

interface Notification {
    id: number
    title: string
    message: string
    type: string
    link?: string | null
    isRead: boolean
    createdAt: Date
}

export function NotificationDropdown({ userName, referralCode }: { userName?: string, referralCode?: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const [selectedNotification, setSelectedNotification] = useState<Notification | null>(null)
    const dropdownRef = useRef<HTMLDivElement>(null)
    const [mounted, setMounted] = useState(false)
    const router = useRouter()

    const fetchNotifications = async () => {
        const res = await getNotifications(1, 10) // Fetch top 10
        if (res.success && res.notifications) {
            setNotifications(res.notifications as any)
            setUnreadCount(res.unreadCount || 0)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        setMounted(true)
        fetchNotifications()
        // Poll every 30 seconds for new notifications
        const interval = setInterval(fetchNotifications, 30000)
        return () => clearInterval(interval)
    }, [])

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener("mousedown", handleClickOutside)
        return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    const handleMarkAllRead = async () => {
        await markAllAsRead()
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })))
        setUnreadCount(0)
    }

    const handleNotificationClick = async (n: Notification) => {
        setSelectedNotification(n)
        setIsOpen(false) // Close dropdown when opening modal
        if (!n.isRead) {
            await markAsRead(n.id)
            setNotifications(prev => prev.map(item =>
                item.id === n.id ? { ...item, isRead: true } : item
            ))
            setUnreadCount(prev => Math.max(0, prev - 1))
        }
        if (n.link) {
            router.push(n.link)
        }
    }

    const getIcon = (type: string) => {
        switch (type) {
            case 'success': return <CheckCircle size={16} className="text-green-500" />
            case 'warning': return <AlertTriangle size={16} className="text-amber-500" />
            case 'error': return <XCircle size={16} className="text-red-500" />
            default: return <Info size={16} className="text-blue-500" />
        }
    }

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative p-2 rounded-full hover:bg-gray-100 transition-colors"
                title="Notifications"
                suppressHydrationWarning
            >
                <Bell size={20} className="text-gray-600" />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
                    // Or for a number badge:
                    // <span className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-red-600 text-white text-[10px] flex items-center justify-center font-bold">
                    //     {unreadCount > 9 ? '9+' : unreadCount}
                    // </span>
                )}
            </button>

            {isOpen && (
                <div className="absolute right-0 sm:right-0 mt-3 w-[280px] xs:w-80 glass-panel !bg-white/95 dark:!bg-slate-900/95 rounded-2xl shadow-2xl border border-white/20 z-50 overflow-hidden transform origin-top-right transition-all animate-in fade-in zoom-in-95 duration-200">
                    <div className="px-5 py-4 border-b border-black/5 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-white/5 backdrop-blur-md">
                        <h3 className="text-sm font-black text-gray-900 dark:text-white tracking-tight uppercase">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-[10px] font-black text-ui-primary hover:text-ui-primary/80 flex items-center gap-1 uppercase tracking-widest transition-colors"
                            >
                                <Check size={12} strokeWidth={3} /> Mark all read
                            </button>
                        )}
                    </div>

                    <div className="max-h-[400px] overflow-y-auto">
                        {isLoading ? (
                            <div className="p-4 text-center text-gray-500 text-sm">Loading...</div>
                        ) : notifications.length === 0 ? (
                            <div className="p-8 text-center text-gray-400">
                                <Bell size={32} className="mx-auto mb-2 opacity-20" />
                                <p className="text-sm">No notifications yet</p>
                            </div>
                        ) : (
                            <div className="divide-y divide-gray-50">
                                {notifications.map((notification) => (
                                    <div
                                        key={notification.id}
                                        onClick={() => handleNotificationClick(notification)}
                                        className={`px-5 py-4 hover:bg-ui-primary/5 transition-all cursor-pointer group relative ${!notification.isRead ? 'bg-ui-primary/[0.03]' : ''}`}
                                    >
                                        <div className="flex gap-4">
                                            <div className="mt-0.5 flex-shrink-0 p-2 bg-gray-100 dark:bg-white/10 rounded-xl group-hover:scale-110 transition-transform self-start h-fit">
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className={`text-sm tracking-tight leading-snug ${!notification.isRead ? 'font-black text-gray-900 dark:text-white' : 'font-bold text-gray-600 dark:text-white/70'}`}>
                                                    {notification.title
                                                        .replace(/{userName}|{Ambassador}/g, userName || 'Ambassador')
                                                        .replace(/{referralCode}|{code}/g, referralCode || '')}
                                                </p>
                                                <p className="text-[11px] font-medium leading-relaxed text-gray-600 dark:text-white/50 line-clamp-2">
                                                    {notification.message
                                                        .replace(/{userName}|{Ambassador}/g, userName || 'Ambassador')
                                                        .replace(/{referralCode}|{code}/g, referralCode || '')}
                                                </p>
                                                <p className="text-[9px] font-black text-gray-400 dark:text-white/30 uppercase tracking-widest mt-2">
                                                    {new Date(notification.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            {!notification.isRead && (
                                                <div className="mt-1.5 h-2 w-2 rounded-full bg-ui-primary shadow-[0_0_8px_rgba(var(--ui-primary-rgb),0.5)] flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="bg-gray-50 dark:bg-white/5 border-t border-gray-100 dark:border-white/10 px-4 py-3 text-center">
                            <Link
                                href="/notifications"
                                onClick={() => setIsOpen(false)}
                                className="text-xs font-black text-ui-primary hover:text-ui-primary/80 uppercase tracking-widest transition-colors"
                            >
                                View all notifications
                            </Link>
                        </div>
                    )}
                </div>
            )}

            {/* Detail Modal Overlay - Portal to body to avoid Clipping */}
            {mounted && selectedNotification && createPortal(
                <div className={userName ? "dark" : ""}>
                    <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-4">
                        <div
                            className="absolute inset-0 bg-black/80 backdrop-blur-md"
                            onClick={() => setSelectedNotification(null)}
                        />
                        <div className="relative w-full max-w-sm bg-white dark:bg-[#0f172a] border-t sm:border border-black/5 dark:border-white/10 rounded-t-[32px] sm:rounded-[32px] overflow-hidden shadow-2xl transition-all p-8 mb-[env(safe-area-inset-bottom)] pb-12 sm:pb-8 animate-in slide-in-from-bottom duration-300">
                            {/* Mobile Drag Handle */}
                            <div className="sm:hidden w-12 h-1.5 bg-gray-200 dark:bg-white/20 rounded-full mx-auto -mt-4 mb-6" />

                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-gray-100 dark:bg-white/10 rounded-2xl">
                                        {getIcon(selectedNotification.type)}
                                    </div>
                                    <div>
                                        <h3 className="text-lg font-black text-gray-900 dark:text-white leading-tight">
                                            {selectedNotification.title
                                                .replace(/{userName}|{Ambassador}/g, userName || 'Ambassador')
                                                .replace(/{referralCode}|{code}/g, referralCode || '')}
                                        </h3>
                                        <p className="text-[10px] font-black text-gray-400 dark:text-white/30 uppercase tracking-widest mt-1">
                                            {new Date(selectedNotification.createdAt).toLocaleString()}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => {
                                            const text = `${selectedNotification.title}\n\n${selectedNotification.message
                                                .replace(/{userName}|{Ambassador}/g, userName || 'Ambassador')
                                                .replace(/{referralCode}|{code}/g, referralCode || '')}`
                                            const shareData = {
                                                title: selectedNotification.title,
                                                text: text,
                                                url: selectedNotification.link || window.location.href
                                            }

                                            if (navigator.share) {
                                                navigator.share(shareData).catch(console.error)
                                            } else {
                                                window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                                            }
                                        }}
                                        className="w-10 h-10 bg-green-500/10 border border-green-500/20 flex items-center justify-center hover:bg-green-500/20 transition-all shadow-xl"
                                        style={{ borderRadius: '50%', color: '#22c55e' }}
                                        title="Share on WhatsApp"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: '18px', minHeight: '18px', display: 'block' }}>
                                            <circle cx="18" cy="5" r="3" />
                                            <circle cx="6" cy="12" r="3" />
                                            <circle cx="18" cy="19" r="3" />
                                            <line x1="8.59" x2="15.42" y1="13.51" y2="17.49" />
                                            <line x1="15.41" x2="8.59" y1="6.51" y2="10.49" />
                                        </svg>
                                    </button>
                                    <button
                                        onClick={() => setSelectedNotification(null)}
                                        className="w-10 h-10 bg-gray-200 dark:bg-white/10 border border-gray-300 dark:border-white/20 flex items-center justify-center hover:bg-gray-300 dark:hover:bg-white/20 transition-all shadow-xl"
                                        style={{ borderRadius: '50%', color: '#ffffff' }}
                                        aria-label="Close"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ minWidth: '20px', minHeight: '20px', display: 'block' }}>
                                            <path d="M18 6 6 18" />
                                            <path d="m6 6 18 12" />
                                        </svg>
                                    </button>
                                </div>
                            </div>

                            <div className="max-h-[50vh] overflow-y-auto custom-scrollbar pr-1 mb-8">
                                <p className="text-sm text-gray-600 dark:text-white/70 leading-relaxed font-medium">
                                    {selectedNotification.message
                                        .replace(/{userName}|{Ambassador}/g, userName || 'Ambassador')
                                        .replace(/{referralCode}|{code}/g, referralCode || '')}
                                </p>
                            </div>

                            <div className="flex flex-col gap-3">
                                {selectedNotification.link && (
                                    <button
                                        onClick={() => {
                                            if (selectedNotification.link) router.push(selectedNotification.link)
                                            setSelectedNotification(null)
                                            setIsOpen(false)
                                        }}
                                        className="w-full py-4 rounded-2xl bg-ui-primary text-white font-black uppercase tracking-widest shadow-lg shadow-ui-primary/20 hover:scale-[1.02] transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                                    >
                                        View Details
                                        <ChevronLeft size={16} className="rotate-180" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>,
                document.body
            )}
        </div>
    )
}
