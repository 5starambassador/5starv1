'use client'

import { useState, useEffect } from 'react'
import { Calendar, Search, Filter, ChevronLeft, ChevronRight, CheckCircle2, XCircle, Clock, ExternalLink } from 'lucide-react'
import { getPaginatedWhatsAppLogs } from '@/app/automation-actions'

interface WhatsAppLog {
    id: number
    mobile: string
    template: string | null
    type: string
    status: string
    refId: string | null
    content: string | null
    userRole?: string
    campus?: string
    createdAt: Date
}

export function WhatsAppLogTable({ defaultType = 'All', refId }: { defaultType?: string, refId?: string }) {
    const [logs, setLogs] = useState<WhatsAppLog[]>([])
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [totalPages, setTotalPages] = useState(0)
    const [loading, setLoading] = useState(true)
    const [filters, setFilters] = useState({ 
        status: 'All', 
        type: defaultType,
        refId,
        excludeCampaigns: defaultType === 'All' && !refId // If All and no refId, exclude campaigns
    })

    const pageSize = 15

    const fetchLogs = async () => {
        setLoading(true)
        try {
            const res = await getPaginatedWhatsAppLogs(page, pageSize, filters as any)
            if (res.success && res.logs) {
                setLogs(res.logs)
                setTotal(res.total || 0)
                setTotalPages(res.totalPages || 0)
            }
        } catch (error) {
            console.error('Failed to load logs')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchLogs()
    }, [page, filters])

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'SENT': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            case 'DELIVERED': return <CheckCircle2 className="h-4 w-4 text-emerald-500" />
            case 'READ': return <CheckCircle2 className="h-4 w-4 text-blue-500" />
            case 'RECEIVED': return <CheckCircle2 className="h-4 w-4 text-indigo-500" />
            case 'FAILED': return <XCircle className="h-4 w-4 text-rose-500" />
            default: return <Clock className="h-4 w-4 text-amber-500" />
        }
    }

    return (
        <div className="space-y-4">
            {/* Filter Bar */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                        <label htmlFor="log-status-filter" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</label>
                        <select 
                            id="log-status-filter"
                            value={filters.status}
                            onChange={(e) => { setFilters({ ...filters, status: e.target.value }); setPage(1); }}
                            className="bg-white border-none rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm focus:ring-2 focus:ring-indigo-100"
                            aria-label="Filter logs by Status"
                        >
                            <option value="All">All Statuses</option>
                            <option value="SENT">Sent</option>
                            <option value="DELIVERED">Delivered</option>
                            <option value="READ">Read</option>
                            <option value="FAILED">Failed</option>
                        </select>
                    </div>
                    <div className="flex items-center gap-2">
                        <label htmlFor="log-type-filter" className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</label>
                        <select 
                            id="log-type-filter"
                            value={filters.type}
                            onChange={(e) => { setFilters({ ...filters, type: e.target.value, excludeCampaigns: e.target.value === 'All' }); setPage(1); }}
                            className="bg-white border-none rounded-xl px-3 py-1.5 text-xs font-bold text-slate-600 shadow-sm focus:ring-2 focus:ring-indigo-100"
                            aria-label="Filter logs by Type"
                        >
                            <option value="All">All Types</option>
                            <option value="AUTOMATION">Automation Only</option>
                            <option value="SYSTEM">System</option>
                            <option value="CAMPAIGN">Campaign</option>
                            <option value="REMINDER">Reminder</option>
                            <option value="ALERT">Alert</option>
                            <option value="DRIP">Drip</option>
                            <option value="NUDGE">Nudge</option>
                            <option value="CHATBOT">AI Conversations</option>
                            <option value="DPR">DPR</option>
                        </select>
                    </div>
                </div>
                <div className="text-xs font-bold text-slate-400 italic">
                    Showing {logs.length} of {total} total messages
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-100 overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Recipient</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Role/Campus</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Template/Event</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Type</th>
                                <th className="px-6 py-4 text-[10px] font-black text-slate-400 uppercase tracking-widest">Ref ID</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <tr key={i} className="animate-pulse">
                                        <td colSpan={6} className="px-6 py-6"><div className="h-4 bg-slate-100 rounded w-full" /></td>
                                    </tr>
                                ))
                            ) : logs.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-6 py-12 text-center text-slate-400 font-medium italic">No logs matched your filters</td>
                                </tr>
                            ) : (
                                logs.map((log: any) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors group">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-slate-800">{new Date(log.createdAt).toLocaleDateString()}</span>
                                                <span className="text-[10px] text-slate-400 font-medium">{new Date(log.createdAt).toLocaleTimeString()}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className="text-xs font-black text-slate-700">{log.mobile}</span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold text-slate-600 uppercase tracking-tight">{log.userRole || 'User'}</span>
                                                <span className="text-[10px] text-slate-400 italic">{log.campus || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold text-indigo-600 truncate max-w-[250px]" title={log.template || ''}>{log.template || 'Direct Content'}</span>
                                                {log.content && (
                                                    <span 
                                                        className="text-[10px] text-slate-500 line-clamp-2 max-w-[300px] leading-relaxed" 
                                                        title={log.content}
                                                    >
                                                        {log.content}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-2">
                                                    {log.status === 'SENT' && <Clock className="h-4 w-4 text-amber-500" />}
                                                    {log.status === 'DELIVERED' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                                                    {log.status === 'READ' && <CheckCircle2 className="h-4 w-4 text-blue-500" />}
                                                    {log.status === 'FAILED' && <XCircle className="h-4 w-4 text-rose-500" />}
                                                    <span className={`text-[10px] font-black uppercase tracking-tight ${
                                                        log.status === 'READ' ? 'text-blue-600' : 
                                                        log.status === 'DELIVERED' ? 'text-emerald-600' : 
                                                        log.status === 'SENT' ? 'text-amber-600' : 'text-rose-600'
                                                    }`}>
                                                        {log.status}
                                                    </span>
                                                </div>
                                                {log.metadata && (log.metadata.readAt || log.metadata.deliveredAt) && (
                                                    <span className="text-[9px] text-slate-400 font-bold ml-6">
                                                        {log.metadata.readAt ? `Read ${new Date(log.metadata.readAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}` : 
                                                         `Delivered ${new Date(log.metadata.deliveredAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}`}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest ${
                                                log.type === 'INBOUND' ? 'bg-indigo-50 text-indigo-500 border border-indigo-100' : 
                                                log.type === 'CHATBOT' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 
                                                'bg-slate-100 text-slate-500'
                                            }`}>
                                                {log.type === 'CHATBOT' ? 'AI REPLY' : log.type}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-[10px] text-slate-400 font-mono">
                                            {log.refId || '-'}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                    <button 
                        disabled={page === 1 || loading}
                        onClick={() => setPage(p => Math.max(1, p - 1))}
                        className="p-2 rounded-xl hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        aria-label="Previous Page"
                    >
                        <ChevronLeft className="h-5 w-5 text-slate-600" />
                    </button>
                    <div className="flex items-center gap-2">
                        {(() => {
                            let start = Math.max(1, page - 2);
                            let end = Math.min(totalPages, start + 4);
                            if (end - start < 4) {
                                start = Math.max(1, end - 4);
                            }
                            const pages = [];
                            for (let i = start; i <= end; i++) pages.push(i);
                            
                            return pages.map(pageNum => page === pageNum ? (
                                <button
                                    key={pageNum}
                                    onClick={() => setPage(pageNum)}
                                    className="w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-all bg-indigo-600 text-white shadow-lg shadow-indigo-100"
                                    aria-label={`Go to page ${pageNum}`}
                                    aria-current="page"
                                >
                                    {pageNum}
                                </button>
                            ) : (
                                <button
                                    key={pageNum}
                                    onClick={() => setPage(pageNum)}
                                    className="w-8 h-8 rounded-xl text-xs font-black flex items-center justify-center transition-all text-slate-500 hover:bg-white"
                                    aria-label={`Go to page ${pageNum}`}
                                >
                                    {pageNum}
                                </button>
                            ));
                        })()}
                    </div>
                    <button 
                        disabled={page === totalPages || loading}
                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                        className="p-2 rounded-xl hover:bg-white hover:shadow-sm disabled:opacity-30 disabled:hover:bg-transparent transition-all"
                        aria-label="Next Page"
                    >
                        <ChevronRight className="h-5 w-5 text-slate-600" />
                    </button>
                </div>
            </div>
        </div>
    )
}
