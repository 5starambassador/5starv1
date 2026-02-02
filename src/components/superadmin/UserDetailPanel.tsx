'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, CreditCard, Building, Hash, Smartphone, User, Star, Key, Shield, Activity as ActivityIcon, IndianRupee, Users, FileText, Wallet } from 'lucide-react'
import { User as UserType } from '@/types'
import { calculateStars } from '@/lib/gamification'
import { ActivityHistory } from './ActivityHistory'
import Image from 'next/image'
import { getUserSettlements } from '@/app/settlement-actions'
import { getUserReferrals } from '@/app/superadmin-actions'
import { useEffect, useState } from 'react'
import { format } from 'date-fns'
import { toast } from 'sonner'

interface UserDetailPanelProps {
    user: UserType | null
    onClose: () => void
    onEdit?: (user: UserType) => void
    onResetPassword?: (id: number, name: string, type: 'user' | 'admin') => void
    onViewAudit?: (user: UserType) => void
}

export function UserDetailPanel({ user, onClose, onEdit, onResetPassword, onViewAudit }: UserDetailPanelProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'referrals' | 'financials'>('overview')
    const [settlements, setSettlements] = useState<any[]>([])
    const [referrals, setReferrals] = useState<any[]>([])
    const [loadingSettlements, setLoadingSettlements] = useState(false)
    const [loadingReferrals, setLoadingReferrals] = useState(false)

    useEffect(() => {
        if (user?.userId) {
            // Reset state on user change
            setActiveTab('overview')
            setSettlements([])
            setReferrals([])

            // Load extra data on demand or pre-fetch
            const loadData = async () => {
                setLoadingSettlements(true)
                try {
                    const res = await getUserSettlements(user.userId)
                    if (res.success && res.settlements) {
                        setSettlements(res.settlements)
                    }
                } catch (error) {
                    console.error('Error loading settlements:', error)
                } finally {
                    setLoadingSettlements(false)
                }

                setLoadingReferrals(true)
                try {
                    const res = await getUserReferrals(user.userId)
                    if (res.success && res.referrals) {
                        setReferrals(res.referrals)
                    }
                } catch (error) {
                    console.error('Error loading referrals:', error)
                } finally {
                    setLoadingReferrals(false)
                }
            }
            loadData()
        }
    }, [user?.userId])

    if (!user) return null
    const stars = calculateStars(user.confirmedReferralCount || 0)

    // Calculate Conversion Rate for this user
    const totalRefs = referrals.length
    const confirmedRefs = referrals.filter(r => r.status === 'Confirmed').length
    const conversionRate = totalRefs > 0 ? Math.round((confirmedRefs / totalRefs) * 100) : 0

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-[60] flex justify-end">
                {/* Backdrop */}
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                />

                {/* Main Panel */}
                <motion.div
                    initial={{ x: '100%' }}
                    animate={{ x: 0 }}
                    exit={{ x: '100%' }}
                    transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                    className="relative w-full max-w-lg bg-white shadow-2xl h-full flex flex-col overflow-hidden"
                >
                    {/* Header */}
                    <div className="p-8 border-b border-gray-100 bg-gradient-to-br from-gray-50 to-white pb-0">
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-4">
                                <div className="w-16 h-16 bg-red-50 rounded-2xl flex items-center justify-center border border-red-100 shadow-inner">
                                    <User size={32} className="text-red-500" />
                                </div>
                                <div>
                                    <h2 className="text-2xl font-black text-gray-900 leading-tight uppercase tracking-tight">
                                        {user.fullName}
                                    </h2>
                                    <div className="flex items-center gap-2 mt-1">
                                        <span className={`text-[10px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${user.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-200'
                                            }`}>
                                            {user.status}
                                        </span>
                                        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">•</span>
                                        <span className="text-[10px] font-black text-red-600 uppercase tracking-widest">
                                            {user.role}
                                        </span>
                                    </div>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-gray-100 rounded-xl transition-colors text-gray-400"
                            >
                                <X size={24} />
                            </button>
                        </div>

                        {/* Tabs */}
                        <div className="flex gap-6 mt-4">
                            <button
                                onClick={() => setActiveTab('overview')}
                                className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'overview' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <User size={14} /> Overview
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('referrals')}
                                className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'referrals' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Users size={14} /> Referrals
                                    <span className="bg-gray-100 text-gray-600 px-1.5 rounded text-[9px]">{referrals.length}</span>
                                </div>
                            </button>
                            <button
                                onClick={() => setActiveTab('financials')}
                                className={`pb-3 text-xs font-black uppercase tracking-widest border-b-2 transition-all ${activeTab === 'financials' ? 'border-red-600 text-red-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                            >
                                <div className="flex items-center gap-2">
                                    <Wallet size={14} /> Financials
                                </div>
                            </button>
                        </div>
                    </div>

                    {/* Scrollable Content */}
                    <div className="flex-1 overflow-y-auto custom-scrollbar p-8 space-y-10 bg-white">

                        {activeTab === 'overview' && (
                            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-10">
                                {/* Star Tier Summary - Only on Overview */}
                                <div className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Efficiency Status</p>
                                        <p className={`text-sm font-black mt-0.5 ${stars.tier === '5-Star' ? 'text-red-600' : 'text-amber-500'}`}>
                                            {stars.tier} Member
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-0.5">
                                        {[...Array(5)].map((_, i) => (
                                            <Star
                                                key={i}
                                                size={18}
                                                fill={i < stars.starCount ? "currentColor" : "none"}
                                                className={`${i < stars.starCount ? (stars.tier === '5-Star' ? 'text-red-600' : 'text-amber-400') : 'text-gray-200'}`}
                                                strokeWidth={i < stars.starCount ? 0 : 2}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Engagement Grid */}
                                <section>
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Ambassador Insights</h3>
                                    <div className="grid grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 text-red-500">
                                                <Calendar size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Joined On</span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 pl-6" suppressHydrationWarning>
                                                {format(new Date(user.createdAt), 'MMMM dd, yyyy')}
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 text-emerald-500">
                                                <CreditCard size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Base Benefit</span>
                                            </div>
                                            <p className="text-sm font-black text-emerald-600 pl-6">
                                                {user.yearFeeBenefitPercent}% Discount
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 text-blue-500">
                                                <ActivityIcon size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Loyalty Rank</span>
                                            </div>
                                            <p className="text-sm font-black text-blue-600 pl-6">
                                                {user.longTermBenefitPercent}% Extra
                                            </p>
                                        </div>
                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-2 text-purple-500">
                                                <Hash size={14} />
                                                <span className="text-[10px] font-black uppercase tracking-widest">Global ID</span>
                                            </div>
                                            <p className="text-sm font-bold text-gray-900 pl-6 font-mono">
                                                #{user.userId.toString().padStart(6, '0')}
                                            </p>
                                        </div>
                                    </div>
                                </section>

                                {/* Administrative Details */}
                                <section>
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Profile Details</h3>
                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-gray-50 border border-gray-100">
                                            <div className="flex items-center gap-3">
                                                <Smartphone size={16} className="text-gray-400" />
                                                <div>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Mobile Number</p>
                                                    <p className="text-sm font-bold text-gray-900">{user.mobileNumber}</p>
                                                </div>
                                            </div>
                                            <span className="text-[10px] font-black bg-red-50 text-red-700 px-3 py-1 rounded-lg border border-red-100 uppercase tracking-widest">
                                                {user.referralCode}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="flex-1 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Building size={14} className="text-gray-400" />
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Campus</p>
                                                </div>
                                                <p className="text-sm font-bold text-gray-900 pl-5">{user.assignedCampus || 'Global'}</p>
                                            </div>
                                            <div className="flex-1 p-4 rounded-xl bg-gray-50 border border-gray-100">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <Shield size={14} className="text-gray-400" />
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Grade</p>
                                                </div>
                                                <p className="text-sm font-bold text-gray-900 pl-5">{user.grade || 'N/A'}</p>
                                            </div>
                                        </div>
                                    </div>
                                </section>

                                {/* Recent Activity */}
                                <section className="pb-8">
                                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] mb-6">Activity Timeline</h3>
                                    <ActivityHistory userId={user.userId} userName={user.fullName} />
                                </section>
                            </motion.div>
                        )}

                        {activeTab === 'referrals' && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                {/* Conversion Stat Card */}
                                <div className="bg-indigo-50 rounded-2xl p-5 border border-indigo-100 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-black text-indigo-400 uppercase tracking-widest">Ambassador Conversion</h4>
                                        <p className="text-2xl font-black text-indigo-900 mt-1">{conversionRate}%</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-[10px] font-bold text-indigo-400 uppercase">Confirmed / Total</p>
                                        <p className="text-sm font-bold text-indigo-700">{confirmedRefs} / {totalRefs} Leads</p>
                                    </div>
                                </div>

                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Referral History</h3>

                                {loadingReferrals ? (
                                    <div className="flex justify-center p-8"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600" /></div>
                                ) : referrals.length > 0 ? (
                                    <div className="space-y-3">
                                        {referrals.map((ref) => (
                                            <div key={ref.id} className="p-4 rounded-xl border border-gray-100 bg-white hover:border-gray-200 transition-all flex items-center justify-between group">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-2 h-10 rounded-full ${ref.status === 'Confirmed' ? 'bg-emerald-400' : ref.status === 'New' ? 'bg-blue-400' : 'bg-gray-300'}`} />
                                                    <div>
                                                        <p className="text-sm font-black text-gray-900">{ref.studentName}</p>
                                                        <p className="text-[10px] font-bold text-gray-400">{format(new Date(ref.date), 'MMM dd, yyyy')}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest border ${ref.status === 'Confirmed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                        ref.status === 'New' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                            'bg-gray-50 text-gray-500 border-gray-200'
                                                        }`}>
                                                        {ref.status}
                                                    </span>
                                                    {ref.admissionStatus && (
                                                        <p className="text-[9px] font-bold text-gray-400 mt-1 uppercase tracking-wide">{ref.admissionStatus}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                        <Users size={24} className="mx-auto text-gray-300 mb-2" />
                                        <p className="text-xs font-bold text-gray-400">No referrals made yet by this ambassador.</p>
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {activeTab === 'financials' && (
                            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-6">
                                {/* Financial Stats */}
                                <div className="bg-emerald-50 rounded-2xl p-5 border border-emerald-100 flex items-center justify-between">
                                    <div>
                                        <h4 className="text-xs font-black text-emerald-400 uppercase tracking-widest">Total Payouts</h4>
                                        <p className="text-2xl font-black text-emerald-900 mt-1">
                                            ₹{settlements.reduce((acc, curr) => acc + (curr.status === 'Processed' ? curr.amount : 0), 0).toLocaleString()}
                                        </p>
                                    </div>
                                    <div className="p-2 bg-white rounded-xl shadow-sm">
                                        <Wallet size={20} className="text-emerald-500" />
                                    </div>
                                </div>

                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Settlement Log</h3>
                                <div className="space-y-3">
                                    {loadingSettlements ? (
                                        <div className="flex items-center justify-center py-4">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                                        </div>
                                    ) : settlements.length > 0 ? (
                                        settlements.map((s) => (
                                            <div key={s.id} className="p-4 rounded-xl border border-gray-100 bg-white shadow-sm flex items-center justify-between group hover:border-red-100 transition-colors">
                                                <div className="flex items-center gap-3">
                                                    <div className={`p-2 rounded-lg ${s.status === 'Processed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        <IndianRupee size={14} />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-gray-900">₹{s.amount.toLocaleString()}</p>
                                                        <p className="text-[10px] font-bold text-gray-400">{format(new Date(s.createdAt), 'MMM dd, yyyy')}</p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-tighter ${s.status === 'Processed' ? 'bg-emerald-50 text-emerald-600' : 'bg-amber-50 text-amber-600'}`}>
                                                        {s.status}
                                                    </span>
                                                    {s.bankReference && (
                                                        <p className="text-[9px] font-mono text-gray-400 mt-0.5">{s.bankReference}</p>
                                                    )}
                                                </div>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-4 rounded-xl border border-dashed border-gray-200 text-center">
                                            <p className="text-xs font-bold text-gray-400 italic">No automated payouts recorded yet.</p>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </div>

                    {/* Footer Actions */}
                    <div className="p-6 border-t border-gray-100 bg-gray-50/50 grid grid-cols-2 gap-3 z-10 relative">
                        <button
                            onClick={() => onEdit?.(user)}
                            className="py-3.5 px-4 bg-gray-900 hover:bg-black text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-gray-200 transition-all flex items-center justify-center gap-2"
                        >
                            Edit Profile
                        </button>
                        <button
                            onClick={() => onResetPassword?.(user.userId, user.fullName, 'user')}
                            className="py-3.5 px-4 bg-white border border-gray-200 text-gray-900 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-gray-100 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            <Key size={14} /> Reset PIN
                        </button>
                        <button
                            onClick={() => onViewAudit?.(user)}
                            className="col-span-2 py-3.5 px-4 bg-white border border-blue-100 text-blue-600 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-blue-50 transition-all flex items-center justify-center gap-2 shadow-sm"
                        >
                            <Shield size={14} /> Full Audit Trail
                        </button>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    )
}
