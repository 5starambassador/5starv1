'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { Users, TrendingUp, Award, BarChart3, DollarSign, CheckCircle, RefreshCw, Trophy, Building2, BookOpen, UserPlus } from 'lucide-react'
import { ReferralTable } from './referral-table'
import { useState, useEffect } from 'react'
import { toast } from 'sonner'

import { User, Student, ReferralLead, RolePermissions, AdminAnalytics, CampusPerformance, Admin, Campus } from '@/types'

interface AdminClientProps {
    referrals: ReferralLead[]
    analytics: AdminAnalytics
    confirmReferral: (leadId: number) => Promise<{ success: boolean; error?: string }>
    initialView?: string
    campuses?: Campus[]
    users?: User[]
    students?: Student[]
    admins?: Admin[]
    campusPerformance?: CampusPerformance[]
    permissions?: RolePermissions
}

export function AdminClient({ referrals, analytics, confirmReferral, initialView = 'analytics', campuses = [], users = [], students = [], admins = [], campusPerformance = [], permissions }: AdminClientProps) {
    const router = useRouter()
    const searchParams = useSearchParams()
    const [statusFilter, setStatusFilter] = useState<string>('All')

    // Filters for Admins View
    const [adminSearch, setAdminSearch] = useState('')
    const [adminRoleFilter, setAdminRoleFilter] = useState('All')
    const [adminCampusFilter, setAdminCampusFilter] = useState('All')

    // Filters for Users View
    const [filterRole, setFilterRole] = useState('All')
    const [filterCampus, setFilterCampus] = useState('All')
    const [filterStatus, setFilterStatus] = useState('All')
    const [searchQuery, setSearchQuery] = useState('')

    // Filters for Students View
    const [studentSearch, setStudentSearch] = useState('')
    const [studentCampusFilter, setStudentCampusFilter] = useState('All')
    const [studentGradeFilter, setStudentGradeFilter] = useState('All')

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

            {/* Premium Header - Mobile Optimized */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100" style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '16px',
                padding: '24px',
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', width: '24px', height: '24px' }}>
                        <div style={{ width: '12px', height: '12px', background: '#10B981', borderRadius: '50%', zIndex: 2 }}></div>
                        <div style={{ position: 'absolute', width: '100%', height: '100%', background: '#10B981', borderRadius: '50%', animation: 'ripple 2s infinite', opacity: 0.4 }}></div>
                    </div>
                    <div>
                        <h1 style={{ fontSize: 'clamp(20px, 6vw, 28px)', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                            {selectedView === 'campuses' ? 'Campus Management' : selectedView === 'users' ? 'User Directory' : selectedView === 'students' ? 'Student Management' : 'Admin Dashboard'}
                        </h1>
                        <p style={{ fontSize: '16px', color: '#6B7280', marginTop: '6px', fontWeight: '500' }}>
                            {selectedView === 'campuses' ? 'View and manage campus details' : selectedView === 'users' ? 'View all system users' : selectedView === 'students' ? 'View registered students' : 'Operational insights and lead conversion'}
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

            {/* CAMPUSES VIEW - Rich Performance Analytics */}
            {
                selectedView === 'campuses' && (
                    <div className="space-y-6">
                        {/* Summary Stats Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px' }}>
                            <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '700', color: '#B91C1C', margin: 0 }}>{campusPerformance.length}</p>
                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Total Campuses</p>
                            </div>
                            <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '700', color: '#F59E0B', margin: 0 }}>{campusPerformance.reduce((sum: number, c: CampusPerformance) => sum + c.totalLeads, 0)}</p>
                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Total Leads</p>
                            </div>
                            <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                <p style={{ fontSize: '24px', fontWeight: '700', color: '#10B981', margin: 0 }}>{campusPerformance.reduce((sum: number, c: CampusPerformance) => sum + c.confirmed, 0)}</p>
                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Confirmed</p>
                            </div>
                            <div style={{ background: 'white', padding: '16px', borderRadius: '10px', border: '1px solid #f0f0f0', textAlign: 'center' }}>
                                {/* Compute Global Conversion */}
                                <p style={{ fontSize: '24px', fontWeight: '700', color: '#8B5CF6', margin: 0 }}>
                                    {(campusPerformance.reduce((sum: number, c: CampusPerformance) => sum + c.totalLeads, 0) > 0
                                        ? ((campusPerformance.reduce((sum: number, c: CampusPerformance) => sum + c.confirmed, 0) / campusPerformance.reduce((sum: number, c: CampusPerformance) => sum + c.totalLeads, 0)) * 100).toFixed(1)
                                        : '0')}%
                                </p>
                                <p style={{ fontSize: '12px', color: '#6B7280', marginTop: '4px' }}>Avg Conversion</p>
                            </div>
                        </div>

                        {/* Lead Distribution Chart */}
                        <div style={{ background: 'white', padding: '20px', borderRadius: '10px', border: '1px solid #f0f0f0' }}>
                            <h3 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '16px', color: '#111827' }}>Lead Distribution by Campus</h3>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                {campusPerformance.map((campus: CampusPerformance) => {
                                    const maxLeads = Math.max(...campusPerformance.map((c: CampusPerformance) => c.totalLeads))
                                    const widthPercent = maxLeads > 0 ? (campus.totalLeads / maxLeads) * 100 : 0

                                    return (
                                        <div key={campus.campus}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                                                <span style={{ fontWeight: '500', fontSize: '13px' }}>{campus.campus}</span>
                                                <span style={{ fontSize: '13px', color: '#6B7280' }}>{campus.totalLeads} leads</span>
                                            </div>
                                            <div style={{ width: '100%', background: '#E5E7EB', borderRadius: '6px', height: '8px' }}>
                                                <div
                                                    style={{
                                                        width: `${widthPercent}%`,
                                                        background: 'linear-gradient(90deg, #DC2626, #EF4444)',
                                                        height: '8px',
                                                        borderRadius: '6px'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    )
                                })}
                                {campusPerformance.length === 0 && (
                                    <p style={{ textAlign: 'center', color: '#9CA3AF', fontSize: '13px' }}>No campus performance data available</p>
                                )}
                            </div>
                        </div>

                        {/* Campus Performance Table - Desktop */}
                        <div className="desktop-only" style={{ background: 'white', borderRadius: '12px', border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.05)' }}>
                            <div style={{ padding: '20px 24px', borderBottom: '1px solid #E5E7EB' }}>
                                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#111827', margin: 0 }}>Campus Performance Details</h3>
                            </div>
                            <div style={{ overflowX: 'auto' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead>
                                        <tr style={{ background: '#F9FAFB' }}>
                                            <th style={{ padding: '12px 24px', textAlign: 'left', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>Campus</th>
                                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>Total Leads</th>
                                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>Confirmed</th>
                                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>Pending</th>
                                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>Conversion</th>
                                            <th style={{ padding: '12px 24px', textAlign: 'center', fontSize: '12px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em', borderBottom: '1px solid #E5E7EB' }}>Ambassadors</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {campusPerformance.map((campus: CampusPerformance, index: number) => (
                                            <tr key={campus.campus} style={{ background: index % 2 === 0 ? 'white' : '#FAFAFA', borderBottom: '1px solid #F3F4F6' }}>
                                                <td style={{ padding: '14px 24px', fontWeight: '600', color: '#111827' }}>{campus.campus}</td>
                                                <td style={{ padding: '14px 24px', textAlign: 'center', color: '#374151', fontWeight: '600' }}>{campus.totalLeads}</td>
                                                <td style={{ padding: '14px 24px', textAlign: 'center', color: '#059669', fontWeight: '600' }}>{campus.confirmed}</td>
                                                <td style={{ padding: '14px 24px', textAlign: 'center', color: '#D97706', fontWeight: '500' }}>{campus.pending}</td>
                                                <td style={{ padding: '14px 24px', textAlign: 'center' }}>
                                                    <span style={{ display: 'inline-block', padding: '4px 10px', fontSize: '12px', fontWeight: '600', borderRadius: '9999px', background: campus.conversionRate >= 80 ? '#D1FAE5' : campus.conversionRate >= 50 ? '#FEF3C7' : '#FEE2E2', color: campus.conversionRate >= 80 ? '#065F46' : campus.conversionRate >= 50 ? '#92400E' : '#B91C1C' }}>
                                                        {campus.conversionRate}%
                                                    </span>
                                                </td>
                                                <td style={{ padding: '14px 24px', textAlign: 'center', color: '#374151', fontWeight: '500' }}>{campus.ambassadors}</td>
                                            </tr>
                                        ))}
                                        {campusPerformance.length === 0 && (
                                            <tr>
                                                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF' }}>No data available</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Campus Performance - Mobile Cards */}
                        <div className="mobile-only" style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                            <div style={{ padding: '16px 20px', borderBottom: '1px solid #E5E7EB' }}>
                                <h3 style={{ fontSize: '16px', fontWeight: '700', color: '#111827', margin: 0 }}>Campus Performance</h3>
                            </div>
                            <div className="mobile-card-list" style={{ padding: '16px' }}>
                                {campusPerformance.map((campus: CampusPerformance) => (
                                    <div key={campus.campus} className="mobile-card-item">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <p style={{ fontWeight: '700', color: '#111827', fontSize: '16px', margin: 0 }}>{campus.campus}</p>
                                                <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>{campus.ambassadors} Ambassadors</p>
                                            </div>
                                            <span style={{ display: 'inline-block', padding: '6px 12px', fontSize: '13px', fontWeight: '700', borderRadius: '9999px', background: campus.conversionRate >= 80 ? '#D1FAE5' : campus.conversionRate >= 50 ? '#FEF3C7' : '#FEE2E2', color: campus.conversionRate >= 80 ? '#065F46' : campus.conversionRate >= 50 ? '#92400E' : '#B91C1C' }}>
                                                {campus.conversionRate}%
                                            </span>
                                        </div>
                                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                                            <div style={{ textAlign: 'center', padding: '8px', background: '#F9FAFB', borderRadius: '8px' }}>
                                                <p style={{ fontSize: '20px', fontWeight: '800', color: '#374151', margin: 0 }}>{campus.totalLeads}</p>
                                                <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Leads</p>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: '8px', background: '#ECFDF5', borderRadius: '8px' }}>
                                                <p style={{ fontSize: '20px', fontWeight: '800', color: '#059669', margin: 0 }}>{campus.confirmed}</p>
                                                <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Confirmed</p>
                                            </div>
                                            <div style={{ textAlign: 'center', padding: '8px', background: '#FFFBEB', borderRadius: '8px' }}>
                                                <p style={{ fontSize: '20px', fontWeight: '800', color: '#D97706', margin: 0 }}>{campus.pending}</p>
                                                <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '2px' }}>Pending</p>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                {campusPerformance.length === 0 && (
                                    <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '20px' }}>No data available</p>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

            {/* ANALYTICS VIEW (Default) */}
            {
                (selectedView === 'analytics' || !selectedView) && (
                    <>
                        {/* Premium KPI Cards Grid - Mobile Stacked */}
                        <div className="mobile-stack" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
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
                                    {analytics.topPerformers.map((performer: { name: string; role: string; referralCode: string; count: number }, idx: number) => (
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
                )
            }

            {/* USERS VIEW */}
            {
                selectedView === 'users' && (
                    <div className="space-y-4">
                        {/* Summary Stats Row */}
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '10px' }}>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Users size={18} style={{ color: '#DC2626' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{users.length}</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>Total Users</p>
                                </div>
                            </div>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#E0F2FE', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <BookOpen size={18} style={{ color: '#0284C7' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{users.filter(u => u.role === 'Staff').length}</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>Staff Members</p>
                                </div>
                            </div>
                            <div style={{ background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: '#FEF3C7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Award size={18} style={{ color: '#D97706' }} />
                                </div>
                                <div>
                                    <p style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{users.filter(u => u.role === 'Parent').length}</p>
                                    <p style={{ fontSize: '11px', color: '#6B7280' }}>Parents</p>
                                </div>
                            </div>
                        </div>

                        {/* Filters Row */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                <input
                                    type="text"
                                    placeholder="Search users..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px 8px 32px',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <select
                                value={filterRole}
                                onChange={(e) => setFilterRole(e.target.value)}
                                style={{ padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#374151' }}
                            >
                                <option value="All">All Roles</option>
                                <option value="Parent">Parent</option>
                                <option value="Staff">Staff</option>
                            </select>

                            <select
                                value={filterStatus}
                                onChange={(e) => setFilterStatus(e.target.value)}
                                style={{ padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#374151' }}
                            >
                                <option value="All">All Status</option>
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>

                        {/* Users Table - Desktop Only */}
                        <div className="desktop-only" style={{ background: 'white', borderRadius: '10px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto', borderLeft: '4px solid #FEE2E2' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#F9FAFB' }}>
                                        <tr>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Full Name</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Mobile</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Role</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Campus</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Referrals</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {users
                                            .filter((user) => {
                                                const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                                    user.mobileNumber.includes(searchQuery)
                                                const matchesRole = filterRole === 'All' || user.role === filterRole
                                                const matchesStatus = filterStatus === 'All' || user.status === filterStatus
                                                return matchesSearch && matchesRole && matchesStatus
                                            })
                                            .map((user) => (
                                                <tr key={user.userId} className="hover:bg-gray-50">
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#111827' }}>{user.fullName}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{user.mobileNumber}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: user.role === 'Staff' ? '#F3E8FF' : '#DBEAFE', color: user.role === 'Staff' ? '#7C3AED' : '#2563EB' }}>
                                                            {user.role}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{user.assignedCampus || '-'}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151', textAlign: 'center', fontWeight: '600' }}>{user.confirmedReferralCount}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: user.status === 'Active' ? '#D1FAE5' : '#F3F4F6', color: user.status === 'Active' ? '#065F46' : '#6B7280' }}>
                                                            {user.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        {users.filter(u => u.role === filterRole || filterRole === 'All').length === 0 && (
                                            <tr>
                                                <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
                                                    No users found matching filters
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Users - Mobile Cards */}
                        <div className="mobile-only mobile-card-list">
                            {users
                                .filter((user) => {
                                    const matchesSearch = user.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                                        user.mobileNumber.includes(searchQuery)
                                    const matchesRole = filterRole === 'All' || user.role === filterRole
                                    const matchesStatus = filterStatus === 'All' || user.status === filterStatus
                                    return matchesSearch && matchesRole && matchesStatus
                                })
                                .map((user) => (
                                    <div key={user.userId} className="mobile-card-item">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <p style={{ fontWeight: '700', color: '#111827', fontSize: '16px', margin: 0 }}>{user.fullName}</p>
                                                <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>{user.mobileNumber}</p>
                                            </div>
                                            <span style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '9999px', background: user.status === 'Active' ? '#D1FAE5' : '#F3F4F6', color: user.status === 'Active' ? '#065F46' : '#6B7280' }}>
                                                {user.status}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                                            <span style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '8px', background: user.role === 'Staff' ? '#F3E8FF' : '#DBEAFE', color: user.role === 'Staff' ? '#7C3AED' : '#2563EB' }}>
                                                {user.role}
                                            </span>
                                            <span style={{ fontSize: '14px', color: '#374151' }}>{user.assignedCampus || 'No Campus'}</span>
                                            <span style={{ fontSize: '14px', fontWeight: '600', color: '#10B981' }}>{user.confirmedReferralCount} referrals</span>
                                        </div>
                                    </div>
                                ))}
                            {users.filter(u => u.role === filterRole || filterRole === 'All').length === 0 && (
                                <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '24px' }}>No users found</p>
                            )}
                        </div>
                    </div>
                )
            }

            {/* ADMINS VIEW */}
            {
                selectedView === 'admins' && (
                    <div className="space-y-4">
                        {/* Filters Row */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                <input
                                    type="text"
                                    placeholder="Search admins..."
                                    value={adminSearch}
                                    onChange={(e) => setAdminSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px 8px 32px',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <select
                                value={adminRoleFilter}
                                onChange={(e) => setAdminRoleFilter(e.target.value)}
                                style={{ padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#374151' }}
                            >
                                <option value="All">All Roles</option>
                                <option value="Campus Admin">Campus Admin</option>
                                <option value="Admission Admin">Admission Admin</option>
                                <option value="CampusHead">Campus Head</option>
                            </select>
                        </div>

                        {/* Admins Table - Desktop Only */}
                        <div className="desktop-only" style={{ background: 'white', borderRadius: '10px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto', borderLeft: '4px solid #10B981' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#F9FAFB' }}>
                                        <tr>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Admin Name</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Mobile</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Role</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Assigned Campus</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {admins
                                            .filter(a => {
                                                const matchesSearch = a.adminName.toLowerCase().includes(adminSearch.toLowerCase()) ||
                                                    a.adminMobile.includes(adminSearch)
                                                const matchesRole = adminRoleFilter === 'All' || a.role === adminRoleFilter
                                                return matchesSearch && matchesRole
                                            })
                                            .map((admin: Admin) => (
                                                <tr key={admin.adminId} className="hover:bg-gray-50">
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                                                        {admin.adminName}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>
                                                        {admin.adminMobile}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: admin.role === 'CampusHead' ? '#FEE2E2' : '#ECFDF5', color: admin.role === 'CampusHead' ? '#B91C1C' : '#047857' }}>
                                                            {admin.role}
                                                        </span>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{admin.assignedCampus || '-'}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span style={{ padding: '4px 10px', fontSize: '11px', fontWeight: '600', borderRadius: '9999px', background: admin.status === 'Active' ? '#D1FAE5' : '#F3F4F6', color: admin.status === 'Active' ? '#065F46' : '#6B7280' }}>
                                                            {admin.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        {admins.length === 0 && (
                                            <tr>
                                                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
                                                    No admins found
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Admins - Mobile Cards */}
                        <div className="mobile-only mobile-card-list">
                            {admins
                                .filter(a => {
                                    const matchesSearch = a.adminName.toLowerCase().includes(adminSearch.toLowerCase()) ||
                                        a.adminMobile.includes(adminSearch)
                                    const matchesRole = adminRoleFilter === 'All' || a.role === adminRoleFilter
                                    return matchesSearch && matchesRole
                                })
                                .map((admin: Admin) => (
                                    <div key={admin.adminId} className="mobile-card-item">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <p style={{ fontWeight: '700', color: '#111827', fontSize: '16px', margin: 0 }}>{admin.adminName}</p>
                                                <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>{admin.adminMobile}</p>
                                            </div>
                                            <span style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '9999px', background: admin.status === 'Active' ? '#D1FAE5' : '#F3F4F6', color: admin.status === 'Active' ? '#065F46' : '#6B7280' }}>
                                                {admin.status}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
                                            <span style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '8px', background: admin.role === 'CampusHead' ? '#FEE2E2' : '#ECFDF5', color: admin.role === 'CampusHead' ? '#B91C1C' : '#047857' }}>
                                                {admin.role}
                                            </span>
                                            <span style={{ fontSize: '14px', color: '#374151' }}>{admin.assignedCampus || 'No Campus'}</span>
                                        </div>
                                    </div>
                                ))}
                            {admins.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '24px' }}>No admins found</p>
                            )}
                        </div>
                    </div>
                )
            }
            {
                selectedView === 'students' && (
                    <div className="space-y-4">
                        {/* Filters Row */}
                        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', background: 'white', padding: '12px 16px', borderRadius: '8px', border: '1px solid #f0f0f0', flexWrap: 'wrap' }}>
                            <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                                <input
                                    type="text"
                                    placeholder="Search students..."
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: '8px 10px 8px 32px',
                                        border: '1px solid #E5E7EB',
                                        borderRadius: '6px',
                                        fontSize: '13px',
                                        outline: 'none'
                                    }}
                                />
                            </div>

                            <select
                                value={studentCampusFilter}
                                onChange={(e) => setStudentCampusFilter(e.target.value)}
                                style={{ padding: '6px 12px', border: '1px solid #E5E7EB', borderRadius: '6px', fontSize: '12px', color: '#374151' }}
                            >
                                <option value="All">All Campuses</option>
                                {Array.from(new Set(students.map(s => s.campus?.campusName || 'Unassigned'))).map(c => (
                                    <option key={c} value={c}>{c}</option>
                                ))}
                            </select>
                        </div>

                        {/* Action Buttons Row - Permission Check */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '10px' }}>
                            {permissions?.studentManagement?.canCreate && (
                                <button
                                    onClick={() => toast.info('Add Student form coming soon to Admin View. Please contact Super Admin.')}
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        padding: '8px 16px', background: 'linear-gradient(135deg, #10B981, #059669)', color: 'white',
                                        border: 'none', borderRadius: '8px', fontSize: '13px', fontWeight: '500', cursor: 'pointer'
                                    }}
                                >
                                    <UserPlus size={14} />
                                    Add Student
                                </button>
                            )}
                        </div>

                        {/* Students Table - Desktop Only */}
                        <div className="desktop-only" style={{ background: 'white', borderRadius: '10px', border: '1px solid #f0f0f0', overflow: 'hidden' }}>
                            <div style={{ overflowX: 'auto', borderLeft: '4px solid #DBEAFE' }}>
                                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                                    <thead style={{ background: '#F9FAFB' }}>
                                        <tr>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>ID</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Student Name</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Parent Name</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ambassador Name</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Ambassador Type</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Referral Code</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Campus</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Grade</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Section</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Roll No</th>
                                            <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '11px', fontWeight: '600', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Status</th>
                                        </tr>
                                    </thead>
                                    <tbody className="bg-white divide-y divide-gray-200">
                                        {students
                                            .filter(s => {
                                                const matchesSearch = (s.fullName || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
                                                    (s.parent?.fullName || '').toLowerCase().includes(studentSearch.toLowerCase())
                                                const matchesCampus = studentCampusFilter === 'All' || s.campus?.campusName === studentCampusFilter
                                                return matchesSearch && matchesCampus
                                            })
                                            .map((student: Student) => (
                                                <tr key={student.studentId} className="hover:bg-gray-50" style={{ borderBottom: '1px solid #F3F4F6' }}>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#6B7280' }}>#{student.studentId}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '600', color: '#111827' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                            <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: '#DBEAFE', color: '#1E40AF', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', fontWeight: '700' }}>
                                                                {(student.fullName || '?')[0]}
                                                            </div>
                                                            {student.fullName}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#374151' }}>
                                                        <div>
                                                            {student.parent?.fullName || 'N/A'}
                                                            <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '400', marginTop: '2px' }}>
                                                                {student.parent?.mobileNumber}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', fontWeight: '500', color: '#6366F1' }}>
                                                        <div>
                                                            {student.ambassador?.fullName || '-'}
                                                            {student.ambassador?.mobileNumber && (
                                                                <div style={{ fontSize: '11px', color: '#6B7280', fontWeight: '400', marginTop: '2px' }}>
                                                                    {student.ambassador.mobileNumber}
                                                                </div>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        {student.ambassador?.role ? (
                                                            <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '4px', background: student.ambassador.role === 'Staff' ? '#DBEAFE' : '#FEF3C7', color: student.ambassador.role === 'Staff' ? '#1E40AF' : '#D97706', fontWeight: '600' }}>
                                                                {student.ambassador.role}
                                                            </span>
                                                        ) : '-'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#059669', fontWeight: '600' }}>
                                                        {student.ambassador?.referralCode || '-'}
                                                    </td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{student.campus?.campusName || 'Unassigned'}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{student.grade}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{student.section || '-'}</td>
                                                    <td style={{ padding: '12px 16px', fontSize: '13px', color: '#374151' }}>{student.rollNumber || '-'}</td>
                                                    <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                                                        <span className={`px-2.5 py-0.5 rounded text-xs font-medium ${student.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                            {student.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))}
                                        {students.length === 0 && (
                                            <tr>
                                                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: '#9CA3AF', fontSize: '14px' }}>
                                                    No students found. Confirm leads to add students.
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Students - Mobile Cards */}
                        <div className="mobile-only mobile-card-list">
                            {students
                                .filter(s => {
                                    const matchesSearch = (s.fullName || '').toLowerCase().includes(studentSearch.toLowerCase()) ||
                                        (s.parent?.fullName || '').toLowerCase().includes(studentSearch.toLowerCase())
                                    const matchesCampus = studentCampusFilter === 'All' || s.campus?.campusName === studentCampusFilter
                                    return matchesSearch && matchesCampus
                                })
                                .map((student: Student) => (
                                    <div key={student.studentId} className="mobile-card-item">
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                                            <div>
                                                <p style={{ fontWeight: '700', color: '#111827', fontSize: '16px', margin: 0 }}>{student.fullName}</p>
                                                {/* <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>{student.curriculum}</p> */}
                                            </div>
                                            <span style={{ padding: '6px 12px', fontSize: '12px', fontWeight: '600', borderRadius: '8px', background: '#F3F4F6', color: '#374151' }}>
                                                Grade {student.grade}
                                            </span>
                                        </div>
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '13px', color: '#6B7280' }}>Parent:</span>
                                                <span style={{ fontSize: '14px', fontWeight: '600', color: '#111827' }}>{student.parent?.fullName || 'N/A'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '13px', color: '#6B7280' }}>Campus:</span>
                                                <span style={{ fontSize: '14px', color: '#374151' }}>{student.campus?.campusName || 'Unassigned'}</span>
                                            </div>
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span style={{ fontSize: '13px', color: '#6B7280' }}>Joined:</span>
                                                <span style={{ fontSize: '14px', color: '#374151' }}>{new Date(student.createdAt).toLocaleDateString('en-GB')}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            {students.length === 0 && (
                                <p style={{ textAlign: 'center', color: '#9CA3AF', padding: '24px', fontSize: '16px' }}>No students found. Confirm leads to add students.</p>
                            )}
                        </div>
                    </div>
                )
            }
        </div >
    )
}
