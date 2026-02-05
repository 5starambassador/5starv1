'use client'

import { motion } from 'framer-motion'
import { PageAnimate } from '@/components/PageAnimate'
import { CheckCircle2, Clock, ExternalLink, MessageSquare, IndianRupee, Star, MousePointerClick } from 'lucide-react'
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
        <div className="space-y-8">
            {/* Quick Stats (Global) */}
            <div className="grid grid-cols-2 gap-4">
                <div onClick={() => setFilter('CLICKED')} className={`cursor-pointer transition-all border p-4 rounded-2xl backdrop-blur-md ${filter === 'CLICKED' ? 'bg-indigo-500/20 border-indigo-500 ring-1 ring-indigo-400' : 'bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border-indigo-500/30 hover:border-indigo-500/50'}`}>
                    <p className="text-indigo-200 text-xs font-bold uppercase tracking-widest mb-1">Total Clicks</p>
                    <p className="text-3xl font-black text-white">{leads.length}</p>
                </div>
                <div onClick={() => setFilter('REGISTERED')} className={`cursor-pointer transition-all border p-4 rounded-2xl backdrop-blur-md ${filter === 'REGISTERED' ? 'bg-emerald-500/20 border-emerald-500 ring-1 ring-emerald-400' : 'bg-gradient-to-br from-emerald-500/20 to-teal-500/20 border-emerald-500/30 hover:border-emerald-500/50'}`}>
                    <p className="text-emerald-200 text-xs font-bold uppercase tracking-widest mb-1">Converted</p>
                    <p className="text-3xl font-black text-white">{registered.length}</p>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex items-center gap-2 pb-2 overflow-x-auto">
                <button
                    onClick={() => setFilter('ALL')}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all ${filter === 'ALL' ? 'bg-white text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}
                >
                    Show All
                </button>
                <button
                    onClick={() => setFilter('REGISTERED')}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${filter === 'REGISTERED' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-white/5 text-emerald-400/80 hover:bg-emerald-500/10'}`}
                >
                    <CheckCircle2 size={12} /> Converted
                </button>
                <button
                    onClick={() => setFilter('CLICKED')}
                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all flex items-center gap-2 ${filter === 'CLICKED' ? 'bg-indigo-500 text-white shadow-lg shadow-indigo-500/20' : 'bg-white/5 text-indigo-400/80 hover:bg-indigo-500/10'}`}
                >
                    <MousePointerClick size={12} /> Clicks Only
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
                                <div key={program.id} className="space-y-4">
                                    <div className="flex items-center gap-3 px-2">
                                        <div className="h-px flex-1 bg-gradient-to-r from-white/20 to-transparent" />
                                        <h2 className="text-sm font-bold text-indigo-300 uppercase tracking-widest">{program.title}</h2>
                                        <span className="bg-white/10 text-white/60 text-[10px] font-bold px-2 py-0.5 rounded-full">{programLeads.length}</span>
                                        <div className="h-px flex-1 bg-gradient-to-l from-white/20 to-transparent" />
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
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className={`group relative bg-gradient-to-br ${isRegistered ? 'from-emerald-900/40 to-slate-900/40 border-emerald-500/30' : 'from-slate-800/60 to-slate-900/60 border-white/10'} backdrop-blur-md rounded-[24px] p-5 overflow-hidden transition-all hover:shadow-xl hover:scale-[1.01]`}
        >
            <div className="relative z-10">
                <div className="flex justify-between items-start mb-3">
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-wider bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                                {lead.program?.title || 'External Program'}
                            </span>
                        </div>
                        <h3 className="font-bold text-lg text-white group-hover:text-amber-300 transition-colors">
                            {lead.studentName || lead.visitorName || 'Prospective Student'}
                        </h3>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                            <p className="text-white/60 text-xs font-medium flex items-center gap-1.5">
                                <span className="text-white/30 uppercase tracking-wide text-[9px]">Contact:</span> {lead.visitorName || 'Lead'}
                            </p>
                            <p className="text-white/60 text-xs font-medium flex items-center gap-1.5">
                                <span className="text-white/30 uppercase tracking-wide text-[9px]">Mobile:</span> {lead.visitorMobile}
                            </p>
                        </div>
                    </div>

                    <div className={`px-3 py-1.5 rounded-full border flex items-center gap-1.5 ${isRegistered ? 'bg-emerald-500/20 border-emerald-500/30 text-emerald-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300'}`}>
                        {isRegistered ? <CheckCircle2 size={12} /> : <MousePointerClick size={12} />}
                        <span className="text-[10px] font-black uppercase tracking-widest">{lead.status}</span>
                    </div>
                </div>

                <div className="flex items-center justify-between mt-4 text-white/40 text-xs font-medium border-t border-white/5 pt-3">
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <Clock size={12} /> {mounted ? new Date(lead.clickedAt).toLocaleDateString() : 'Loading...'}
                        </span>
                        {lead.program?.commissionAmount > 0 && (
                            <span className={`flex items-center gap-1 ${isRegistered ? 'text-emerald-400' : 'text-white/40'}`}>
                                {lead.program.rewardType === 'CASH' ? <IndianRupee size={12} /> : <Star size={12} />}
                                {lead.program.commissionAmount} {lead.program.rewardType === 'CASH' ? 'INR' : 'Pts'}
                            </span>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    )
}
