'use client'

import { useState, useEffect } from 'react'
import { Plus, MessageSquare, Clock, AlertCircle, CheckCircle2, X, Send, Tag, Calendar, Loader2, Star } from 'lucide-react'
import { createTicket, getUserTickets, rateSupportTicket } from '@/app/ticket-actions'
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

    const loadTickets = async () => {
        const res = await getUserTickets()
        if (res.success) {
            setTickets(res.tickets)
        }
        setIsLoading(false)
    }

    useEffect(() => {
        loadTickets()
    }, [])

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

    const getStatusClasses = (status: string) => {
        switch (status) {
            case 'Open': return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
            case 'In-Progress': return 'bg-amber-500/20 text-amber-400 border-amber-500/30'
            case 'Resolved': return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
            case 'Closed': return 'bg-slate-500/40 text-slate-300 border-slate-500/50'
            default: return 'bg-white/10 text-slate-300 border-white/20'
        }
    }

    const getPriorityClasses = (priority: string) => {
        switch (priority) {
            case 'High': return 'bg-gradient-to-br from-red-500 to-red-600 text-white'
            case 'Urgent': return 'bg-gradient-to-br from-red-600 to-red-900 text-white'
            case 'Medium': return 'bg-gradient-to-br from-amber-500 to-amber-600 text-white'
            case 'Low': return 'bg-gradient-to-br from-emerald-500 to-emerald-600 text-white'
            default: return 'bg-slate-600 text-white'
        }
    }

    return (
        <div className="fixed inset-0 w-full h-[100dvh] overflow-y-auto bg-[#0f172a] z-[100] font-[family-name:var(--font-outfit)] overscroll-y-contain">
            <ScrollLock />
            {/* Force Dark Background Overlay - SAPPHIRE & INDIGO */}
            <div className="absolute inset-0 bg-[#0f172a] -z-10">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-600/10 via-indigo-950/60 to-[#0f172a] z-0 opacity-100" />
            </div>

            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-purple-600/10 rounded-full blur-[120px]" />
            </div>

            {/* Main Content Container - Aggressively Centered for Visible Gaps (Matching Profile) */}
            <PageAnimate className="w-[90%] max-w-lg mx-auto flex flex-col gap-4 relative z-10 top-0">
                {/* SAFE SPACER - Forces content down below fixed headers */}
                <div className="w-full h-32 shrink-0" />

                <PageItem className="!bg-gradient-to-br !from-blue-600 !to-blue-900 border border-white/20 p-6 rounded-[2rem] shadow-2xl flex flex-wrap items-center justify-between gap-4 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 blur-[80px] rounded-full pointer-events-none group-hover:bg-white/20 transition-all duration-1000" />
                    <div className="flex items-center gap-5">
                        <div className="p-4 bg-white/10 rounded-2xl border border-white/10 backdrop-blur-md shadow-2xl">
                            <MessageSquare size={24} className="text-white fill-white/10" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none italic mb-1">Support Desk</h1>
                            <p className="text-[10px] font-black text-blue-100/60 uppercase tracking-widest">Resolution Concierge</p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowNewTicket(true)}
                        className="flex items-center gap-2 px-10 py-5 bg-white text-[#0f172a] rounded-[1.5rem] font-black text-[10px] uppercase tracking-[0.25em] shadow-[0_15px_40px_rgba(255,255,255,0.2)] hover:scale-105 active:scale-95 transition-all relative overflow-hidden group/btn"
                    >
                        <Plus size={18} strokeWidth={4} /> Open Ticket
                    </button>
                </PageItem>

                {/* Premium Stats Cards - Glass Theme - Compacted */}
                <PageItem className="grid grid-cols-3 gap-3">
                    {/* Open */}
                    <div className="!bg-gradient-to-br !from-blue-600/20 !to-blue-900/20 backdrop-blur-3xl p-4 rounded-[1.5rem] border border-blue-400/30 shadow-xl relative overflow-hidden group hover:bg-blue-600/30 transition-all">
                        <div className="flex flex-col items-center justify-center gap-1 relative z-10 text-center">
                            <span className="text-[10px] font-black text-blue-200 uppercase tracking-widest">Open</span>
                            <p className="text-3xl font-black text-white tracking-tighter tabular-nums">{openCount}</p>
                        </div>
                    </div>

                    {/* In-Progress */}
                    <div className="!bg-gradient-to-br !from-amber-600/20 !to-amber-900/20 backdrop-blur-3xl p-4 rounded-[1.5rem] border border-amber-400/30 shadow-xl relative overflow-hidden group hover:bg-amber-600/30 transition-all">
                        <div className="flex flex-col items-center justify-center gap-1 relative z-10 text-center">
                            <span className="text-[10px] font-black text-amber-200 uppercase tracking-widest">Active</span>
                            <p className="text-3xl font-black text-white tracking-tighter tabular-nums">{inProgressCount}</p>
                        </div>
                    </div>

                    {/* Resolved */}
                    <div className="!bg-gradient-to-br !from-emerald-600/20 !to-emerald-900/20 backdrop-blur-3xl p-4 rounded-[1.5rem] border border-emerald-400/30 shadow-xl relative overflow-hidden group hover:bg-emerald-600/30 transition-all">
                        <div className="flex flex-col items-center justify-center gap-1 relative z-10 text-center">
                            <span className="text-[10px] font-black text-emerald-200 uppercase tracking-widest">Done</span>
                            <p className="text-3xl font-black text-white tracking-tighter tabular-nums">{resolvedCount}</p>
                        </div>
                    </div>
                </PageItem>

                {/* Tickets List - Glass Theme */}
                <PageItem className="bg-white/5 backdrop-blur-xl p-6 md:p-8 rounded-[32px] border border-white/10 shadow-xl relative">
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
                                const statusClasses = getStatusClasses(ticket.status)
                                const priorityClasses = getPriorityClasses(ticket.priority)
                                const isResolved = ticket.status === 'Resolved' || ticket.status === 'Closed'
                                const hasRated = !!ticket.rating

                                return (
                                    <div key={ticket.id} className="space-y-3">
                                        <div
                                            onClick={() => setSelectedTicket(ticket)}
                                            className="p-7 !bg-gradient-to-br !from-indigo-950/80 !via-indigo-900/40 !to-blue-900/40 border border-white/10 rounded-2xl hover:border-white/20 hover:shadow-2xl transition-all cursor-pointer group active:scale-[0.98]"
                                        >
                                            <div className="flex justify-between items-start mb-3">
                                                <div className="flex-1">
                                                    <h3 className="text-lg font-bold text-white mb-1.5 group-hover:text-indigo-200 transition-colors">{ticket.subject}</h3>
                                                    <p className="text-sm text-white/60 line-clamp-2">
                                                        {ticket.messages && ticket.messages.length > 0
                                                            ? ticket.messages[ticket.messages.length - 1].message
                                                            : ticket.message}
                                                    </p>
                                                </div>
                                                <div className="flex gap-2 ml-4">
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${priorityClasses}`}
                                                    >
                                                        {ticket.priority}
                                                    </span>
                                                    <span
                                                        className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider border ${statusClasses}`}
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
                                                {isResolved && hasRated && (
                                                    <span className="flex items-center gap-1.5 text-emerald-400 font-bold uppercase tracking-tighter">
                                                        <Star size={14} fill="currentColor" />
                                                        Rated {ticket.rating}/5
                                                    </span>
                                                )}
                                                {ticket.messages && ticket.messages.length > 0 && (
                                                    <span className="ml-auto flex items-center gap-1.5 text-indigo-400 font-bold">
                                                        <MessageSquare size={14} />
                                                        {ticket.messages.length} replies
                                                    </span>
                                                )}
                                            </div>
                                        </div>

                                        {isResolved && !hasRated && (
                                            <CSATRatingCard ticketId={ticket.id} />
                                        )}
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
                                    aria-label="Close Ticket Modal"
                                >
                                    <X size={20} className="text-white" />
                                </button>
                            </div>
                            <div className="p-8 flex flex-col gap-6">
                                <div>
                                    <label htmlFor="ticket-category" className="block text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3">Category</label>
                                    <select
                                        id="ticket-category"
                                        className="w-full px-5 py-4 rounded-xl border border-white/10 bg-white/5 focus:border-indigo-500 focus:bg-white/10 focus:ring-4 focus:ring-indigo-500/20 transition-all text-sm font-bold text-white outline-none"
                                        value={category}
                                        onChange={(e) => setCategory(e.target.value)}
                                        aria-label="Select Ticket Category"
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
                {/* Explicit Bottom Spacer for Mobile Scroll */}
                <div className="h-40 md:h-10 w-full shrink-0" />
            </PageAnimate>
        </div>
    )
}
function CSATRatingCard({ ticketId }: { ticketId: number }) {
    const [rating, setRating] = useState(0)
    const [hover, setHover] = useState(0)
    const [feedback, setFeedback] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [success, setSuccess] = useState(false)

    const handleRate = async () => {
        if (rating === 0 || isSubmitting) return
        setIsSubmitting(true)
        const res = await rateSupportTicket(ticketId, rating, feedback)
        if (res.success) {
            setSuccess(true)
            toast.success('Thank you for your feedback!')
        } else {
            toast.error(res.error || 'Failed to submit rating')
        }
        setIsSubmitting(false)
    }

    if (success) return null

    return (
        <div className="p-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl animate-in slide-in-from-top-2 duration-300">
            <div className="flex flex-col md:flex-row items-center gap-6">
                <div className="flex-1">
                    <h4 className="text-sm font-black text-emerald-400 uppercase tracking-widest mb-1">Rate your experience</h4>
                    <p className="text-[10px] font-bold text-white/50 uppercase tracking-tighter">How was the resolution of this case?</p>
                </div>
                <div className="flex flex-col items-center md:items-end gap-3">
                    <div className="flex gap-1.5">
                        {[1, 2, 3, 4, 5].map((star) => (
                            <button
                                key={star}
                                onMouseEnter={() => setHover(star)}
                                onMouseLeave={() => setHover(0)}
                                onClick={() => setRating(star)}
                                className="transition-all hover:scale-125 active:scale-95"
                                aria-label={`Rate ${star} star${star > 1 ? 's' : ''}`}
                            >
                                <Star
                                    size={24}
                                    className={`${(hover || rating) >= star ? 'text-amber-400 fill-amber-400 shadow-xl' : 'text-white/20'}`}
                                />
                            </button>
                        ))}
                    </div>
                    {rating > 0 && (
                        <div className="flex gap-3 w-full animate-in fade-in duration-300 mt-2">
                            <input
                                placeholder="Any feedback? (optional)"
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-[10px] font-bold text-white outline-none flex-1 min-w-[200px]"
                            />
                            <button
                                onClick={handleRate}
                                disabled={isSubmitting}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                            >
                                {isSubmitting ? '...' : 'Send'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
