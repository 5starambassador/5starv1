'use client'

import React, { useState, useEffect } from 'react'
import {
    Search,
    Filter,
    RefreshCw,
    Calendar,
    Download,
    Database,
    ShieldAlert,
    User,
    Shield,
    ChevronRight,
    ArrowUpDown
} from 'lucide-react'
import { getAuditLogs, getAuditStats } from '@/app/audit-actions'
import { toast } from 'sonner'

interface AuditLog {
    id: number
    createdAt: string
    action: string
    module: string
    description: string
    ipAddress?: string
    admin?: { adminName: string; role: string }
    user?: { fullName: string; role: string }
    metadata?: any
}

interface AuditStats {
    dailyVolume: number
    securityAlerts: number
    moduleHealth: { name: string; count: number }[]
    topActor: { name: string; count: number }
}

export function AuditLogPanel() {
    const [logs, setLogs] = useState<AuditLog[]>([])
    const [stats, setStats] = useState<AuditStats | null>(null)
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const [selectedModule, setSelectedModule] = useState('All')
    const [dateRange, setDateRange] = useState({ start: '', end: '' })
    const [expandedLogId, setExpandedLogId] = useState<number | null>(null)

    const fetchData = async () => {
        setLoading(true)
        try {
            const [logsRes, statsRes] = await Promise.all([
                getAuditLogs({
                    search: searchTerm,
                    module: selectedModule,
                    startDate: dateRange.start,
                    endDate: dateRange.end
                }),
                getAuditStats()
            ])

            if (logsRes.success && logsRes.logs) {
                setLogs(logsRes.logs as any)
            }
            if (statsRes.success && statsRes.stats) {
                setStats(statsRes.stats)
            }
        } catch (error) {
            toast.error('Error loading audit trails')
        } finally {
            setLoading(false)
        }
    }

    // Debounce search
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchData()
        }, 500)
        return () => clearTimeout(timer)
    }, [searchTerm, selectedModule, dateRange])

    const modules = ['All', 'AUTH', 'LEADS', 'ADMIN', 'SETTINGS', 'FINANCE', 'REPORTS', 'SECURITY']

    const getActionColor = (action: string) => {
        const a = action.toUpperCase()
        if (a.includes('DELETE') || a.includes('BAN') || a.includes('RESET')) return 'text-red-600 bg-red-50 border-red-100'
        if (a.includes('UPDATE') || a.includes('EDIT')) return 'text-amber-600 bg-amber-50 border-amber-100'
        if (a.includes('CREATE') || a.includes('ADD')) return 'text-emerald-600 bg-emerald-50 border-emerald-100'
        if (a.includes('LOGIN')) return 'text-blue-600 bg-blue-50 border-blue-100'
        return 'text-gray-600 bg-gray-50 border-gray-100'
    }

    const toggleExpand = (id: number) => {
        setExpandedLogId(expandedLogId === id ? null : id)
    }

    return (
        <div className="space-y-6">
            {/* Intelligence Summary Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Daily Activity</p>
                    <div className="flex items-end justify-between">
                        <h4 className="text-2xl font-black text-gray-900">{stats?.dailyVolume || 0}</h4>
                        <span className="text-[10px] font-bold text-emerald-500 bg-emerald-50 px-2 py-0.5 rounded-full flex items-center gap-1">
                            <ArrowUpDown size={10} /> Live
                        </span>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">Logged actions in 24h</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-red-500 uppercase tracking-widest mb-1">Security Alerts</p>
                    <div className="flex items-end justify-between">
                        <h4 className={`text-2xl font-black ${stats?.securityAlerts && stats.securityAlerts > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                            {stats?.securityAlerts || 0}
                        </h4>
                        <Shield size={16} className={stats?.securityAlerts && stats.securityAlerts > 0 ? 'text-red-500 animate-pulse' : 'text-gray-300'} />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">Critical ops detected</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">Audit High-Point</p>
                    <div className="flex items-end justify-between">
                        <h4 className="text-sm font-black text-gray-900 truncate max-w-[120px]">{stats?.topActor.name || 'None'}</h4>
                        <div className="flex items-center -space-x-1">
                            <div className="w-5 h-5 rounded-full bg-blue-100 flex items-center justify-center border border-white">
                                <User size={10} className="text-blue-600" />
                            </div>
                        </div>
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">{stats?.topActor.count || 0} actions today</p>
                </div>

                <div className="bg-white p-5 rounded-3xl border border-gray-100 shadow-sm flex flex-col justify-between">
                    <p className="text-[10px] font-black text-purple-500 uppercase tracking-widest mb-1">Active Module</p>
                    <div className="flex items-end justify-between">
                        <h4 className="text-sm font-black text-gray-900">{stats?.moduleHealth[0]?.name || 'N/A'}</h4>
                        <Database size={16} className="text-gray-300" />
                    </div>
                    <p className="text-[10px] text-gray-400 mt-2 font-medium">Highest share of logs</p>
                </div>
            </div>

            {/* Control Bar */}
            <div className="bg-white p-4 rounded-2xl border border-gray-100 shadow-sm flex flex-col md:flex-row gap-4 items-center justify-between">
                <div className="flex items-center gap-4 flex-1 w-full md:w-auto">
                    <div className="relative flex-1 md:max-w-xs">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>

                    <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
                        {modules.map(mod => (
                            <button
                                key={mod}
                                onClick={() => setSelectedModule(mod)}
                                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${selectedModule === mod
                                    ? 'bg-gray-900 text-white shadow-lg shadow-gray-200'
                                    : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
                                    }`}
                            >
                                {mod === 'All' ? 'All Modules' : mod}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto justify-end">
                    <button
                        onClick={fetchData}
                        className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 hover:bg-gray-100 rounded-xl transition-colors"
                    >
                        <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>

                    <button
                        onClick={() => {
                            const headers = ["Timestamp", "Actor", "Role", "Action", "Module", "Description", "IP Address"]
                            const csvRows = [
                                headers.join(','),
                                ...logs.map(log => [
                                    new Date(log.createdAt).toISOString(),
                                    `"${log.admin?.adminName || log.user?.fullName || 'System'}"`,
                                    `"${log.admin?.role || log.user?.role || 'System'}"`,
                                    log.action,
                                    log.module,
                                    `"${log.description.replace(/"/g, '""')}"`,
                                    log.ipAddress || ''
                                ].join(','))
                            ]
                            const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' })
                            const url = window.URL.createObjectURL(blob)
                            const a = document.createElement('a')
                            a.href = url
                            a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`
                            a.click()
                            toast.success('Audit logs exported')
                        }}
                        disabled={logs.length === 0}
                        className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-black transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-gray-200"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Logs Table */}
            <div className="bg-white rounded-[24px] border border-gray-100 shadow-xl shadow-gray-200/40 overflow-hidden min-h-[400px]">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-gray-50/50 border-b border-gray-100">
                                <th className="w-10 px-6 py-4"></th>
                                <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">Timestamp</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">Actor</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">Action</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">Details</th>
                                <th className="px-6 py-4 text-left text-[11px] font-black uppercase tracking-widest text-gray-400">IP Addr</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td className="p-6"></td>
                                        <td className="p-6"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                        <td className="p-6"><div className="h-4 bg-gray-100 rounded w-32"></div></td>
                                        <td className="p-6"><div className="h-6 bg-gray-100 rounded w-20"></div></td>
                                        <td className="p-6"><div className="h-4 bg-gray-100 rounded w-48"></div></td>
                                        <td className="p-6"><div className="h-4 bg-gray-100 rounded w-24"></div></td>
                                    </tr>
                                ))
                            ) : logs.length > 0 ? (
                                logs.map((log) => (
                                    <React.Fragment key={log.id}>
                                        <tr
                                            className={`group hover:bg-gray-50/50 transition-all cursor-pointer ${expandedLogId === log.id ? 'bg-gray-50/80 shadow-inner' : ''}`}
                                            onClick={() => toggleExpand(log.id)}
                                        >
                                            <td className="px-6 py-4">
                                                <div className={`p-1 rounded bg-gray-100 text-gray-400 transition-transform duration-300 ${expandedLogId === log.id ? 'rotate-90 bg-red-50 text-red-500' : 'group-hover:bg-gray-200'}`}>
                                                    <ChevronRight size={14} />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-900">
                                                        {new Date(log.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <span className="text-[10px] font-medium text-gray-400">
                                                        {new Date(log.createdAt).toLocaleTimeString()}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${log.admin ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'}`}>
                                                        {log.admin ? <Shield size={14} fill="currentColor" /> : <User size={14} />}
                                                    </div>
                                                    <div className="flex flex-col">
                                                        <span className="text-sm font-bold text-gray-900 leading-tight">
                                                            {log.admin?.adminName || log.user?.fullName || 'System'}
                                                        </span>
                                                        <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-0.5">
                                                            {log.admin?.role || log.user?.role || 'SYSTEM'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex items-center px-2 py-0.5 rounded-lg text-[10px] font-black border uppercase tracking-widest ${getActionColor(log.action)}`}>
                                                    {log.action}
                                                </span>
                                                {log.module && (
                                                    <span className="ml-2 text-[10px] font-black text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded border border-gray-200 uppercase">
                                                        {log.module}
                                                    </span>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <p className="text-sm font-medium text-gray-600 max-w-sm truncate group-hover:text-gray-900 transition-colors" title={log.description}>
                                                    {log.description}
                                                </p>
                                            </td>
                                            <td className="px-6 py-4 text-[10px] font-mono font-bold text-gray-400">
                                                {log.ipAddress || '—'}
                                            </td>
                                        </tr>
                                        {expandedLogId === log.id && (
                                            <tr className="bg-gray-50/50">
                                                <td colSpan={6} className="px-12 py-8 border-y border-gray-100 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="flex flex-col gap-4">
                                                        <div className="flex items-center gap-2 mb-2">
                                                            <div className="w-1.5 h-4 bg-red-500 rounded-full" />
                                                            <h4 className="text-[11px] font-black uppercase tracking-widest text-gray-500">Operation Payload & Metadata</h4>
                                                        </div>
                                                        {log.metadata ? (
                                                            <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
                                                                <div className="bg-gray-50 px-4 py-2 border-b border-gray-200 flex justify-between items-center">
                                                                    <span className="text-[10px] font-black text-gray-400 uppercase">JSON Structure</span>
                                                                    <Database size={12} className="text-gray-400" />
                                                                </div>
                                                                <pre className="p-6 text-xs font-mono text-gray-700 overflow-x-auto whitespace-pre-wrap leading-relaxed selection:bg-red-100">
                                                                    {JSON.stringify(log.metadata, null, 2)}
                                                                </pre>
                                                            </div>
                                                        ) : (
                                                            <div className="bg-white border-2 border-dashed border-gray-100 rounded-2xl p-8 text-center">
                                                                <p className="text-sm font-bold text-gray-400">No extended metadata was captured for this specific event.</p>
                                                                <p className="text-[10px] text-gray-300 mt-1 uppercase tracking-widest font-black">Audit Detail: Low</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        )}
                                    </React.Fragment>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan={6} className="py-24 text-center">
                                        <div className="flex flex-col items-center gap-4">
                                            <div className="p-6 bg-gray-50 rounded-full text-gray-200">
                                                <Database size={48} strokeWidth={1} />
                                            </div>
                                            <div>
                                                <p className="text-lg font-black text-gray-900">End of the Trail</p>
                                                <p className="text-sm font-medium text-gray-400 mt-1">We couldn't find any logs matching your criteria.</p>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
