'use client'

import { GlassCard } from '@/components/ui/GlassCard'
import { PageAnimate, PageItem } from '@/components/PageAnimate'
import { CheckCircle2, Clock, ExternalLink, MessageSquare, IndianRupee, Star, MousePointerClick, ChevronRight, User, Phone } from 'lucide-react'
import { useState, useEffect } from 'react'

interface ProgramLeadsListProps {
    leads: any[]
    programs?: any[]
    user: any
}

export function ProgramLeadsList({ leads, programs = [], user }: ProgramLeadsListProps) {
    const [filter, setFilter] = useState<'ALL' | 'REGISTERED' | 'CLICKED'>('ALL')

    // Deduplicate: Group by mobile + program and pick best/latest
    const deduplicatedLeads = Object.values(
        leads.reduce((acc: Record<string, any>, lead) => {
            const key = `${lead.visitorMobile}-${lead.programId}`
            const existing = acc[key]
            if (!existing) {
                acc[key] = lead
            } else {
                const existingIsReg = existing.status === 'REGISTERED'
                const newIsReg = lead.status === 'REGISTERED'

                if (newIsReg && !existingIsReg) {
                    acc[key] = lead
                } else if (new Date(lead.clickedAt) > new Date(existing.clickedAt)) {
                    if (newIsReg === existingIsReg) {
                        acc[key] = lead
                    }
                }
            }
            return acc
        }, {})
    )

    // Group by status
    const registered = deduplicatedLeads.filter(l => l.status === 'REGISTERED')
    const clicked = deduplicatedLeads.filter(l => l.status === 'CLICKED')

    const displayedLeads = filter === 'ALL' ? deduplicatedLeads :
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
                                                <LeadListItem key={lead.id} lead={lead} user={user} />
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

function LeadListItem({ lead, user }: { lead: any, user: any }) {
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
                        {/* WhatsApp Nudge Button */}
                        <a 
                            href={`https://wa.me/${lead.visitorMobile}?text=${encodeURIComponent(`Hello! I'm *${user?.fullName || 'an Ambassador'}*, an Ambassador from ACHARIYA. I'm reaching out regarding your interest in the *${lead.program?.title || 'Program'}*. I'd love to share more details and help with your inquiry!`)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 hover:bg-emerald-500/20 hover:scale-110 active:scale-95 transition-all shadow-lg"
                            title="Nudge via WhatsApp"
                        >
                            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                        </a>

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
