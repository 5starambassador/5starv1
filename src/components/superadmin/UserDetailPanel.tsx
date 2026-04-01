'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X, Calendar, CreditCard, Building, Hash, Smartphone, User, Star, Key, Shield, Activity as ActivityIcon, IndianRupee, Users, FileText, Wallet } from 'lucide-react'
import { User as UserType } from '@/types'
import { calculateStars } from '@/lib/gamification'
import { ActivityHistory } from './ActivityHistory'
import Image from 'next/image'
import { getUserSettlements } from '@/app/settlement-actions'
import { getUserReferrals } from '@/app/superadmin-actions'
import { getAmbassadorLedger } from '@/app/financial-actions'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
    const [mounted, setMounted] = useState(false)
    const [settlements, setSettlements] = useState<any[]>([])
    const [referrals, setReferrals] = useState<any[]>([])
    const [ledger, setLedger] = useState<any[]>([])
    const [ledgerSummary, setLedgerSummary] = useState<any>(null)
    const [loadingSettlements, setLoadingSettlements] = useState(false)
    const [loadingReferrals, setLoadingReferrals] = useState(false)
    const [loadingLedger, setLoadingLedger] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        if (user?.userId) {
            // Reset state on user change
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

                setLoadingLedger(true)
                try {
                    const res = await getAmbassadorLedger(user.userId)
                    if (res.success && res.data) {
                        setLedger(res.data.ledger)
                        setLedgerSummary(res.data.summary)
                    }
                } catch (error) {
                    console.error('Error loading ledger:', error)
                } finally {
                    setLoadingLedger(false)
                }
            }
            loadData()
        }
    }, [user?.userId])

    // Body scroll locking
    useEffect(() => {
        if (user) {
            document.body.style.overflow = 'hidden'
            return () => {
                document.body.style.overflow = 'unset'
            }
        }
    }, [user])

    if (!mounted) return null

    // Calculations - handled safely for potential null user
    const stars = user ? calculateStars(user.confirmedReferralCount || 0) : { tier: '', starCount: 0 }
    const totalRefs = referrals.length
    const confirmedRefs = referrals.filter(r => r.status === 'Confirmed').length
    // Use user.confirmedReferralCount as the source-of-truth for stats if it's higher than the leads list
    const effectiveConfirmedCount = Math.max(confirmedRefs, user?.confirmedReferralCount || 0)
    const conversionRate = totalRefs > 0 ? Math.round((effectiveConfirmedCount / Math.max(totalRefs, effectiveConfirmedCount)) * 100) : 0

    const panelContent = (
        <AnimatePresence mode="wait">
            {user && (
                <div 
                    className="fixed inset-0 z-[150] flex justify-end" 
                    key="user-detail-panel-root"
                >
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-black/40 backdrop-blur-[6px]"
                    />

                    {/* Main Panel - Flush with top/bottom */}
                    <motion.div
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
                        className="relative w-full max-w-lg bg-white shadow-[0_0_50px_-12px_rgba(0,0,0,0.3)] h-screen flex flex-col overflow-hidden"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Header Area */}
                        <div className="p-8 pb-6 border-b border-gray-100 bg-gradient-to-br from-gray-50/80 to-white backdrop-blur-md">
                            <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-5">
                                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center border border-indigo-100 shadow-inner relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-gradient-to-br from-indigo-50/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                                        <User size={32} className="text-indigo-500 relative z-10" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-gray-900 leading-tight uppercase tracking-tight italic">
                                            {user.fullName}
                                        </h2>
                                        <div className="flex items-center gap-2 mt-1.5">
                                            <span className={`text-[9px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-widest border transition-colors ${
                                                user.status === 'Active' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-gray-50 text-gray-400 border-gray-200'
                                            }`}>
                                                {user.status}
                                            </span>
                                            <span className="text-[10px] font-bold text-gray-300 uppercase tracking-widest">•</span>
                                            <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest bg-indigo-50/50 px-2 rounded-md">
                                                {user.role}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-10 h-10 bg-white border border-gray-100 flex items-center justify-center rounded-xl hover:bg-red-50 hover:text-red-500 hover:border-red-100 transition-all text-gray-400 shadow-sm active:scale-95"
                                    title="Close Panel (Esc)"
                                >
                                    <X size={20} strokeWidth={3} />
                                </button>
                            </div>

                            {/* Standardized Header Cards */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-white/60 rounded-2xl p-4 border border-gray-100 shadow-sm transition-all hover:border-indigo-100 group">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">Performance</p>
                                    <p className={`text-sm font-black flex items-center gap-2 ${stars.tier === '5-Star' ? 'text-indigo-600' : 'text-amber-500'}`}>
                                        <Star size={14} fill="currentColor" /> {stars.tier} Rank
                                    </p>
                                </div>
                                <div className="bg-white/60 rounded-2xl p-4 border border-gray-100 shadow-sm text-right transition-all hover:border-emerald-100 group">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1 group-hover:text-emerald-400 transition-colors">Total Pipeline</p>
                                    <p className="text-sm font-black text-emerald-600">
                                        {effectiveConfirmedCount} Confirmed
                                    </p>
                                </div>
                            </div>
                        </div>

                        {/* Section Jumper (Mini-Nav) */}
                        <div className="flex px-8 py-2 border-b border-gray-50 bg-white/50 backdrop-blur-sm gap-6 overflow-x-auto no-scrollbar">
                            {['Profile', 'Registry', 'Performance', 'Finance', 'Activity'].map((sec) => (
                                <button
                                    key={sec}
                                    onClick={() => {
                                        const el = document.getElementById(`section-${sec.toLowerCase()}`)
                                        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
                                    }}
                                    className="text-[9px] font-black uppercase tracking-[0.2em] text-gray-400 hover:text-indigo-600 transition-colors py-2 whitespace-nowrap"
                                >
                                    {sec}
                                </button>
                            ))}
                        </div>

                        {/* Scrollable Content */}
                        <div className="flex-1 overflow-y-auto custom-scrollbar-panel p-8 space-y-12 bg-white pb-20">
                            
                            {/* 1. Profile Insights */}
                            <section id="section-profile" className="scroll-mt-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Ambassador Profile
                                </h3>
                                <div className="grid grid-cols-2 gap-8">
                                    <div className="space-y-2 flex flex-col">
                                        <div className="flex items-center gap-2 text-gray-400">
                                            <Calendar size={14} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Joined On</span>
                                        </div>
                                        <p className="text-sm font-bold text-gray-900 pl-6" suppressHydrationWarning>
                                            {format(new Date(user.createdAt), 'MMMM dd, yyyy')}
                                        </p>
                                    </div>
                                    <div className="space-y-2 flex flex-col">
                                        <div className="flex items-center gap-2 text-emerald-500">
                                            <CreditCard size={14} />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Benefit Status</span>
                                        </div>
                                        <p className="text-sm font-black text-emerald-600 pl-6">
                                            {user.yearFeeBenefitPercent}% Annual Discount
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* 2. Contact Registry */}
                            <section id="section-registry" className="scroll-mt-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Contact Registry
                                </h3>
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between p-5 rounded-2xl bg-gray-50/50 border border-gray-100 hover:bg-white hover:shadow-lg hover:shadow-gray-100/50 transition-all group">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center border border-gray-100 shadow-sm group-hover:scale-110 transition-transform">
                                                <Smartphone size={18} className="text-indigo-500" />
                                            </div>
                                            <div className="text-left">
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Primary Mobile</p>
                                                <p className="text-sm font-bold text-gray-900 tracking-tight">{user.mobileNumber}</p>
                                            </div>
                                        </div>
                                        <div className="flex flex-col items-end">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Passcode</p>
                                            <span className="text-[11px] font-black bg-indigo-600 text-white px-3 py-1 rounded-lg border border-indigo-700 uppercase tracking-[0.1em] shadow-lg shadow-indigo-100 italic">
                                                {user.referralCode}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-5 rounded-2xl bg-gray-50/50 border border-gray-100 text-left hover:bg-white hover:shadow-lg hover:shadow-gray-100/50 transition-all">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Base Campus</p>
                                            <p className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tight">
                                                <Building size={14} className="text-gray-400" /> {user.assignedCampus || 'Global Operations'}
                                            </p>
                                        </div>
                                        <div className="p-5 rounded-2xl bg-gray-50/50 border border-gray-100 text-left hover:bg-white hover:shadow-lg hover:shadow-gray-100/50 transition-all">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-2">Academic Stage</p>
                                            <p className="text-sm font-bold text-gray-900 flex items-center gap-2 uppercase tracking-tight">
                                                <Star size={14} className="text-amber-400" /> {user.grade || 'Staff / Graduate'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* 3. Performance & Pipeline */}
                            <section id="section-performance" className="scroll-mt-4">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Pipeline Health
                                </h3>
                                <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-[32px] p-7 border border-indigo-500 shadow-xl shadow-indigo-100 text-white text-left relative overflow-hidden group">
                                    <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl group-hover:scale-125 transition-transform" />
                                    <div className="flex items-center justify-between relative z-10">
                                        <div>
                                            <h4 className="text-[10px] font-black opacity-80 uppercase tracking-[0.2em] flex items-center gap-2">
                                                <ActivityIcon size={12} /> Target Conversion
                                            </h4>
                                            <p className="text-4xl font-black mt-2 tracking-tighter italic">{conversionRate}%</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[10px] font-bold opacity-70 uppercase tracking-widest mb-1">Efficiency Ratio</p>
                                            <p className="text-base font-black tracking-tight">{effectiveConfirmedCount} / {Math.max(totalRefs, effectiveConfirmedCount)} Leads</p>
                                        </div>
                                    </div>
                                    <div className="mt-6 h-2 bg-white/10 rounded-full overflow-hidden">
                                        <motion.div 
                                            initial={{ width: 0 }}
                                            animate={{ width: `${conversionRate}%` }}
                                            transition={{ duration: 1, ease: 'easeOut' }}
                                            className="h-full bg-white shadow-[0_0_15px_rgba(255,255,255,0.5)]" 
                                        />
                                    </div>
                                </div>
                            </section>

                            {/* 4. Financial Ledger */}
                            <section id="section-finance" className="scroll-mt-4 pt-4 border-t border-gray-50">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-6 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> Financial Performance
                                </h3>
                                
                                {ledgerSummary && (
                                    <div className="grid grid-cols-2 gap-4 mb-8">
                                        <div className="bg-emerald-50/50 rounded-2xl p-5 border border-emerald-100 transition-all hover:bg-emerald-50">
                                            <h4 className="text-[10px] font-black text-emerald-500 uppercase tracking-widest mb-1">Global Earnings</h4>
                                            <p className="text-2xl font-black text-emerald-900 tracking-tighter italic">₹{ledgerSummary.totalEarned.toLocaleString()}</p>
                                        </div>
                                        <div className="bg-indigo-50/50 rounded-2xl p-5 border border-indigo-100 text-right transition-all hover:bg-indigo-50">
                                            <h4 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-1">Pending Payout</h4>
                                            <p className="text-2xl font-black text-indigo-900 tracking-tighter italic">₹{ledgerSummary.outstanding.toLocaleString()}</p>
                                        </div>
                                    </div>
                                )}

                                <div className="space-y-3">
                                    {loadingLedger ? (
                                        <div className="flex items-center justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 opacity-20" /></div>
                                    ) : ledger.length > 0 ? (
                                        ledger.slice(0, 5).map((item) => (
                                            <div key={item.id} className="p-4 rounded-xl border border-gray-50 bg-white hover:border-gray-200 transition-all flex items-center gap-4 text-left group">
                                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-inner ${item.direction === 'IN' ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>
                                                    <IndianRupee size={16} />
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-xs font-black text-gray-900 leading-tight group-hover:text-indigo-600 transition-colors uppercase tracking-tight">{item.remarks}</p>
                                                    <p className="text-[9px] font-bold text-gray-400 mt-0.5" suppressHydrationWarning>{format(new Date(item.date), 'dd MMMM yyyy')}</p>
                                                </div>
                                                <p className={`text-sm font-black italic ${item.direction === 'IN' ? 'text-emerald-600' : 'text-red-600'}`}>
                                                    {item.direction === 'IN' ? '+' : '-'} ₹{item.amount.toLocaleString()}
                                                </p>
                                            </div>
                                        ))
                                    ) : (
                                        <div className="p-10 text-center bg-gray-50/50 rounded-[24px] border border-dashed border-gray-200">
                                            <p className="text-xs font-bold text-gray-300 italic uppercase tracking-widest">No entries in financial archives</p>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* 5. Operation Log */}
                            <section id="section-activity" className="scroll-mt-4 pt-4 border-t border-gray-50">
                                <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em] mb-10 flex items-center gap-3">
                                    <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" /> System Operations
                                </h3>
                                <ActivityHistory userId={user.userId} userName={user.fullName} />
                            </section>

                            {/* Operational Footer Actions */}
                            <div className="pt-8 border-t border-gray-50 bg-white grid grid-cols-2 gap-4">
                                <button
                                    onClick={() => onEdit?.(user)}
                                    className="py-4 px-6 bg-gray-900 hover:bg-black text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-gray-200 transition-all flex items-center justify-center gap-2 hover:-translate-y-1 active:scale-95 italic"
                                >
                                    Modify Profiling
                                </button>
                                <button
                                    onClick={() => onResetPassword?.(user.userId, user.fullName, 'user')}
                                    className="py-4 px-6 bg-white border border-gray-200 text-gray-900 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-50 transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-lg active:scale-95 italic"
                                >
                                    <Key size={14} /> Security Reset
                                </button>
                                <button
                                    onClick={() => onViewAudit?.(user)}
                                    className="col-span-2 py-4 px-6 bg-indigo-50/50 border border-indigo-100 text-indigo-600 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] hover:bg-indigo-100 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 italic"
                                >
                                    <Shield size={14} /> Comprehensive Audit Node
                                </button>
                            </div>
                            
                            <div className="h-10" aria-hidden="true" />
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )

    return createPortal(panelContent, document.body)
}
