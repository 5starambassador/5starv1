'use client'

import { useState, useEffect } from 'react'
import { MessageSquare, Plus, Clock, CheckCircle2, AlertCircle, Send, X, Loader2, Ticket, Tag, Calendar } from 'lucide-react'
import { createTicket, getUserTickets } from '@/app/ticket-actions'

export default function SupportPage() {
    const [showNewTicket, setShowNewTicket] = useState(false)
    const [tickets, setTickets] = useState<any[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Form state
    const [subject, setSubject] = useState('')
    const [message, setMessage] = useState('')
    const [category, setCategory] = useState('Technical Issue')

    // Load tickets on mount
    useEffect(() => {
        loadTickets()
    }, [])

    const loadTickets = async () => {
        const result = await getUserTickets()
        if (result.success) {
            setTickets(result.tickets)
        }
    }

    const handleSubmit = async () => {
        if (!subject.trim() || !message.trim()) {
            alert('Please fill in all fields')
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
            alert('Ticket submitted successfully!')
        } else {
            alert(result.error || 'Failed to submit ticket')
        }
    }

    const openCount = tickets.filter(t => t.status === 'Open').length
    const inProgressCount = tickets.filter(t => t.status === 'In-Progress').length
    const resolvedCount = tickets.filter(t => t.status === 'Resolved' || t.status === 'Closed').length

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'Open': return { bg: '#DBEAFE', text: '#1E40AF', border: '#93C5FD' }
            case 'In-Progress': return { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' }
            case 'Resolved': return { bg: '#D1FAE5', text: '#065F46', border: '#6EE7B7' }
            case 'Closed': return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' }
            default: return { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' }
        }
    }

    const getPriorityStyle = (priority: string) => {
        switch (priority) {
            case 'High': return { bg: 'linear-gradient(135deg, #EF4444, #DC2626)', text: 'white' }
            case 'Urgent': return { bg: 'linear-gradient(135deg, #DC2626, #991B1B)', text: 'white' }
            case 'Medium': return { bg: 'linear-gradient(135deg, #F59E0B, #D97706)', text: 'white' }
            case 'Low': return { bg: 'linear-gradient(135deg, #10B981, #059669)', text: 'white' }
            default: return { bg: '#E5E7EB', text: '#374151' }
        }
    }

    return (
        <div className="max-w-4xl mx-auto animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Premium Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'white',
                padding: '20px 28px',
                borderRadius: '20px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.03)',
                border: '1px solid rgba(229, 231, 235, 0.5)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        padding: '12px',
                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                        borderRadius: '14px',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                    }}>
                        <MessageSquare size={24} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                            Support Desk
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px', fontWeight: '500' }}>
                            We're here to help you with any questions
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => setShowNewTicket(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 24px',
                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '700',
                        color: 'white',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                    }}
                >
                    <Plus size={18} /> New Ticket
                </button>
            </div>

            {/* Premium Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {/* Open */}
                <div style={{
                    background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                    padding: '24px',
                    borderRadius: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)'
                }}>
                    <Clock size={60} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Clock size={20} color="rgba(255,255,255,0.9)" />
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Open</span>
                    </div>
                    <p style={{ fontSize: '42px', fontWeight: '800', color: 'white', margin: 0 }}>{openCount}</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>Awaiting response</p>
                </div>

                {/* In-Progress */}
                <div style={{
                    background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                    padding: '24px',
                    borderRadius: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)'
                }}>
                    <AlertCircle size={60} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <AlertCircle size={20} color="rgba(255,255,255,0.9)" />
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In-Progress</span>
                    </div>
                    <p style={{ fontSize: '42px', fontWeight: '800', color: 'white', margin: 0 }}>{inProgressCount}</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>Being worked on</p>
                </div>

                {/* Resolved */}
                <div style={{
                    background: 'linear-gradient(135deg, #10B981, #059669)',
                    padding: '24px',
                    borderRadius: '20px',
                    position: 'relative',
                    overflow: 'hidden',
                    boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)'
                }}>
                    <CheckCircle2 size={60} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <CheckCircle2 size={20} color="rgba(255,255,255,0.9)" />
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolved</span>
                    </div>
                    <p style={{ fontSize: '42px', fontWeight: '800', color: 'white', margin: 0 }}>{resolvedCount}</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>Successfully closed</p>
                </div>
            </div>

            {/* Tickets List */}
            <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
                border: '1px solid rgba(229, 231, 235, 0.5)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F3F4F6' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>Your Tickets</h2>
                    <span style={{ fontSize: '13px', color: '#6B7280', fontWeight: '500' }}>Showing last 30 days</span>
                </div>

                {tickets.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '60px 20px' }}>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'linear-gradient(135deg, #F3F4F6, #E5E7EB)',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px'
                        }}>
                            <MessageSquare size={36} color="#9CA3AF" />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 8px' }}>No active tickets</h3>
                        <p style={{ fontSize: '14px', color: '#6B7280' }}>If you have a question, click 'New Ticket' above.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {tickets.map((ticket) => {
                            const statusStyle = getStatusColor(ticket.status)
                            const priorityStyle = getPriorityStyle(ticket.priority)

                            return (
                                <div
                                    key={ticket.id}
                                    style={{
                                        background: 'linear-gradient(135deg, #FAFAFA, #FFFFFF)',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '16px',
                                        padding: '20px',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                        <div style={{ flex: 1 }}>
                                            <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: '0 0 6px' }}>{ticket.subject}</h3>
                                            <p style={{ fontSize: '14px', color: '#6B7280', margin: 0, lineHeight: 1.5 }}>{ticket.message}</p>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px', marginLeft: '16px' }}>
                                            <span style={{
                                                fontSize: '11px',
                                                padding: '5px 12px',
                                                borderRadius: '50px',
                                                fontWeight: '700',
                                                background: priorityStyle.bg,
                                                color: priorityStyle.text,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.03em'
                                            }}>
                                                {ticket.priority}
                                            </span>
                                            <span style={{
                                                fontSize: '11px',
                                                padding: '5px 12px',
                                                borderRadius: '50px',
                                                fontWeight: '700',
                                                background: statusStyle.bg,
                                                color: statusStyle.text,
                                                border: `1px solid ${statusStyle.border}`,
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.03em'
                                            }}>
                                                {ticket.status}
                                            </span>
                                        </div>
                                    </div>
                                    <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#6B7280', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Tag size={14} />
                                            {ticket.category}
                                        </span>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <Calendar size={14} />
                                            {new Date(ticket.createdAt).toLocaleDateString()}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {/* New Ticket Modal */}
            {showNewTicket && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    backdropFilter: 'blur(4px)'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '24px',
                        width: '100%',
                        maxWidth: '500px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                            padding: '24px 28px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start'
                        }}>
                            <div>
                                <h2 style={{ fontSize: '20px', fontWeight: '800', color: 'white', margin: 0 }}>Raise Support Ticket</h2>
                                <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginTop: '6px' }}>Tell us what's on your mind</p>
                            </div>
                            <button
                                onClick={() => setShowNewTicket(false)}
                                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
                            >
                                <X size={20} color="white" />
                            </button>
                        </div>
                        <div style={{ padding: '28px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Category</label>
                                <select
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        borderRadius: '12px',
                                        border: '2px solid #E5E7EB',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        background: 'white',
                                        transition: 'border-color 0.2s'
                                    }}
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    <option>Technical Issue</option>
                                    <option>Benefit Discrepancy</option>
                                    <option>Referral Not Showing</option>
                                    <option>Profile Update Request</option>
                                    <option>Other</option>
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</label>
                                <input
                                    type="text"
                                    placeholder="Quick summary of your issue"
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        borderRadius: '12px',
                                        border: '2px solid #E5E7EB',
                                        fontSize: '14px',
                                        fontWeight: '500'
                                    }}
                                    value={subject}
                                    onChange={(e) => setSubject(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Message</label>
                                <textarea
                                    placeholder="Provide details here..."
                                    style={{
                                        width: '100%',
                                        padding: '14px 16px',
                                        borderRadius: '12px',
                                        border: '2px solid #E5E7EB',
                                        fontSize: '14px',
                                        fontWeight: '500',
                                        minHeight: '120px',
                                        resize: 'vertical'
                                    }}
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                ></textarea>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button
                                    onClick={() => setShowNewTicket(false)}
                                    disabled={isSubmitting}
                                    style={{
                                        flex: 1,
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: '2px solid #E5E7EB',
                                        background: 'white',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: '#374151',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '14px',
                                        borderRadius: '12px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: 'white',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                    }}
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={18} className="animate-spin" /> Submitting...</>
                                    ) : (
                                        <><Send size={18} /> Submit Ticket</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
