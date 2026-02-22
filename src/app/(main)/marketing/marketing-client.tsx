'use client'

import { useState, useEffect } from 'react'
import { Search, Filter, Download, Share2, Copy, Check, FileImage, FileText, PlayCircle, ExternalLink, Megaphone, FolderClosed } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { PageAnimate, PageItem } from '@/components/PageAnimate'
import { encryptReferralCode } from '@/lib/crypto'

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://5starambassador.com'

interface Asset {
    id: number
    title: string
    description: string
    type: 'IMAGE' | 'VIDEO' | 'PDF' | 'LINK'
    url: string
    thumbnailUrl?: string
    category: string
    tags?: string[]
}

interface MarketingClientProps {
    grouped: Record<string, Asset[]>
    categories: string[]
    referralCode?: string
}

export function MarketingClient({ grouped, categories, referralCode }: MarketingClientProps) {
    const [activeCategory, setActiveCategory] = useState<string>(categories[0] || 'All')
    const [searchQuery, setSearchQuery] = useState('')
    const [copiedUrl, setCopiedUrl] = useState<string | null>(null)
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    const encryptedCode = referralCode ? encryptReferralCode(referralCode) : ''
    const referralLink = encryptedCode ? `${APP_URL}/r/${encryptedCode}` : ''

    const allAssets = Object.values(grouped).flat()

    const filteredAssets = activeCategory === 'All'
        ? allAssets
        : grouped[activeCategory] || []

    const displayAssets = filteredAssets.filter(asset =>
        asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleCopyAssetLink = (asset: Asset) => {
        const textToCopy = `${asset.title}\n\n${asset.description}\n\nAsset: ${asset.url}\n\n${referralCode ? `Join me at Achariya: ${referralLink}` : ''}`
        navigator.clipboard.writeText(textToCopy)
        setCopiedUrl(asset.url)
        toast.success('Asset details & invite copied!')
        setTimeout(() => setCopiedUrl(null), 2000)
    }

    const handleShare = async (asset: Asset) => {
        const shareData = {
            title: asset.title,
            text: `${asset.description}\n\nJoin me at Achariya: ${referralLink}`,
            url: asset.url
        }

        if (navigator.share) {
            try {
                await navigator.share(shareData)
            } catch (err) {
                if ((err as Error).name !== 'AbortError') {
                    navigator.clipboard.writeText(shareData.url)
                    toast.success('Link copied!')
                }
            }
        } else {
            navigator.clipboard.writeText(shareData.url)
            toast.success('Link copied!')
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'IMAGE': return <FileImage size={14} className="text-purple-400" />
            case 'VIDEO': return <PlayCircle size={14} className="text-rose-400" />
            case 'PDF': return <FileText size={14} className="text-amber-400" />
            case 'LINK': return <ExternalLink size={14} className="text-blue-400" />
            default: return <FileText size={14} className="text-gray-400" />
        }
    }

    if (!mounted) return null

    return (
        <div className="relative w-full min-h-screen font-[family-name:var(--font-outfit)]">

            {/* Dashboard-Style Atmospheric Radiance - SAPPHIRE & INDIGO */}
            <div className="fixed inset-0 bg-[#0f172a] -z-10 overflow-hidden">
                <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px]" />
                <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[140px]" />
                <div className="absolute top-[40%] right-[15%] w-[400px] h-[400px] bg-blue-600/10 rounded-full blur-[120px]" />
            </div>

            <PageAnimate className="w-[92%] max-w-6xl mx-auto flex flex-col gap-8 pb-32 relative z-10 pt-10 sm:pt-16">

                <PageItem className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="flex flex-col gap-5">
                        <div className="flex items-center gap-5">
                            <div className="p-4 bg-gradient-to-br from-blue-600 to-blue-900 rounded-2xl border border-white/20 shadow-[0_10px_30px_rgba(30,58,138,0.4)]">
                                <Megaphone className="text-white" size={28} />
                            </div>
                            <h1 className="text-4xl md:text-5xl font-black text-white tracking-tight uppercase leading-none italic">
                                PROMO KIT
                            </h1>
                        </div>
                        <p className="text-blue-200/40 font-black uppercase tracking-[0.2em] text-[11px] max-w-md">
                            Official marketing infrastructure & social transmission tools.
                        </p>
                    </div>

                    {/* Compact Search Bar */}
                    <div className="relative w-full md:w-72">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={16} />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            className="w-full pl-11 pr-4 h-12 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:bg-white/10 focus:border-indigo-500/50 outline-none transition-all shadow-inner text-sm"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </PageItem>

                {/* 2. CATEGORY CHIPS - POLISHED */}
                <PageItem className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveCategory('All')}
                        className={`h-10 px-6 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${activeCategory === 'All'
                            ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                            : 'bg-white/5 text-blue-200/40 border-white/5 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        All Transmissions
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`h-10 px-6 rounded-full text-[9px] font-black uppercase tracking-[0.2em] transition-all border ${activeCategory === cat
                                ? 'bg-blue-600 text-white border-blue-400 shadow-[0_0_20px_rgba(37,99,235,0.3)]'
                                : 'bg-white/5 text-blue-200/40 border-white/5 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </PageItem>

                {/* 3. LINK TRANSMISSION HUB - HIGH DENSITY LIST */}
                <div className="flex flex-col gap-3">
                    <AnimatePresence mode="popLayout">
                        {displayAssets.length > 0 ? (
                            displayAssets.map((asset, idx) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, x: -10 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, scale: 0.98 }}
                                    key={asset.id}
                                    className="group relative flex flex-col sm:flex-row items-stretch sm:items-center gap-4 p-3 sm:p-4 bg-white/[0.03] hover:bg-white/[0.08] border border-white/10 hover:border-indigo-500/30 rounded-2xl transition-all duration-300 backdrop-blur-md"
                                >
                                    {/* Icon Zone */}
                                    <div className="shrink-0 w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-indigo-600/20 to-blue-900/40 rounded-xl border border-white/10 flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg relative overflow-hidden">
                                        <div className="absolute inset-x-0 bottom-0 h-1 bg-indigo-500/50" />
                                        {asset.type === 'IMAGE' ? <FileImage size={24} className="text-indigo-400" /> :
                                            asset.type === 'VIDEO' ? <PlayCircle size={24} className="text-rose-400" /> :
                                                asset.type === 'PDF' ? <FileText size={24} className="text-amber-400" /> :
                                                    <ExternalLink size={24} className="text-blue-400" />}
                                    </div>

                                    {/* Content Area */}
                                    <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-6">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-bold text-white text-base sm:text-lg tracking-tight truncate group-hover:text-indigo-300 transition-colors uppercase italic leading-none">
                                                    {asset.title}
                                                </h3>
                                                <span className="hidden sm:inline-block px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-[8px] font-black text-indigo-400 uppercase tracking-widest">
                                                    {asset.category}
                                                </span>
                                            </div>
                                            <p className="text-blue-100/30 text-[10px] sm:text-[11px] font-medium truncate uppercase tracking-wide">
                                                {asset.description}
                                            </p>
                                        </div>

                                        {/* Action Zone */}
                                        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                                            <button
                                                onClick={() => handleShare(asset)}
                                                className="flex-1 sm:flex-none h-12 px-6 sm:px-10 bg-gradient-to-br from-indigo-600 to-blue-700 hover:from-indigo-500 hover:to-blue-600 text-white rounded-2xl text-[10px] sm:text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl shadow-indigo-900/40 active:scale-95 flex items-center justify-center gap-3 whitespace-nowrap"
                                            >
                                                <Share2 size={18} strokeWidth={2.5} />
                                                <span>Share Link</span>
                                            </button>

                                            <button
                                                onClick={() => window.open(asset.url, '_blank')}
                                                className="h-14 w-14 shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-center transition-all active:scale-90 shadow-2xl shadow-blue-900/40 border border-blue-400/30"
                                                title="Open Link"
                                            >
                                                <ExternalLink size={26} strokeWidth={2.5} className="text-white" />
                                            </button>

                                            <button
                                                onClick={() => handleCopyAssetLink(asset)}
                                                className="h-14 w-14 shrink-0 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl flex items-center justify-center relative transition-all active:scale-90 shadow-2xl shadow-blue-900/40 border border-blue-400/30"
                                                title="Copy Details"
                                            >
                                                {copiedUrl === asset.url ? <Check size={26} strokeWidth={2.5} className="text-emerald-300" /> : <Copy size={26} strokeWidth={2.5} className="text-white" />}
                                                {copiedUrl === asset.url && (
                                                    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 bg-emerald-500 text-black text-[8px] font-black rounded uppercase tracking-tighter shadow-lg">DONE</span>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="py-24 text-center bg-white/[0.02] border border-dashed border-white/10 rounded-3xl">
                                <FolderClosed size={48} className="text-white/5 mx-auto mb-4" />
                                <h3 className="text-white font-black text-xl mb-1 uppercase tracking-tight">Transmission Empty</h3>
                                <p className="text-blue-200/40 text-xs font-medium uppercase tracking-widest">Adjust filters to find assets.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </PageAnimate>
        </div>
    )
}
