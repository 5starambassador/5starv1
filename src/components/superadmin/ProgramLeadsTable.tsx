'use client'

import { useState } from 'react'
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

    useState(() => {
        setMounted(true)
    })

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
                                            <span className="text-sm font-bold text-slate-600">
                                                {mounted ? new Date(lead.clickedAt).toLocaleDateString() : '...'}
                                            </span>
                                            <span className="text-xs text-slate-400">
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
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{lead.visitorMobile}</p>
                                            <p className="text-xs text-slate-400">{lead.visitorName || 'N/A'}</p>
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
