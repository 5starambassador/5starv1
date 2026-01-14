'use client'

import { useState, useEffect } from 'react'
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign, runCampaign, getAudienceCount } from '@/app/campaign-actions'
import { getCampuses } from '@/app/campus-actions'
import { toast } from 'sonner'
import { Plus, Play, Edit, Trash2, Mail, Clock, CheckCircle2, AlertTriangle, Loader2, Users, Building2, Eye, Filter } from 'lucide-react'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

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

        const tid = toast.loading('Starting campaign...')
        // Close dialog immediately
        setConfirmState({ isOpen: false, type: null })

        const res = await runCampaign(id)
        if (res.success) {
            toast.success(`Campaign finished. Sent: ${res.sent}, Failed: ${res.failed || 0}`, { id: tid })
            loadCampaigns()
        } else {
            toast.error(res.error || 'Failed to run', { id: tid })
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
            toast.success('Campaign deleted')
            loadCampaigns()
            setConfirmState({ isOpen: false, type: null })
        } else {
            toast.error(res.error || 'Failed to delete')
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
        if (!audience) return 'All Users'
        const parts = []
        if (audience.role !== 'All') parts.push(audience.role)
        if (audience.campus !== 'All') parts.push(audience.campus)
        if (audience.activityStatus !== 'All') parts.push(audience.activityStatus)
        return parts.length > 0 ? parts.join(' | ') : 'All Users'
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center bg-white p-6 rounded-2xl border border-gray-200 shadow-sm relative z-20">
                <div>
                    <h2 className="text-xl font-bold flex items-center gap-2 text-gray-900">
                        <Mail className="text-gray-900" size={24} />
                        Campaign Manager
                    </h2>
                    <p className="text-gray-500 text-sm mt-1">Design and automate targeted email workflows</p>
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
                    className="bg-gray-900 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-black transition-colors flex items-center gap-2 shadow-sm text-sm"
                >
                    <Plus size={16} /> New Campaign
                </button>
            </div>

            {loading ? (
                <div className="flex justify-center p-12"><Loader2 className="animate-spin text-gray-400" /></div>
            ) : campaigns.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-dashed border-gray-200">
                    <Mail size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="text-gray-500 font-medium">No campaigns found. Create your first one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {campaigns.map(c => (
                        <div key={c.id} className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm hover:shadow-md transition-shadow relative group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-gray-50 text-gray-900 rounded-xl">
                                    <Mail size={24} />
                                </div>
                                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={() => openPreview(c)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Eye size={16} /></button>
                                    <button onClick={() => openEdit(c)} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(c.id)} className="p-2 hover:bg-red-50 text-red-500 rounded-lg"><Trash2 size={16} /></button>
                                </div>
                            </div>

                            <h3 className="font-bold text-gray-900 text-lg mb-1">{c.name}</h3>
                            <p className="text-sm text-gray-500 mb-2 line-clamp-1">Subject: {c.subject}</p>

                            {/* Audience Filter Display */}
                            <div className="flex items-center gap-1.5 mb-4">
                                <Filter size={12} className="text-gray-400" />
                                <span className="text-xs font-bold text-gray-600">{getAudienceDescription(c.targetAudience)}</span>
                            </div>

                            {/* Recent Execution Logs */}
                            {c.logs && c.logs.length > 0 && (
                                <div className="bg-gray-50 rounded-lg p-3 mb-4 border border-gray-100">
                                    <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Last Run</p>
                                    {c.logs.slice(0, 2).map((log: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between text-xs mb-1 last:mb-0">
                                            <span className="text-gray-600">{new Date(log.runAt).toLocaleDateString()}</span>
                                            <div className="flex items-center gap-2">
                                                <span className="text-emerald-600 font-bold">{log.sentCount} sent</span>
                                                {log.failedCount > 0 && <span className="text-red-600 font-bold">{log.failedCount} failed</span>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div className="border-t border-gray-100 pt-4 mt-4">
                                <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                                    <span className="flex items-center gap-1">
                                        <Clock size={12} />
                                        {c.lastRunAt ? `Ran ${new Date(c.lastRunAt).toLocaleDateString()}` : 'Never ran'}
                                    </span>
                                    <span className={`px-2 py-1 rounded-full font-bold text-[10px] uppercase tracking-wide border ${c.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                                        {c.status}
                                    </span>
                                </div>

                                <button
                                    onClick={() => handleRun(c.id, c.name)}
                                    className="w-full py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-900 rounded-lg font-bold text-sm flex items-center justify-center gap-2 transition-colors"
                                >
                                    <Play size={14} /> Run Now
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-xl animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto border border-gray-100">
                        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                            {editingCampaign ? <Edit size={20} /> : <Plus size={20} />}
                            {editingCampaign ? 'Edit Campaign' : 'New Campaign'}
                        </h3>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Campaign Name</label>
                                <input
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                                    placeholder="e.g., Monthly Newsletter"
                                    value={form.name}
                                    onChange={e => setForm({ ...form, name: e.target.value })}
                                />
                            </div>

                            {/* Audience Filters */}
                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200">
                                <p className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
                                    <Users size={16} /> Audience Targeting
                                </p>
                                <div className="grid grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Role</label>
                                        <select
                                            value={form.targetAudience.role}
                                            onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, role: e.target.value } })}
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                                        >
                                            <option value="All">All Roles</option>
                                            <option value="Staff">Staff</option>
                                            <option value="Parent">Parent</option>
                                            <option value="Alumni">Alumni</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Campus</label>
                                        <select
                                            value={form.targetAudience.campus}
                                            onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, campus: e.target.value } })}
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                                        >
                                            <option value="All">All Campuses</option>
                                            {campuses.map((c: any) => (
                                                <option key={c.id} value={c.campusName}>{c.campusName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-600 mb-1.5">Activity</label>
                                        <select
                                            value={form.targetAudience.activityStatus}
                                            onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, activityStatus: e.target.value } })}
                                            className="w-full p-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                                        >
                                            <option value="All">All Users</option>
                                            <option value="Active">Active</option>
                                            <option value="Dormant">Dormant (14+ days)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="mt-4 pt-3 border-t border-gray-200 flex justify-between items-center">
                                    <p className="text-xs font-semibold text-gray-500">Estimated Reach:</p>
                                    <p className="text-sm font-bold text-gray-900">{estimatedReach !== null ? `${estimatedReach} Users` : 'Calculating...'}</p>
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Email Subject</label>
                                <input
                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all"
                                    placeholder="Subject line..."
                                    value={form.subject}
                                    onChange={e => setForm({ ...form, subject: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1">Content Template</label>
                                <textarea
                                    className="w-full p-3 bg-white border border-gray-200 rounded-lg h-40 focus:outline-none focus:ring-2 focus:ring-gray-900 focus:border-transparent transition-all font-mono text-sm"
                                    placeholder="HTML or Text content..."
                                    value={form.templateBody}
                                    onChange={e => setForm({ ...form, templateBody: e.target.value })}
                                />
                                <p className="text-xs text-gray-400 mt-2 font-mono">Supports variables: {'{userName}'}, {'{referralCode}'}</p>
                            </div>
                        </div>

                        <div className="flex gap-3 mt-8 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-5 py-2.5 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transition-colors text-sm"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isProcessing}
                                className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors disabled:opacity-50 text-sm ml-auto"
                            >
                                {isProcessing ? 'Saving...' : 'Save Campaign'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Preview Modal */}
            {showPreviewModal && previewCampaign && (
                <div className="fixed inset-0 bg-black/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-2xl p-8 w-full max-w-2xl shadow-xl animate-in zoom-in-95 duration-200 border border-gray-100">
                        <div className="flex justify-between items-start mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Campaign Preview</h3>
                            <button onClick={() => setShowPreviewModal(false)} className="text-gray-400 hover:text-gray-600">
                                <span className="sr-only">Close</span>
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                                <p className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-wide">Subject</p>
                                <p className="font-medium text-gray-900">{previewCampaign.subject.replace('{userName}', 'John Doe')}</p>
                            </div>

                            <div className="bg-white rounded-xl p-4 border border-gray-200 shadow-sm min-h-[200px]">
                                <div className="text-sm text-gray-700 whitespace-pre-wrap">
                                    {previewCampaign.templateBody
                                        .replace(/{userName}/g, 'John Doe')
                                        .replace(/{referralCode}/g, 'AMB12345')}
                                </div>
                            </div>

                            <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-3 rounded-lg border border-gray-200">
                                <Users size={14} />
                                <span className="font-semibold">Target Audience:</span>
                                <span>{getAudienceDescription(previewCampaign.targetAudience)}</span>
                            </div>
                        </div>

                        <div className="mt-6 flex justify-end">
                            <button
                                onClick={() => setShowPreviewModal(false)}
                                className="px-5 py-2.5 bg-gray-900 hover:bg-black text-white font-bold rounded-xl transition-colors text-sm"
                            >
                                Close Preview
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Premium Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.type === 'run' ? 'Run Campaign?' : 'Delete Campaign?'}
                description={
                    confirmState.type === 'run' ? (
                        <p>
                            Are you sure you want to run <strong>{confirmState.data?.name}</strong>?
                            <br />This will immediately send emails to all matching users.
                        </p>
                    ) : (
                        <p>
                            Are you sure you want to permanently delete this campaign?
                            <br />This action cannot be undone.
                        </p>
                    )
                }
                confirmText={confirmState.type === 'run' ? 'Yes, Run Campaign' : 'Delete Campaign'}
                variant={confirmState.type === 'run' ? 'default' : 'danger'}
                onConfirm={() => {
                    if (confirmState.type === 'run') executeRun()
                    else executeDelete()
                }}
                onCancel={() => setConfirmState({ isOpen: false, type: null })}
            />
        </div>
    )
}
