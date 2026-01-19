'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Clock, CheckCircle2, AlertCircle, RefreshCw, Ticket, User, Calendar, Tag, Search, Filter } from 'lucide-react'
import { updateTicketStatus } from '@/app/ticket-actions'
import { TicketChatModal } from '@/components/support/ticket-chat-modal'
import { toast } from 'sonner'

interface TicketsClientProps {
    tickets: any[]
    counts: { open: number; inProgress: number; resolved: number }
    role: string
    adminId?: number
}

export function TicketsClient({ tickets, counts, role, adminId }: TicketsClientProps) {
    const router = useRouter()
    const [statusFilter, setStatusFilter] = useState<string>('All')
    const [searchQuery, setSearchQuery] = useState('')
    const [isUpdating, setIsUpdating] = useState(false)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])
    const [selectedTicket, setSelectedTicket] = useState<any>(null)

    const filteredTickets = tickets.filter(t => {
        const matchesStatus = statusFilter === 'All' || t.status === statusFilter
        const matchesSearch = t.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.user?.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
            t.id.toString().includes(searchQuery)
        return matchesStatus && matchesSearch
    })

    const handleStatusUpdate = async (ticketId: number, newStatus: string) => {
        setIsUpdating(true)
        const res = await updateTicketStatus(ticketId, newStatus)
        setIsUpdating(false)
        if (res.success) {
            toast.success(`Ticket marked as ${newStatus}`)
            router.refresh()
        } else {
            toast.error(res.error || 'Failed to update status')
        }
    }

    const getStatusStyles = (status: string) => {
        switch (status) {
            case 'Open': return 'bg-blue-500/10 text-blue-500 border-blue-500/20'
            case 'In-Progress': return 'bg-amber-500/10 text-amber-500 border-amber-500/20'
            case 'Resolved': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
            case 'Closed': return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
            default: return 'bg-gray-500/10 text-gray-400 border-gray-500/20'
        }
    }

    const getPriorityStyles = (priority: string) => {
        switch (priority) {
            case 'Urgent': return 'bg-gradient-to-r from-red-600 to-red-800 text-white'
            case 'High': return 'bg-gradient-to-r from-orange-500 to-red-600 text-white'
            case 'Medium': return 'bg-gradient-to-r from-amber-400 to-orange-500 text-white'
            case 'Low': return 'bg-gradient-to-r from-emerald-400 to-emerald-600 text-white'
            default: return 'bg-gray-500 text-white'
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in duration-700">
            {/* Premium Glass Header */}
            <div className="bg-white/80 backdrop-blur-xl border border-gray-200 p-6 rounded-[2.5rem] shadow-xl shadow-gray-200/50 flex flex-wrap items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-2xl shadow-lg shadow-indigo-500/30">
                        <Ticket size={28} className="text-white" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black italic text-gray-900 tracking-tight uppercase leading-none mb-2">Resolution Center</h1>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                            {role === 'Super Admin' ? 'Governance & Escalations' : `${role} Support Queue`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search tickets, names, IDs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            suppressHydrationWarning
                            className="pl-12 pr-6 py-3.5 bg-gray-50 border border-transparent focus:border-indigo-500 focus:bg-white rounded-2xl text-sm font-bold text-gray-900 transition-all outline-none w-64 shadow-inner"
                        />
                    </div>
                    <button
                        onClick={() => router.refresh()}
                        suppressHydrationWarning
                        className="p-3.5 bg-gray-50 hover:bg-white border border-gray-100 hover:border-indigo-200 rounded-2xl text-gray-400 hover:text-indigo-600 transition-all shadow-sm hover:shadow-md active:scale-95"
                    >
                        <RefreshCw size={20} className={isUpdating ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Performance Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Open', count: counts.open, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-500', shadow: 'shadow-blue-500/20' },
                    { label: 'In-Progress', count: counts.inProgress, icon: AlertCircle, color: 'text-amber-600', bg: 'bg-amber-500', shadow: 'shadow-amber-500/20' },
                    { label: 'Resolved', count: counts.resolved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-500', shadow: 'shadow-emerald-500/20' }
                ].map((stat) => (
                    <button
                        key={stat.label}
                        onClick={() => setStatusFilter(stat.label === 'Resolved' ? 'Resolved' : stat.label)}
                        suppressHydrationWarning
                        className={`group relative overflow-hidden bg-white/80 backdrop-blur-xl border-2 p-8 rounded-[2.5rem] text-left transition-all duration-300 hover:-translate-y-1 ${statusFilter === stat.label || (statusFilter === 'Resolved' && stat.label === 'Resolved')
                            ? 'border-indigo-500 shadow-2xl shadow-indigo-500/10'
                            : 'border-transparent shadow-xl shadow-gray-200/50 hover:border-gray-200'
                            }`}
                    >
                        <stat.icon className={`absolute -right-6 -bottom-6 w-32 h-32 opacity-5 scale-150 rotate-12 transition-transform group-hover:rotate-0`} />
                        <div className="flex flex-col gap-1 relative z-10">
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-gray-400">{stat.label}</span>
                            <div className="flex items-baseline gap-2">
                                <span className="text-5xl font-black italic tracking-tighter text-gray-900">{stat.count}</span>
                                <div className={`w-2 h-2 rounded-full ${stat.bg} animate-pulse`} />
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-4 px-2">
                <div className="flex items-center gap-2 text-gray-400">
                    <Filter size={16} />
                    <span className="text-[10px] font-black uppercase tracking-widest">Filter By</span>
                </div>
                <div className="flex gap-2">
                    {['All', 'Open', 'In-Progress', 'Resolved'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            suppressHydrationWarning
                            className={`px-6 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status
                                ? 'bg-gray-900 text-white shadow-lg'
                                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tickets Grid/List */}
            <div className="space-y-4 pb-20">
                {filteredTickets.length === 0 ? (
                    <div className="bg-white/50 backdrop-blur-sm border-2 border-dashed border-gray-200 rounded-[3rem] py-32 text-center">
                        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <MessageSquare size={40} className="text-gray-300" />
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 uppercase italic tracking-tight">Zone Clear</h3>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mt-2 px-10">No {statusFilter.toLowerCase()} tickets found matching your search</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredTickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className="group relative bg-white/80 backdrop-blur-xl border border-gray-100 p-8 rounded-[2.5rem] hover:border-indigo-300 hover:shadow-2xl hover:shadow-indigo-500/10 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8 active:scale-[0.98]"
                            >
                                <div className="absolute left-0 top-0 w-1.5 h-full opacity-50 group-hover:opacity-100 transition-opacity bg-gradient-to-b from-indigo-500 via-purple-500 to-indigo-500" />

                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg ${getPriorityStyles(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">#{ticket.id}</span>
                                    </div>

                                    <div>
                                        <h3 className="text-2xl font-black italic text-gray-900 group-hover:text-indigo-600 transition-colors uppercase tracking-tight line-clamp-1">{ticket.subject}</h3>
                                        <p className="text-sm font-medium text-gray-500 line-clamp-2 mt-1 leading-relaxed">{ticket.message}</p>
                                    </div>

                                    <div className="flex flex-wrap gap-6 items-center pt-2">
                                        <div className="flex items-center gap-2 group/user bg-gray-50 px-3 py-1.5 rounded-xl border border-gray-100">
                                            <div className="w-6 h-6 bg-gray-900 rounded-lg flex items-center justify-center">
                                                <User size={12} className="text-white" />
                                            </div>
                                            <span className="text-[11px] font-black uppercase tracking-tighter text-gray-900">{ticket.user?.fullName}</span>
                                            <span className="text-[10px] font-bold text-violet-600/60 uppercase">{ticket.user?.role}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Tag size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{ticket.category}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Calendar size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {mounted ? new Date(ticket.createdAt).toLocaleDateString() : 'Loading...'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-10">
                                    {ticket.status === 'Open' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(ticket.id, 'In-Progress') }}
                                            disabled={isUpdating}
                                            suppressHydrationWarning
                                            className="px-6 py-4 bg-gray-900 text-white rounded-2xl font-black italic text-xs uppercase tracking-[0.2em] shadow-xl hover:shadow-indigo-500/20 hover:-translate-y-1 transition-all"
                                        >
                                            🚀 Engage
                                        </button>
                                    )}
                                    {ticket.status === 'In-Progress' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(ticket.id, 'Resolved') }}
                                            disabled={isUpdating}
                                            suppressHydrationWarning
                                            className="px-6 py-4 bg-emerald-600 text-white rounded-2xl font-black italic text-xs uppercase tracking-[0.2em] shadow-xl hover:shadow-emerald-500/20 hover:-translate-y-1 transition-all"
                                        >
                                            ✅ Finalize
                                        </button>
                                    )}
                                    <div className="p-4 bg-gray-50 rounded-2xl text-indigo-600 group-hover:scale-110 transition-transform">
                                        <MessageSquare size={24} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Chat Modal */}
            {selectedTicket && (
                <TicketChatModal
                    ticket={selectedTicket}
                    currentUserType="Admin"
                    currentUserId={adminId || 0}
                    onClose={() => {
                        setSelectedTicket(null)
                        router.refresh()
                    }}
                />
            )}
        </div>
    )
}

