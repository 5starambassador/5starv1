'use client'

import { useState, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { Rocket, Mail, CheckCircle2, AlertTriangle, Loader2, Users, Clock, Zap, BarChart3, Activity, ArrowRight, MousePointer2, ShieldAlert } from 'lucide-react'
import { triggerReengagementCampaign, getEngagementStats } from '@/app/engagement-actions'
import { triggerCampusEnforcementBroadcast, getCampusEnforcementStats } from '@/app/campus-enforcement-actions'
import { toast } from 'sonner'
import { CampaignManager } from './CampaignManager'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import { RolePermissions } from '@/types'

const WhatsAppConfigPanel = dynamic(() => import('./WhatsAppConfigPanel'), { 
    ssr: false,
    loading: () => <div className="h-96 w-full animate-pulse bg-gray-50 rounded-3xl border border-gray-100" />
})

interface EngagementPanelProps {
    permissions?: RolePermissions
}

export function EngagementPanel({ permissions }: EngagementPanelProps) {
    const [activeTab, setActiveTab] = useState<'overview' | 'campaigns' | 'automation'>('overview')
    const [loading, setLoading] = useState(false)
    const [lastResult, setLastResult] = useState<{ sent: number, time: Date } | null>(null)
    const [stats, setStats] = useState<{
        totalCampaigns: number,
        totalEmailsSent: number,
        dormantAmbassadors: number,
        activeJobs?: Record<string, string>
    } | null>(null)
    const [campusStats, setCampusStats] = useState<{ count: number } | null>(null)

    const fetchStats = async () => {
        const [res, campusRes] = await Promise.all([
            getEngagementStats(),
            getCampusEnforcementStats()
        ])
        if (res.success && res.stats) setStats(res.stats)
        if (campusRes.success) setCampusStats({ count: campusRes.count ?? 0 })
    }

    useEffect(() => {
        fetchStats()
        const interval = setInterval(fetchStats, 10000) // Poll for job status
        return () => clearInterval(interval)
    }, [])

    // Confirmation State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean
        type?: 'reengagement' | 'campus'
        data?: any
    }>({
        isOpen: false
    })

    const [campusLoading, setCampusLoading] = useState(false)

    const handleTriggerCampaign = () => {
        setConfirmState({ isOpen: true, type: 'reengagement' })
    }

    const handleTriggerCampusEnforcement = () => {
        setConfirmState({ isOpen: true, type: 'campus' })
    }

    const executeTriggerCampaign = async () => {
        const type = confirmState.type
        setConfirmState({ isOpen: false })

        if (type === 'reengagement') {
            setLoading(true)
            try {
                const res = await triggerReengagementCampaign()
                if (res.success) {
                    toast.success(res.message || 'Re-engagement scheduled')
                    fetchStats()
                } else {
                    toast.error(res.error || 'Operation failed')
                }
            } catch (error) {
                toast.error('Unexpected system error')
            } finally {
                setLoading(false)
            }
        } else if (type === 'campus') {
            setCampusLoading(true)
            try {
                const res = await triggerCampusEnforcementBroadcast()
                if (res.success) {
                    toast.success(res.message || 'Broadcast scheduled')
                    fetchStats()
                } else {
                    toast.error(res.error || 'Broadcast failed')
                }
            } catch (error) {
                toast.error('Unexpected system error during broadcast')
            } finally {
                setCampusLoading(false)
            }
        }
    }

    const isReengagementScheduled = stats?.activeJobs?.['SYSTEM_REENGAGEMENT']
    const isEnforcementScheduled = stats?.activeJobs?.['SYSTEM_ENFORCEMENT']

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Navigational Control */}
            <div className="flex p-1.5 bg-white/40 backdrop-blur-md rounded-[24px] border border-white/20 w-fit shadow-sm relative z-20">
                <button
                    onClick={() => setActiveTab('overview')}
                    className={`relative px-8 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-2xl ${activeTab === 'overview' ? 'text-white' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    {activeTab === 'overview' && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                        <Activity size={14} /> Overview
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('campaigns')}
                    className={`relative px-8 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-2xl ${activeTab === 'campaigns' ? 'text-white' : 'text-gray-400 hover:text-gray-600'
                        }`}
                >
                    {activeTab === 'campaigns' && (
                        <motion.div
                            layoutId="activeTab"
                            className="absolute inset-0 bg-gray-900 rounded-2xl shadow-xl shadow-gray-200"
                            transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                        />
                    )}
                    <span className="relative z-10 flex items-center gap-2">
                        <Mail size={14} /> Campaigns
                    </span>
                </button>
                {(permissions === undefined || (permissions as any).whatsappConfig?.access) && (
                    <button
                        onClick={() => setActiveTab('automation')}
                        className={`relative px-8 py-3.5 text-[11px] font-black uppercase tracking-[0.2em] transition-all rounded-2xl ${activeTab === 'automation' ? 'text-white' : 'text-gray-400 hover:text-gray-600'
                            }`}
                    >
                        {activeTab === 'automation' && (
                            <motion.div
                                layoutId="activeTab"
                                className="absolute inset-0 bg-indigo-600 rounded-2xl shadow-xl shadow-indigo-100"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                        <span className="relative z-10 flex items-center gap-2">
                            <Zap size={14} /> Automation
                        </span>
                    </button>
                )}
            </div>

            <AnimatePresence mode="wait">
                {activeTab === 'campaigns' ? (
                    <motion.div
                        key="campaigns"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.4 }}
                    >
                        <CampaignManager />
                    </motion.div>
                ) : activeTab === 'automation' ? (
                    <motion.div
                        key="automation"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.4 }}
                    >
                        <WhatsAppConfigPanel />
                    </motion.div>
                ) : (
                    <motion.div
                        key="overview"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        className="space-y-10"
                    >
                        {/* Metrics Dashboard */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                            {[
                                { label: 'Active Workflows', val: stats?.totalCampaigns, color: 'text-violet-600', icon: BarChart3, bg: 'bg-violet-50' },
                                { label: 'Dispatched Units', val: stats?.totalEmailsSent, color: 'text-blue-600', icon: Mail, bg: 'bg-blue-50' },
                                { label: 'Dormant Leads', val: stats?.dormantAmbassadors, color: 'text-amber-600', icon: Users, bg: 'bg-amber-50' }
                            ].map((s, idx) => (
                                <motion.div
                                    key={s.label}
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.1 }}
                                    className="bg-white/40 backdrop-blur-md p-6 md:p-8 rounded-[40px] border border-white/20 shadow-sm relative group overflow-hidden"
                                >
                                    <div className={`absolute -right-4 -top-4 w-24 h-24 ${s.bg} rounded-full blur-3xl opacity-0 group-hover:opacity-40 transition-opacity`} />
                                    <div className={`w-12 h-12 ${s.bg} ${s.color} rounded-2xl flex items-center justify-center mb-6 shadow-sm border border-white/10 group-hover:scale-110 transition-transform`}>
                                        <s.icon size={20} />
                                    </div>
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{s.label}</p>
                                    <p className="text-4xl font-black text-gray-900 tracking-tighter">{s.val?.toLocaleString() ?? '...'}</p>
                                </motion.div>
                            ))}
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Proactive Logic Card */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white/60 backdrop-blur-md rounded-[48px] border border-white/40 p-6 md:p-10 shadow-sm relative overflow-hidden group border-b-4 border-b-amber-500/20"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-50/50 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl transition-colors group-hover:bg-amber-100/50" />

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="w-16 h-16 bg-amber-500 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-amber-100 border-4 border-white">
                                            <Zap size={28} fill="currentColor" />
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black bg-amber-100 text-amber-600 px-3 py-1 rounded-full uppercase tracking-widest border border-amber-200">System Optimizer</span>
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tighter italic">Re-engagement Core</h3>
                                    <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">
                                        Automated algorithmic scan. Identifies ambassadors with zero activity in the previous 14 days and deploys a high-retention nudge sequence.
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 mb-10">
                                        <div className="bg-white/40 border border-white p-4 rounded-3xl">
                                            <Clock size={16} className="text-amber-500 mb-2" />
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Protocol</p>
                                            <p className="text-xs font-black text-gray-900">14-Day Inactivity</p>
                                        </div>
                                        <div className="bg-white/40 border border-white p-4 rounded-3xl">
                                            <MousePointer2 size={16} className="text-amber-500 mb-2" />
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</p>
                                            <p className="text-xs font-black text-gray-900">{isReengagementScheduled ? (isReengagementScheduled === 'PROCESSING' ? 'Running...' : 'Scheduled') : 'Standard Nudge'}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleTriggerCampaign}
                                        disabled={loading || campusLoading || !!isReengagementScheduled}
                                        className="w-full py-5 bg-gray-900 hover:bg-black text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.25em] shadow-2xl shadow-gray-200 transition-all flex items-center justify-center gap-3 disabled:opacity-70 group/btn overflow-hidden relative"
                                    >
                                        {loading || isReengagementScheduled === 'PROCESSING' ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Optimizing Ecosystem...
                                            </>
                                        ) : isReengagementScheduled === 'PENDING' ? (
                                            <>
                                                <Clock size={18} />
                                                Core Scheduled
                                            </>
                                        ) : (
                                            <>
                                                <Rocket size={18} />
                                                Deploy Re-engagement Core
                                                <ArrowRight size={18} className="ml-2 group-hover/btn:translate-x-2 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>

                            {/* Campus Enforcement Card */}
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-white/60 backdrop-blur-md rounded-[48px] border border-white/40 p-6 md:p-10 shadow-sm relative overflow-hidden group border-b-4 border-b-rose-500/20"
                            >
                                <div className="absolute top-0 right-0 w-64 h-64 bg-rose-50/50 rounded-full translate-x-1/3 -translate-y-1/3 blur-3xl transition-colors group-hover:bg-rose-100/50" />

                                <div className="relative z-10">
                                    <div className="flex items-center justify-between mb-8">
                                        <div className="w-16 h-16 bg-rose-500 text-white rounded-[24px] flex items-center justify-center shadow-xl shadow-rose-100 border-4 border-white">
                                            <ShieldAlert size={28} />
                                        </div>
                                        <div className="text-right">
                                            <span className="text-[10px] font-black bg-rose-100 text-rose-600 px-3 py-1 rounded-full uppercase tracking-widest border border-rose-200">Data Integrity</span>
                                        </div>
                                    </div>

                                    <h3 className="text-2xl font-black text-gray-900 mb-4 uppercase tracking-tighter italic">Campus Enforcement</h3>
                                    <p className="text-sm text-gray-500 mb-8 leading-relaxed font-medium">
                                        Identify and notify Parent, Staff, and Alumni ambassadors missing campus data. Multi-channel dispatch (SMS, Email, In-App).
                                    </p>

                                    <div className="grid grid-cols-2 gap-4 mb-10">
                                        <div className="bg-white/40 border border-white p-4 rounded-3xl">
                                            <Users size={16} className="text-rose-500 mb-2" />
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Targeted</p>
                                            <p className="text-xs font-black text-gray-900">{campusStats?.count ?? '...'} Ambassadors</p>
                                        </div>
                                        <div className="bg-white/40 border border-white p-4 rounded-3xl">
                                            <ShieldAlert size={16} className="text-rose-500 mb-2" />
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Status</p>
                                            <p className="text-xs font-black text-gray-900">{isEnforcementScheduled ? (isEnforcementScheduled === 'PROCESSING' ? 'Dispatching...' : 'Scheduled') : 'Mandatory Profile Update'}</p>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleTriggerCampusEnforcement}
                                        disabled={loading || campusLoading || !!isEnforcementScheduled}
                                        className="w-full py-5 bg-rose-600 hover:bg-rose-700 text-white rounded-[24px] font-black text-[11px] uppercase tracking-[0.25em] shadow-2xl shadow-rose-100 transition-all flex items-center justify-center gap-3 disabled:opacity-70 group/btn overflow-hidden relative"
                                    >
                                        {campusLoading || isEnforcementScheduled === 'PROCESSING' ? (
                                            <>
                                                <Loader2 size={18} className="animate-spin" />
                                                Processing Broadcast...
                                            </>
                                        ) : isEnforcementScheduled === 'PENDING' ? (
                                            <>
                                                <Clock size={18} />
                                                Broadcast Scheduled
                                            </>
                                        ) : (
                                            <>
                                                <Mail size={18} />
                                                Trigger Enforcement Broadcast
                                                <ArrowRight size={18} className="ml-2 group-hover/btn:translate-x-2 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </div>
                            </motion.div>

                            {/* Execution Log / Success Display */}
                            <div className="space-y-6">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.3em] px-2 italic">Historical Logs</h4>

                                <AnimatePresence mode="popLayout">
                                    {lastResult ? (
                                        <motion.div
                                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                                            animate={{ opacity: 1, scale: 1, y: 0 }}
                                            className="bg-emerald-500/90 backdrop-blur-md rounded-[48px] p-6 md:p-10 text-white shadow-2xl shadow-emerald-100 flex flex-col justify-center min-h-[300px] relative overflow-hidden"
                                        >
                                            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl" />
                                            <CheckCircle2 size={64} className="mb-6 opacity-30" />
                                            <h3 className="text-xl font-black uppercase tracking-tighter italic mb-1">Impact Confirmed</h3>
                                            <p className="text-8xl font-black tracking-tighter leading-none mb-4">
                                                {lastResult.sent}
                                            </p>
                                            <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-60">Successive Dispatches Delivered</p>
                                            <div className="mt-8 pt-6 border-t border-white/10 flex items-center gap-2">
                                                <Clock size={12} className="opacity-60" />
                                                <span className="text-[10px] font-bold opacity-60 uppercase tracking-widest">Logged: {lastResult.time.toLocaleTimeString()}</span>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center bg-gray-50/50 border-2 border-dashed border-gray-200/50 rounded-[48px] p-10 min-h-[300px] text-center">
                                            <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center text-gray-200 mb-6 shadow-sm border border-gray-100">
                                                <Activity size={32} />
                                            </div>
                                            <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest italic">Awaiting First Pulse</h4>
                                            <p className="text-[11px] text-gray-400 mt-2 font-medium max-w-[200px]">Trigger the optimization core to see impact metrics here.</p>
                                        </div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Premium Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.type === 'campus' ? "Trigger Mandatory Enforcement?" : "Initiate Ecosystem Nudge?"}
                description={
                    confirmState.type === 'campus' ? (
                        <p className="text-sm font-medium text-gray-500 leading-relaxed italic">
                            This will send SMS, Email, and In-App notifications to <strong className="text-gray-900 underline decoration-rose-200">{campusStats?.count ?? 'all'} ambassadors</strong> missing campus data. Action is immutable.
                        </p>
                    ) : (
                        <p className="text-sm font-medium text-gray-500 leading-relaxed italic">
                            This operation targets <strong className="text-gray-900 underline decoration-amber-200">Every Ambassador</strong> flagged as dormant (14+ days since last referral). Action is bulk-dispatched and cannot be recalled.
                        </p>
                    )
                }
                confirmText={confirmState.type === 'campus' ? "Execute Enforcement" : "Commence Deployment"}
                variant={confirmState.type === 'campus' ? "danger" : "warning"}
                onConfirm={executeTriggerCampaign}
                onCancel={() => setConfirmState({ isOpen: false })}
            />
        </div>
    )
}
