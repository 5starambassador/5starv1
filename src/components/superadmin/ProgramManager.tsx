'use client'

import { useState, useEffect } from 'react'
import { createExternalProgram, getAllPrograms, updateExternalProgram, syncProgramLeads } from '@/app/program-actions'
import { toast } from 'sonner'
import { Plus, Link2, DollarSign, Database, Loader2, Save, X, ExternalLink, RefreshCw, Edit, Calendar, CheckCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export function ProgramManager() {
    const [programs, setPrograms] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [showModal, setShowModal] = useState(false)
    const [isProcessing, setIsProcessing] = useState(false)
    const [editingProgram, setEditingProgram] = useState<any | null>(null)
    const [isSyncing, setIsSyncing] = useState(false)

    // Form State
    const [form, setForm] = useState({
        title: '',
        slug: '',
        targetUrl: '',
        description: '',
        commissionAmount: 0,
        rewardType: 'NONE' as 'NONE' | 'CASH' | 'POINTS',
        autoSyncUrl: '',
        isActive: true,
        startDate: '',
        endDate: ''
    })

    // Load Data
    useEffect(() => {
        loadPrograms()
    }, [])

    const loadPrograms = async () => {
        setLoading(true)
        const res = await getAllPrograms()
        if (res.success) setPrograms(res.programs || [])
        setLoading(false)
    }

    // Auto-generate slug from title
    useEffect(() => {
        if (form.title) {
            const slug = form.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, '')
            setForm(prev => ({ ...prev, slug }))
        }
    }, [form.title])

    const handleSync = async () => {
        setIsSyncing(true)
        const toastId = toast.loading('Synchronizing leads from Google Sheets...')
        try {
            const res = await syncProgramLeads()
            setIsSyncing(false)
            if (res.success) {
                const results = res.results || []
                const totalSynced = results.reduce((acc: number, r: any) => acc + (r.synced || 0), 0)
                toast.success(`Sync Complete: ${totalSynced} leads updated`, { id: toastId })
                loadPrograms() // Refresh views
            } else {
                toast.error(res.error || 'Sync failed', { id: toastId })
            }
        } catch (error) {
            setIsSyncing(false)
            toast.error('Sync failed', { id: toastId })
        }
    }

    const handleSubmit = async () => {
        if (!form.title || !form.slug || !form.targetUrl) {
            toast.error('Please fill required fields (Title, Slug, Redirect URL)')
            return
        }

        setIsProcessing(true)
        let res
        if (editingProgram) {
            res = await updateExternalProgram(editingProgram.id, {
                ...form,
                commissionAmount: Number(form.commissionAmount),
                startDate: form.startDate ? new Date(form.startDate) : undefined,
                endDate: form.endDate ? new Date(form.endDate) : undefined
            })
        } else {
            res = await createExternalProgram({
                ...form,
                commissionAmount: Number(form.commissionAmount),
                startDate: form.startDate ? new Date(form.startDate) : undefined,
                endDate: form.endDate ? new Date(form.endDate) : undefined
            })
        }
        setIsProcessing(false)

        if (res.success) {
            toast.success(editingProgram ? 'Program Updated' : 'Program Launched Successfully')
            setShowModal(false)
            setForm({
                title: '', slug: '', targetUrl: '', description: '',
                commissionAmount: 0, rewardType: 'NONE', autoSyncUrl: '',
                isActive: true, startDate: '', endDate: ''
            })
            setEditingProgram(null)
            loadPrograms()
        } else {
            toast.error(res.error || 'Operation failed')
        }
    }

    const toggleProgramStatus = async (program: any) => {
        const newStatus = !program.isActive
        const toastId = toast.loading(`${newStatus ? 'Activating' : 'Deactivating'} program...`)

        const res = await updateExternalProgram(program.id, {
            ...program,
            isActive: newStatus
        })

        if (res.success) {
            toast.success(`Program ${newStatus ? 'Activated' : 'Deactivated'}`, { id: toastId })
            loadPrograms()
        } else {
            toast.error(res.error || 'Failed to update status', { id: toastId })
        }
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-[32px] border border-white/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl opacity-50" />
                <div className="relative z-10">
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tight italic">
                        <Link2 className="text-blue-600" />
                        External Programs
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">Manage tracked links & commission structures</p>
                </div>
                <div className="relative z-10 flex gap-4">
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-indigo-50 border border-indigo-100 text-indigo-700 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-indigo-100 transition-all shadow-sm"
                    >
                        {isSyncing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                        Sync All Leads
                    </button>
                    <button
                        onClick={() => {
                            setEditingProgram(null)
                            setForm({
                                title: '', slug: '', targetUrl: '', description: '',
                                commissionAmount: 0, rewardType: 'NONE', autoSyncUrl: '',
                                isActive: true, startDate: '', endDate: ''
                            })
                            setShowModal(true)
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-200"
                    >
                        <Plus size={16} /> New Program
                    </button>
                </div>
            </div>

            {/* List */}
            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" /></div>
            ) : programs.length === 0 ? (
                <div className="text-center py-12 bg-white/40 rounded-[32px] border border-dashed border-gray-300">
                    <p className="text-sm text-gray-400 font-medium">No programs active using the new gateway.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {programs.map((p) => (
                        <div key={p.id} className="bg-white rounded-[24px] border border-gray-100 p-6 shadow-sm relative overflow-hidden group hover:shadow-lg transition-all">
                            <div className={`absolute top-0 right-0 px-3 py-1 bg-gray-100 rounded-bl-xl text-[10px] font-black uppercase tracking-widest ${p.isActive ? 'text-emerald-600 bg-emerald-50' : 'text-gray-400'}`}>
                                {p.isActive ? 'Active' : 'Inactive'}
                            </div>

                            <div className="mb-4">
                                <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight">{p.title}</h3>
                                <div className="flex items-center gap-2 text-xs font-mono text-gray-400 mt-1">
                                    <span className="bg-gray-100 px-2 py-0.5 rounded">/offer/{p.slug}</span>
                                    <span className="text-gray-300">→</span>
                                    <span className="truncate max-w-[150px]">{p.targetUrl}</span>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 mb-4">
                                <div className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 rounded-lg text-indigo-700">
                                    <Calendar size={12} />
                                    <span className="text-[10px] font-bold uppercase tracking-wide">
                                        {p.startDate ? new Date(p.startDate).toLocaleDateString() : 'Now'}
                                        {' '}-{' '}
                                        {p.endDate ? new Date(p.endDate).toLocaleDateString() : 'Forever'}
                                    </span>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Commission</p>
                                    <p className="font-black text-gray-900">
                                        {p.rewardType === 'NONE' ? 'None' :
                                            p.rewardType === 'CASH' ? `₹${p.commissionAmount}` :
                                                `${p.commissionAmount} Pts`}
                                    </p>
                                </div>
                                <div className="bg-gray-50 rounded-xl p-3">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">Leads Sync</p>
                                    <div className="flex items-center gap-2">
                                        <div className={`w-2 h-2 rounded-full ${p.autoSyncUrl ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                                        <span className="text-xs font-bold text-gray-600">{p.autoSyncUrl ? 'Automated' : 'Manual'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Actions (Future) */}
                            {/* Actions */}
                            <div className="flex gap-2 mt-auto pt-4 border-t border-gray-50">
                                <button
                                    onClick={() => {
                                        setEditingProgram(p)
                                        setForm({
                                            title: p.title,
                                            slug: p.slug,
                                            targetUrl: p.targetUrl,
                                            description: p.description || '',
                                            commissionAmount: p.commissionAmount,
                                            rewardType: p.rewardType,
                                            autoSyncUrl: p.autoSyncUrl || '',
                                            isActive: p.isActive,
                                            startDate: p.startDate ? new Date(p.startDate).toISOString().split('T')[0] : '',
                                            endDate: p.endDate ? new Date(p.endDate).toISOString().split('T')[0] : ''
                                        })
                                        setShowModal(true)
                                    }}
                                    className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center gap-1"
                                >
                                    <Edit size={14} /> Edit Config
                                </button>
                                <button
                                    onClick={() => toggleProgramStatus(p)}
                                    className={`text-xs font-bold flex items-center gap-1 px-3 py-1 rounded-lg border transition-all ${p.isActive
                                            ? 'text-amber-600 border-amber-100 hover:bg-amber-50'
                                            : 'text-emerald-600 border-emerald-100 hover:bg-emerald-50'
                                        }`}
                                >
                                    {p.isActive ? (
                                        <><X size={14} /> Stop Program</>
                                    ) : (
                                        <><CheckCheck size={14} /> Start Program</>
                                    )}
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Modal */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                            onClick={() => setShowModal(false)}
                        />
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-[32px] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            <div className="p-6 border-b border-gray-100 bg-gray-50/50 flex justify-between items-center">
                                <h3 className="font-black text-lg text-gray-900 uppercase tracking-tight">
                                    {editingProgram ? 'Update Program' : 'Launch Program'}
                                </h3>
                                <button onClick={() => setShowModal(false)}><X size={20} className="text-gray-400 hover:text-gray-900" /></button>
                            </div>

                            <div className="p-8 overflow-y-auto space-y-6">
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Program Title</label>
                                        <input
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            placeholder="e.g. WOW Academy Workshop"
                                            value={form.title}
                                            onChange={e => setForm({ ...form, title: e.target.value })}
                                        />
                                    </div>

                                    {editingProgram && (
                                        <div className="col-span-2 flex items-center justify-between bg-gray-50 p-4 rounded-xl border border-gray-100">
                                            <div>
                                                <p className="text-[10px] font-black text-gray-900 uppercase tracking-widest">Program Status</p>
                                                <p className="text-[10px] text-gray-500 font-medium">{form.isActive ? 'Actively tracking leads' : 'Tracking disabled'}</p>
                                            </div>
                                            <button
                                                onClick={() => setForm({ ...form, isActive: !form.isActive })}
                                                className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${form.isActive
                                                        ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100'
                                                        : 'bg-gray-200 text-gray-500'
                                                    }`}
                                            >
                                                {form.isActive ? 'Active' : 'Inactive'}
                                            </button>
                                        </div>
                                    )}

                                    <div className="space-y-2 col-span-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Program Description (Ambassador Tagline)</label>
                                        <textarea
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 h-24 resize-none"
                                            placeholder="Detailed description or tagline for ambassadors..."
                                            value={form.description}
                                            onChange={e => setForm({ ...form, description: e.target.value })}
                                        />
                                    </div>

                                    {/* Date Parsers - Moved to Top */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Start Date (Optional)</label>
                                        <input
                                            type="date"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={form.startDate}
                                            onChange={e => setForm({ ...form, startDate: e.target.value })}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">End Date (Optional)</label>
                                        <input
                                            type="date"
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            value={form.endDate}
                                            onChange={e => setForm({ ...form, endDate: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">URL Slug</label>
                                        <div className="flex items-center bg-gray-50 border border-gray-200 rounded-xl px-4 py-3">
                                            <span className="text-gray-400 text-sm font-mono mr-1">/offer/</span>
                                            <input
                                                className="bg-transparent w-full font-mono text-sm font-bold text-gray-900 focus:outline-none"
                                                placeholder="wow-academy"
                                                value={form.slug}
                                                onChange={e => setForm({ ...form, slug: e.target.value })}
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Redirect Target</label>
                                        <input
                                            className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-sm font-code text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                            placeholder="https://external-site.com/discount-page"
                                            value={form.targetUrl}
                                            onChange={e => setForm({ ...form, targetUrl: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="p-6 bg-blue-50/50 rounded-[24px] border border-blue-100 space-y-4">
                                    <h4 className="text-[11px] font-black text-blue-900 uppercase tracking-widest flex items-center gap-2">
                                        <DollarSign size={14} /> Commission Logic
                                    </h4>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block mb-2">Reward Type</label>
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => setForm({ ...form, rewardType: 'NONE' })}
                                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${form.rewardType === 'NONE' ? 'bg-blue-600 text-white shadow-lg shadow-blue-200' : 'bg-white text-gray-400'}`}
                                                >None</button>
                                                <button
                                                    onClick={() => setForm({ ...form, rewardType: 'CASH' })}
                                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${form.rewardType === 'CASH' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200' : 'bg-white text-gray-400'}`}
                                                >Cash</button>
                                                <button
                                                    onClick={() => setForm({ ...form, rewardType: 'POINTS' })}
                                                    className={`px-3 py-2 rounded-lg text-xs font-bold transition-all ${form.rewardType === 'POINTS' ? 'bg-amber-500 text-white shadow-lg shadow-amber-200' : 'bg-white text-gray-400'}`}
                                                >Points</button>
                                            </div>
                                        </div>
                                        {form.rewardType !== 'NONE' && (
                                            <div>
                                                <label className="text-[9px] font-bold text-blue-400 uppercase tracking-widest block mb-2">Amount ({form.rewardType})</label>
                                                <input
                                                    type="number"
                                                    className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2 font-bold text-gray-900 focus:outline-none"
                                                    value={form.commissionAmount}
                                                    onChange={e => setForm({ ...form, commissionAmount: Number(e.target.value) })}
                                                />
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Google Sheet CSV Link (Auto-Sync)</label>
                                        <a href="#" className="text-[10px] font-bold text-blue-500 hover:underline">How do I get this?</a>
                                    </div>
                                    <input
                                        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs font-mono text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                                        placeholder="https://docs.google.com/spreadsheets/d/e/.../pub?output=csv"
                                        value={form.autoSyncUrl}
                                        onChange={e => setForm({ ...form, autoSyncUrl: e.target.value })}
                                    />
                                    <p className="text-[10px] text-gray-400">Paste the &quot;Published to Web&quot; CSV link here for automatic lead verification.</p>
                                </div>
                            </div>

                            <div className="p-6 border-t border-gray-100 bg-gray-50 flex justify-end gap-3">
                                <button onClick={() => setShowModal(false)} className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:bg-gray-100 text-xs uppercase tracking-wider">Cancel</button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isProcessing}
                                    className="px-8 py-3 bg-gray-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-black shadow-xl shadow-gray-200 flex items-center gap-2"
                                >
                                    {isProcessing ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                    {editingProgram ? 'Update Program' : 'Launch Program'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    )
}
