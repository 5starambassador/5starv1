'use client'

import { useRouter } from 'next/navigation'
import { Users, TrendingUp, Award, BarChart3, DollarSign, CheckCircle, Building2, RefreshCw, Trophy } from 'lucide-react'
import { ReferralTable } from '../admin/referral-table'
import { useState } from 'react'

interface CampusClientProps {
    campus: string
    analytics: any
    referrals: any[]
    confirmReferral: (leadId: number, campus: string) => Promise<any>
}

export function CampusClient({ campus, analytics, referrals, confirmReferral }: CampusClientProps) {
    const router = useRouter()
    const [statusFilter, setStatusFilter] = useState<string>('All')

    const handleCardClick = (filter: string) => {
        setStatusFilter(filter)
    }

    const confirmReferralWrapper = async (leadId: number) => {
        await confirmReferral(leadId, campus)
    }

    return (
        <div className="animate-fade-in space-y-6">
            <style>{`
                @keyframes ripple {
                    0% { transform: scale(0.8); opacity: 0.5; }
                    100% { transform: scale(2.5); opacity: 0; }
                }
            `}</style>

            {/* Premium Header - Matching Admin Style */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'white',
                padding: '16px 24px',
                borderRadius: '16px',
                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)',
                border: '1px solid rgba(229, 231, 235, 0.5)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '20px', height: '20px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#10B981', borderRadius: '50%', zIndex: 2 }}></div>
                        <div style={{ position: 'absolute', width: '100%', height: '100%', background: '#10B981', borderRadius: '50%', animation: 'ripple 2s infinite', opacity: 0.4 }}></div>
                    </div>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                            Campus Dashboard
                        </h1>
                        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '1px', fontWeight: '500', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Building2 size={14} />
                            {campus} Campus • Lead management and analytics
                        </p>
                    </div>
                </div>

                <button
                    onClick={() => router.refresh()}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        background: '#F9FAFB',
                        border: '1px solid #E5E7EB',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: '#374151',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                    }}
                    onMouseOver={(e) => {
                        e.currentTarget.style.background = '#FFFFFF';
                        e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.1)';
                        e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseOut={(e) => {
                        e.currentTarget.style.background = '#F9FAFB';
                        e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.05)';
                        e.currentTarget.style.transform = 'translateY(0)';
                    }}
                    suppressHydrationWarning
                >
                    <RefreshCw size={14} /> Refresh
                </button>
            </div>

            {/* Premium KPI Cards Grid - Matching Admin Style */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                {/* Total Leads Card */}
                <div
                    onClick={() => handleCardClick('All')}
                    style={{
                        background: 'linear-gradient(135deg, #EF4444, #B91C1C)',
                        padding: '20px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 20px -5px rgba(239, 68, 68, 0.3)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: statusFilter === 'All' ? '2px solid white' : '2px solid transparent',
                        transform: statusFilter === 'All' ? 'scale(1.02)' : 'none'
                    }}
                >
                    <BarChart3 size={48} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', position: 'relative' }}>
                        <BarChart3 size={16} style={{ color: 'rgba(255,255,255,0.9)' }} />
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em' }}>Total Leads</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', position: 'relative' }}>
                        <p style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>{analytics.totalLeads}</p>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Entries</span>
                    </div>
                </div>

                {/* Confirmed Card */}
                <div
                    onClick={() => handleCardClick('Confirmed')}
                    style={{
                        background: 'linear-gradient(135deg, #10B981, #059669)',
                        padding: '20px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 20px -5px rgba(16, 185, 129, 0.3)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: statusFilter === 'Confirmed' ? '2px solid white' : '2px solid transparent',
                        transform: statusFilter === 'Confirmed' ? 'scale(1.02)' : 'none'
                    }}
                >
                    <CheckCircle size={48} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', position: 'relative' }}>
                        <CheckCircle size={16} style={{ color: 'rgba(255,255,255,0.9)' }} />
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em' }}>Confirmed</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', position: 'relative' }}>
                        <p style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>{analytics.confirmedLeads}</p>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Admitted</span>
                    </div>
                </div>

                {/* Pending Card */}
                <div
                    onClick={() => handleCardClick('Pending')}
                    style={{
                        background: 'linear-gradient(135deg, #F59E0B, #D97706)',
                        padding: '20px',
                        borderRadius: '16px',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 20px -5px rgba(245, 158, 11, 0.3)',
                        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
                        border: statusFilter === 'Pending' ? '2px solid white' : '2px solid transparent',
                        transform: statusFilter === 'Pending' ? 'scale(1.02)' : 'none'
                    }}
                >
                    <TrendingUp size={48} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', position: 'relative' }}>
                        <TrendingUp size={16} style={{ color: 'rgba(255,255,255,0.9)' }} />
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em' }}>Pending</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', position: 'relative' }}>
                        <p style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>{analytics.pendingLeads}</p>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Follow-up</span>
                    </div>
                </div>

                {/* Conversion Rate Card */}
                <div
                    style={{
                        background: 'linear-gradient(135deg, #F97316, #EA580C)',
                        padding: '20px',
                        borderRadius: '16px',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 20px -5px rgba(249, 115, 22, 0.3)'
                    }}
                >
                    <Award size={48} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', position: 'relative' }}>
                        <Award size={16} style={{ color: 'rgba(255,255,255,0.9)' }} />
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em' }}>Conversion</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', position: 'relative' }}>
                        <p style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>{analytics.conversionRate}%</p>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Rate</span>
                    </div>
                </div>

                {/* Ambassadors Card */}
                <div
                    style={{
                        background: 'linear-gradient(135deg, #8B5CF6, #6D28D9)',
                        padding: '20px',
                        borderRadius: '16px',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 20px -5px rgba(139, 92, 246, 0.3)'
                    }}
                >
                    <Users size={48} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', position: 'relative' }}>
                        <Users size={16} style={{ color: 'rgba(255,255,255,0.9)' }} />
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em' }}>Ambassadors</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', position: 'relative' }}>
                        <p style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>{analytics.totalAmbassadors}</p>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Members</span>
                    </div>
                </div>

                {/* Est. Value Card */}
                <div
                    style={{
                        background: 'linear-gradient(135deg, #EC4899, #BE185D)',
                        padding: '20px',
                        borderRadius: '16px',
                        position: 'relative',
                        overflow: 'hidden',
                        boxShadow: '0 10px 20px -5px rgba(236, 72, 153, 0.3)'
                    }}
                >
                    <DollarSign size={48} style={{ position: 'absolute', right: '-10px', bottom: '-10px', color: 'rgba(255,255,255,0.15)' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', position: 'relative' }}>
                        <DollarSign size={16} style={{ color: 'rgba(255,255,255,0.9)' }} />
                        <span style={{ color: 'rgba(255,255,255,0.9)', fontSize: '12px', fontWeight: '600', letterSpacing: '0.02em' }}>Benefits</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', position: 'relative' }}>
                        <p style={{ fontSize: '28px', fontWeight: '800', color: 'white', margin: 0 }}>₹{Math.round(analytics.totalEstimatedValue / 1000)}K</p>
                        <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)', fontWeight: '500' }}>Value</span>
                    </div>
                </div>
            </div>

            {/* Charts & Insights Section - Matching Admin Style */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '24px' }}>
                {/* Campus & Role Distribution */}
                <div style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '20px',
                    border: '1px solid rgba(229, 231, 235, 0.5)',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)'
                }}>
                    <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', marginBottom: '20px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <BarChart3 size={20} className="text-primary-red" />
                        Distribution Insights
                    </h3>

                    <div className="space-y-6">
                        {/* Status Pipeline */}
                        <div>
                            <p style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status Pipeline</p>
                            <div className="space-y-4">
                                {analytics.statusBreakdown.map((item: any, idx: number) => (
                                    <div key={idx}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: '600', color: '#4B5563' }}>{item.status}</span>
                                            <span style={{ fontSize: '13px', fontWeight: '700', color: '#111827' }}>{item.count} <span style={{ fontWeight: '500', color: '#6B7280' }}>({item.percentage}%)</span></span>
                                        </div>
                                        <div style={{ height: '8px', background: '#F3F4F6', borderRadius: '4px', overflow: 'hidden' }}>
                                            <div style={{
                                                height: '100%',
                                                width: `${item.percentage}%`,
                                                background: item.status === 'Confirmed' ? '#10B981' : item.status === 'Follow-up' ? '#F59E0B' : '#EF4444',
                                                borderRadius: '4px',
                                                transition: 'width 1s ease-out'
                                            }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Role Breakdown */}
                        <div style={{ paddingTop: '20px', borderTop: '1px solid #F3F4F6' }}>
                            <p style={{ fontSize: '13px', fontWeight: '700', color: '#374151', marginBottom: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ambassador Type</p>
                            <div className="flex gap-4">
                                <div style={{ flex: 1, padding: '12px', background: '#F0FDF4', borderRadius: '12px', border: '1px solid #DCFCE7' }}>
                                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#166534', textTransform: 'uppercase', marginBottom: '4px' }}>Parents</p>
                                    <p style={{ fontSize: '20px', fontWeight: '800', color: '#166534' }}>{analytics.roleBreakdown.parent.count}</p>
                                    <p style={{ fontSize: '12px', color: '#15803d', fontWeight: '600' }}>{analytics.roleBreakdown.parent.percentage}% Share</p>
                                </div>
                                <div style={{ flex: 1, padding: '12px', background: '#FFF7ED', borderRadius: '12px', border: '1px solid #FFEDD5' }}>
                                    <p style={{ fontSize: '11px', fontWeight: '700', color: '#9A3412', textTransform: 'uppercase', marginBottom: '4px' }}>Staff</p>
                                    <p style={{ fontSize: '20px', fontWeight: '800', color: '#9A3412' }}>{analytics.roleBreakdown.staff.count}</p>
                                    <p style={{ fontSize: '12px', color: '#c2410c', fontWeight: '600' }}>{analytics.roleBreakdown.staff.percentage}% Share</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Top Performers Leaderboard */}
                <div style={{
                    background: 'white',
                    padding: '24px',
                    borderRadius: '20px',
                    border: '1px solid rgba(229, 231, 235, 0.5)',
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                        <div style={{ padding: '8px', background: '#FEF3C7', borderRadius: '10px' }}>
                            <Trophy size={20} color="#D97706" />
                        </div>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>Top Performers - {campus}</h3>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {analytics.topPerformers.map((performer: any, idx: number) => (
                            <div
                                key={idx}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    padding: '16px',
                                    background: idx === 0 ? 'linear-gradient(to right, #FFFBEB, #FFFFFF)' : '#F9FAFB',
                                    borderRadius: '16px',
                                    border: idx === 0 ? '1px solid #FEF3C7' : '1px solid #F3F4F6',
                                    transition: 'all 0.2s',
                                    cursor: 'pointer'
                                }}
                                onMouseOver={(e) => {
                                    e.currentTarget.style.transform = 'translateX(4px)';
                                    e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0,0,0,0.05)';
                                }}
                                onMouseOut={(e) => {
                                    e.currentTarget.style.transform = 'translateX(0)';
                                    e.currentTarget.style.boxShadow = 'none';
                                }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        background: idx === 0 ? '#FDE68A' : idx === 1 ? '#E5E7EB' : idx === 2 ? '#FFEDD5' : 'white',
                                        fontSize: '14px',
                                        fontWeight: '800',
                                        color: idx === 0 ? '#92400E' : idx === 1 ? '#4B5563' : idx === 2 ? '#9A3412' : '#9CA3AF',
                                        border: '1px solid rgba(0,0,0,0.05)'
                                    }}>
                                        {idx + 1}
                                    </div>
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: '700', color: '#111827', margin: 0 }}>{performer.name}</p>
                                        <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>{performer.role}</p>
                                    </div>
                                </div>
                                <div style={{ textAlign: 'right' }}>
                                    <p style={{ fontSize: '20px', fontWeight: '800', color: '#EF4444', margin: 0 }}>{performer.count}</p>
                                    <p style={{ fontSize: '11px', fontWeight: '600', color: '#9CA3AF', margin: 0, textTransform: 'uppercase' }}>leads</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Referrals Table with Filters */}
            <ReferralTable
                referrals={referrals}
                confirmReferral={confirmReferralWrapper}
                initialStatusFilter={statusFilter === 'Pending' ? 'All' : statusFilter}
                key={statusFilter}
            />
        </div>
    )
}
