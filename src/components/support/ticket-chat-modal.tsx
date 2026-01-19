'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, User, Shield, Loader2, Clock, AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react'
import { addTicketMessage, getTicketMessages, escalateTicket } from '@/app/ticket-actions'
import { toast } from 'sonner'

interface Message {
    id: number
    senderType: string
    senderId: number
    message: string
    createdAt: Date | string
    isInternal?: boolean
}

interface Ticket {
    id: number
    subject: string
    status: string
    messages: Message[]
    escalationLevel?: number
}

interface TicketChatModalProps {
    ticket: Ticket
    currentUserType: 'User' | 'Admin'
    currentUserId: number
    onClose: () => void
    onStatusChange?: (status: string) => void
}

export function TicketChatModal({ ticket, currentUserType, currentUserId, onClose, onStatusChange }: TicketChatModalProps) {
    const [mounted, setMounted] = useState(false)
    const [newMessage, setNewMessage] = useState('')

    useEffect(() => {
        setMounted(true)
    }, [])
    const [isSending, setIsSending] = useState(false)
    const [messages, setMessages] = useState<Message[]>(ticket.messages || [])
    const messagesEndRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    useEffect(() => {
        const pollMessages = async () => {
            if (ticket.status === 'Resolved' || ticket.status === 'Closed') return

            const result = await getTicketMessages(ticket.id)
            if (result.success && result.messages) {
                setMessages(prev => {
                    if (result.messages && result.messages.length > prev.length) {
                        return result.messages
                    }
                    return prev
                })

                if (result.status && result.status !== ticket.status && onStatusChange) {
                    onStatusChange(result.status)
                }
            }
        }

        const intervalId = setInterval(pollMessages, 4000)
        return () => clearInterval(intervalId)
    }, [ticket.id, ticket.status, onStatusChange])

    const handleSend = async () => {
        if (!newMessage.trim() || isSending) return

        setIsSending(true)
        const optimisticMsg: Message = {
            id: Date.now(),
            senderType: currentUserType,
            senderId: currentUserId,
            message: newMessage,
            createdAt: new Date().toISOString()
        }

        setMessages(prev => [...prev, optimisticMsg])
        setNewMessage('')

        const result = await addTicketMessage(ticket.id, optimisticMsg.message)

        if (!result.success) {
            toast.error(result.error || 'Failed to send message')
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
        }
        setIsSending(false)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleEscalate = async () => {
        if (currentUserType !== 'Admin') return
        const reason = prompt('Escalation Reason:')
        if (!reason) return

        const result = await escalateTicket(ticket.id, reason)
        if (result.success) {
            toast.success(`Ticket escalated to Level ${result.level}`)
        } else {
            toast.error(result.error || 'Escalation failed')
        }
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-gray-900/60 backdrop-blur-md" onClick={onClose} />

            <div className="relative w-full max-w-2xl h-[85vh] bg-white rounded-[3rem] shadow-2xl shadow-black/20 flex flex-col overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="bg-gray-900 px-8 py-6 flex items-center justify-between border-b border-white/10">
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${ticket.status === 'Open' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' :
                                ticket.status === 'Resolved' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                    'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                }`}>
                                {ticket.status}
                            </span>
                            <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Case #{ticket.id}</span>
                        </div>
                        <h2 className="text-xl font-black italic text-white uppercase tracking-tight line-clamp-1">{ticket.subject}</h2>
                        {ticket.escalationLevel && ticket.escalationLevel > 1 && (
                            <div className="flex items-center gap-2">
                                <span className="bg-red-500 text-[9px] font-black italic text-white px-2 py-0.5 rounded-full uppercase tracking-widest animate-pulse">
                                    🔥 Priority Level {ticket.escalationLevel}
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="flex gap-3">
                        {currentUserType === 'Admin' && (!ticket.escalationLevel || ticket.escalationLevel < 4) && (
                            <button
                                onClick={handleEscalate}
                                suppressHydrationWarning
                                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-[10px] font-black uppercase italic tracking-widest text-white rounded-2xl transition-all hover:scale-105"
                            >
                                Escalate
                            </button>
                        )}
                        <button onClick={onClose} suppressHydrationWarning className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all">
                            <X size={20} />
                        </button>
                    </div>
                </div>

                {/* Messages */}
                <div className="flex-1 bg-gray-50/50 overflow-y-auto p-8 space-y-6">
                    <div className="flex justify-center mb-8">
                        <div className="bg-indigo-100/50 backdrop-blur-sm border border-indigo-200 px-6 py-2 rounded-2xl flex items-center gap-3">
                            <Shield size={14} className="text-indigo-600" />
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-700">Encrypted Communication Protocol Active</span>
                        </div>
                    </div>

                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-48 text-gray-400 space-y-4">
                            <MessageSquare size={48} className="opacity-20 translate-y-2" />
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] italic">Awaiting Initiation</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => {
                        const isMe = msg.senderType === currentUserType
                        const isAdmin = msg.senderType === 'Admin'

                        return (
                            <div key={idx} className={`flex ${isMe ? 'justify-end' : 'justify-start'} w-full group animate-in slide-in-from-bottom-2 duration-300`}>
                                <div className={`flex flex-col max-w-[85%] ${isMe ? 'items-end' : 'items-start'}`}>
                                    <div className="flex items-center gap-2 mb-1.5 px-2">
                                        {!isMe && (
                                            <div className={`p-1 rounded-lg ${isAdmin ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                                                {isAdmin ? <Shield size={10} strokeWidth={3} /> : <User size={10} strokeWidth={3} />}
                                            </div>
                                        )}
                                        <span className={`text-[10px] font-black uppercase tracking-tighter ${isMe ? 'text-gray-400' : isAdmin ? 'text-red-600' : 'text-indigo-600'}`}>
                                            {isMe ? 'Authorized Agent' : isAdmin ? 'Support Executive' : 'Originator'}
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-300">
                                            {mounted ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </span>
                                    </div>

                                    <div className={`px-6 py-4 rounded-[2rem] text-sm font-bold leading-relaxed shadow-sm border ${isMe
                                        ? 'bg-gray-900 text-white border-transparent rounded-tr-none'
                                        : 'bg-white text-gray-900 border-gray-100 rounded-tl-none shadow-blue-500/5'
                                        }`}>
                                        {msg.message}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Footer/Input */}
                <div className="p-8 bg-white border-t border-gray-100">
                    <div className="relative flex items-end gap-4">
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            suppressHydrationWarning
                            placeholder={ticket.status === 'Resolved' ? "Case is closed." : "Protocol update..."}
                            disabled={ticket.status === 'Resolved' || ticket.status === 'Closed' || isSending}
                            className="flex-1 bg-gray-50 border-2 border-transparent focus:border-indigo-500 focus:bg-white rounded-[2rem] px-8 py-5 text-sm font-bold text-gray-900 outline-none transition-all resize-none shadow-inner min-h-[70px] max-h-[150px]"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!newMessage.trim() || isSending || ticket.status === 'Resolved'}
                            suppressHydrationWarning
                            className={`w-[70px] h-[70px] rounded-[2rem] flex items-center justify-center transition-all shadow-lg active:scale-90 ${!newMessage.trim() || isSending || ticket.status === 'Resolved'
                                ? 'bg-gray-100 text-gray-300 pointer-events-none shadow-none'
                                : 'bg-gray-900 text-white hover:bg-black hover:shadow-indigo-500/20'
                                }`}
                        >
                            {isSending ? <Loader2 size={24} className="animate-spin" /> : <Send size={24} className="translate-x-0.5 -translate-y-0.5" />}
                        </button>
                    </div>
                    {ticket.status === 'Resolved' && (
                        <div className="mt-6 flex items-center justify-center gap-3 py-3 bg-emerald-50 rounded-2xl border border-emerald-100">
                            <CheckCircle2 size={16} className="text-emerald-600" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-700 italic">
                                Case successfully closed. Protocol finalized.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
