'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Users, TrendingUp, Award, BarChart3, DollarSign, CheckCircle, RefreshCw, Trophy, Building2 } from 'lucide-react'
import { ReferralTable } from './referral-table'
import { useState, useEffect } from 'react'

interface AdminClientProps {
    referrals: any[]
    analytics: any
    confirmReferral: (leadId: number) => Promise<any>
    initialView?: string
    campuses?: any[]
    users?: any[]
    students?: any[]
}

export function AdminClient({ referrals, analytics, confirmReferral, initialView = 'analytics', campuses = [], users = [], students = [] }: AdminClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [statusFilter, setStatusFilter] = useState<string>('All')

    // View state
    const [selectedView, setSelectedView] = useState<string>(initialView)

    // Sync state with URL
    useEffect(() => {
        const view = searchParams.get('view') || 'analytics'
        setSelectedView(view)
    }, [searchParams])

    const handleCardClick = (filter: string) => {
        setStatusFilter(filter)
    }

    return (
        <div className="animate-fade-in space-y-6">
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
                            {selectedView === 'campuses' ? 'Campus Management' : selectedView === 'users' ? 'User Directory' : selectedView === 'students' ? 'Student Management' : 'Admin Dashboard'}
                        </h1>
                        <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '1px', fontWeight: '500' }}>
                            {selectedView === 'campuses' ? 'View and manage campus details' : selectedView === 'users' ? 'View all system users' : selectedView === 'students' ? 'View registered students' : 'Operational insights and lead conversion management'}
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

            {/* CONTENT VIEWS */}

            {/* CAMPUSES VIEW */}
            {selectedView === 'campuses' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
                    {campuses && campuses.length > 0 ? (
                        campuses.map((campus: any) => (
                            <div key={campus.id} style={{
                                background: 'white',
                                borderRadius: '16px',
                                padding: '24px',
                                border: '1px solid #E5E7EB',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '16px' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '10px',
                                        background: '#E0E7FF',
                                        color: '#4F46E5',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center'
                                    }}>
                                        <Building2 size={20} />
                                    </div>
                                    <span style={{
                                        fontSize: '11px',
                                        fontWeight: '700',
                                        padding: '4px 8px',
                                        borderRadius: '20px',
                                        background: campus.isActive ? '#DCFCE7' : '#F3F4F6',
                                        color: campus.isActive ? '#15803D' : '#6B7280'
                                    }}>
                                        {campus.isActive ? 'ACTIVE' : 'INACTIVE'}
                                    </span>
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>{campus.campusName}</h3>
                                <p style={{ fontSize: '13px', color: '#6B7280', margin: '0 0 16px' }}>{campus.campusCode} • {campus.location}</p>

                                <div style={{ display: 'flex', gap: '12px', borderTop: '1px solid #F3F4F6', paddingTop: '16px' }}>
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0, fontWeight: '600', textTransform: 'uppercase' }}>Grades</p>
                                        <p style={{ fontSize: '13px', color: '#374151', margin: '2px 0 0', fontWeight: '500' }}>{campus.grades}</p>
                                    </div>
                                    <div style={{ height: '30px', width: '1px', background: '#F3F4F6' }}></div>
                                    <div>
                                        <p style={{ fontSize: '11px', color: '#9CA3AF', margin: 0, fontWeight: '600', textTransform: 'uppercase' }}>Capacity</p>
                                        <p style={{ fontSize: '13px', color: '#374151', margin: '2px 0 0', fontWeight: '500' }}>{campus.maxCapacity}</p>
                                    </div>
                                </div>
                            </div>
                        ))
                    ) : (
                        <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '40px', background: 'white', borderRadius: '16px', color: '#6B7280' }}>
                            No campuses found.
                        </div>
                    )}
                </div>
            )}

            {/* ANALYTICS VIEW (Default) */}
            {(selectedView === 'analytics' || !selectedView) && (
                <>
                    {/* Premium KPI Cards Grid */}
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
                                boxShadow: '0 10px 15px -3px rgba(239, 68, 68, 0.3), 0 4px 6px -2px rgba(239, 68, 68, 0.1)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                transform: 'translateY(0)',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(239, 68, 68, 0.4), 0 10px 10px -5px rgba(239, 68, 68, 0.2)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(239, 68, 68, 0.3), 0 4px 6px -2px rgba(239, 68, 68, 0.1)';
                            }}
                        >
                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', position: 'relative', zIndex: 1 }}>
                                <div>
                                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Total Leads</p>
                                    <h2 style={{ color: 'white', fontSize: '32px', fontWeight: '800', lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{analytics?.totalLeads || 0}</h2>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                                    <Users color="white" size={24} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', padding: '6px 10px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', width: 'fit-content' }}>
                                <TrendingUp size={14} color="white" />
                                <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>{analytics?.conversionRate || 0}% Conversion</span>
                            </div>
                        </div>

                        {/* Confirmed Leads Card */}
                        <div
                            onClick={() => handleCardClick('Confirmed')}
                            style={{
                                background: 'linear-gradient(135deg, #10B981, #059669)',
                                padding: '20px',
                                borderRadius: '16px',
                                cursor: 'pointer',
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: '0 10px 15px -3px rgba(16, 185, 129, 0.3), 0 4px 6px -2px rgba(16, 185, 129, 0.1)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(16, 185, 129, 0.4), 0 10px 10px -5px rgba(16, 185, 129, 0.2)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(16, 185, 129, 0.3), 0 4px 6px -2px rgba(16, 185, 129, 0.1)';
                            }}
                        >
                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', position: 'relative', zIndex: 1 }}>
                                <div>
                                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Confirmed</p>
                                    <h2 style={{ color: 'white', fontSize: '32px', fontWeight: '800', lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>{analytics?.confirmedLeads || 0}</h2>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                                    <CheckCircle color="white" size={24} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', padding: '6px 10px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', width: 'fit-content' }}>
                                <Award size={14} color="white" />
                                <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>Verified Enrollments</span>
                            </div>
                        </div>

                        {/* Est. Value Card */}
                        <div
                            style={{
                                background: 'linear-gradient(135deg, #6366F1, #4F46E5)',
                                padding: '20px',
                                borderRadius: '16px',
                                position: 'relative',
                                overflow: 'hidden',
                                boxShadow: '0 10px 15px -3px rgba(99, 102, 241, 0.3), 0 4px 6px -2px rgba(99, 102, 241, 0.1)',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                border: '1px solid rgba(255,255,255,0.1)'
                            }}
                            onMouseOver={(e) => {
                                e.currentTarget.style.transform = 'translateY(-5px)';
                                e.currentTarget.style.boxShadow = '0 20px 25px -5px rgba(99, 102, 241, 0.4), 0 10px 10px -5px rgba(99, 102, 241, 0.2)';
                            }}
                            onMouseOut={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(99, 102, 241, 0.3), 0 4px 6px -2px rgba(99, 102, 241, 0.1)';
                            }}
                        >
                            <div style={{ position: 'absolute', top: '-10px', right: '-10px', width: '100px', height: '100px', background: 'radial-gradient(circle, rgba(255,255,255,0.2) 0%, rgba(255,255,255,0) 70%)', borderRadius: '50%' }}></div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', position: 'relative', zIndex: 1 }}>
                                <div>
                                    <p style={{ color: 'rgba(255,255,255,0.9)', fontSize: '13px', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase', marginBottom: '8px' }}>Est. Value</p>
                                    <h2 style={{ color: 'white', fontSize: '32px', fontWeight: '800', lineHeight: 1, textShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>₹{(analytics?.totalEstimatedValue || 0).toLocaleString()}</h2>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.2)', padding: '10px', borderRadius: '12px', backdropFilter: 'blur(4px)' }}>
                                    <DollarSign color="white" size={24} strokeWidth={2.5} />
                                </div>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '16px', padding: '6px 10px', background: 'rgba(255,255,255,0.15)', borderRadius: '8px', width: 'fit-content' }}>
                                <BarChart3 size={14} color="white" />
                                <span style={{ color: 'white', fontSize: '12px', fontWeight: '600' }}>Incentive Value</span>
                            </div>
                        </div>
                    </div>

                    {/* Chart & Top Performers Section */}
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '20px' }}>
                        {/* Weekly Activity Chart (Placeholder) */}
                        <div style={{
                            background: 'white',
                            padding: '24px',
                            borderRadius: '20px',
                            border: '1px solid rgba(229, 231, 235, 0.5)',
                            boxShadow: '0 10px 15px -3px rgba(0,0,0,0.04), 0 4px 6px -2px rgba(0,0,0,0.02)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px' }}>
                                <div style={{ padding: '8px', background: '#F3F4F6', borderRadius: '10px' }}>
                                    <BarChart3 size={20} color="#4B5563" />
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>Role Distribution</h3>
                            </div>

                            <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                {/* Simple Visual Representation instead of Chart.js for simplicity */}
                                <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                                            <span>Parents</span>
                                            <span>{analytics?.roleBreakdown?.parent?.percentage}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '12px', background: '#F3F4F6', borderRadius: '6px', overflow: 'hidden' }}>
                                            <div style={{ width: `${analytics?.roleBreakdown?.parent?.percentage}%`, height: '100%', background: '#EF4444', borderRadius: '6px' }}></div>
                                        </div>
                                    </div>
                                    <div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>
                                            <span>Staff</span>
                                            <span>{analytics?.roleBreakdown?.staff?.percentage}%</span>
                                        </div>
                                        <div style={{ width: '100%', height: '12px', background: '#F3F4F6', borderRadius: '6px', overflow: 'hidden' }}>
                                            <div style={{ width: `${analytics?.roleBreakdown?.staff?.percentage}%`, height: '100%', background: '#10B981', borderRadius: '6px' }}></div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Top Performers */}
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
                                <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827', margin: 0 }}>Top Performers</h3>
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
                                                <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>{performer.role} • {performer.referralCode}</p>
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
                        confirmReferral={confirmReferral}
                        initialStatusFilter={statusFilter}
                    />
                </>
            )}

            {/* USERS VIEW */}
            {selectedView === 'users' && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-lg font-bold text-gray-900">User Directory</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 border-y border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Campus</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Referrals</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {users.map((user: any) => (
                                    <tr key={user.userId} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{user.fullName}</div>
                                            <div className="text-xs text-gray-500">{user.mobileNumber}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.role === 'Staff' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{user.assignedCampus || '-'}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                {user.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 font-mono text-sm">{user.confirmedReferralCount}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* STUDENTS VIEW */}
            {selectedView === 'students' && (
                <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-100 bg-gray-50/50">
                        <h2 className="text-lg font-bold text-gray-900">Student Directory</h2>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50/50 border-y border-gray-100">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Student Name</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Parent</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Campus</th>
                                    <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {students.map((student: any) => (
                                    <tr key={student.t_id} className="hover:bg-gray-50/50">
                                        <td className="px-6 py-4">
                                            <div className="font-semibold text-gray-900">{student.studentName}</div>
                                            <div className="text-xs text-gray-500">{student.grade} - {student.curriculum}</div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="text-sm font-medium text-gray-900">{student.parent?.fullName || 'N/A'}</div>
                                            <div className="text-xs text-gray-500">{student.parent?.mobileNumber}</div>
                                        </td>
                                        <td className="px-6 py-4 text-sm text-gray-600">{student.campus?.campusName || 'Unassigned'}</td>
                                        <td className="px-6 py-4 text-sm text-gray-500">{new Date(student.createdAt).toLocaleDateString()}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div >
    )
}
