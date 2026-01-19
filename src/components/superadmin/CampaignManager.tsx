'use client'

import { useState, useEffect } from 'react'
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign, runCampaign, getAudienceCount } from '@/app/campaign-actions'
import { getCampuses } from '@/app/campus-actions'
import { toast } from 'sonner'
import { Plus, Play, Edit, Trash2, Mail, Clock, CheckCircle2, AlertTriangle, Loader2, Users, Building2, Eye, Filter, Sparkles, Send, Target, ChevronRight, Activity, X, Save } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'

export function CampaignManager() {
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [showPreviewModal, setShowPreviewModal] = useState(false)
    const [previewCampaign, setPreviewCampaign] = useState<any>(null)
    const [editingCampaign, setEditingCampaign] = useState<any>(null)
    const [campuses, setCampuses] = useState<any[]>([])

    // Confirmation State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean
        type: 'run' | 'delete' | null
        data?: any
    }>({
        isOpen: false,
        type: null
    })
    const [form, setForm] = useState({
        name: '',
        subject: '',
        templateBody: '',
        targetAudience: {
            role: 'All',
            campus: 'All',
            activityStatus: 'All'
        }
    })
    const [estimatedReach, setEstimatedReach] = useState<number | null>(null)

    const updateReach = async (audience: any) => {
        const res = await getAudienceCount(audience)
        if (res.success) setEstimatedReach(res.count ?? 0)
    }

    useEffect(() => {
        if (showModal) {
            updateReach(form.targetAudience)
        }
    }, [form.targetAudience, showModal])

    const loadCampaigns = async () => {
        setLoading(true)
        const res = await getCampaigns()
        if (res.success) setCampaigns(res.campaigns || [])
        setLoading(false)
    }

    useEffect(() => {
        loadCampaigns()
        getCampuses().then(res => {
            if (res.success) setCampuses(res.campuses || [])
        })
    }, [])

    const handleSubmit = async () => {
        if (!form.name || !form.subject || !form.templateBody) {
            toast.error('All fields are required')
            return
        }
        setIsProcessing(true)
        let res
        if (editingCampaign) {
            res = await updateCampaign(editingCampaign.id, {
                name: form.name,
                subject: form.subject,
                templateBody: form.templateBody,
                targetAudience: form.targetAudience
            })
        } else {
            res = await createCampaign({
                name: form.name,
                subject: form.subject,
                templateBody: form.templateBody,
                targetAudience: form.targetAudience
            })
        }
        setIsProcessing(false)

        if (res.success) {
            toast.success(editingCampaign ? 'Campaign updated' : 'Campaign created')
            setShowModal(false)
            setEditingCampaign(null)
            setForm({
                name: '',
                subject: '',
                templateBody: '',
                targetAudience: { role: 'All', campus: 'All', activityStatus: 'All' }
            })
            loadCampaigns()
        } else {
            toast.error(res.error || 'Operation failed')
        }
    }

    const handleRun = (id: number, name: string) => {
        setConfirmState({ isOpen: true, type: 'run', data: { id, name } })
    }

    const executeRun = async () => {
        const { id, name } = confirmState.data
        if (!id) return

        const tid = toast.loading('Dispatching campaign...')
        setConfirmState({ isOpen: false, type: null })

        const res = await runCampaign(id)
        if (res.success) {
            toast.success(`Deployment finished. Success: ${res.sent}, Failed: ${res.failed || 0}`, { id: tid })
            loadCampaigns()
        } else {
            toast.error(res.error || 'Failed to deploy', { id: tid })
        }
    }

    const handleDelete = (id: number) => {
        setConfirmState({ isOpen: true, type: 'delete', data: id })
    }

    const executeDelete = async () => {
        const id = confirmState.data
        if (!id) return

        const res = await deleteCampaign(id)
        if (res.success) {
            toast.success('Campaign purged')
            loadCampaigns()
            setConfirmState({ isOpen: false, type: null })
        } else {
            toast.error(res.error || 'Failed to purge')
            setConfirmState({ isOpen: false, type: null })
        }
    }

    const openEdit = (c: any) => {
        setEditingCampaign(c)
        setForm({
            name: c.name,
            subject: c.subject,
            templateBody: c.templateBody,
            targetAudience: c.targetAudience || { role: 'All', campus: 'All', activityStatus: 'All' }
        })
        setShowModal(true)
    }

    const openPreview = (c: any) => {
        setPreviewCampaign(c)
        setShowPreviewModal(true)
    }

    const getAudienceDescription = (audience: any) => {
        if (!audience) return 'Global Audience'
        const parts = []
        if (audience.role !== 'All') parts.push(audience.role)
        if (audience.campus !== 'All') parts.push(audience.campus)
        if (audience.activityStatus !== 'All') parts.push(audience.activityStatus)
        return parts.length > 0 ? parts.join(' • ') : 'Global Audience'
    }

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header Control Panel */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white/40 backdrop-blur-md p-6 rounded-[32px] border border-white/20 shadow-sm relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-50/50 rounded-full translate-x-1/2 -translate-y-1/2 blur-3xl opacity-50" />
                <div className="relative z-10">
                    <h2 className="text-xl font-black text-gray-900 flex items-center gap-2 uppercase tracking-tight italic">
                        <Mail className="text-indigo-600" />
                        Campaign Control
                    </h2>
                    <p className="text-sm text-gray-500 font-medium">Design and automate high-conversion email workflows</p>
                </div>
                <button
                    onClick={() => {
                        setEditingCampaign(null)
                        setForm({
                            name: '',
                            subject: '',
                            templateBody: '',
                            targetAudience: { role: 'All', campus: 'All', activityStatus: 'All' }
                        })
                        setShowModal(true)
                    }}
                    className="relative z-10 flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-200"
                >
                    <Plus size={16} /> Create Workflow
                </button>
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 bg-white/40 backdrop-blur-md rounded-[40px] border border-white/20">
                    <Loader2 className="animate-spin text-indigo-400 mb-4" size={32} />
                    <p className="text-xs font-black text-gray-400 uppercase tracking-widest animate-pulse">Synchronizing Data...</p>
                </div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-24 bg-white/40 backdrop-blur-md rounded-[40px] border-2 border-dashed border-white/60">
                    <div className="w-20 h-20 bg-white/60 rounded-3xl flex items-center justify-center mx-auto mb-6 text-gray-300 shadow-inner">
                        <Mail size={40} />
                    </div>
                    <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight mb-2 italic">No Active Workflows</h3>
                    <p className="text-sm text-gray-500 font-medium max-w-xs mx-auto mb-8">Ready to boost your engagement? Create your first automated campaign.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {campaigns.map(c => (
                        <motion.div
                            key={c.id}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="group bg-white/60 backdrop-blur-sm rounded-[32px] border border-white/40 p-6 shadow-sm hover:shadow-2xl hover:bg-white/80 hover:-translate-y-1.5 transition-all relative overflow-hidden"
                        >
                            {/* Status Glow */}
                            <div className={`absolute -top-12 -right-12 w-24 h-24 blur-3xl rounded-full opacity-20 transition-colors ${c.status === 'ACTIVE' ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                            <div className="flex justify-between items-start mb-6">
                                <div className={`p-4 rounded-2xl shadow-sm transition-colors ${c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' : 'bg-gray-50 text-gray-400 border border-gray-100'}`}>
                                    <Send size={24} />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0">
                                    <button onClick={() => openPreview(c)} className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 hover:shadow-sm transition-all"><Eye size={16} /></button>
                                    <button onClick={() => openEdit(c)} className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 hover:shadow-sm transition-all"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(c.id)} className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-400 hover:bg-rose-600 hover:text-white hover:shadow-sm transition-all"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <div className="mb-6">
                                <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight truncate group-hover:text-indigo-600 transition-colors">{c.name}</h3>
                                <p className="text-[11px] text-gray-400 font-bold font-mono tracking-wider truncate mb-2">{c.subject}</p>
                                <div className="flex items-center gap-2 inline-flex border border-gray-100 bg-gray-50/50 px-2.5 py-1 rounded-full">
                                    <Target size={12} className="text-indigo-400" />
                                    <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{getAudienceDescription(c.targetAudience)}</span>
                                </div>
                            </div>

                            {/* Recent Metrics */}
                            <div className="bg-white/40 border border-white/60 rounded-3xl p-4 mb-6 relative overflow-hidden group-hover:bg-white/60 transition-colors shadow-inner">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-[0.2em] mb-3 flex items-center gap-2">
                                    <Activity size={10} className="text-gray-400" />
                                    Latest Metrics
                                </p>
                                {c.logs && c.logs.length > 0 ? (
                                    c.logs.slice(0, 1).map((log: any, idx: number) => (
                                        <div key={idx} className="space-y-3">
                                            <div className="flex items-end justify-between">
                                                <div className="flex-1">
                                                    <p className="text-[20px] font-black text-gray-900 leading-none">{log.sentCount}</p>
                                                    <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest mt-1">Confirmed Delivery</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className={`text-[20px] font-black leading-none ${log.failedCount > 0 ? 'text-rose-500' : 'text-gray-200'}`}>{log.failedCount}</p>
                                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Failed</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2 text-[9px] font-black text-gray-400 uppercase tracking-widest pt-2 border-t border-gray-100/50">
                                                <Clock size={10} />
                                                <span>{new Date(log.runAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="py-4 text-center">
                                        <p className="text-[10px] font-black text-gray-300 uppercase tracking-widest italic">Awaiting Initiation</p>
                                    </div>
                                )}
                            </div>

                            <button
                                onClick={() => handleRun(c.id, c.name)}
                                className="w-full py-4 bg-gray-900 text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all shadow-xl shadow-gray-100"
                            >
                                <Play size={12} fill="currentColor" /> Initiate Dispatch
                            </button>
                        </motion.div>
                    ))}
                </div>
            )}

            {/* Modal Layer UI (Glassmorphism Modal) */}
            <AnimatePresence>
                {showModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowModal(false)}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-[40px] w-full max-w-3xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Modal Header */}
                            <div className="bg-indigo-600 p-8 text-white relative">
                                <div className="absolute top-0 right-0 w-48 h-48 bg-indigo-500/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl" />
                                <div className="flex justify-between items-center relative z-10">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-md">
                                            {editingCampaign ? <Edit size={24} /> : <Sparkles size={24} />}
                                        </div>
                                        <div>
                                            <h2 className="text-xl font-black uppercase tracking-tight italic">{editingCampaign ? 'Config Workflow' : 'Ignite Workflow'}</h2>
                                            <p className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] font-mono">Precision Marketing Automation</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setShowModal(false)}
                                        className="p-3 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-colors"
                                    >
                                        <X size={24} />
                                    </button>
                                </div>
                            </div>

                            {/* Scrollable Form Body */}
                            <div className="p-8 overflow-y-auto space-y-8">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2 col-span-2 md:col-span-1">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Campaign Label</label>
                                        <input
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all placeholder:text-gray-300"
                                            placeholder="e.g. Phase 2 Retargeting"
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                        />
                                    </div>

                                    <div className="space-y-2 col-span-2 md:col-span-1">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Subject Signature</label>
                                        <input
                                            className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all placeholder:text-gray-300"
                                            placeholder="Headline for the recipient..."
                                            value={form.subject}
                                            onChange={e => setForm({ ...form, subject: e.target.value })}
                                        />
                                    </div>
                                </div>

                                {/* Advanced Audience Partitioning */}
                                <div className="bg-indigo-50/50 border border-indigo-100/50 rounded-[32px] p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <Target size={16} className="text-indigo-600" />
                                            <h4 className="text-[11px] font-black text-gray-900 uppercase tracking-widest">Audience Segmentation</h4>
                                        </div>
                                        <div className="flex items-center gap-2 bg-indigo-600 px-3 py-1 rounded-full shadow-lg shadow-indigo-100">
                                            <span className="text-[9px] font-black text-white/60 uppercase tracking-widest">Est. Impact:</span>
                                            <span className="text-[10px] font-black text-white uppercase tracking-widest">{estimatedReach !== null ? `${estimatedReach} Profiles` : '...'}</span>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] px-1">Structural Role</label>
                                            <select
                                                value={form.targetAudience.role}
                                                onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, role: e.target.value } })}
                                                className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                            >
                                                <option value="All">Global (All Roles)</option>
                                                <option value="Staff">Internal Staff</option>
                                                <option value="Parent">Parent Network</option>
                                                <option value="Alumni">Alumni Circle</option>
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] px-1">Institutional Node</label>
                                            <select
                                                value={form.targetAudience.campus}
                                                onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, campus: e.target.value } })}
                                                className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                            >
                                                <option value="All">Global (All Nodes)</option>
                                                {campuses.map((c: any) => (
                                                    <option key={c.id} value={c.campusName}>{c.campusName}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="block text-[9px] font-black text-indigo-400 uppercase tracking-[0.2em] px-1">Vitals Status</label>
                                            <select
                                                value={form.targetAudience.activityStatus}
                                                onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, activityStatus: e.target.value } })}
                                                className="w-full bg-white border border-indigo-100 rounded-xl px-4 py-2.5 text-xs font-bold text-gray-700 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                                            >
                                                <option value="All">Full Population</option>
                                                <option value="Active">Pulse Observed (Active)</option>
                                                <option value="Dormant">Dormant (14+ days)</option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <div className="flex justify-between px-1">
                                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Payload Content</label>
                                        <div className="flex gap-4">
                                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest font-mono">{"{userName}"}</span>
                                            <span className="text-[9px] font-black text-indigo-400 uppercase tracking-widest font-mono">{"{referralCode}"}</span>
                                        </div>
                                    </div>
                                    <textarea
                                        className="w-full bg-gray-50 border border-gray-100 rounded-3xl px-6 py-5 text-sm font-bold text-gray-900 h-48 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all font-mono leading-relaxed"
                                        placeholder="Inject HTML or standard text template here..."
                                        value={form.templateBody}
                                        onChange={e => setForm({ ...form, templateBody: e.target.value })}
                                    />
                                    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                                        <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                                        <p className="text-[10px] font-bold text-amber-700 leading-normal">Precision Dispatch ensures variables are merged server-side. Validate syntax before deploying.</p>
                                    </div>
                                </div>
                            </div>

                            {/* Modal Footer */}
                            <div className="p-8 bg-gray-50 flex gap-3 border-t border-gray-100">
                                <button
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 py-4 bg-white border border-gray-200 text-gray-400 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-gray-100 transition-all"
                                >
                                    Dismiss
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isProcessing}
                                    className="flex-1 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-indigo-100 hover:bg-indigo-700 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                >
                                    {isProcessing ? (
                                        <Loader2 size={16} className="animate-spin" />
                                    ) : (
                                        <><Save size={16} /> Finalize Workflow</>
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Preview Modal Layer */}
            <AnimatePresence>
                {showPreviewModal && previewCampaign && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setShowPreviewModal(false)}
                            className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.95 }}
                            className="bg-white rounded-[40px] w-full max-w-2xl shadow-2xl relative overflow-hidden"
                        >
                            <div className="p-8 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                <h3 className="text-md font-black text-gray-900 uppercase tracking-tighter italic">Workflow Output Preview</h3>
                                <button onClick={() => setShowPreviewModal(false)} className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-black transition-colors">
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-8 space-y-6">
                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">Simulated Inbox View</p>
                                    <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-inner">
                                        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 italic">Subject:</p>
                                        <p className="text-sm font-black text-gray-900">{previewCampaign.subject.replace('{userName}', 'Prof. John Doe')}</p>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">Payload Execution</p>
                                    <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm min-h-[250px] overflow-y-auto font-mono text-sm leading-relaxed text-gray-700 scrollbar-hide">
                                        {previewCampaign.templateBody
                                            .replace(/{userName}/g, 'Prof. John Doe')
                                            .replace(/{referralCode}/g, 'AMB_X99P')}
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 bg-indigo-50 p-4 rounded-2xl border border-indigo-100">
                                    <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm border border-indigo-100">
                                        <Users size={20} />
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-indigo-900 uppercase tracking-tight italic">Confirmed Segmentation</p>
                                        <p className="text-[11px] font-bold text-indigo-600 tracking-wide">{getAudienceDescription(previewCampaign.targetAudience)}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="p-8 pt-0 flex">
                                <button
                                    onClick={() => setShowPreviewModal(false)}
                                    className="w-full py-4 bg-gray-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-gray-200 hover:bg-black transition-all"
                                >
                                    Dismiss Sandbox
                                </button>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.type === 'run' ? 'Fire Workflow Dispatch?' : 'Purge Campaign Artifact?'}
                description={
                    confirmState.type === 'run' ? (
                        <p className="font-medium text-gray-500 italic">
                            Final warning: Initiating dispatch for <strong className="text-gray-900 underline decoration-indigo-200">{confirmState.data?.name}</strong> will push emails to the prioritized audience instantly.
                        </p>
                    ) : (
                        <p className="font-medium text-gray-500 italic">
                            Terminating the campaign archive for <strong className="text-gray-900 underline decoration-rose-200 whitespace-nowrap">{confirmState.data?.name || 'this workflow'}</strong>.
                            <br /><span className="text-rose-600 font-black uppercase text-[10px] tracking-widest mt-2 block not-italic">CRITICAL: DATA LOSS DETECTED</span>
                        </p>
                    )
                }
                confirmText={confirmState.type === 'run' ? 'Commence Dispatch' : 'Confirm Purge'}
                variant={confirmState.type === 'run' ? 'info' : 'danger'}
                onConfirm={() => {
                    if (confirmState.type === 'run') executeRun()
                    else executeDelete()
                }}
                onCancel={() => setConfirmState({ isOpen: false, type: null })}
            />
        </div>
    )
}
