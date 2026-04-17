'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, User, Shield, Loader2, Clock, AlertTriangle, CheckCircle2, MessageSquare } from 'lucide-react'
import { addTicketMessage, getTicketMessages, escalateTicket, getSupportSnippets } from '@/app/ticket-actions'
import { toast } from 'sonner'
import { PromptDialog } from '../ui/PromptDialog'
import { FileText, ChevronDown, Paperclip, ImageIcon, FileIcon, Trash2 } from 'lucide-react'

interface Message {
    id: number
    senderType: string
    senderId: number
    message: string
    createdAt: Date | string
    isInternal?: boolean
    attachmentUrl?: string | null
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
    const [isInternal, setIsInternal] = useState(false)
    const [showEscalatePrompt, setShowEscalatePrompt] = useState(false)
    const [snippets, setSnippets] = useState<any[]>([])
    const [showSnippets, setShowSnippets] = useState(false)
    const [selectedFile, setSelectedFile] = useState<File | null>(null)
    const [filePreview, setFilePreview] = useState<string | null>(null)
    const fileInputRef = useRef<HTMLInputElement>(null)

    useEffect(() => {
        if (currentUserType === 'Admin') {
            getSupportSnippets().then(res => {
                if (res.success) setSnippets(res.snippets || [])
            })
        }
    }, [currentUserType])

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
        let pollingInterval = 10000 // Default 10s
        let intervalId: NodeJS.Timeout

        const updatePolling = () => {
            clearInterval(intervalId)
            // Active: 3s if window is focused, else 30s
            const ms = document.hasFocus() ? 3000 : 30000
            intervalId = setInterval(pollMessages, ms)
        }

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

        // Listen for focus changes to adapt polling
        window.addEventListener('focus', updatePolling)
        window.addEventListener('blur', updatePolling)

        // Initial start
        updatePolling()

        return () => {
            clearInterval(intervalId)
            window.removeEventListener('focus', updatePolling)
            window.removeEventListener('blur', updatePolling)
        }
    }, [ticket.id, ticket.status, onStatusChange])

    const handleSend = async () => {
        if (!newMessage.trim() || isSending) return

        setIsSending(true)
        const attachmentUrl = selectedFile ? URL.createObjectURL(selectedFile) : null // This needs to be handled properly for actual upload
        const attachmentUrlFinal = attachmentUrl || undefined

        const optimisticMsg: Message = {
            id: Date.now(),
            senderType: currentUserType,
            senderId: currentUserId,
            message: newMessage,
            isInternal,
            createdAt: new Date().toISOString(),
            attachmentUrl: attachmentUrlFinal
        }

        setMessages(prev => [...prev, optimisticMsg])
        setNewMessage('')
        setSelectedFile(null)
        setFilePreview(null)

        const result = await addTicketMessage(ticket.id, optimisticMsg.message, isInternal, attachmentUrlFinal)

        if (!result.success) {
            toast.error(result.error || 'Failed to send message')
            setMessages(prev => prev.filter(m => m.id !== optimisticMsg.id))
        }
        setIsSending(false)
    }

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (file) {
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File too large (Max 5MB)')
                return
            }
            setSelectedFile(file)
            if (file.type.startsWith('image/')) {
                const reader = new FileReader()
                reader.onloadend = () => setFilePreview(reader.result as string)
                reader.readAsDataURL(file)
            } else {
                setFilePreview(null)
            }
        }
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleEscalate = async () => {
        if (currentUserType !== 'Admin') return
        setShowEscalatePrompt(true)
    }

    const confirmEscalate = async (reason: string) => {
        setShowEscalatePrompt(false)
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
                        <button onClick={onClose} suppressHydrationWarning className="p-3 bg-white/10 hover:bg-white/20 rounded-2xl text-white transition-all" aria-label="Close chat">
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
                        const isInternalNote = msg.isInternal

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
                                            {isInternalNote && <span className="ml-2 text-amber-500 font-bold">[Internal Note]</span>}
                                        </span>
                                        <span className="text-[9px] font-bold text-gray-300">
                                            {mounted ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : '--:--'}
                                        </span>
                                    </div>

                                    <div className={`px-6 py-4 rounded-[2rem] text-sm font-bold leading-relaxed shadow-sm border ${isInternalNote
                                        ? 'bg-amber-50 border-amber-200 text-amber-900 rounded-tr-none'
                                        : isMe
                                            ? 'bg-gray-900 text-white border-transparent rounded-tr-none'
                                            : 'bg-white text-gray-900 border-gray-100 rounded-tl-none shadow-blue-500/5'
                                        }`}>
                                        {msg.attachmentUrl && (
                                            <div className="mb-3 rounded-xl overflow-hidden border border-gray-100/20 max-w-sm">
                                                {msg.attachmentUrl.startsWith('data:image/') || msg.attachmentUrl.startsWith('http') && msg.attachmentUrl.match(/\.(jpeg|jpg|gif|png)$/) ? (
                                                    <img src={msg.attachmentUrl} alt="Attachment" className="w-full h-auto object-cover max-h-60" />
                                                ) : (
                                                    <div className="flex items-center gap-3 p-4 bg-gray-50/10">
                                                        <FileIcon size={20} className={isMe ? 'text-gray-400' : 'text-blue-500'} />
                                                        <span className="text-[10px] font-black uppercase tracking-tighter truncate">
                                                            {msg.attachmentUrl.split('//').pop()}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        )}
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
                    {currentUserType === 'Admin' && (
                        <div className="flex items-center gap-2 mb-4 px-2">
                            <label className="flex items-center gap-3 cursor-pointer group">
                                <div className={`w-10 h-6 rounded-full p-1 transition-all ${isInternal ? 'bg-amber-500 shadow-lg shadow-amber-500/20' : 'bg-gray-200'}`}>
                                    <div className={`w-4 h-4 bg-white rounded-full transition-transform ${isInternal ? 'translate-x-4' : 'translate-x-0'}`} />
                                </div>
                                <input
                                    type="checkbox"
                                    className="hidden"
                                    checked={isInternal}
                                    onChange={(e) => setIsInternal(e.target.checked)}
                                />
                                <span className={`text-[10px] font-black uppercase tracking-widest ${isInternal ? 'text-amber-600' : 'text-gray-400 group-hover:text-gray-600'}`}>
                                    {isInternal ? 'Private Audit Note' : 'Public Reply'}
                                </span>
                            </label>

                            {snippets.length > 0 && (
                                <div className="ml-auto relative">
                                    <button
                                        onClick={() => setShowSnippets(!showSnippets)}
                                        className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl transition-all"
                                    >
                                        <FileText size={12} className="text-gray-500" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-600">Snippets</span>
                                        <ChevronDown size={12} className={`text-gray-400 transition-transform ${showSnippets ? 'rotate-180' : ''}`} />
                                    </button>

                                    {showSnippets && (
                                        <div className="absolute bottom-full right-0 mb-2 w-64 bg-white rounded-2xl shadow-2xl border border-gray-100 p-2 z-[110] animate-in slide-in-from-bottom-2 duration-200">
                                            <div className="max-h-48 overflow-y-auto space-y-1">
                                                {snippets.map((s) => (
                                                    <button
                                                        key={s.id}
                                                        onClick={() => {
                                                            setNewMessage(s.content)
                                                            setShowSnippets(false)
                                                        }}
                                                        className="w-full text-left px-4 py-2 hover:bg-gray-50 rounded-xl transition-colors group"
                                                    >
                                                        <p className="text-[10px] font-black uppercase text-gray-900 group-hover:text-blue-600 truncate">{s.title}</p>
                                                        <p className="text-[9px] text-gray-400 truncate mt-0.5">{s.content}</p>
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                    {/* Pending Attachment Preview */}
                    {selectedFile && (
                        <div className="mx-2 mb-4 p-4 bg-gray-50 rounded-2xl border border-gray-100 animate-in slide-in-from-bottom-2 duration-300">
                            <div className="flex items-center gap-4">
                                {filePreview ? (
                                    <div className="w-12 h-12 rounded-lg overflow-hidden flex-shrink-0">
                                        <img src={filePreview} className="w-full h-full object-cover" alt="Preview" />
                                    </div>
                                ) : (
                                    <div className="w-12 h-12 rounded-lg bg-gray-200 flex items-center justify-center flex-shrink-0">
                                        <FileIcon size={20} className="text-gray-500" />
                                    </div>
                                )}
                                <div className="flex-1 min-w-0">
                                    <p className="text-[10px] font-black uppercase text-gray-900 truncate">{selectedFile.name}</p>
                                    <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">{(selectedFile.size / 1024).toFixed(0)} KB • Ready to send</p>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedFile(null)
                                        setFilePreview(null)
                                    }}
                                    className="p-2 hover:bg-red-50 text-red-500 rounded-lg transition-colors"
                                    aria-label="Remove selected file"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="relative flex items-end gap-4">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleFileChange}
                            className="hidden"
                            accept="image/*,application/pdf,.doc,.docx,.txt"
                            title="Upload attachment"
                        />
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isSending}
                            className={`w-[70px] h-[70px] rounded-[2rem] flex items-center justify-center transition-all bg-gray-50 border border-gray-100 text-gray-400 hover:text-indigo-600 hover:border-indigo-100 hover:bg-white active:scale-95 ${isSending ? 'opacity-50 pointer-events-none' : ''}`}
                            aria-label="Attach file"
                        >
                            <Paperclip size={24} />
                        </button>
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            suppressHydrationWarning
                            placeholder={ticket.status === 'Resolved' && currentUserType === 'User' ? "Case is closed." : isInternal ? "Enter private internal note..." : "Protocol update..."}
                            disabled={(ticket.status === 'Resolved' && currentUserType === 'User') || ticket.status === 'Closed' || isSending}
                            className={`flex-1 bg-gray-50 border-2 border-transparent focus:bg-white rounded-[2rem] px-8 py-5 text-sm font-bold outline-none transition-all resize-none shadow-inner min-h-[70px] max-h-[150px] ${isInternal ? 'focus:border-amber-500 text-amber-950' : 'focus:border-indigo-500 text-gray-900'}`}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!newMessage.trim() || isSending || (ticket.status === 'Resolved' && currentUserType === 'User')}
                            suppressHydrationWarning
                            aria-label="Send message"
                            className={`w-[70px] h-[70px] rounded-[2rem] flex items-center justify-center transition-all shadow-lg active:scale-90 ${!newMessage.trim() || isSending || ticket.status === 'Resolved'
                                ? 'bg-gray-100 text-gray-300 pointer-events-none shadow-none'
                                : isInternal
                                    ? 'bg-amber-500 text-white hover:bg-amber-600 hover:shadow-amber-500/20'
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

            <PromptDialog
                isOpen={showEscalatePrompt}
                title="Escalate Ticket?"
                description="Please provide a brief reason for escalating this ticket. This will be recorded in the audit log."
                placeholder="Enter escalation reason..."
                confirmText="Yes, Escalate"
                onConfirm={confirmEscalate}
                onCancel={() => setShowEscalatePrompt(false)}
                variant="warning"
            />
        </div>
    )
}
