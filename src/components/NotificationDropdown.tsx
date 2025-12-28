'use client'

import { useState, useEffect, useRef } from 'react'
import { Bell, Check, Info, AlertTriangle, XCircle, CheckCircle } from 'lucide-react'
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

export function NotificationDropdown() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [unreadCount, setUnreadCount] = useState(0)
    const [isOpen, setIsOpen] = useState(false)
    const [isLoading, setIsLoading] = useState(true)
    const dropdownRef = useRef<HTMLDivElement>(null)
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
        if (!n.isRead) {
            await markAsRead(n.id)
            setNotifications(prev => prev.map(item =>
                item.id === n.id ? { ...item, isRead: true } : item
            ))
            setUnreadCount(prev => Math.max(0, prev - 1))
        }
        if (n.link) {
            setIsOpen(false)
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
                <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-lg ring-1 ring-black ring-opacity-5 z-50 overflow-hidden transform origin-top-right transition-all">
                    <div className="px-4 py-3 border-b border-gray-100 flex justify-between items-center bg-gray-50/50">
                        <h3 className="text-sm font-bold text-gray-900">Notifications</h3>
                        {unreadCount > 0 && (
                            <button
                                onClick={handleMarkAllRead}
                                className="text-xs font-medium text-[#CC0000] hover:text-red-700 flex items-center gap-1"
                            >
                                <Check size={12} /> Mark all read
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
                                        className={`px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer ${!notification.isRead ? 'bg-red-50/30' : ''}`}
                                    >
                                        <div className="flex gap-3">
                                            <div className="mt-0.5 flex-shrink-0">
                                                {getIcon(notification.type)}
                                            </div>
                                            <div className="flex-1 space-y-1">
                                                <p className={`text-sm ${!notification.isRead ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'}`}>
                                                    {notification.title}
                                                </p>
                                                <p className="text-xs text-gray-500 line-clamp-2">
                                                    {notification.message}
                                                </p>
                                                <p className="text-[10px] text-gray-400">
                                                    {new Date(notification.createdAt).toLocaleString()}
                                                </p>
                                            </div>
                                            {!notification.isRead && (
                                                <div className="mt-1.5 h-2 w-2 rounded-full bg-[#CC0000] flex-shrink-0" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {notifications.length > 0 && (
                        <div className="bg-gray-50 border-t border-gray-100 px-4 py-2 text-center">
                            <Link href="/notifications" className="text-xs text-gray-600 hover:text-gray-900 font-medium">
                                View all notifications
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
