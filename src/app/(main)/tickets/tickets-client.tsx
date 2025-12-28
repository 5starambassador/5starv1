'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { MessageSquare, Clock, CheckCircle2, AlertCircle, RefreshCw, Ticket, User, Calendar, Tag } from 'lucide-react'
import { updateTicketStatus } from '@/app/ticket-actions'
import { TicketChatModal } from '@/components/support/ticket-chat-modal'

interface TicketsClientProps {
    tickets: any[]
    counts: { open: number; inProgress: number; resolved: number }
    role: string
    adminId?: number
}

export function TicketsClient({ tickets, counts, role, adminId }: TicketsClientProps) {
    const router = useRouter()
    const [statusFilter, setStatusFilter] = useState<string>('All')
    const [isUpdating, setIsUpdating] = useState(false)
    const [selectedTicket, setSelectedTicket] = useState<any>(null)


    const filteredTickets = statusFilter === 'All'
        ? tickets
        : tickets.filter(t => t.status === statusFilter)

    const handleStatusUpdate = async (ticketId: number, newStatus: string) => {
        setIsUpdating(true)
        await updateTicketStatus(ticketId, newStatus, adminId)
        setIsUpdating(false)
        router.refresh()
    }

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
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            <style>{`
                @keyframes ripple {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>

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
                        <Ticket size={24} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                            Support Tickets
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px', fontWeight: '500' }}>
                            {role === 'Campus Head' ? '🏛️ Campus-specific tickets' :
                                role === 'Admission Admin' ? '💰 Benefit & Referral tickets' :
                                    '🎯 All support tickets'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={() => router.refresh()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #F9FAFB, #F3F4F6)',
                        border: '1px solid #E5E7EB',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        color: '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.05)'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.1)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.transform = 'translateY(0)';
                        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.05)';
                    }}
                >
                    <RefreshCw size={16} /> Refresh
                </button>
            </div>

            {/* Premium Stats Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {/* Open Tickets */}
                <div
                    onClick={() => setStatusFilter('Open')}
                    style={{
                        background: 'linear-gradient(135deg, #3B82F6, #1D4ED8)',
                        padding: '24px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 25px -5px rgba(59, 130, 246, 0.4)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: statusFilter === 'Open' ? 'scale(1.02)' : 'scale(1)',
                        border: statusFilter === 'Open' ? '3px solid white' : '3px solid transparent'
                    }}
                >
                    <Clock size={60} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <Clock size={20} color="rgba(255,255,255,0.9)" />
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Open</span>
                    </div>
                    <p style={{ fontSize: '42px', fontWeight: '800', color: 'white', margin: 0 }}>{counts.open}</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>Awaiting response</p>
                </div>

                {/* In-Progress */}
                <div
                    onClick={() => setStatusFilter('In-Progress')}
                    style={{
                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                        padding: '24px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.4)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: statusFilter === 'In-Progress' ? 'scale(1.02)' : 'scale(1)',
                        border: statusFilter === 'In-Progress' ? '3px solid white' : '3px solid transparent'
                    }}
                >
                    <AlertCircle size={60} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <AlertCircle size={20} color="rgba(255,255,255,0.9)" />
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>In-Progress</span>
                    </div>
                    <p style={{ fontSize: '42px', fontWeight: '800', color: 'white', margin: 0 }}>{counts.inProgress}</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>Being worked on</p>
                </div>

                {/* Resolved */}
                <div
                    onClick={() => setStatusFilter('Resolved')}
                    style={{
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        padding: '24px',
                        borderRadius: '20px',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 25px -5px rgba(16, 185, 129, 0.4)',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        transform: statusFilter === 'Resolved' ? 'scale(1.02)' : 'scale(1)',
                        border: statusFilter === 'Resolved' ? '3px solid white' : '3px solid transparent'
                    }}
                >
                    <CheckCircle2 size={60} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                        <CheckCircle2 size={20} color="rgba(255,255,255,0.9)" />
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '14px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Resolved</span>
                    </div>
                    <p style={{ fontSize: '42px', fontWeight: '800', color: 'white', margin: 0 }}>{counts.resolved}</p>
                    <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', marginTop: '4px' }}>Successfully closed</p>
                </div>
            </div>

            {/* Filter Pills */}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ fontSize: '14px', fontWeight: '600', color: '#6B7280' }}>Filter:</span>
                {['All', 'Open', 'In-Progress', 'Resolved'].map(status => (
                    <button
                        key={status}
                        onClick={() => setStatusFilter(status)}
                        style={{
                            padding: '8px 18px',
                            fontSize: '13px',
                            fontWeight: '600',
                            borderRadius: '50px',
                            border: 'none',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            background: statusFilter === status
                                ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                                : 'white',
                            color: statusFilter === status ? 'white' : '#4B5563',
                            boxShadow: statusFilter === status
                                ? '0 4px 12px rgba(239, 68, 68, 0.3)'
                                : '0 2px 4px rgba(0,0,0,0.05)'
                        }}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Tickets List */}
            <div style={{
                background: 'white',
                borderRadius: '20px',
                padding: '24px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
                border: '1px solid rgba(229, 231, 235, 0.5)'
            }}>
                <div style={{ marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid #F3F4F6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>
                        Tickets ({filteredTickets.length})
                    </h2>
                </div>

                {filteredTickets.length === 0 ? (
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
                        <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 8px' }}>No tickets found</h3>
                        <p style={{ fontSize: '14px', color: '#6B7280' }}>No {statusFilter.toLowerCase()} tickets at the moment.</p>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {filteredTickets.map((ticket) => {
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
                                        transition: 'all 0.2s',
                                        cursor: 'pointer'
                                    }}
                                    onClick={() => setSelectedTicket(ticket)}

                                    onMouseOver={(e) => {
                                        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.08)';
                                        e.currentTarget.style.transform = 'translateY(-2px)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.boxShadow = 'none';
                                        e.currentTarget.style.transform = 'translateY(0)';
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

                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #F3F4F6' }}>
                                        <div style={{ display: 'flex', gap: '20px', fontSize: '12px', color: '#6B7280' }}>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <User size={14} />
                                                <strong>{ticket.user?.fullName}</strong> ({ticket.user?.role})
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Tag size={14} />
                                                {ticket.category}
                                            </span>
                                            <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                <Calendar size={14} />
                                                {new Date(ticket.createdAt).toLocaleDateString('en-GB')}
                                            </span>
                                        </div>

                                        {/* Action Buttons */}
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            {ticket.status === 'Open' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(ticket.id, 'In-Progress')}
                                                    disabled={isUpdating}
                                                    style={{
                                                        padding: '8px 16px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                                                        color: 'white',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 8px rgba(245, 158, 11, 0.3)'
                                                    }}
                                                >
                                                    🚀 Start Working
                                                </button>
                                            )}
                                            {ticket.status === 'In-Progress' && (
                                                <button
                                                    onClick={() => handleStatusUpdate(ticket.id, 'Resolved')}
                                                    disabled={isUpdating}
                                                    style={{
                                                        padding: '8px 16px',
                                                        fontSize: '12px',
                                                        fontWeight: '700',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: 'linear-gradient(135deg, #10B981, #059669)',
                                                        color: 'white',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 4px 8px rgba(16, 185, 129, 0.3)'
                                                    }}
                                                >
                                                    ✅ Mark Resolved
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
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

