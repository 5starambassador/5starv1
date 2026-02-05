'use client'

import { useState } from 'react'
import { Search, Filter, Download } from 'lucide-react'
import { motion } from 'framer-motion'

interface ProgramLead {
    id: number
    program: { title: string, slug: string }
    referrer: { fullName: string, referralCode: string, mobileNumber: string }
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

        return matchesSearch && matchesStatus
    })

    const downloadCSV = () => {
        const headers = ['Date', 'Program', 'Referrer', 'Referral Code', 'Visitor Name', 'Visitor Mobile', 'Student Name', 'Payment Status', 'Status']
        const rows = filteredLeads.map(l => [
            new Date(l.clickedAt).toLocaleDateString(),
            l.program.title,
            l.referrer.fullName,
            l.referrer.referralCode,
            l.visitorName || '-',
            l.visitorMobile,
            l.studentName || '-',
            l.paymentStatus || '-',
            l.status
        ])

        const csvContent = "data:text/csv;charset=utf-8,"
            + [headers.join(','), ...rows.map(r => r.join(','))].join('\n')

        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "program_leads.csv")
        document.body.appendChild(link)
        link.click()
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-black text-slate-800">External Program Leads</h2>
                <div className="flex gap-2">
                    <button
                        onClick={downloadCSV}
                        suppressHydrationWarning
                        className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold uppercase tracking-wider flex items-center gap-2 hover:bg-slate-800"
                    >
                        <Download size={14} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Filters */}
            <div className="flex gap-4 items-center bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                    <input
                        type="text"
                        placeholder="Search by program, referrer, or visitor..."
                        suppressHydrationWarning
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 border-none rounded-xl text-sm font-medium focus:ring-2 focus:ring-indigo-100"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Status:</span>
                    <select
                        className="bg-slate-50 border-none rounded-xl text-sm font-bold text-slate-600 py-2 pl-3 pr-8 focus:ring-2 focus:ring-indigo-100"
                        value={statusFilter}
                        suppressHydrationWarning
                        onChange={(e) => setStatusFilter(e.target.value)}
                    >
                        <option value="ALL">All Status</option>
                        <option value="CLICKED">Clicked</option>
                        <option value="REGISTERED">Registered</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-100">
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Program</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Referrer</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Visitor Info</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Student Name</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Payment</th>
                                <th className="px-6 py-4 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50">
                            {filteredLeads.map((lead) => (
                                <tr key={lead.id} className="hover:bg-indigo-50/30 transition-colors group">
                                    <td className="px-6 py-4">
                                        <div className="flex items-center gap-2">
                                            <span className="text-sm font-bold text-slate-600">
                                                {mounted ? new Date(lead.clickedAt).toLocaleDateString() : '...'}
                                            </span>
                                            <span className="text-xs text-slate-400">
                                                {mounted ? new Date(lead.clickedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <span className="px-2 py-1 rounded-md bg-indigo-50 text-indigo-600 text-xs font-bold">
                                            {lead.program.title}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{lead.referrer.fullName}</p>
                                            <p className="text-xs text-slate-400">{lead.referrer.mobileNumber}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div>
                                            <p className="text-sm font-bold text-slate-700">{lead.visitorMobile}</p>
                                            <p className="text-xs text-slate-400">{lead.visitorName || 'N/A'}</p>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
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
                {filteredLeads.length === 0 && (
                    <div className="p-12 text-center text-slate-400 text-sm font-medium">
                        No leads found matching your filters.
                    </div>
                )}
            </div>
        </div>
    )
}
