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

            {/* Softened Background Glows - Matching 3001 Screenshot */}
            <div className="fixed inset-0 bg-[#0f172a] -z-10 overflow-hidden">
                <div className="absolute top-[-15%] right-[-10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[140px]" />
                <div className="absolute bottom-[20%] left-[-10%] w-[500px] h-[500px] bg-purple-600/10 rounded-full blur-[140px]" />
                <div className="absolute top-[40%] right-[15%] w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-[120px]" />
            </div>

            <PageAnimate className="w-[92%] max-w-6xl mx-auto flex flex-col gap-8 pb-32 relative z-10 pt-10 sm:pt-16">

                {/* 1. BRAND HEADER - REFINED */}
                <PageItem className="flex flex-col md:flex-row md:items-end justify-between gap-8">
                    <div className="flex flex-col gap-4">
                        <div className="flex items-center gap-4">
                            <div className="p-3.5 bg-white/5 rounded-[1.25rem] border border-white/10 backdrop-blur-md shadow-lg">
                                <Megaphone className="text-amber-400" size={26} />
                            </div>
                            <h1 className="text-4xl font-black text-white tracking-tight uppercase leading-none">
                                PROMO KIT
                            </h1>
                        </div>
                        <p className="text-slate-400 font-medium max-w-md leading-relaxed">
                            Access official marketing materials, social media posts, and brochures to boost your referrals.
                        </p>
                    </div>

                    {/* Compact Search Bar */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" size={18} />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            className="w-full pl-12 pr-4 h-14 bg-white/5 border border-white/10 rounded-2xl text-white placeholder:text-white/30 focus:bg-white/10 focus:border-indigo-500/50 outline-none transition-all shadow-inner"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </PageItem>

                {/* 2. CATEGORY CHIPS - POLISHED */}
                <PageItem className="flex flex-wrap gap-2.5">
                    <button
                        onClick={() => setActiveCategory('All')}
                        className={`h-11 px-6 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${activeCategory === 'All'
                            ? 'bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-600/20'
                            : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                            }`}
                    >
                        All Assets
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`h-11 px-6 rounded-full text-xs font-black uppercase tracking-widest transition-all border ${activeCategory === cat
                                ? 'bg-indigo-600 text-white border-transparent shadow-lg shadow-indigo-600/20'
                                : 'bg-white/5 text-slate-400 border-white/5 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </PageItem>

                {/* 3. ASSET GRID - REFINED CARDS */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    <AnimatePresence mode="popLayout">
                        {displayAssets.length > 0 ? (
                            displayAssets.map((asset, idx) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }}
                                    key={asset.id}
                                    className="group bg-white/5 backdrop-blur-sm border border-white/5 rounded-[2rem] overflow-hidden hover:bg-white/[0.08] hover:border-white/10 transition-all duration-300 shadow-xl"
                                >
                                    {/* Thumbnail / Symbol Area */}
                                    <div className="aspect-[16/10] bg-slate-900/40 relative overflow-hidden flex items-center justify-center">
                                        {asset.thumbnailUrl ? (
                                            <Image
                                                src={asset.thumbnailUrl}
                                                alt={asset.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-700 opacity-90 group-hover:opacity-100"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-4 text-white/10 group-hover:text-amber-500/20 transition-all">
                                                <FolderClosed size={56} strokeWidth={1.5} />
                                            </div>
                                        )}

                                        {/* Type Badge - Matching Screenshot */}
                                        <div className="absolute top-4 right-4 px-2.5 py-1.5 bg-black/40 backdrop-blur-md rounded-xl border border-white/10 flex items-center gap-2 z-10 shadow-lg">
                                            {getTypeIcon(asset.type)}
                                            <span className="text-[10px] font-black text-white tracking-widest uppercase">{asset.type}</span>
                                        </div>

                                        {/* Hover Quick Actions */}
                                        <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-4 backdrop-blur-sm duration-300">
                                            <button
                                                onClick={() => window.open(asset.url, '_blank')}
                                                className="w-12 h-12 bg-white text-indigo-950 rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
                                                title="View / Download"
                                            >
                                                <Download size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleShare(asset)}
                                                className="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center hover:scale-110 transition-transform shadow-xl"
                                                title="Share"
                                            >
                                                <Share2 size={20} />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Description Area */}
                                    <div className="p-7 flex flex-col gap-4">
                                        <div>
                                            <h3 className="font-black text-white text-xl leading-snug tracking-tight mb-2 uppercase italic group-hover:text-amber-400 transition-colors">
                                                {asset.title}
                                            </h3>
                                            <p className="text-slate-400 text-sm leading-relaxed line-clamp-2 h-10 font-medium">
                                                {asset.description}
                                            </p>
                                        </div>

                                        <div className="flex items-center justify-between pt-5 border-t border-white/5">
                                            <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest bg-indigo-500/5 px-2.5 py-1.5 rounded-lg border border-indigo-500/10">
                                                {asset.category}
                                            </span>

                                            <button
                                                onClick={() => handleCopyAssetLink(asset)}
                                                className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-white transition-all uppercase tracking-widest"
                                            >
                                                {copiedUrl === asset.url ? (
                                                    <div className="flex items-center gap-2 text-emerald-400">
                                                        <Check size={14} strokeWidth={3} />
                                                        <span>Copied</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2">
                                                        <Copy size={14} />
                                                        <span>Copy</span>
                                                    </div>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full py-24 text-center">
                                <div className="w-24 h-24 bg-white/5 rounded-[2.5rem] flex items-center justify-center mx-auto mb-6 border border-white/10 shadow-inner">
                                    <FolderClosed size={36} className="text-white/10" />
                                </div>
                                <h3 className="text-white font-black text-xl mb-2 uppercase tracking-tight">No assets found</h3>
                                <p className="text-slate-500 font-medium">Try adjusting your search or category filter.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </PageAnimate>
        </div>
    )
}
