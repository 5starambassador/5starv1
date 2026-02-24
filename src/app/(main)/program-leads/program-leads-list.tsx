'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { PageAnimate, PageItem } from '@/components/PageAnimate'
import { CheckCircle2, Clock, ExternalLink, MessageSquare, IndianRupee, Star, MousePointerClick, ChevronRight, User, Phone } from 'lucide-react'
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
            <div className="grid grid-cols-2 gap-4 relative z-10">
                <GlassCard
                    onClick={() => setFilter('CLICKED')}
                    className={`cursor-pointer transition-all duration-300 active:scale-95 !border-2 py-3 px-4 ${filter === 'CLICKED'
                        ? 'border-orange-400 !bg-orange-600/20 shadow-2xl shadow-orange-500/20'
                        : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                >
                    <p className="text-orange-200/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Discovery</p>
                    <div className="flex items-center justify-between">
                        <p className="text-4xl font-black text-white italic tracking-tighter tabular-nums">{leads.length}</p>
                        <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-400/30 flex items-center justify-center text-orange-400">
                            <MousePointerClick size={20} />
                        </div>
                    </div>
                </GlassCard>

                <GlassCard
                    onClick={() => setFilter('REGISTERED')}
                    className={`cursor-pointer transition-all duration-300 active:scale-95 !border-2 py-3 px-4 ${filter === 'REGISTERED'
                        ? 'border-emerald-400 !bg-emerald-600/20 shadow-2xl shadow-emerald-500/20'
                        : 'border-white/5 bg-white/5 hover:border-white/10'}`}
                >
                    <p className="text-emerald-200/40 text-[10px] font-black uppercase tracking-[0.2em] mb-2">Conversions</p>
                    <div className="flex items-center justify-between">
                        <p className="text-4xl font-black text-white italic tracking-tighter tabular-nums">{registered.length}</p>
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                            <CheckCircle2 size={20} />
                        </div>
                    </div>
                </GlassCard>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-3 pb-2 overflow-x-auto relative z-10 scrollbar-none">
                <button
                    onClick={() => setFilter('CLICKED')}
                    className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 flex items-center gap-2 ${filter === 'CLICKED'
                        ? 'bg-orange-500 text-white border-orange-400 shadow-[0_0_20px_rgba(249,115,22,0.3)]'
                        : 'bg-orange-500/10 text-orange-400/70 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/20'}`}
                >
                    <MousePointerClick size={12} strokeWidth={3} /> Clicks
                </button>
                <button
                    onClick={() => setFilter('REGISTERED')}
                    className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 flex items-center gap-2 ${filter === 'REGISTERED'
                        ? 'bg-emerald-500 text-white border-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.3)]'
                        : 'bg-emerald-500/10 text-emerald-400/70 border-emerald-500/20 hover:border-emerald-500/40 hover:bg-emerald-500/20'}`}
                >
                    <CheckCircle2 size={12} strokeWidth={3} /> Converted
                </button>
                <button
                    onClick={() => setFilter('ALL')}
                    className={`px-6 py-2.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] transition-all border shrink-0 ${filter === 'ALL'
                        ? 'bg-white text-slate-900 border-white shadow-[0_0_20px_rgba(255,255,255,0.1)]'
                        : 'bg-white/5 text-white/40 border-white/10 hover:border-white/20 hover:bg-white/10'}`}
                >
                    All
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
                                            <h2 className="text-[16px] font-black text-white uppercase tracking-[0.2em] leading-snug max-w-[80%]">{program.title}</h2>
                                            <div className="h-px min-w-[30px] flex-1 bg-gradient-to-r from-blue-500/40 to-transparent" />
                                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 shrink-0">
                                                <span className="text-[11px] font-black text-blue-400 tracking-tighter italic">{programLeads.length}</span>
                                                <span className="text-[9px] font-black text-blue-500/50 uppercase tracking-widest">Leads</span>
                                            </div>
                                        </div>
                                    </div>

                                    {programLeads.length === 0 ? (
                                        <div className="bg-white/5 border border-white/5 border-dashed rounded-[20px] p-6 text-center">
                                            <p className="text-white/20 text-xs font-medium uppercase tracking-wider">No {filter === 'ALL' ? '' : filter.toLowerCase()} leads for this program</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-1">
                                            {programLeads.map((lead: any) => (
                                                <LeadListItem key={lead.id} lead={lead} />
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

function LeadListItem({ lead }: { lead: any }) {
    const isRegistered = lead.status === 'REGISTERED' || lead.status === 'COVERED'
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const theme = isRegistered
        ? { text: 'text-emerald-400', bg: 'bg-emerald-500/5', border: 'border-emerald-500/20', dot: 'bg-emerald-500', icon: 'text-emerald-400/50' }
        : { text: 'text-orange-400', bg: 'bg-orange-500/5', border: 'border-orange-500/20', dot: 'bg-orange-500', icon: 'text-orange-400/50' }

    return (
        <PageItem>
            <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border transition-all duration-300 hover:bg-white/[0.04] ${theme.bg} ${theme.border}`}>
                <div className="flex items-center gap-5 min-w-0 flex-1">
                    <div className="relative shrink-0">
                        <div className={`w-11 h-11 rounded-xl bg-white/5 flex items-center justify-center ${theme.text} border border-white/10`}>
                            <User size={20} />
                        </div>
                        <div className={`absolute -bottom-1 -right-1 w-4.5 h-4.5 rounded-full border-2 border-slate-950 flex items-center justify-center ${theme.dot} shadow-lg shadow-black/50`}>
                            {isRegistered ? <CheckCircle2 size={10} className="text-white" strokeWidth={4} /> : <MousePointerClick size={10} className="text-white" strokeWidth={4} />}
                        </div>
                    </div>

                    <div className="min-w-0">
                        <h4 className="text-[17px] font-black text-white truncate uppercase tracking-tight flex items-center gap-3">
                            {lead.studentName || lead.visitorName || 'Lead Discovery'}
                        </h4>
                        {lead.visitorName && (lead.studentName ? lead.studentName !== lead.visitorName : true) && (
                            <p className="text-[12px] font-bold text-white/30 uppercase tracking-[0.15em] leading-none mt-1.5">
                                Parent: <span className="text-white/60 font-black">{lead.visitorName}</span>
                            </p>
                        )}
                    </div>
                </div>

                <div className="flex flex-row items-center justify-between sm:justify-end gap-8 sm:gap-14 shrink-0 border-t sm:border-t-0 border-white/5 pt-4 sm:pt-0">
                    <div className="flex flex-col items-start sm:items-end leading-none gap-2">
                        <span className="text-[12px] font-black text-white/50 tracking-wide flex items-center gap-2 group/meta">
                            <Phone size={11} className={`${theme.icon} group-hover:text-white transition-colors`} />
                            <span className="courier-prime group-hover:text-white transition-colors">{lead.visitorMobile}</span>
                        </span>
                        <span className="text-[10px] font-bold text-white/20 italic tracking-wider flex items-center gap-1.5">
                            <Clock size={10} className="text-white/10" />
                            {mounted ? new Date(lead.clickedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) : '...'}
                        </span>
                    </div>

                    <div className="flex items-center gap-5">
                        {lead.program?.commissionAmount > 0 && (
                            <div className="flex flex-col items-end leading-none">
                                <div className={`text-base font-black italic ${theme.text} mb-0.5`}>
                                    {lead.program.rewardType === 'CASH' ? '₹' : ''}{lead.program.commissionAmount}
                                </div>
                                <div className="text-[8px] font-black text-white/20 uppercase tracking-[0.2em] not-italic">Yield</div>
                            </div>
                        )}
                        <div className={`px-4 py-2 rounded-xl border text-[10px] font-black uppercase tracking-[0.2em] italic flex items-center gap-2.5 shadow-xl transition-all hover:scale-105 active:scale-95 ${theme.bg} ${theme.border} ${theme.text}`}>
                            <div className={`w-2 h-2 rounded-full ${theme.dot} animate-pulse shadow-[0_0_10px_${isRegistered ? 'rgba(16,185,129,0.5)' : 'rgba(249,115,22,0.5)'}]`} />
                            {lead.status === 'CLICKED' ? 'Clicked' : 'Converted'}
                        </div>
                    </div>
                </div>
            </div>
        </PageItem>
    )
}
