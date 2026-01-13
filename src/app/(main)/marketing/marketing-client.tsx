'use client'

import { useState } from 'react'
import { Search, Filter, Download, Share2, Copy, Check, FileImage, FileText, PlayCircle, ExternalLink, Megaphone, FolderClosed } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'
import { motion, AnimatePresence } from 'framer-motion'
import { PageAnimate, PageItem } from '@/components/PageAnimate'
import { ScrollLock } from '@/components/ui/ScrollLock'

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

    // Flatten assets for "All" view or searching
    const allAssets = Object.values(grouped).flat()

    // Filter logic
    const filteredAssets = activeCategory === 'All'
        ? allAssets
        : grouped[activeCategory] || []

    const displayAssets = filteredAssets.filter(asset =>
        asset.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleCopyLink = (url: string) => {
        // If referral code exists, append it to links if applicable
        // For now, simply copying the asset URL
        navigator.clipboard.writeText(url)
        setCopiedUrl(url)
        toast.success('Link copied to clipboard')
        setTimeout(() => setCopiedUrl(null), 2000)
    }

    const handleShare = async (asset: Asset) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: asset.title,
                    text: asset.description,
                    url: asset.url
                })
            } catch (err) {
                console.error('Error sharing:', err)
            }
        } else {
            handleCopyLink(asset.url)
        }
    }

    const getTypeIcon = (type: string) => {
        switch (type) {
            case 'IMAGE': return <FileImage size={16} className="text-purple-400" />
            case 'VIDEO': return <PlayCircle size={16} className="text-rose-400" />
            case 'PDF': return <FileText size={16} className="text-orange-400" />
            case 'LINK': return <ExternalLink size={16} className="text-blue-400" />
            default: return <FileText size={16} className="text-gray-400" />
        }
    }

    return (
        <div className="fixed inset-0 w-full h-full overflow-y-auto bg-[#0f172a] z-[100] font-[family-name:var(--font-outfit)] overscroll-y-contain">
            <ScrollLock />
            {/* Force Dark Background Overlay */}
            {/* Force Dark Background Overlay */}
            <div className="absolute inset-0 bg-[#0f172a] -z-10">
                {/* Brightness Booster Layer - Increased Intensity */}
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/40 via-slate-900/60 to-slate-900 z-0 opacity-100" />
            </div>

            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[10%] w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[120px]" />
            </div>

            {/* Main Content Container - Aggressively Centered for Visible Gaps */}
            <PageAnimate className="w-[90%] max-w-6xl mx-auto flex flex-col gap-8 pb-32 relative z-10 top-0">
                {/* SAFE SPACER - Forces content down below fixed headers */}
                <div className="w-full h-14 shrink-0" />

                {/* Header Section */}
                <PageItem className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <div className="p-3 bg-white/10 rounded-xl border border-white/10 backdrop-blur-md">
                                <Megaphone className="text-amber-400" size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-white tracking-tight uppercase">Promo Kit</h1>
                        </div>
                        <p className="text-indigo-200 font-medium max-w-lg">
                            Access official marketing materials, social media posts, and brochures to boost your referrals.
                        </p>
                    </div>

                    {/* Search Bar */}
                    <div className="relative w-full md:w-80">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40" size={18} />
                        <input
                            type="text"
                            placeholder="Search assets..."
                            className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-white/30 focus:bg-white/10 focus:border-amber-500/50 outline-none transition-all"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                </PageItem>

                {/* Categories Tabs */}
                <PageItem className="flex flex-wrap gap-2">
                    <button
                        onClick={() => setActiveCategory('All')}
                        className={`px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all border ${activeCategory === 'All'
                            ? 'bg-amber-500 text-white border-amber-400 shadow-lg shadow-amber-500/20'
                            : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                            }`}
                    >
                        All Assets
                    </button>
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`px-5 py-2.5 rounded-full text-sm font-bold uppercase tracking-wider transition-all border ${activeCategory === cat
                                ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg shadow-indigo-600/20'
                                : 'bg-white/5 text-white/60 border-white/10 hover:bg-white/10'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </PageItem>

                {/* Assets Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {displayAssets.length > 0 ? (
                            displayAssets.map((asset) => (
                                <motion.div
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    key={asset.id}
                                    className="group bg-white/5 backdrop-blur-md border border-white/10 rounded-[24px] overflow-hidden hover:bg-white/10 hover:border-white/20 hover:shadow-2xl hover:-translate-y-1 transition-all"
                                >
                                    {/* Preview Area */}
                                    <div className="aspect-video bg-black/40 relative overflow-hidden flex items-center justify-center">
                                        {asset.thumbnailUrl ? (
                                            <Image
                                                src={asset.thumbnailUrl}
                                                alt={asset.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform duration-500"
                                            />
                                        ) : (
                                            <div className="flex flex-col items-center gap-3 text-white/20 group-hover:text-white/40 transition-colors">
                                                {asset.type === 'IMAGE' ? <FileImage size={48} /> :
                                                    asset.type === 'VIDEO' ? <PlayCircle size={48} /> :
                                                        <FolderClosed size={48} />
                                                }
                                            </div>
                                        )}

                                        {/* Overlay Actions */}
                                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3 backdrop-blur-sm">
                                            <button
                                                onClick={() => window.open(asset.url, '_blank')}
                                                className="p-3 bg-white text-indigo-900 rounded-full hover:scale-110 transition-transform shadow-lg"
                                                title="View / Download"
                                            >
                                                <Download size={20} />
                                            </button>
                                            <button
                                                onClick={() => handleShare(asset)}
                                                className="p-3 bg-indigo-600 text-white rounded-full hover:scale-110 transition-transform shadow-lg"
                                                title="Share"
                                            >
                                                <Share2 size={20} />
                                            </button>
                                        </div>

                                        {/* Type Badge */}
                                        <div className="absolute top-3 right-3 px-2 py-1 bg-black/60 backdrop-blur-md rounded-lg border border-white/10 flex items-center gap-1.5 z-10">
                                            {getTypeIcon(asset.type)}
                                            <span className="text-[10px] font-bold text-white tracking-widest uppercase">{asset.type}</span>
                                        </div>
                                    </div>

                                    {/* Content */}
                                    <div className="p-5">
                                        <div className="flex items-start justify-between gap-3 mb-2">
                                            <h3 className="font-bold text-white text-lg leading-tight group-hover:text-amber-200 transition-colors">{asset.title}</h3>
                                        </div>
                                        <p className="text-white/60 text-sm line-clamp-2 mb-4 h-10">{asset.description}</p>

                                        <div className="flex items-center justify-between pt-4 border-t border-white/10">
                                            <span className="text-[10px] font-bold text-white/40 uppercase tracking-widest bg-white/5 px-2 py-1 rounded">
                                                {asset.category}
                                            </span>

                                            <button
                                                onClick={() => handleCopyLink(asset.url)}
                                                className="flex items-center gap-1.5 text-xs font-bold text-indigo-300 hover:text-white transition-colors"
                                            >
                                                {copiedUrl === asset.url ? (
                                                    <>
                                                        <Check size={14} className="text-emerald-400" />
                                                        <span className="text-emerald-400">Copied!</span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Copy size={14} />
                                                        <span>Copy Link</span>
                                                    </>
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))
                        ) : (
                            <div className="col-span-full py-20 text-center">
                                <div className="w-20 h-20 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4 border border-white/10">
                                    <FolderClosed size={32} className="text-white/20" />
                                </div>
                                <h3 className="text-white font-bold text-lg mb-1">No assets found</h3>
                                <p className="text-white/40 text-sm">Try adjusting your search or category filter.</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </PageAnimate>
        </div>
    )
}
