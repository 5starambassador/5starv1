'use client'

import { useState, useEffect } from 'react'
import { Plus, MessageSquare, Clock, AlertCircle, CheckCircle2, X, Send, Tag, Calendar, Loader2 } from 'lucide-react'
import { createTicket, getUserTickets } from '@/app/ticket-actions'
import { TicketChatModal } from '@/components/support/ticket-chat-modal'
import { toast } from 'sonner'
import { PageAnimate, PageItem } from '@/components/PageAnimate'
import { ScrollLock } from '@/components/ui/ScrollLock'

export default function SupportPage() {
    const [tickets, setTickets] = useState<any[]>([])
    const [isLoading, setIsLoading] = useState(true)
    const [showNewTicket, setShowNewTicket] = useState(false)
    const [selectedTicket, setSelectedTicket] = useState<any>(null)
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [category, setCategory] = useState('Technical Issue')
    const [isSubmitting, setIsSubmitting] = useState(false)

    useEffect(() => {
        loadTickets()
    }, [])

    const loadTickets = async () => {
        const res = await getUserTickets()
        if (res.success) {
            setTickets(res.tickets)
        }
        setIsLoading(false)
    }

    const handleSubmit = async () => {
        if (!subject.trim() || !message.trim()) {
            toast.error('Please fill in all fields')
            return
        }

        setIsSubmitting(true)
        const result = await createTicket({ subject, message, category })
        setIsSubmitting(false)

        if (result.success) {
            setShowNewTicket(false)
            setSubject('')
            setMessage('')
            setCategory('Technical Issue')
            loadTickets()
            toast.success('Ticket submitted successfully!')
        } else {
            toast.error(result.error || 'Failed to submit ticket')
        }
    }

    const openCount = tickets.filter(t => t.status === 'Open').length
    const inProgressCount = tickets.filter(t => t.status === 'In-Progress').length
    const resolvedCount = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return { bg: 'rgba(59, 130, 246, 0.2)', text: '#60A5FA', border: 'rgba(59, 130, 246, 0.3)' }
            case 'In-Progress': return { bg: 'rgba(245, 158, 11, 0.2)', text: '#FBBF24', border: 'rgba(245, 158, 11, 0.3)' }
            case 'Resolved': return { bg: 'rgba(16, 185, 129, 0.2)', text: '#34D399', border: 'rgba(16, 185, 129, 0.3)' }
            case 'Closed': return { bg: 'rgba(75, 85, 99, 0.4)', text: '#D1D5DB', border: 'rgba(75, 85, 99, 0.5)' }
            default: return { bg: 'rgba(255, 255, 255, 0.1)', text: '#D1D5DB', border: 'rgba(255, 255, 255, 0.2)' }
        }
    }

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'High': return { bg: 'linear-gradient(135deg, #EF4444, #DC2626)', text: 'white' }
            case 'Urgent': return { bg: 'linear-gradient(135deg, #DC2626, #991B1B)', text: 'white' }
            case 'Medium': return { bg: 'linear-gradient(135deg, #F59E0B, #D97706)', text: 'white' }
            case 'Low': return { bg: 'linear-gradient(135deg, #10B981, #059669)', text: 'white' }
            default: return { bg: '#4B5563', text: 'white' }
        }
    }

    return (
        <div className="fixed inset-0 w-full h-full overflow-y-auto bg-[#0f172a] z-[100] font-[family-name:var(--font-outfit)] overscroll-y-contain">
            <ScrollLock />
            {/* Force Dark Background Overlay */}
            {/* Force Dark Background Overlay */}
            <div className="absolute inset-0 bg-[#0f172a] -z-10">
                {/* Brightness Booster Layer - Increased Intensity */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/40 via-slate-900/60 to-slate-900 z-0 opacity-100" />
            </div>

            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
            </div>

            {/* Main Content Container - Aggressively Centered for Visible Gaps (Matching Profile) */}
            <PageAnimate className="w-[90%] max-w-lg mx-auto flex flex-col gap-4 pb-64 relative z-10 top-0">
                {/* SAFE SPACER - Forces content down below fixed headers */}
                <div className="w-full h-14 shrink-0" />

                {/* Premium Header - Glass Theme - Compacted */}
                <PageItem className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 rounded-[24px] shadow-2xl flex flex-wrap items-center justify-between gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 opacity-50 group-hover:opacity-100 transition-opacity"></div>
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl shadow-lg shadow-indigo-500/30 group-hover:scale-110 transition-transform">
                            <MessageSquare size={20} className="text-white" />
                        </div>
                        <div>
                            <h1 className="text-3xl font-black text-white tracking-tight uppercase leading-none mb-2">Support Desk</h1>
                            <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest">Concierge assistance for your account</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowNewTicket(true)}
                        className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-[0.2em] shadow-xl hover:shadow-indigo-500/40 hover:-translate-y-0.5 active:translate-y-0 transition-all border border-indigo-400/30"
                    >
                        <Plus size={18} strokeWidth={3} /> New Ticket
                    </button>
                </PageItem>

                {/* Premium Stats Cards - Glass Theme - Compacted */}
                <PageItem className="grid grid-cols-3 gap-3">
                    {/* Open */}
                    <div className="bg-white/5 backdrop-blur-lg p-3 rounded-[20px] border border-white/10 shadow-xl relative overflow-hidden group hover:bg-white/10 transition-colors">
                        <div className="absolute -right-4 -bottom-4 bg-blue-500/20 w-32 h-32 rounded-full blur-2xl group-hover:bg-blue-500/30 transition-colors" />
                        <div className="flex flex-col items-center justify-center gap-1 relative z-10 text-center">
                            <span className="text-[9px] font-black text-blue-200 uppercase tracking-wider">Open</span>
                            <p className="text-2xl font-black text-white tracking-tighter">{openCount}</p>
                        </div>
                    </div>

                    {/* In-Progress */}
                    <div className="bg-white/5 backdrop-blur-lg p-3 rounded-[20px] border border-white/10 shadow-xl relative overflow-hidden group hover:bg-white/10 transition-colors">
                        <div className="absolute -right-4 -bottom-4 bg-amber-500/20 w-32 h-32 rounded-full blur-2xl group-hover:bg-amber-500/30 transition-colors" />
                        <div className="flex flex-col items-center justify-center gap-1 relative z-10 text-center">
                            <span className="text-[9px] font-black text-amber-200 uppercase tracking-wider">Active</span>
                            <p className="text-2xl font-black text-white tracking-tighter">{inProgressCount}</p>
                        </div>
                    </div>

                    {/* Resolved */}
                    <div className="bg-white/5 backdrop-blur-lg p-3 rounded-[20px] border border-white/10 shadow-xl relative overflow-hidden group hover:bg-white/10 transition-colors">
                        <div className="absolute -right-4 -bottom-4 bg-emerald-500/20 w-32 h-32 rounded-full blur-2xl group-hover:bg-emerald-500/30 transition-colors" />
                        <div className="flex flex-col items-center justify-center gap-1 relative z-10 text-center">
                            <span className="text-[9px] font-black text-emerald-200 uppercase tracking-wider">Done</span>
                            <p className="text-2xl font-black text-white tracking-tighter">{resolvedCount}</p>
                        </div>
                    </div>
                </PageItem>

                {/* Tickets List - Glass Theme */}
                <PageItem className="bg-white/5 backdrop-blur-xl p-8 rounded-[32px] border border-white/10 shadow-xl overflow-hidden relative">
                    <div className="flex justify-between items-center mb-8 border-b border-white/10 pb-6">
                        <div>
                            <h2 className="text-xl font-black text-white tracking-tight uppercase">Support Queue</h2>
                            <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mt-1">Active Tickets</p>
                        </div>
                    </div>

                    {tickets.length === 0 ? (
                        <div className="text-center py-16 opacity-50">
                            <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6 border border-white/10">
                                <MessageSquare size={36} className="text-white/40" />
                            </div>
                            <h3 className="text-lg font-black text-white uppercase mb-2">No active tickets</h3>
                            <p className="text-xs font-bold text-white/40 uppercase tracking-widest">Our team is standing by to help</p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-4">
                            {tickets.map((ticket) => {
                                const statusStyle = getStatusColor(ticket.status)
                                const priorityStyle = getPriorityStyle(ticket.priority)

                                return (
                                    <div
                                        key={ticket.id}
                                        onClick={() => setSelectedTicket(ticket)}
                                        className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:bg-white/10 hover:border-white/20 hover:shadow-xl transition-all cursor-pointer group"
                                    >
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div style={{ flex: 1 }}>
                                                <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-indigo-200 transition-colors">{ticket.subject}</h3>
                                                <p className="text-sm text-white/60 line-clamp-2">
                                                    {ticket.messages && ticket.messages.length > 0
                                                        ? ticket.messages[ticket.messages.length - 1].message
                                                        : ticket.message}
                                                </p>
                                            </div>
                                            <div className="flex gap-2 ml-4">
                                                <span
                                                    className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
                                                    style={{ background: priorityStyle.bg, color: priorityStyle.text }}
                                                >
                                                    {ticket.priority}
                                                </span>
                                                <span
                                                    className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border"
                                                    style={{ background: statusStyle.bg, color: statusStyle.text, borderColor: statusStyle.border }}
                                                >
                                                    {ticket.status}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex gap-5 text-xs text-white/40 mt-4 pt-4 border-t border-white/5">
                                            <span className="flex items-center gap-1.5">
                                                <Tag size={14} />
                                                {ticket.category}
                                            </span>
                                            <span className="flex items-center gap-1.5">
                                                <Calendar size={14} />
                                                {new Date(ticket.createdAt).toLocaleDateString()}
                                            </span>
                                            {ticket.messages && ticket.messages.length > 0 && (
                                                <span className="ml-auto flex items-center gap-1.5 text-indigo-400 font-bold">
                                                    <MessageSquare size={14} />
                                                    {ticket.messages.length} replies
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </PageItem>

                {/* New Ticket Modal - Dark Theme */}
                {showNewTicket && (
                    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="bg-[#0f172a] w-full max-w-lg rounded-[32px] border border-white/20 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
                            <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-8 flex justify-between items-start">
                                <div>
                                    <h2 className="text-2xl font-black text-white uppercase tracking-tight">Raise Support Ticket</h2>
                                    <p className="text-xs font-bold text-white/70 uppercase tracking-widest mt-2">Personal concierge assistance</p>
                                </div>
                                <button
                                    onClick={() => setShowNewTicket(false)}
                                    className="p-2 bg-white/20 hover:bg-white/30 rounded-xl transition-colors"
                                >
                                    <X size={20} className="text-white" />
                                </button>
                            </div>
                            <div className="p-8 flex flex-col gap-6">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Category</label>
                                    <select
                                        className="w-full px-5 py-4 rounded-xl border border-white/10 bg-white/5 focus:border-indigo-500 focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/20 transition-all text-sm font-bold text-white outline-none"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                    >
                                        <option className="bg-slate-900 text-white">Technical Issue</option>
                                        <option className="bg-slate-900 text-white">Benefit Discrepancy</option>
                                        <option className="bg-slate-900 text-white">Referral Not Showing</option>
                                        <option className="bg-slate-900 text-white">Profile Update Request</option>
                                        <option className="bg-slate-900 text-white">Fee / Payment Query</option>
                                        <option className="bg-slate-900 text-white">Ambassador Program Help</option>
                                        <option className="bg-slate-900 text-white">Login / Account Issue</option>
                                        <option className="bg-slate-900 text-white">General Inquiry</option>
                                        <option className="bg-slate-900 text-white">Feedback & Suggestions</option>
                                        <option className="bg-slate-900 text-white">Other</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Subject</label>
                                    <input
                                        type="text"
                                        placeholder="Executive summary of the issue"
                                        className="w-full px-5 py-4 rounded-xl border border-white/10 bg-white/5 focus:border-indigo-500 focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/20 transition-all text-sm font-bold text-white outline-none placeholder:text-white/20"
                                        value={subject}
                                        onChange={(e) => setSubject(e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Message</label>
                                    <textarea
                                        placeholder="Detail your request here..."
                                        className="w-full px-5 py-4 rounded-xl border border-white/10 bg-white/5 focus:border-indigo-500 focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/20 transition-all text-sm font-bold text-white outline-none placeholder:text-white/20 min-h-[120px] resize-none"
                                        value={message}
                                        onChange={(e) => setMessage(e.target.value)}
                                    ></textarea>
                                </div>
                                <div className="flex gap-4 mt-2">
                                    <button
                                        onClick={() => setShowNewTicket(false)}
                                        disabled={isSubmitting}
                                        className="flex-1 py-4 px-6 rounded-2xl border border-white/10 font-black text-xs uppercase tracking-widest text-gray-400 hover:bg-white/5 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="flex-1 py-4 px-6 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:bg-indigo-500 hover:shadow-indigo-600/30 hover:-translate-y-0.5 transition-all disabled:opacity-50 border border-indigo-400/30"
                                    >
                                        {isSubmitting ? (
                                            <div className="flex items-center justify-center gap-2">
                                                <Loader2 size={16} className="animate-spin" />
                                                <span>Sending...</span>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-center gap-2">
                                                <Send size={16} />
                                                <span>Submit Ticket</span>
                                            </div>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Chat Modal */}
                {selectedTicket && (
                    <TicketChatModal
                        ticket={selectedTicket}
                        currentUserType="User"
                        currentUserId={0} // Passed as 0, backend uses auth context if needed, or this is just for display logic in modal
                        onClose={() => {
                            setSelectedTicket(null)
                            loadTickets()
                        }}
                    />
                )}
            </PageAnimate>
        </div>
    )
}
