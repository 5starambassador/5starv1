'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Eye, EyeOff, Save, X, Upload, FileText, Loader2, ArrowRight, Share2, Filter, LayoutGrid } from 'lucide-react'
import { toast } from 'sonner'
import { createMarketingAsset, deleteMarketingAsset, toggleAssetVisibility } from '@/app/marketing-actions'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'

const MARKETING_CATEGORIES = ['Branding', 'WhatsApp Templates', 'Social Media', 'Videos', 'Flyers']

interface MarketingManagerProps {
    assets: any[]
}

export function MarketingManager({ assets }: MarketingManagerProps) {
    const router = useRouter()
    const [showForm, setShowForm] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)
    const [activeCategory, setActiveCategory] = useState<string>('All')

    // Confirmation State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean
        data?: any
    }>({
        isOpen: false
    })

    // Form state
    const [name, setName] = useState('')
    const [category, setCategory] = useState<string>(MARKETING_CATEGORIES[0])
    const [description, setDescription] = useState('')
    const [fileUrl, setFileUrl] = useState('')

    const handleSubmit = async () => {
        if (!name.trim() || !fileUrl.trim()) {
            toast.error('Please fill in name and file URL')
            return
        }

        setIsSubmitting(true)
        const result = await createMarketingAsset({
            name: name.trim(),
            category,
            description: description.trim() || undefined,
            fileUrl: fileUrl.trim()
        })
        setIsSubmitting(false)

        if (result.success) {
            toast.success('Asset created successfully')
            setShowForm(false)
            setName('')
            setCategory(MARKETING_CATEGORIES[0])
            setDescription('')
            setFileUrl('')
            router.refresh()
        } else {
            toast.error(result.error || 'Failed to create asset')
        }
    }

    const handleDelete = (id: number) => {
        setConfirmState({ isOpen: true, data: id })
    }

    const executeDelete = async () => {
        const id = confirmState.data
        if (!id) return

        setConfirmState({ isOpen: false })
        setDeletingId(id)

        try {
            const res = await deleteMarketingAsset(id)
            if (res.success) {
                toast.success('Asset deleted')
                router.refresh()
            } else {
                toast.error(res.error || 'Failed to delete')
            }
        } catch (e) {
            toast.error('Unexpected error')
        } finally {
            setDeletingId(null)
        }
    }

    const handleToggle = async (id: number, currentState: boolean) => {
        const res = await toggleAssetVisibility(id, !currentState)
        if (res.success) {
            toast.success(currentState ? 'Asset hidden' : 'Asset visible')
            router.refresh()
        } else {
            toast.error(res.error || 'Operation failed')
        }
    }

    const groupedAssets: Record<string, any[]> = {}
    const safeAssets = assets || []
    for (const cat of MARKETING_CATEGORIES) {
        groupedAssets[cat] = safeAssets.filter(a => a.category === cat)
    }

    const displayCategories = activeCategory === 'All' ? MARKETING_CATEGORIES : [activeCategory]

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Action Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-3xl border border-white/20 shadow-sm">
                <div>
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tight italic">
                        <Share2 className="text-blue-600" />
                        Marketing Assets
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">Manage branding materials and promotional content</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-indigo-100"
                >
                    <Plus size={16} /> Add New Asset
                </button>
            </div>

            {/* Content Filters */}
            <div className="flex flex-wrap gap-2">
                <button
                    onClick={() => setActiveCategory('All')}
                    className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeCategory === 'All'
                        ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-100'
                        : 'bg-white/60 text-gray-500 border-white/40 hover:bg-white hover:text-gray-900'
                        }`}
                >
                    All Types
                </button>
                {MARKETING_CATEGORIES.map(cat => (
                    <button
                        key={cat}
                        onClick={() => setActiveCategory(cat)}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${activeCategory === cat
                            ? 'bg-blue-600 text-white border-blue-500 shadow-md shadow-blue-100'
                            : 'bg-white/60 text-gray-500 border-white/40 hover:bg-white hover:text-gray-900'
                            }`}
                    >
                        {cat}
                    </button>
                ))}
            </div>

            {/* Assets Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {displayCategories.map(cat => {
                    const catAssets = groupedAssets[cat] || []
                    if (activeCategory === 'All' && catAssets.length === 0) return null

                    return (
                        <div key={cat} className="space-y-4">
                            <div className="flex items-center justify-between px-2">
                                <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] italic underline underline-offset-8 decoration-blue-500/30 font-mono">
                                    {cat}
                                </h3>
                                <span className="text-[10px] font-black text-gray-400 font-mono">[{catAssets.length}]</span>
                            </div>

                            <div className="space-y-3">
                                {catAssets.length === 0 ? (
                                    <div className="bg-white/20 border-2 border-dashed border-white/40 rounded-3xl p-8 text-center">
                                        <p className="text-xs text-gray-400 font-black uppercase tracking-widest italic">No assets drafted</p>
                                    </div>
                                ) : (
                                    catAssets.map((asset: any) => (
                                        <motion.div
                                            key={asset.id}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className={`grid grid-cols-[auto,1fr,auto] items-center gap-4 p-4 bg-white/60 backdrop-blur-sm border rounded-3xl transition-all group ${asset.isActive ? 'border-white/40 shadow-sm' : 'border-gray-100 opacity-60 grayscale'
                                                }`}
                                        >
                                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center transition-colors ${asset.isActive ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-400'
                                                }`}>
                                                <FileText size={20} />
                                            </div>

                                            <div className="min-w-0">
                                                <h4 className="text-sm font-black text-gray-900 truncate uppercase tracking-tight leading-none mb-1.5 flex items-center gap-2">
                                                    {asset.name}
                                                    {!asset.isActive && <span className="text-[8px] font-black bg-gray-200 px-1.5 py-0.5 rounded uppercase tracking-widest text-gray-500">Hidden</span>}
                                                </h4>
                                                <p className="text-[11px] text-gray-400 font-medium truncate font-mono">{asset.description || 'No description provided'}</p>
                                            </div>

                                            <div className="flex items-center gap-2 pr-2">
                                                <button
                                                    onClick={() => handleToggle(asset.id, asset.isActive)}
                                                    className={`p-2.5 rounded-xl border transition-all ${asset.isActive
                                                        ? 'bg-white border-white shadow-sm text-gray-400 hover:text-blue-600'
                                                        : 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-100'
                                                        }`}
                                                    title={asset.isActive ? 'Hide Asset' : 'Show Asset'}
                                                >
                                                    {asset.isActive ? <EyeOff size={16} /> : <Eye size={16} />}
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(asset.id)}
                                                    disabled={deletingId === asset.id}
                                                    className="p-2.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-xl hover:bg-rose-600 hover:text-white transition-all disabled:opacity-50"
                                                    title="Delete"
                                                >
                                                    {deletingId === asset.id ? (
                                                        <Loader2 size={16} className="animate-spin" />
                                                    ) : (
                                                        <Trash2 size={16} />
                                                    )}
                                                </button>
                                                <div className="w-px h-8 bg-gray-100 mx-1 hidden sm:block" />
                                                <button
                                                    onClick={() => window.open(asset.fileUrl, '_blank')}
                                                    className="p-2.5 bg-gray-900 text-white rounded-xl hover:bg-black transition-all shadow-lg shadow-gray-200"
                                                    title="View Source"
                                                >
                                                    <ArrowRight size={16} />
                                                </button>
                                            </div>
                                        </motion.div>
                                    ))
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Add Asset Modal */}
            <AnimatePresence>
                {showForm && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowForm(false)}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-[40px] w-full max-w-lg shadow-2xl relative overflow-hidden"
                        >
                            {/* Modal Header */}
                            <div className="bg-indigo-600 p-8 text-white relative">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -translate-y-1/2 translate-x-1/2 blur-2xl" />
                                <div className="flex justify-between items-center relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-md">
                                            <Upload size={20} className="text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-black uppercase tracking-tight italic">New Asset</h2>
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] font-mono">Marketing Kit Entry</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowForm(false)}
                                        className="p-2.5 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>
                            </div>

                            {/* Modal Form */}
                            <div className="p-8 space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="col-span-2">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 px-1">Category Segment</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            {MARKETING_CATEGORIES.map(cat => (
                                                <button
                                                    key={cat}
                                                    onClick={() => setCategory(cat)}
                                                    className={`px-4 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${category === cat
                                                        ? 'bg-blue-600 text-white border-blue-500 shadow-lg shadow-blue-100'
                                                        : 'bg-gray-50 text-gray-500 border-gray-100 hover:bg-gray-100'
                                                        }`}
                                                >
                                                    {cat}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="col-span-2 space-y-4 pt-2">
                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Asset Name</label>
                                            <input
                                                type="text"
                                                placeholder="e.g. Official Logo Pack"
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all placeholder:text-gray-300"
                                                value={name}
                                                onChange={(e) => setName(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Public File URL</label>
                                            <input
                                                type="url"
                                                placeholder="Direct link to file (Drive/Cloud)"
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all placeholder:text-gray-300"
                                                value={fileUrl}
                                                onChange={(e) => setFileUrl(e.target.value)}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Contextual Description</label>
                                            <textarea
                                                placeholder="Brief purpose of this file..."
                                                className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all placeholder:text-gray-300 min-h-[100px] resize-none"
                                                value={description}
                                                onChange={(e) => setDescription(e.target.value)}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex gap-3 pt-4 border-t border-gray-50">
                                    <button
                                        onClick={() => setShowForm(false)}
                                        className="flex-1 py-4 bg-gray-50 text-gray-500 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-100 transition-all"
                                    >
                                        Dismiss
                                    </button>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting}
                                        className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-blue-100 hover:bg-blue-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 size={16} className="animate-spin" />
                                        ) : (
                                            <><Save size={16} /> Deploy Asset</>
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title="Purge Marketing Asset?"
                description={
                    <p className="font-medium text-gray-500">
                        This will permanently remove the asset from the cloud distribution.
                        <br /><span className="text-rose-600 font-bold uppercase text-[10px] tracking-widest leading-none mt-2 block italic">Critical Action: IRREVERSIBLE</span>
                    </p>
                }
                confirmText="Confirm Purge"
                variant="danger"
                onConfirm={executeDelete}
                onCancel={() => setConfirmState({ isOpen: false })}
            />
        </div>
    )
}
