'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Clock, CheckCircle2, AlertCircle, RefreshCw, Ticket, User, Calendar, Tag, Search, Filter, Shield } from 'lucide-react'
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
            case 'Open': return 'bg-blue-50 text-blue-700 border-blue-200'
            case 'In-Progress': return 'bg-amber-50 text-amber-700 border-amber-200'
            case 'Resolved': return 'bg-emerald-50 text-emerald-700 border-emerald-200'
            case 'Closed': return 'bg-gray-100 text-gray-700 border-gray-200'
            default: return 'bg-gray-50 text-gray-600 border-gray-100'
        }
    }

    const getPriorityStyles = (priority: string) => {
        switch (priority) {
            case 'Urgent': return 'bg-red-600 text-white'
            case 'High': return 'bg-red-100 text-red-700 border border-red-200'
            case 'Medium': return 'bg-gray-900 text-white'
            case 'Low': return 'bg-gray-100 text-gray-700 border border-gray-200'
            default: return 'bg-gray-50 text-gray-500'
        }
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            {/* Super Admin Classic Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 bg-white/80 backdrop-blur-md p-8 rounded-[40px] border border-white/50 shadow-xl shadow-gray-200/50">
                <div className="flex items-center gap-5">
                    <div className="p-4 bg-gray-900 text-white rounded-[20px] shadow-lg shadow-gray-200 border border-gray-800">
                        <Ticket size={28} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tighter uppercase italic leading-none mb-1">Resolution Center</h1>
                        <p className="text-[11px] text-gray-400 font-black uppercase tracking-[0.2em] font-mono">
                            {role === 'Super Admin' ? 'Governance & Escalations' : `${role} Support Queue`}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative group">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-900 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder="Search tickets, names, IDs..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            suppressHydrationWarning
                            className="pl-12 pr-6 py-4 bg-gray-50/50 border border-gray-100 focus:border-red-200 focus:bg-white rounded-2xl text-sm font-bold text-gray-900 transition-all outline-none md:w-72 shadow-inner"
                        />
                    </div>
                    <button
                        onClick={() => router.refresh()}
                        suppressHydrationWarning
                        className="p-4 bg-white border border-gray-100 text-gray-400 hover:text-gray-900 rounded-2xl transition-all shadow-sm hover:shadow-md active:scale-95"
                        aria-label="Refresh ticket queue"
                    >
                        <RefreshCw size={20} className={isUpdating ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            {/* Classic Metric Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {[
                    { label: 'Open', count: counts.open, icon: Clock, color: 'text-blue-600', ring: 'ring-blue-100', bg: 'bg-blue-50' },
                    { label: 'In-Progress', count: counts.inProgress, icon: AlertCircle, color: 'text-amber-600', ring: 'ring-amber-100', bg: 'bg-amber-50' },
                    { label: 'Resolved', count: counts.resolved, icon: CheckCircle2, color: 'text-emerald-600', ring: 'ring-emerald-100', bg: 'bg-emerald-50' }
                ].map((stat) => (
                    <button
                        key={stat.label}
                        onClick={() => setStatusFilter(stat.label === 'Resolved' ? 'Resolved' : stat.label)}
                        suppressHydrationWarning
                        className={`group relative bg-white/80 backdrop-blur-md p-8 rounded-[40px] border transition-all duration-300 ${statusFilter === stat.label || (statusFilter === 'Resolved' && stat.label === 'Resolved')
                            ? 'border-gray-900 shadow-2xl shadow-gray-200 scale-[1.02]'
                            : 'border-white/50 shadow-xl shadow-gray-200/30 hover:shadow-gray-200/50 hover:border-gray-200'
                            }`}
                    >
                        <div className="flex items-center gap-4 relative z-10">
                            <div className={`p-3 rounded-2xl ${stat.bg} ${stat.color} ring-4 ${stat.ring}`}>
                                <stat.icon size={24} strokeWidth={2.5} />
                            </div>
                            <div>
                                <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{stat.label}</p>
                                <p className="text-4xl font-black text-gray-900 tracking-tighter italic">{stat.count}</p>
                            </div>
                        </div>
                    </button>
                ))}
            </div>

            {/* Neat Filter Scope */}
            <div className="flex items-center gap-4 px-2">
                <div className="flex items-center gap-2 text-gray-400">
                    <Filter size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest text-gray-400/60">Protocol Scope</span>
                </div>
                <div className="flex gap-2">
                    {['All', 'Open', 'In-Progress', 'Resolved'].map(status => (
                        <button
                            key={status}
                            onClick={() => setStatusFilter(status)}
                            suppressHydrationWarning
                            className={`px-6 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${statusFilter === status
                                ? 'bg-gray-900 text-white shadow-lg'
                                : 'bg-white border border-gray-100 text-gray-400 hover:bg-gray-50'
                                }`}
                        >
                            {status}
                        </button>
                    ))}
                </div>
            </div>

            {/* Classic Ticket List */}
            <div className="space-y-4">
                {filteredTickets.length === 0 ? (
                    <div className="bg-white/40 backdrop-blur-sm border-2 border-dashed border-gray-200 rounded-[40px] py-24 text-center">
                        <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-sm">
                            <MessageSquare size={24} className="text-gray-200" />
                        </div>
                        <h3 className="text-xl font-black text-gray-900 uppercase italic tracking-tight">Queue Clear</h3>
                        <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-2">No items matching current scope</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {filteredTickets.map((ticket) => (
                            <div
                                key={ticket.id}
                                onClick={() => setSelectedTicket(ticket)}
                                className="group relative bg-white/70 backdrop-blur-md border border-white/50 p-8 rounded-[40px] hover:bg-white/95 hover:shadow-2xl hover:shadow-gray-200/50 transition-all duration-300 cursor-pointer overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-8 active:scale-[0.99]"
                            >
                                <div className="absolute left-0 top-0 w-2 h-full bg-gray-900/5 group-hover:bg-red-600 transition-colors" />

                                <div className="flex-1 space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${getStatusStyles(ticket.status)}`}>
                                            {ticket.status}
                                        </span>
                                        <span className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest shadow-sm ${getPriorityStyles(ticket.priority)}`}>
                                            {ticket.priority}
                                        </span>
                                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">#TCK-{ticket.id.toString().padStart(4, '0')}</span>
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-gray-900 group-hover:text-red-700 transition-colors uppercase tracking-tight italic line-clamp-1">{ticket.subject}</h3>
                                        <p className="text-sm font-bold text-gray-500 line-clamp-1 mt-1 leading-relaxed">{ticket.message}</p>
                                    </div>
                                    <div className="flex flex-wrap gap-8 items-center pt-2">
                                        <div className="flex items-center gap-3 group/user bg-gray-50 px-4 py-2 rounded-2xl border border-gray-100 shadow-sm">
                                            <div className="w-8 h-8 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm">
                                                <User size={14} className="text-gray-900" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[11px] font-black uppercase tracking-tighter text-gray-900 leading-none">{ticket.user?.fullName}</span>
                                                <div className="flex gap-2 items-center mt-1">
                                                    <a 
                                                        href={`tel:${ticket.user?.mobileNumber}`}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-[10px] font-bold text-gray-400 hover:text-red-600 transition-colors"
                                                    >
                                                        {ticket.user?.mobileNumber}
                                                    </a>
                                                    <span className="w-1 h-1 bg-gray-200 rounded-full" />
                                                    <a 
                                                        href={`https://wa.me/${ticket.user?.mobileNumber?.replace(/\D/g, '')}`}
                                                        target="_blank"
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="text-[10px] font-bold text-emerald-500 hover:text-emerald-600 transition-colors"
                                                    >
                                                        WhatsApp
                                                    </a>
                                                </div>
                                            </div>
                                            <span className="ml-2 px-2 py-0.5 bg-gray-900 text-white text-[8px] font-black uppercase rounded-lg">{ticket.user?.role}</span>
                                        </div>
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Tag size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">{ticket.category}</span>
                                        </div>
                                        {ticket.assignedAdmin && (
                                            <div className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-100 shadow-sm">
                                                <Shield size={12} className="text-blue-600" />
                                                <span className="text-[10px] font-black uppercase tracking-tighter text-blue-700">
                                                    Handled By: {ticket.assignedAdmin.adminName}
                                                </span>
                                            </div>
                                        )}
                                        {!ticket.assignedAdmin && ticket.status !== 'Open' && (
                                            <div className="flex items-center gap-2 bg-gray-100 px-3 py-1.5 rounded-xl border border-gray-200">
                                                <div className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-tighter text-gray-500">
                                                    Self-Assigned Required
                                                </span>
                                            </div>
                                        )}
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Calendar size={16} />
                                            <span className="text-[10px] font-black uppercase tracking-widest">
                                                {mounted ? new Date(ticket.createdAt).toLocaleDateString() : '...'}
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
                                            className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-red-100 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Engage Hub
                                        </button>
                                    )}
                                    {ticket.status === 'In-Progress' && (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); handleStatusUpdate(ticket.id, 'Resolved') }}
                                            disabled={isUpdating}
                                            suppressHydrationWarning
                                            className="px-8 py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-gray-200 hover:scale-105 active:scale-95 transition-all"
                                        >
                                            Resolve TCK
                                        </button>
                                    )}
                                    <div className="p-4 bg-gray-50 rounded-2xl text-gray-400 group-hover:text-red-600 group-hover:bg-red-50 transition-all border border-gray-100 shadow-inner">
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
