'use client'

import { useState, useEffect } from 'react'
import { Clock, Shield, User, Filter, Calendar, AlertCircle, CheckCircle, Trash2, Edit, Plus, X } from 'lucide-react'
import { toast } from 'sonner'
import { getUserAuditLogs } from '@/app/audit-actions'
import { createPortal } from 'react-dom'

interface UserAuditTimelineProps {
    userId: number
    userName: string
    onClose: () => void
}

export function UserAuditTimeline({ userId, userName, onClose }: UserAuditTimelineProps) {
    const [mounted, setMounted] = useState(false)
    const [logs, setLogs] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filterAction, setFilterAction] = useState('All')
    const [filterModule, setFilterModule] = useState('All')

    useEffect(() => {
        setMounted(true)
        loadAuditLogs()
    }, [userId])

    const loadAuditLogs = async () => {
        setLoading(true)
        try {
            const res = await getUserAuditLogs(userId)
            if (res.success) {
                setLogs(res.logs || [])
            } else {
                toast.error('Failed to load audit logs')
            }
        } catch (error) {
            toast.error('Failed to load audit logs')
        } finally {
            setLoading(false)
        }
    }

    if (!mounted) return null

    const getActionIcon = (action: string) => {
        switch (action.toUpperCase()) {
            case 'CREATE': return <Plus size={16} className="text-green-600" />
            case 'UPDATE': return <Edit size={16} className="text-blue-600" />
            case 'DELETE': return <Trash2 size={16} className="text-red-600" />
            default: return <Shield size={16} className="text-gray-600" />
        }
    }

    const getActionColor = (action: string) => {
        switch (action.toUpperCase()) {
            case 'CREATE': return 'bg-green-50/50 border-green-100 text-green-700'
            case 'UPDATE': return 'bg-blue-50/50 border-blue-100 text-blue-700'
            case 'DELETE': return 'bg-red-50/50 border-red-100 text-red-700'
            default: return 'bg-gray-50/50 border-gray-100 text-gray-700'
        }
    }

    const filteredLogs = logs.filter(log => {
        const matchesAction = filterAction === 'All' || log.action === filterAction
        const matchesModule = filterModule === 'All' || log.module === filterModule
        return matchesAction && matchesModule
    })

    const uniqueActions = ['All', ...new Set(logs.map(l => l.action))]
    const uniqueModules = ['All', ...new Set(logs.map(l => l.module))]

    const modalContent = (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />

            {/* Modal Body */}
            <div 
                className="bg-white rounded-[40px] w-full max-w-4xl shadow-2xl max-h-[90vh] overflow-hidden flex flex-col relative z-10 border border-gray-100"
                role="dialog"
                aria-modal="true"
                aria-labelledby="audit-timeline-title"
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-900 to-gray-800 p-8 text-white relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                    <div className="flex items-center justify-between relative z-10">
                        <div>
                            <h3 id="audit-timeline-title" className="text-2xl font-black uppercase tracking-tight italic">Audit Timeline</h3>
                            <p className="text-white/60 text-[10px] font-black uppercase tracking-[0.2em] mt-2">Operational history for {userName}</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center transition-all border border-white/10"
                            aria-label="Close Audit Timeline"
                        >
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-gray-50/50 p-4 border-b border-gray-100 flex gap-4 backdrop-blur-md">
                    <div className="flex-1 relative">
                        <select
                            id="audit-filter-action"
                            value={filterAction}
                            onChange={(e) => setFilterAction(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                            aria-label="Filter logs by Action"
                        >
                            {uniqueActions.map(action => (
                                <option key={action} value={action}>
                                    {action === 'All' ? 'Filter: All Actions' : action}
                                </option>
                            ))}
                        </select>
                        <Filter size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                    <div className="flex-1 relative">
                        <select
                            id="audit-filter-module"
                            value={filterModule}
                            onChange={(e) => setFilterModule(e.target.value)}
                            className="w-full pl-4 pr-10 py-2.5 bg-white border border-gray-200 rounded-xl text-[10px] font-black uppercase tracking-widest outline-none focus:ring-2 focus:ring-indigo-500/20 transition-all appearance-none"
                            aria-label="Filter logs by Module"
                        >
                            {uniqueModules.map(module => (
                                <option key={module} value={module}>
                                    {module === 'All' ? 'Filter: All Modules' : module}
                                </option>
                            ))}
                        </select>
                        <Filter size={12} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                    </div>
                </div>

                {/* Timeline */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600"></div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Accessing Logs...</p>
                        </div>
                    ) : filteredLogs.length === 0 ? (
                        <div className="text-center py-20">
                            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-gray-100">
                                <Filter size={24} className="text-gray-300" />
                            </div>
                            <p className="text-xs font-black text-gray-400 uppercase tracking-widest">No matching audit points found</p>
                        </div>
                    ) : (
                        <div className="relative">
                            {/* Vertical Line */}
                            <div className="absolute left-6 top-2 bottom-2 w-px bg-gradient-to-b from-gray-100 via-gray-200 to-gray-100"></div>

                            <div className="space-y-8">
                                {filteredLogs.map((log, index) => (
                                    <div key={log.id} className="relative pl-16 group">
                                        {/* Node Dot */}
                                        <div className={`absolute left-[20px] w-3 h-3 rounded-full border-2 border-white shadow-sm transition-transform group-hover:scale-125 z-10 ${
                                            log.action === 'CREATE' ? 'bg-green-500' :
                                            log.action === 'UPDATE' ? 'bg-blue-500' :
                                            log.action === 'DELETE' ? 'bg-red-500' : 'bg-gray-500'
                                        }`}></div>

                                        {/* Card */}
                                        <div className={`rounded-2xl border p-5 transition-all hover:bg-white hover:shadow-xl hover:shadow-gray-200/40 ${getActionColor(log.action)}`}>
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-lg bg-white/80 flex items-center justify-center shadow-sm">
                                                        {getActionIcon(log.action)}
                                                    </div>
                                                    <div>
                                                        <span className="font-black text-[10px] uppercase tracking-widest block">{log.action}</span>
                                                        <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">
                                                            Module: {log.module}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-2 text-[10px] font-bold text-gray-400 bg-white/50 px-3 py-1 rounded-full border border-white" suppressHydrationWarning>
                                                    <Clock size={10} />
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </div>
                                            </div>
                                            <p className="text-sm font-bold text-gray-800 leading-relaxed">{log.description}</p>

                                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                                                <div className="mt-4 bg-gray-900 rounded-xl p-4 overflow-hidden relative group/meta">
                                                    <div className="flex items-center justify-between mb-2">
                                                        <p className="text-[8px] font-black text-gray-600 uppercase tracking-widest">Data Payload</p>
                                                        <Shield size={10} className="text-gray-700" />
                                                    </div>
                                                    <pre className="text-[10px] font-mono text-emerald-400 overflow-x-auto custom-scrollbar-dark leading-normal">
                                                        {JSON.stringify(log.metadata, null, 2)}
                                                    </pre>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-gray-50/80 p-6 border-t border-gray-100 flex justify-between items-center backdrop-blur-md rounded-b-[40px]">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        Showing <span className="text-gray-900">{filteredLogs.length}</span> of <span className="text-gray-900">{logs.length}</span> total log nodes
                    </p>
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-gray-900 hover:bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-xl shadow-gray-200 transition-all hover:-translate-y-0.5 active:scale-95 italic"
                    >
                        Close Portal
                    </button>
                </div>
            </div>
        </div>
    )

    return createPortal(modalContent, document.body)
}
