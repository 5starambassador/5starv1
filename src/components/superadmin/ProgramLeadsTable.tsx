'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Download, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { syncProgramLeads } from '@/app/program-actions'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'

interface ProgramLead {
    id: number
    program: { title: string, slug: string }
    referrer: { fullName: string, referralCode: string, mobileNumber: string, assignedCampus: string | null }
    visitorName: string | null
    visitorMobile: string
    studentName: string | null
    paymentStatus: string | null
    status: string
    clickedAt: Date
    registeredAt: Date | null
}

interface ProgramLeadsTableProps {
    leads: ProgramLead[]
}

export function ProgramLeadsTable({ leads }: ProgramLeadsTableProps) {
    const [mounted, setMounted] = useState(false)
    const [search, setSearch] = useState('')
    const [statusFilter, setStatusFilter] = useState('ALL')
    const [campusFilter, setCampusFilter] = useState('ALL')
    const [programFilter, setProgramFilter] = useState('ALL')

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(20)
    const [isSyncing, setIsSyncing] = useState(false)
    const [isExporting, setIsExporting] = useState(false)
    const router = useRouter()

    useEffect(() => {
        setMounted(true)
    }, [])

    // Derived state
    const filteredLeads = leads.filter(lead => {
        const matchesSearch =
            lead.program.title.toLowerCase().includes(search.toLowerCase()) ||
            lead.referrer.fullName.toLowerCase().includes(search.toLowerCase()) ||
            lead.visitorMobile.includes(search) ||
            (lead.visitorName && lead.visitorName.toLowerCase().includes(search.toLowerCase())) ||
            (lead.studentName && lead.studentName.toLowerCase().includes(search.toLowerCase()))

        const matchesStatus = statusFilter === 'ALL' || lead.status === statusFilter
        const matchesCampus = campusFilter === 'ALL' || (lead.referrer.assignedCampus || 'Organic') === campusFilter
        const matchesProgram = programFilter === 'ALL' || lead.program.title === programFilter

        return matchesSearch && matchesStatus && matchesCampus && matchesProgram
    })

    // Pagination logic
    const totalItems = filteredLeads.length
    const totalPages = Math.ceil(totalItems / itemsPerPage)
    const startIndex = (currentPage - 1) * itemsPerPage
    const paginatedLeads = filteredLeads.slice(startIndex, startIndex + itemsPerPage)

    // Filter Options
    const campusOptions = Array.from(new Set(leads.map(l => l.referrer.assignedCampus || 'Organic'))).sort()
    const programOptions = Array.from(new Set(leads.map(l => l.program.title))).sort()

    // Reset page on filter change
    const handleFilterChange = (setter: (val: string) => void, value: string) => {
        setter(value)
        setCurrentPage(1)
    }

    const downloadCSV = () => {
        setIsExporting(true)
        setTimeout(() => {
            try {
                const headers = ['Date', 'Program', 'Referrer', 'Referral Code', 'Campus', 'Visitor Name', 'Visitor Mobile', 'Student Name', 'Payment Status', 'Status']
                const rows = filteredLeads.map(l => [
                    `"${new Date(l.clickedAt).toLocaleDateString()}"`,
                    `"${l.program.title}"`,
                    `"${l.referrer.fullName}"`,
                    `"${l.referrer.referralCode}"`,
                    `"${l.referrer.assignedCampus || 'Organic'}"`,
                    `"${l.visitorName || '-'}"`,
                    `="${l.visitorMobile}"`,
                    `"${l.studentName || '-'}"`,
                    `"${l.paymentStatus || '-'}"`,
                    `"${l.status}"`
                ])

                const csvContent = [headers.join(','), ...rows.map(r => r.join(','))].join('\n')
                const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' })
                const url = window.URL.createObjectURL(blob)
                const link = document.createElement("a")
                link.href = url
                link.setAttribute("download", `program_leads_${new Date().toISOString().split('T')[0]}.csv`)
                document.body.appendChild(link)
                link.click()
                document.body.removeChild(link)
                window.URL.revokeObjectURL(url)
                toast.success('Export completed')
            } catch (error) {
                console.error('Export error:', error)
                toast.error('Export failed')
            } finally {
                setIsExporting(false)
            }
        }, 100)
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800">External Program Leads</h2>
                <div className="flex gap-2">
                    <button
                        onClick={async () => {
                            setIsSyncing(true)
                            const tid = toast.loading('Syncing external leads...')
                            try {
                                const res = await syncProgramLeads()
                                if (res.success) {
                                    const totalSynced = res.results?.reduce((acc: number, r: any) => acc + (r.synced || 0), 0) || 0
                                    toast.success(`Sync complete! ${totalSynced} leads updated across ${res.results?.length || 0} programs.`, { id: tid })
                                    router.refresh()
                                } else {
                                    toast.error(res.error || 'Sync failed', { id: tid })
                                }
                            } catch (error) {
                                toast.error('An unexpected error occurred', { id: tid })
                            } finally {
                                setIsSyncing(false)
                            }
                        }}
                        disabled={isSyncing}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-indigo-700 disabled:opacity-50"
                    >
                        <RefreshCw size={14} className={isSyncing ? 'animate-spin' : ''} />
                        {isSyncing ? 'Syncing...' : 'Sync Leads'}
                    </button>
                    <button
                        onClick={downloadCSV}
                        disabled={isExporting}
                        suppressHydrationWarning
                        className={`px-4 py-2 rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 transition-all ${isExporting ? 'bg-slate-100 text-slate-400 cursor-wait' : 'bg-slate-900 text-white hover:bg-slate-800'}`}
                    >
                        {isExporting ? <RefreshCw size={14} className="animate-spin" /> : <Download size={14} />}
                        {isExporting ? 'Exporting...' : 'Export CSV'}
                    </button>
                </div>
            </div>

            <style jsx>{`
                .custom-table-scrollbar {
                    overflow-x: auto !important;
                    -webkit-overflow-scrolling: touch;
                }
                .custom-table-scrollbar::-webkit-scrollbar {
                    height: 10px;
                }
                .custom-table-scrollbar::-webkit-scrollbar-track {
                    background: #f8fafc;
                    border-radius: 10px;
                }
                .custom-table-scrollbar::-webkit-scrollbar-thumb {
                    background: #cbd5e1;
                    border-radius: 10px;
                    border: 2px solid #f8fafc;
                }
                .custom-table-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #94a3b8;
                }
                /* Force table to respect min-width and ignore global max-width overrides */
                .force-min-width-table {
                    min-width: 1400px !important;
                    width: max-content !important;
                    max-width: none !important;
                }
            `}</style>

            {/* Filters */}
            <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm space-y-4">
                <div className="relative w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                        type="text"
                        placeholder="Search by program, referrer, or visitor mobile/name..."
                        suppressHydrationWarning
                        className="w-full pl-12 pr-4 py-3 bg-slate-50 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-indigo-100 transition-all"
                        value={search}
                        onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                    />
                </div>

                <div className="flex flex-wrap gap-2">
                    <div className="flex-1 min-w-[150px]">
                        <select
                            className="w-full bg-slate-50 border-none rounded-2xl text-[10px] font-black text-slate-600 py-3 px-4 focus:ring-2 focus:ring-indigo-100 uppercase tracking-widest cursor-pointer"
                            value={campusFilter}
                            suppressHydrationWarning
                            onChange={(e) => handleFilterChange(setCampusFilter, e.target.value)}
                        >
                            <option value="ALL">All Campuses</option>
                            {campusOptions.map(c => <option key={c} value={c}>{c}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[150px]">
                        <select
                            className="w-full bg-slate-50 border-none rounded-2xl text-[10px] font-black text-slate-600 py-3 px-4 focus:ring-2 focus:ring-indigo-100 uppercase tracking-widest cursor-pointer"
                            value={programFilter}
                            suppressHydrationWarning
                            onChange={(e) => handleFilterChange(setProgramFilter, e.target.value)}
                        >
                            <option value="ALL">All Programs</option>
                            {programOptions.map(p => <option key={p} value={p}>{p}</option>)}
                        </select>
                    </div>

                    <div className="flex-1 min-w-[150px]">
                        <select
                            className="w-full bg-slate-50 border-none rounded-2xl text-[10px] font-black text-slate-600 py-3 px-4 focus:ring-2 focus:ring-indigo-100 uppercase tracking-widest cursor-pointer"
                            value={statusFilter}
                            suppressHydrationWarning
                            onChange={(e) => handleFilterChange(setStatusFilter, e.target.value)}
                        >
                            <option value="ALL">All Status</option>
                            <option value="CLICKED">Clicked</option>
                            <option value="REGISTERED">Registered</option>
                        </select>
                    </div>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="custom-table-scrollbar pb-2">
                    <table className="table-auto force-min-width-table">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Program</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Referrer</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Campus</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitor Info</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Name</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {paginatedLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-600" suppressHydrationWarning>
                                                {mounted ? new Date(lead.clickedAt).toLocaleDateString() : '...'}
                                            </span>
                                            <span className="text-xs text-slate-400" suppressHydrationWarning>
                                                {mounted ? new Date(lead.clickedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 min-w-[250px]">
                                        <div className="flex flex-wrap gap-1">
                                            <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 text-[11px] font-black leading-tight">
                                                {lead.program.title}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{lead.referrer.fullName}</p>
                                            <p className="text-xs text-slate-400">{lead.referrer.mobileNumber}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <span className="text-xs font-black text-slate-500 uppercase tracking-tight">
                                            {lead.referrer.assignedCampus || 'Organic'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center gap-3">
                                            <div>
                                                <p className="text-sm font-bold text-slate-700">{lead.visitorMobile}</p>
                                                <p className="text-xs text-slate-400">{lead.visitorName || 'N/A'}</p>
                                            </div>
                                            {lead.visitorMobile && (
                                                <a 
                                                    href={`https://wa.me/${lead.visitorMobile}?text=${encodeURIComponent(`Hello! I'm from ACHARIYA Administration. I'm reaching out regarding your interest in the *${lead.program.title}*. I'd love to share more details and help with your inquiry!`)}`}
                                                    target="_blank"
                                                    rel="noopener noreferrer"
                                                    className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 hover:scale-110 active:scale-95 transition-all shadow-sm"
                                                    title="Nudge via WhatsApp"
                                                >
                                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                                                        <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                                                </a>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        {lead.studentName ? (
                                            <span className="text-sm font-bold text-emerald-600">{lead.studentName}</span>
                                        ) : (
                                            <span className="text-xs text-slate-300 italic">Not synced</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        {lead.paymentStatus ? (
                                            <span className={`px-2 py-1 rounded-md text-[10px] font-bold uppercase ${lead.paymentStatus === 'SUCCESS' || lead.paymentStatus === 'PAID' || lead.paymentStatus === 'CONFIRMED'
                                                ? 'bg-green-50 text-green-600'
                                                : 'bg-orange-50 text-orange-600'
                                                }`}>
                                                {lead.paymentStatus}
                                            </span>
                                        ) : (
                                            <span className="text-xs text-slate-300 italic">-</span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${lead.status === 'REGISTERED'
                                            ? 'bg-emerald-100 text-emerald-600'
                                            : 'bg-amber-100 text-amber-600'
                                            }`}>
                                            {lead.status}
                                        </span>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {paginatedLeads.length === 0 && (
                    <div className="p-12 text-center text-slate-400 text-sm font-medium">
                        No leads found matching your filters.
                    </div>
                )}
            </div>

            {/* Pagination UI */}
            {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-md">
                    <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                        Showing <span className="text-slate-900">{startIndex + 1}</span> to <span className="text-slate-900">{Math.min(startIndex + itemsPerPage, totalItems)}</span> of <span className="text-slate-900">{totalItems}</span> leads
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className={`p-2 rounded-xl border transition-all ${currentPage === 1 ? 'border-slate-50 text-slate-200' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-900'}`}
                        >
                            <ChevronLeft size={20} />
                        </button>

                        <div className="flex items-center gap-1">
                            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                                let pageNum = currentPage;
                                if (totalPages <= 5) pageNum = i + 1;
                                else if (currentPage <= 3) pageNum = i + 1;
                                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                else pageNum = currentPage - 2 + i;

                                return (
                                    <button
                                        key={pageNum}
                                        onClick={() => setCurrentPage(pageNum)}
                                        className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === pageNum ? 'bg-slate-900 text-white' : 'text-slate-400 hover:bg-slate-50'}`}
                                    >
                                        {pageNum}
                                    </button>
                                );
                            })}
                        </div>

                        <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className={`p-2 rounded-xl border transition-all ${currentPage === totalPages ? 'border-slate-50 text-slate-200' : 'border-slate-200 text-slate-600 hover:bg-slate-50 hover:border-slate-900'}`}
                        >
                            <ChevronRight size={20} />
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}
