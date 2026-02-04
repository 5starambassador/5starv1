'use client'

import { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

interface Program {
    id: number
    title: string
    description: string
    slug: string
    commissionAmount: number
    rewardType: 'CASH' | 'POINTS' | 'NONE'
}

interface ProgramGalleryProps {
    programs: Program[]
    referralCode: string
}

const CARD_THEMES = [
    { bg: '#EEF2FF', text: '#1E3A8A', border: '#C7D2FE', accent: '#3B82F6' },
    { bg: '#FDF2F8', text: '#9D174D', border: '#FBCFE8', accent: '#F43F5E' },
    { bg: '#ECFDF5', text: '#065F46', border: '#A7F3D0', accent: '#10B981' },
    { bg: '#FFFBEB', text: '#92400E', border: '#FEF08A', accent: '#F59E0B' },
    { bg: '#F5F3FF', text: '#5B21B6', border: '#DDD6FE', accent: '#8B5CF6' },
]

export function ProgramGallery({ programs, referralCode }: ProgramGalleryProps) {
    const [copiedId, setCopiedId] = useState<number | null>(null)
    const scrollRef = useRef<HTMLDivElement>(null)
    const [isPaused, setIsPaused] = useState(false)

    useEffect(() => {
        if (!scrollRef.current || programs.length <= 1 || isPaused) return
        const interval = setInterval(() => {
            if (scrollRef.current) {
                const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
                if (scrollLeft + clientWidth >= scrollWidth - 10) {
                    scrollRef.current.scrollTo({ left: 0, behavior: 'smooth' })
                } else {
                    scrollRef.current.scrollBy({ left: clientWidth, behavior: 'smooth' })
                }
            }
        }, 6000)
        return () => clearInterval(interval)
    }, [programs.length, isPaused])

    const copyLink = (slug: string, id: number) => {
        const baseUrl = window.location.origin
        const link = `${baseUrl}/offer/${slug}?ref=${referralCode}`
        navigator.clipboard.writeText(link)
        setCopiedId(id)
        toast.success('Link Copied!')
        setTimeout(() => setCopiedId(null), 2000)
    }

    const scroll = (direction: 'left' | 'right') => {
        if (scrollRef.current) {
            const { scrollLeft, clientWidth } = scrollRef.current
            scrollRef.current.scrollTo({
                left: direction === 'left' ? scrollLeft - clientWidth : scrollLeft + clientWidth,
                behavior: 'smooth'
            })
        }
    }

    if (!programs || programs.length === 0) return null

    return (
        <div className="relative w-full overflow-hidden mt-0 pt-0" id="pg-master-root">
            {/* FORCE TEXT RENDERING AND HIDE SCROLLBAR */}
            <style dangerouslySetInnerHTML={{
                __html: `
                #pg-master-root .pg-card h3 { color: var(--text-color) !important; font-weight: 900 !important; }
                #pg-master-root .pg-card p { color: var(--text-color) !important; font-weight: 800 !important; opacity: 0.8 !important; }
                #pg-master-root .pg-badge { color: var(--text-color) !important; border-color: var(--text-color) !important; }
                #pg-master-root .hide-scrollbar::-webkit-scrollbar { display: none; }
                
                /* Nuclear Visibility Fix for Icons */
                #pg-master-root svg { display: inline-block !important; overflow: visible !important; }
            `}} />

            <div className="flex items-center justify-between px-4 pb-2 pt-2">
                <div className="relative">
                    <div className="flex items-center gap-1.5">
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="#FACC15" stroke="#FACC15" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{ display: 'block' }}>
                            <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
                            <path d="m5 3 1 1" /><path d="m19 3-1 1" /><path d="m5 21 1-1" /><path d="m19 21-1-1" />
                        </svg>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter italic leading-none">
                            Exclusives
                        </h2>
                    </div>
                    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.4em] mt-0.5 ml-7">
                        Curated Campaigns
                    </p>
                </div>

                {programs.length > 1 && (
                    <div className="flex gap-2.5">
                        {/* LEFT ARROW */}
                        <button
                            onClick={() => scroll('left')}
                            className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                            aria-label="Previous Campaign"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="15 18 9 12 15 6" />
                            </svg>
                        </button>
                        {/* RIGHT ARROW */}
                        <button
                            onClick={() => scroll('right')}
                            className="w-10 h-10 rounded-full bg-white/10 border border-white/20 flex items-center justify-center hover:bg-white/20 active:scale-90 transition-all"
                            aria-label="Next Campaign"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="9 18 15 12 9 6" />
                            </svg>
                        </button>
                    </div>
                )}
            </div>

            <div
                ref={scrollRef}
                onMouseEnter={() => setIsPaused(true)}
                onMouseLeave={() => setIsPaused(false)}
                className="flex gap-4 overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-6 px-4 scroll-smooth mt-1"
                style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
            >
                {programs.map((program, index) => {
                    const theme = CARD_THEMES[index % CARD_THEMES.length]

                    return (
                        <div key={program.id} className="flex-none w-[92%] md:w-[45%] lg:w-[32%] snap-center">
                            <motion.div
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                className="pg-card h-full rounded-[45px] p-6 border-2 flex flex-col min-h-[200px] relative overflow-hidden shadow-2xl shadow-black/40"
                                style={{
                                    backgroundColor: theme.bg,
                                    borderColor: theme.border,
                                    '--text-color': theme.text
                                } as any}
                            >
                                {/* Side Accent Line */}
                                <div style={{ backgroundColor: theme.accent }} className="absolute left-0 top-0 bottom-0 w-2 opacity-30" />

                                <div className="flex justify-between items-start mb-2 relative z-10">
                                    {program.rewardType !== 'NONE' ? (
                                        <div className="pg-badge px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest border-2 bg-white/50 shadow-sm">
                                            {program.rewardType === 'CASH' ? `₹${program.commissionAmount} Reward` : `${program.commissionAmount} Points`}
                                        </div>
                                    ) : <div className="h-4" />}
                                </div>

                                <div className="mb-4 flex-grow relative z-10">
                                    <h3 className="text-2xl leading-[1.1] mb-2 tracking-tight line-clamp-2 uppercase italic">
                                        {program.title}
                                    </h3>
                                    <p className="text-xs leading-relaxed line-clamp-3 italic font-bold">
                                        {program.description || "Unlock exclusive benefits by sharing this premium program with your network."}
                                    </p>
                                </div>

                                <div className="mt-auto relative z-10 flex gap-4">
                                    <button
                                        onClick={() => copyLink(program.slug, program.id)}
                                        className="flex-grow py-4 rounded-3xl bg-[#0F172A] text-white font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 active:scale-[0.98] transition-all hover:bg-slate-800 shadow-xl"
                                    >
                                        <span style={{ color: '#FFFFFF' }}>
                                            {copiedId === program.id ? 'COPIED' : 'COPY LINK'}
                                        </span>
                                        {copiedId === program.id ? (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                                        ) : (
                                            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                                        )}
                                    </button>

                                    <button
                                        onClick={() => {
                                            const baseUrl = window.location.origin
                                            const link = `${baseUrl}/offer/${program.slug}?ref=${referralCode}`
                                            const text = `Join this exclusive program: ${program.title}\n${link}`
                                            window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                                        }}
                                        style={{ backgroundColor: theme.accent }}
                                        className="w-14 h-14 rounded-2xl flex items-center justify-center shadow-lg active:scale-95 transition-all flex-shrink-0"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8" /><polyline points="16 6 12 2 8 6" /><line x1="12" y1="2" x2="12" y2="15" /></svg>
                                    </button>
                                </div>
                            </motion.div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
