'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { PageAnimate, PageItem } from '@/components/PageAnimate'
import { CheckCircle2, Clock, ExternalLink, MessageSquare, IndianRupee, Star, MousePointerClick, ChevronRight, User } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ProgramLeadsListProps {
    leads: any[]
    programs?: any[]
}

export function ProgramLeadsList({ leads, programs = [] }: ProgramLeadsListProps) {
    const [filter, setFilter] = useState<'ALL' | 'REGISTERED' | 'CLICKED'>('ALL')

    // Group by status
    const registered = leads.filter(l => l.status === 'REGISTERED')
    const clicked = leads.filter(l => l.status === 'CLICKED')

    const displayedLeads = filter === 'ALL' ? leads :
        filter === 'REGISTERED' ? registered : clicked

    return (
        <div className="space-y-12">
            {/* Luminous Atmospheric Depth - SAPPHIRE & INDIGO */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[20%] right-[-5%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[10%] left-[-5%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[120px]" />
            </div>

            {/* Quick Stats (Global) - MATCHES DASHBOARD STAT PATTERNS */}
            <div className="grid grid-cols-2 gap-6 relative z-10">
                <GlassCard
                    onClick={() => setFilter('CLICKED')}
                    className={`cursor-pointer transition-all duration-300 active:scale-95 !border-2 ${filter === 'CLICKED'
                        ? 'border-blue-400 !bg-blue-600/20 shadow-2xl shadow-blue-500/20'
                        : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                >
                    <p className="text-blue-200/40 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Total Discovery</p>
                    <div className="flex items-end justify-between">
                        <p className="text-5xl font-black text-white italic tracking-tighter tabular-nums">{leads.length}</p>
                        <div className="w-12 h-12 rounded-[1.2rem] bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400 shadow-xl shadow-blue-500/10">
                            <MousePointerClick size={24} />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard
                    onClick={() => setFilter('REGISTERED')}
                    className={`cursor-pointer transition-all duration-300 active:scale-95 !border-2 ${filter === 'REGISTERED'
                        ? 'border-emerald-400 !bg-emerald-600/20 shadow-2xl shadow-emerald-500/20'
                        : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                >
                    <p className="text-emerald-200/40 text-[10px] font-black uppercase tracking-[0.3em] mb-4">Conversions</p>
                    <div className="flex items-end justify-between">
                        <p className="text-5xl font-black text-white italic tracking-tighter tabular-nums">{registered.length}</p>
                        <div className="w-12 h-12 rounded-[1.2rem] bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shadow-xl shadow-emerald-500/10">
                            <CheckCircle2 size={24} />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-3 pb-2 overflow-x-auto relative z-10 scrollbar-none">
                <button
                    onClick={() => setFilter('CLICKED')}
                    className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 flex items-center gap-2 ${filter === 'CLICKED' ? 'bg-blue-600 text-white border-blue-500 shadow-[0_0_20px_rgba(37,99,235,0.3)]' : 'bg-blue-600/10 text-blue-400 border-blue-500/20 hover:bg-blue-600/20'}`}
                >
                    <MousePointerClick size={12} strokeWidth={3} /> Clicks Only
                </button>
                <button
                    onClick={() => setFilter('REGISTERED')}
                    className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 flex items-center gap-2 ${filter === 'REGISTERED' ? 'bg-emerald-600 text-white border-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]' : 'bg-emerald-600/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-600/20'}`}
                >
                    <CheckCircle2 size={12} strokeWidth={3} /> Converted
                </button>
                <button
                    onClick={() => setFilter('ALL')}
                    className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 ${filter === 'ALL' ? 'bg-white text-slate-900 border-white shadow-[0_0_20px_rgba(255,255,255,0.3)]' : 'bg-white/5 text-white/40 border-white/10 hover:bg-white/10'}`}
                >
                    Show All
                </button>
            </div>

            {/* List Grouped by Program */}
            <PageAnimate key={filter}>
                <div className="space-y-12">
                    {programs.length === 0 ? (
                        <div className="bg-white/5 backdrop-blur-sm border border-white/5 border-dashed rounded-[24px] p-8 flex flex-col items-center justify-center text-center">
                            <p className="text-white/40 font-medium text-sm">No active programs found.</p>
                        </div>
                    ) : (
                        programs.map((program) => {
                            const programLeads = displayedLeads.filter(l => l.programId === program.id)

                            return (
                                <div key={program.id} className="space-y-6">
                                    <div className="flex flex-col gap-3 px-2">
                                        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                                            <h2 className="text-[14px] font-black text-white uppercase tracking-[0.2em] leading-snug max-w-[80%]">{program.title}</h2>
                                            <div className="h-px min-w-[30px] flex-1 bg-gradient-to-r from-blue-500/40 to-transparent" />
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 shrink-0">
                                                <span className="text-[10px] font-black text-blue-400 tracking-tighter italic">{programLeads.length}</span>
                                                <span className="text-[8px] font-black text-blue-500/50 uppercase tracking-widest">Leads</span>
                                            </div>
                                        </div>
                                    </div>

                                    {programLeads.length === 0 ? (
                                        <div className="bg-white/5 border border-white/5 border-dashed rounded-[20px] p-6 text-center">
                                            <p className="text-white/20 text-xs font-medium uppercase tracking-wider">No {filter === 'ALL' ? '' : filter.toLowerCase()} leads for this program</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {programLeads.map((lead: any) => (
                                                <LeadCard key={lead.id} lead={lead} />
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )
                        })
                    )}
                </div>
            </PageAnimate>
        </div>
    )
}

function LeadCard({ lead }: { lead: any }) {
    const isRegistered = lead.status === 'REGISTERED'
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    return (
        <PageItem>
            <GlassCard
                className={`group !p-8 !bg-gradient-to-br !from-indigo-950 !via-indigo-900/90 !to-blue-900 border transition-all duration-300 hover:-translate-y-1 active:scale-[0.98] ${isRegistered ? 'border-emerald-400/40 shadow-2xl shadow-emerald-500/10' : 'border-white/10 hover:border-white/20 shadow-xl'}`}
            >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex-1">
                        <div className="flex items-center gap-3 mb-3">
                            <div className={`px-2.5 py-1 rounded-lg text-[9px] font-black uppercase tracking-[0.15em] border ${isRegistered ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-blue-500/10 border-blue-500/20 text-blue-400'}`}>
                                {lead.program?.title || 'External Program'}
                            </div>
                            {lead.program?.rewardType === 'CASH' && (
                                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-500">
                                    <IndianRupee size={10} strokeWidth={3} />
                                    <span className="text-[9px] font-black uppercase tracking-[0.1em] italic">Cash Reward</span>
                                </div>
                            )}
                        </div>

                        <h3 className="text-xl font-black text-white group-hover:text-blue-400 transition-colors tracking-tight mb-4 italic uppercase">
                            {lead.studentName || lead.visitorName || 'Lead Discovery'}
                        </h3>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Contact Node</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center text-blue-400">
                                        <User size={14} />
                                    </div>
                                    <span className="text-xs font-bold text-white/70">{lead.visitorName || 'Referral Source'}</span>
                                </div>
                            </div>
                            <div className="flex flex-col gap-1.5 p-3 rounded-2xl bg-white/[0.03] border border-white/5">
                                <span className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em]">Link Transmission</span>
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                                        <MousePointerClick size={14} />
                                    </div>
                                    <span className="text-xs font-bold text-white/70">{lead.visitorMobile}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex flex-col items-end gap-3 shrink-0">
                        <div className={`px-4 py-2 rounded-2xl border flex items-center gap-2 shadow-sm ${isRegistered ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
                            {isRegistered ? <CheckCircle2 size={14} strokeWidth={3} /> : <Clock size={14} strokeWidth={3} />}
                            <span className="text-[11px] font-black uppercase tracking-[0.2em] italic">{lead.status}</span>
                        </div>

                        {lead.program?.commissionAmount > 0 && (
                            <div className={`flex flex-col items-end p-3 rounded-2xl border ${isRegistered ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-white/5 border-white/10 opacity-50'}`}>
                                <span className="text-[8px] font-black text-white/30 uppercase tracking-[0.2em] mb-1">Potential Yield</span>
                                <div className={`flex items-center gap-2 font-black italic ${isRegistered ? 'text-emerald-400' : 'text-blue-400'}`}>
                                    <span className="text-2xl tracking-tighter">
                                        {lead.program.rewardType === 'CASH' ? '₹' : ''}{lead.program.commissionAmount}
                                    </span>
                                    <span className="text-[10px] uppercase tracking-widest bg-white/10 px-1.5 py-0.5 rounded-md">
                                        {lead.program.rewardType === 'CASH' ? 'Cash' : 'Points'}
                                    </span>
                                </div>
                            </div>
                        )}

                        <div className="flex items-center gap-2 text-white/20 text-[9px] font-black uppercase tracking-[0.2em] mt-2">
                            <Clock size={10} /> {mounted ? new Date(lead.clickedAt).toLocaleDateString() : 'Syncing...'}
                        </div>
                    </div>
                </div>
            </GlassCard>
        </PageItem>
    )
}
