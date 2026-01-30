'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Copy, CheckCircle2, ChevronRight, Share2, Info, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

interface Program {
    id: number
    title: string
    description: string
    slug: string
    commissionAmount: number
    rewardType: 'CASH' | 'POINTS' | 'NONE'
    imageUrl?: string
}

interface ProgramGalleryProps {
    programs: Program[]
    referralCode: string // The ambassador's unique code
}

export function ProgramGallery({ programs, referralCode }: ProgramGalleryProps) {
    const [copiedId, setCopiedId] = useState<number | null>(null)

    const copyLink = (slug: string, id: number) => {
        // Construct the tracking link
        const baseUrl = window.location.origin
        const link = `${baseUrl}/offer/${slug}?ref=${referralCode}`

        navigator.clipboard.writeText(link)
        setCopiedId(id)
        toast.success('Tracking Link Copied!', {
            description: 'Share this link to track your referrals.'
        })

        setTimeout(() => setCopiedId(null), 2000)
    }

    if (!programs || programs.length === 0) {
        return (
            <div className="bg-white/50 backdrop-blur-sm border border-white/40 rounded-[32px] p-12 text-center">
                <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mx-auto mb-4 text-blue-400">
                    <Share2 size={32} />
                </div>
                <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2">No Active Campaigns</h3>
                <p className="text-sm text-gray-500 font-medium">Check back soon for new programs to share!</p>
            </div>
        )
    }

    return (
        <div id="pg-override-root" className="space-y-6">
            <style dangerouslySetInnerHTML={{
                __html: `
                #pg-override-root .pg-force-white {
                    background-color: #ffffff !important;
                    color: #000000 !important;
                    border: 1px solid #e5e7eb !important;
                }
                #pg-override-root .pg-force-white *,
                #pg-override-root .pg-force-white svg,
                #pg-override-root .pg-force-white path {
                    color: #000000 !important;
                    stroke: #000000 !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                }
                
                #pg-override-root .pg-force-green {
                    background-color: #22c55e !important;
                    color: #ffffff !important;
                    border: 1px solid #16a34a !important;
                }
                #pg-override-root .pg-force-green *,
                #pg-override-root .pg-force-green svg {
                    color: #ffffff !important;
                    stroke: #ffffff !important;
                    fill: none !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                    display: block !important;
                    min-width: 18px !important;
                    min-height: 18px !important;
                }
                #pg-override-root .pg-force-green path,
                #pg-override-root .pg-force-green circle,
                #pg-override-root .pg-force-green line,
                #pg-override-root .pg-force-green polyline {
                    stroke: #ffffff !important;
                    fill: none !important;
                    opacity: 1 !important;
                    visibility: visible !important;
                }
            `}} />

            <div className="flex items-center justify-between px-2">
                <div>
                    <h2 className="text-xl font-black text-gray-900 uppercase tracking-tight italic">Active Campaigns</h2>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mt-1">Share these programs & earn rewards</p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {programs.map((program) => (
                    <motion.div
                        key={program.id}
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="group bg-white rounded-[32px] border border-gray-100 p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all relative overflow-hidden"
                    >
                        {/* Reward Badge */}
                        <div className={`absolute top-0 left-0 w-full h-1.5 ${program.rewardType === 'CASH' ? 'bg-emerald-600' :
                            program.rewardType === 'POINTS' ? 'bg-amber-500' :
                                'bg-gray-300'
                            }`} />

                        <div className="flex justify-between items-start mb-4">
                            <div className={`px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 ${program.rewardType === 'CASH' ? 'bg-emerald-600 text-white border border-emerald-700 shadow-sm' :
                                program.rewardType === 'POINTS' ? 'bg-amber-500 text-white border border-amber-600 shadow-sm' :
                                    'bg-gray-100 text-gray-600 border border-gray-200'
                                }`}>
                                {program.rewardType === 'CASH' && <span>💰 Earn ₹{program.commissionAmount}</span>}
                                {program.rewardType === 'POINTS' && <span>⭐ Earn {program.commissionAmount} Pts</span>}
                                {program.rewardType === 'NONE' && <span>🤝 Volunteer</span>}
                            </div>
                        </div>

                        <div className="mb-6">
                            <h3 className="text-lg font-black text-gray-900 leading-tight mb-2 group-hover:text-blue-600 transition-colors">
                                {program.title}
                            </h3>
                            <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2">
                                {program.description || "Share this exclusive program with your network."}
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <button
                                onClick={() => copyLink(program.slug, program.id)}
                                className="flex-1 py-3 rounded-[12px] font-black text-[10px] uppercase tracking-[0.15em] flex items-center justify-center gap-2 shadow-lg shadow-gray-200 active:scale-[0.98] transition-all pg-force-white"
                            >
                                {copiedId === program.id ? 'Copied!' : 'Copy Link'} <ExternalLink size={14} />
                            </button>

                            {/* WhatsApp Share Shortcut */}
                            <button
                                onClick={() => {
                                    const baseUrl = window.location.origin
                                    const link = `${baseUrl}/offer/${program.slug}?ref=${referralCode}`
                                    const text = `Check out this program: ${program.title}\n${link}`
                                    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank')
                                }}
                                className="w-12 h-12 rounded-[12px] flex items-center justify-center shadow-md shadow-emerald-100 z-10 hover:brightness-110 transition-all pg-force-green"
                            >
                                <Share2 size={18} />
                            </button>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div >
    )
}
