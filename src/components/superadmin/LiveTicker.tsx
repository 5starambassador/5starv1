'use client'

import { useState, useEffect } from 'react'
import { getAuditLogs } from '@/app/audit-actions'
import { motion } from 'framer-motion'

interface LogSnippet {
    id: number
    action: string
    description: string
    createdAt: string
    actorName: string
}

export function LiveTicker() {
    const [logs, setLogs] = useState<LogSnippet[]>([])

    useEffect(() => {
        const fetchLatest = async () => {
            const res = await getAuditLogs({ search: '', module: 'All' })
            if (res.success && res.logs) {
                const snippets = res.logs.slice(0, 5).map((l: any) => ({
                    id: l.id,
                    action: l.action,
                    description: l.description,
                    createdAt: l.createdAt,
                    actorName: l.admin?.adminName || l.user?.fullName || 'System'
                }))
                setLogs(snippets)
            }
        }

        fetchLatest()
        const interval = setInterval(fetchLatest, 60000) // Refresh every 60s (reduced from 30s)
        return () => clearInterval(interval)
    }, [])

    if (logs.length === 0) return null

    return (
        <div className="bg-[#000000] border-b border-gray-800 text-white overflow-hidden py-1.5 px-4 flex items-center gap-6 relative shadow-2xl">
            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-r from-black via-transparent to-black pointer-events-none z-10 opacity-60" />

            <div className="flex items-center gap-2 text-red-500 font-black text-[9px] uppercase tracking-[0.2em] whitespace-nowrap z-20">
                <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                </span>
                LIVE ACTIVITY
            </div>

            <div className="flex-1 overflow-hidden relative h-5 z-20">
                {/* Looping Marquee container */}
                <div className="animate-marquee hover:pause flex items-center gap-12 whitespace-nowrap">
                    {[...logs, ...logs].map((log, idx) => (
                        <div key={`${log.id}-${idx}`} className="flex items-center gap-3 text-[11px] font-medium text-gray-300 group cursor-default">
                            <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-800 text-gray-400">
                                {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            <span className="text-white font-bold tracking-tight">{log.actorName}</span>
                            <span className={`font-black text-[10px] px-1.5 rounded uppercase ${log.action === 'CREATE' ? 'text-emerald-400 bg-emerald-400/10' :
                                log.action === 'UPDATE' ? 'text-blue-400 bg-blue-400/10' :
                                    'text-orange-400 bg-orange-400/10'
                                }`}>
                                {log.action}
                            </span>
                            <span className="text-gray-400 group-hover:text-white transition-colors">{log.description}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
