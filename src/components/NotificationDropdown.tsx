'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Bell, Check, Info, AlertTriangle, XCircle, CheckCircle, X, ChevronLeft, Share2 } from 'lucide-react'
import { getNotifications, markAllAsRead, markAsRead } from '@/app/notification-actions'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { HyperlinkedText } from './HyperlinkedText'
import { NotificationDetailModal } from './NotificationDetailModal'

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

        // Listen for external trigger to open dropdown
        const handleOpenExternal = () => setIsOpen(true)
        window.addEventListener('open-notifications-dropdown', handleOpenExternal)

        document.addEventListener("mousedown", handleClickOutside)
        return () => {
            document.removeEventListener("mousedown", handleClickOutside)
            window.removeEventListener('open-notifications-dropdown', handleOpenExternal)
        }
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

            {/* Detail Modal Overlay */}
            <NotificationDetailModal
                isOpen={!!selectedNotification}
                onClose={() => setSelectedNotification(null)}
                notification={selectedNotification}
                userName={userName}
                referralCode={referralCode}
                getIcon={getIcon}
            />
        </div >
    )
}
