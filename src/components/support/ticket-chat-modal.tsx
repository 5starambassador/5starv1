'use client'

import { useState, useEffect, useRef } from 'react'
import { X, Send, User, Shield, Loader2, Clock } from 'lucide-react'
import { addTicketMessage, getTicketMessages, escalateTicket } from '@/app/ticket-actions'
import { toast } from 'sonner'

interface Message {
    id: number
    senderType: string // 'User' | 'Admin'
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
    const [newMessage, setNewMessage] = useState('')
    const [isSending, setIsSending] = useState(false)
    const [messages, setMessages] = useState<Message[]>(ticket.messages || [])
    const messagesEndRef = useRef<HTMLDivElement>(null)

    // Scroll to bottom on load and new message
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    // Poll for new messages
    useEffect(() => {
        const pollMessages = async () => {
            if (ticket.status === 'Resolved' || ticket.status === 'Closed') return

            const result = await getTicketMessages(ticket.id)
            if (result.success && result.messages) {
                // If there are more messages than we have, update
                // Simple length check might miss edits, but good enough for chat
                // Better: check if last message ID is different
                setMessages(prev => {
                    if (result.messages && result.messages.length > prev.length) {
                        return result.messages
                    }
                    return prev
                })

                // Update status if changed (e.g. Admin replied -> In-Progress)
                if (result.status && result.status !== ticket.status && onStatusChange) {
                    onStatusChange(result.status)
                }
            }
        }

        const intervalId = setInterval(pollMessages, 4000)
        return () => clearInterval(intervalId)
    }, [ticket.id, ticket.status, onStatusChange])

    const handleSend = async () => {
        if (!newMessage.trim()) return

        setIsSending(true)
        // Optimistic UI update
        const tempId = Date.now()
        const tempMsg: Message = {
            id: tempId,
            senderType: currentUserType,
            senderId: currentUserId,
            message: newMessage,
            createdAt: new Date()
        }

        setMessages(prev => [...prev, tempMsg])
        setNewMessage('') // Clear input immediately

        const result = await addTicketMessage(
            ticket.id,
            tempMsg.message,
            currentUserType,
            currentUserId
        )

        if (!result.success) {
            alert('Failed to send message')
            // Revert optimistic update if needed, but for now just alert
        } else {
            // Update the real message from server if needed, mostly for ID
            // For simplicity, we keep the optimistic one or replace it
        }
        setIsSending(false)
    }

    // Enter key to send
    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSend()
        }
    }

    const handleEscalate = async () => {
        if (currentUserType !== 'Admin') return
        const reason = prompt('Enter reason for escalation:')
        if (!reason) return

        try {
            const result = await escalateTicket(ticket.id, reason, currentUserId)
            if (result.success) {
                toast.success(`Ticket escalated to Level ${result.level}`)
                // Polling will update the UI
            } else {
                toast.error(result.error || 'Failed to escalate ticket')
            }
        } catch (error) {
            toast.error('Failed to escalate ticket')
        }
    }

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: 'rgba(0,0,0,0.6)',
            backdropFilter: 'blur(4px)'
        }}>
            <div style={{
                background: 'white',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '600px',
                height: '80vh',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                overflow: 'hidden'
            }}>
                {/* Header */}
                <div style={{
                    background: 'linear-gradient(135deg, #111827, #374151)',
                    padding: '20px 24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid #374151'
                }}>
                    <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{
                                fontSize: '11px',
                                fontWeight: '700',
                                textTransform: 'uppercase',
                                padding: '2px 8px',
                                borderRadius: '4px',
                                background: ticket.status === 'Open' ? '#2563EB' : ticket.status === 'Resolved' ? '#059669' : '#D97706',
                                color: 'white'
                            }}>
                                {ticket.status}
                            </span>
                            <span style={{ color: '#9CA3AF', fontSize: '12px' }}>#{ticket.id}</span>
                        </div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'white', margin: '4px 0 0' }}>
                            {ticket.subject}
                        </h2>
                        {ticket.escalationLevel && ticket.escalationLevel > 1 && (
                            <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <span style={{ fontSize: '10px', background: '#DC2626', color: 'white', padding: '2px 6px', borderRadius: '4px', fontWeight: '700' }}>
                                    🔥 Level {ticket.escalationLevel}
                                </span>
                            </div>
                        )}
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        {currentUserType === 'Admin' && (!ticket.escalationLevel || ticket.escalationLevel < 4) && (
                            <button
                                onClick={handleEscalate}
                                style={{
                                    background: '#DC2626',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '6px',
                                    padding: '4px 8px',
                                    fontSize: '11px',
                                    fontWeight: '600',
                                    cursor: 'pointer'
                                }}
                            >
                                Escalate
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            style={{ background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
                        >
                            <X size={20} color="white" />
                        </button>
                    </div>
                </div>

                {/* Messages Area */}
                <div style={{
                    flex: 1,
                    background: '#F9FAFB',
                    padding: '24px',
                    overflowY: 'auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px'
                }}>
                    {/* Security Notice */}
                    <div style={{
                        textAlign: 'center',
                        fontSize: '12px',
                        color: '#6B7280',
                        marginBottom: '10px',
                        background: '#E5E7EB',
                        padding: '8px',
                        borderRadius: '8px',
                        alignSelf: 'center'
                    }}>
                        🔒 This conversation is secure and visible only to you and the admin team.
                    </div>

                    {messages.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#9CA3AF', marginTop: '40px' }}>
                            <p>No messages yet. Start the conversation!</p>
                        </div>
                    )}

                    {messages.map((msg, idx) => {
                        const isMe = msg.senderType === currentUserType
                        // Admin messages usually have a different look if I'm a User
                        const isAdmin = msg.senderType === 'Admin'

                        return (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyContent: isMe ? 'flex-end' : 'flex-start',
                                marginBottom: '4px'
                            }}>
                                <div style={{
                                    maxWidth: '80%',
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: isMe ? 'flex-end' : 'flex-start'
                                }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        marginBottom: '4px',
                                        marginLeft: '4px',
                                        marginRight: '4px'
                                    }}>
                                        {isMe ? (
                                            <span style={{ fontSize: '11px', color: '#6B7280', fontWeight: '600' }}>You</span>
                                        ) : (
                                            <>
                                                {isAdmin ? <Shield size={12} color="#DC2626" /> : <User size={12} color="#6B7280" />}
                                                <span style={{ fontSize: '11px', color: isAdmin ? '#DC2626' : '#6B7280', fontWeight: '600' }}>
                                                    {isAdmin ? 'Support Team' : 'User'}
                                                </span>
                                            </>
                                        )}
                                        <span style={{ fontSize: '10px', color: '#9CA3AF' }}>
                                            {typeof msg.createdAt === 'string' ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : msg.createdAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                        </span>
                                    </div>

                                    <div style={{
                                        background: isMe
                                            ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                                            : 'white',
                                        color: isMe ? 'white' : '#1F2937',
                                        padding: '12px 16px',
                                        borderRadius: isMe ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                        border: isMe ? 'none' : '1px solid #E5E7EB',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                        wordBreak: 'break-word'
                                    }}>
                                        {msg.message}
                                    </div>
                                </div>
                            </div>
                        )
                    })}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div style={{
                    padding: '20px',
                    background: 'white',
                    borderTop: '1px solid #E5E7EB'
                }}>
                    <div style={{
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'flex-end'
                    }}>
                        <textarea
                            value={newMessage}
                            onChange={(e) => setNewMessage(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder="Type your message..."
                            disabled={ticket.status === 'Resolved' || ticket.status === 'Closed'}
                            style={{
                                flex: 1,
                                padding: '12px 16px',
                                borderRadius: '12px',
                                border: '2px solid #E5E7EB',
                                resize: 'none',
                                height: '50px',
                                minHeight: '50px',
                                maxHeight: '120px',
                                fontSize: '14px',
                                fontFamily: 'inherit'
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!newMessage.trim() || isSending || ticket.status === 'Resolved' || ticket.status === 'Closed'}
                            style={{
                                height: '50px',
                                width: '50px',
                                borderRadius: '12px',
                                border: 'none',
                                background: !newMessage.trim() ? '#E5E7EB' : 'linear-gradient(135deg, #EF4444, #DC2626)',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: !newMessage.trim() ? 'not-allowed' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                    {ticket.status === 'Resolved' && (
                        <p style={{ fontSize: '12px', color: '#059669', textAlign: 'center', marginTop: '10px', fontWeight: '600' }}>
                            ✨ This ticket is resolved. Re-open it by sending a message? (Logic TBD)
                        </p>
                    )}
                </div>
            </div>
        </div>
    )
}
