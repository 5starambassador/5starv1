'use client'

import { useState, useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { getCampaigns, createCampaign, updateCampaign, deleteCampaign, getAudienceCount, exportCampaignData, runCampaign, resetStuckCampaign, syncCampaignMetrics, sendIndividualWhatsApp, getWhatsAppTemplates, sendTestCampaignMessage } from '@/app/campaign-actions'
import { dispatchCampaignBatch } from '@/app/campaign-dispatcher'
import { getCampuses } from '@/app/campus-actions'
import { getAllPrograms } from '@/app/program-actions'
import { toast } from 'sonner'
import { Plus, Play, Edit, Trash2, Mail, Clock, CheckCircle2, AlertTriangle, Loader2, Users, Building2, Eye, Filter, Sparkles, Send, Target, ChevronRight, Activity, X, Save, Smartphone, Bell, Download, Database, RefreshCw, MessageSquare, ExternalLink } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import { CampaignAnalytics } from './CampaignAnalytics'
import { WhatsAppLogTable } from './WhatsAppLogTable'
import { Modal } from '@/components/ui/Modal'

// Helper: portals children to document.body—escapes any CSS transform context
function ClientPortal({ children, show }: { children: React.ReactNode; show: boolean }) {
    const [mounted, setMounted] = useState(false)
    useEffect(() => { setMounted(true) }, [])
    if (!mounted || !show) return null
    return createPortal(children, document.body)
}

export function CampaignManager() {
    const [campaigns, setCampaigns] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [isProcessing, setIsProcessing] = useState(false)
    const [showModal, setShowModal] = useState(false)
    const [showPreviewModal, setShowPreviewModal] = useState(false)
    const [previewCampaign, setPreviewCampaign] = useState<any>(null)
    const [editingCampaign, setEditingCampaign] = useState<any>(null)
    const [campuses, setCampuses] = useState<any[]>([])
    const [programs, setPrograms] = useState<any[]>([])
    const [viewMode, setViewMode] = useState<'list' | 'analytics'>('list')
    const [showIndividualModal, setShowIndividualModal] = useState(false)
    const [isIndividualProcessing, setIsIndividualProcessing] = useState(false)
    const [availableTemplates, setAvailableTemplates] = useState<any[]>([])
    const [showLogsModal, setShowLogsModal] = useState(false)
    const [selectedRefId, setSelectedRefId] = useState<string | null>(null)
    const [isClient, setIsClient] = useState(false)
    useEffect(() => { setIsClient(true) }, [])

    const [testMobile, setTestMobile] = useState('')
    const [isSendingTest, setIsSendingTest] = useState(false)

    // Confirmation State
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean
        type: 'run' | 'delete' | 'reset' | null
        data?: any
    }>({
        isOpen: false,
        type: null
    })
    const [individualForm, setIndividualForm] = useState({
        mobile: '',
        templateName: '',
        variables: ['', '', '', ''],
        button_1: ''
    })
    const [form, setForm] = useState({
        name: '',
        subject: '',
        templateBody: '',
        targetAudience: {
            type: 'AMBASSADORS',
            role: 'All',
            campus: 'All',
            activityStatus: 'All',
            accountHealth: 'Active',
            referralMilestone: 'All',
            leadFunnelStatus: 'All',
            leadStatus: 'All',
            programLeadStatus: 'All',
            programId: 'All',
            missingInfo: 'None'
        },
        channels: ['EMAIL'],
        waTemplateName: '',
        waVariableMapping: {} as Record<string, string>,
        waHeaderUrl: ''
    })

    // Helper to toggle channels
    const toggleChannel = (channel: string) => {
        setForm(prev => {
            const exists = prev.channels.includes(channel)
            if (exists) return { ...prev, channels: prev.channels.filter(c => c !== channel) }
            return { ...prev, channels: [...prev.channels, channel] }
        })
    }
    const lastRequestId = useRef<number>(0)
    const [estimatedReach, setEstimatedReach] = useState<number | null>(null)

    const updateReach = async (audience: any) => {
        const requestId = Date.now()
        lastRequestId.current = requestId
        setEstimatedReach(null) // Show loading state

        const res = await getAudienceCount(audience)

        if (lastRequestId.current === requestId && res.success) {
            setEstimatedReach(res.count ?? 0)
        }
    }

    useEffect(() => {
        if (showModal) {
            updateReach(form.targetAudience)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [JSON.stringify(form.targetAudience), showModal])

    const handleSendTest = async () => {
        if (!previewCampaign) return
        if (!testMobile || testMobile.length < 10) {
            toast.error('Enter a valid mobile number')
            return
        }

        setIsSendingTest(true)
        try {
            const res = await sendTestCampaignMessage(
                previewCampaign.id, 
                testMobile,
                form.waVariableMapping,
                form.waTemplateName,
                form.waHeaderUrl
            )
            if (res.success) {
                toast.success('Test message dispatched!')
            } else {
                toast.error(res.error || 'Failed to send test')
            }
        } catch (error) {
            toast.error('An error occurred during test dispatch')
        } finally {
            setIsSendingTest(false)
        }
    }

    const loadCampaigns = async () => {
        setLoading(true)
        const res = await getCampaigns()
        if (res.success) {
            setCampaigns(res.campaigns || [])
        } else {
            toast.error(res.error || 'Failed to load campaigns')
        }
        setLoading(false)
    }

    // Silent refresh — no loading spinner (used by polling)
    const silentRefresh = async () => {
        const res = await getCampaigns()
        if (res.success) setCampaigns(res.campaigns || [])
    }

    useEffect(() => {
        loadCampaigns()
        getCampuses().then(res => {
            if (res.success) setCampuses(res.campuses || [])
        })
        getWhatsAppTemplates().then(res => {
            if (res.success) setAvailableTemplates(res.templates || [])
        })
        getAllPrograms().then(res => {
            if (res.success) setPrograms((res as any).programs || [])
        })
    }, [])

    // Auto-poll every 4s while any campaign is PROCESSING
    useEffect(() => {
        const hasProcessing = campaigns.some(
            c => c.status === 'SCHEDULED' || c.logs?.[0]?.status === 'PROCESSING'
        )
        if (!hasProcessing) return
        const interval = setInterval(() => {
            silentRefresh()  // ← no loading flash
        }, 4000)
        return () => clearInterval(interval)
    }, [campaigns])

    const handleSubmit = async () => {
        const isWhatsAppEnabled = form.channels.includes('WHATSAPP')
        const hasOtherChannels = form.channels.some(c => c !== 'WHATSAPP')

        if (!form.name || !form.subject) {
            toast.error('Campaign Name and Subject are required')
            return
        }

        if (hasOtherChannels && !form.templateBody) {
            toast.error('Email / Push template body is required')
            return
        }

        if (isWhatsAppEnabled && !form.waTemplateName) {
            toast.error('WhatsApp Messaging Blueprint is required')
            return
        }
        setIsProcessing(true)
        let res
        if (editingCampaign) {
            res = await updateCampaign(editingCampaign.id, {
                name: form.name,
                subject: form.subject,
                templateBody: form.templateBody,
                targetAudience: form.targetAudience,
                channels: form.channels,
                waTemplateName: form.waTemplateName,
                waVariableMapping: form.waVariableMapping,
                waHeaderUrl: form.waHeaderUrl
            })
        } else {
            res = await createCampaign({
                name: form.name,
                subject: form.subject,
                templateBody: form.templateBody,
                targetAudience: form.targetAudience,
                channels: form.channels,
                waTemplateName: form.waTemplateName,
                waVariableMapping: form.waVariableMapping,
                waHeaderUrl: form.waHeaderUrl
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
                targetAudience: { type: 'AMBASSADORS', role: 'All', campus: 'All', activityStatus: 'All', accountHealth: 'Active', referralMilestone: 'All', leadFunnelStatus: 'All', leadStatus: 'All', programLeadStatus: 'All', programId: 'All', missingInfo: 'None' },
                channels: ['EMAIL'],
                waTemplateName: '',
                waVariableMapping: {},
                waHeaderUrl: ''
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
        if (!id || isProcessing) return

        const tid = toast.loading(`Initiating dispatch for ${name}...`)
        setConfirmState({ isOpen: false, type: null })
        setIsProcessing(true)

        // Using new Batch Dispatcher
        const res = await runCampaign(id) // Use runCampaign to schedule instead of direct dispatch
        setIsProcessing(false)

        if (res.success) {
            toast.success(res.message || 'Campaign scheduled successfully', { id: tid })
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

    const handleReset = (id: number, name: string) => {
        setConfirmState({ isOpen: true, type: 'reset', data: { id, name } })
    }

    const executeReset = async () => {
        const { id, name } = confirmState.data
        if (!id || isProcessing) return

        setIsProcessing(true)
        const res = await resetStuckCampaign(id)
        setIsProcessing(false)
        setConfirmState({ isOpen: false, type: null })

        if (res.success) {
            toast.success(`Campaign '${name}' reset successfully`)
            loadCampaigns()
        } else {
            toast.error(res.error || 'Failed to reset')
        }
    }

    const openEdit = (c: any) => {
        setEditingCampaign(c)
        setForm({
            name: c.name,
            subject: c.subject,
            templateBody: c.templateBody,
            targetAudience: c.targetAudience || { type: 'AMBASSADORS', role: 'All', campus: 'All', activityStatus: 'All', accountHealth: 'Active', referralMilestone: 'All', leadFunnelStatus: 'All', missingInfo: 'None', programId: 'All' },
            channels: c.channels || ['EMAIL'],
            waTemplateName: c.waTemplateName || '',
            waVariableMapping: c.waVariableMapping || {},
            waHeaderUrl: c.waHeaderUrl || ''
        })
        setShowModal(true)
    }

    const openPreview = (c: any) => {
        setPreviewCampaign(c)
        setShowPreviewModal(true)
    }

    const handleExport = async (id: number) => {
        const tid = toast.loading('Generating Report...')
        try {
            const res = await exportCampaignData(id)
            if (res.success && res.csv) {
                // Create Blob and Download
                const blob = new Blob([res.csv], { type: 'text/csv;charset=utf-8;' })
                const url = window.URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = res.filename || `report-${id}.csv`
                document.body.appendChild(a)
                a.click()
                document.body.removeChild(a)
                window.URL.revokeObjectURL(url)
                toast.success('Report Downloaded', { id: tid })
            } else {
                toast.error(res.error || 'Export failed', { id: tid })
            }
        } catch (e) {
            console.error(e)
            toast.error('Download failed', { id: tid })
        }
    }

    const getAudienceDescription = (audience: any) => {
        if (!audience) return 'Global Audience'
        const parts = []
        if (audience.type && audience.type !== 'AMBASSADORS') parts.push(audience.type.replace('_', ' '))
        if (audience.role && audience.role !== 'All' && (audience.type === 'AMBASSADORS' || !audience.type)) parts.push(audience.role)
        if (audience.campus && audience.campus !== 'All') parts.push(audience.campus)
        if (audience.accountHealth && audience.accountHealth !== 'Active') parts.push(audience.accountHealth)
        if (audience.referralMilestone && audience.referralMilestone !== 'All') parts.push(`${audience.referralMilestone} Referrals`)
        if (audience.missingInfo && audience.missingInfo !== 'None') parts.push(`Missing ${audience.missingInfo}`)
        if (audience.leadFunnelStatus && audience.leadFunnelStatus !== 'All') {
            const funnelLabels: Record<string, string> = {
                hasPendingLeads: 'Pending Leads',
                hasVisitedLeads: 'Contacted Leads',
                hasNotConvertedLeads: 'Not Admitted'
            }
            parts.push(funnelLabels[audience.leadFunnelStatus] || audience.leadFunnelStatus)
        }
        // ── Show Referral lead status filter ──
        if (audience.leadStatus && audience.leadStatus !== 'All') {
            const leadStatusLabels: Record<string, string> = {
                New: 'New',
                Contacted: 'Contacted',
                Admitted_Confirmed: 'Admitted / Confirmed',
                Rejected: 'Rejected'
            }
            parts.push(leadStatusLabels[audience.leadStatus] || audience.leadStatus)
        }
        // ── Show Program lead status filter ──
        if (audience.programLeadStatus && audience.programLeadStatus !== 'All') {
            parts.push(audience.programLeadStatus.charAt(0) + audience.programLeadStatus.slice(1).toLowerCase())
        }
        // ── Show Specific Program filter ──
        if (audience.programId && audience.programId !== 'All') {
            const prog = programs.find(p => p.id.toString() === audience.programId.toString());
            if (prog) parts.push(`Program: ${prog.title}`);
        }
        // ── Show Activity Status filter (Active / Dormant ambassadors) ──
        if (audience.activityStatus && audience.activityStatus !== 'All') {
            parts.push(audience.activityStatus === 'Dormant' ? 'Dormant' : 'Recently Active')
        }
        return parts.length > 0 ? parts.join(' • ') : 'All Active Ambassadors'
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

                <div className="flex items-center gap-3 relative z-10">
                    <div className="bg-slate-100 p-1 rounded-xl flex items-center mr-2">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'list' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            List
                        </button>
                        <button
                            onClick={() => setViewMode('analytics')}
                            className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'analytics' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Analytics
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setIndividualForm({
                                mobile: '',
                                templateName: '',
                                variables: ['', '', '', ''],
                                button_1: ''
                            })
                            setShowIndividualModal(true)
                        }}
                        className="flex items-center justify-center gap-2 px-5 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-xs uppercase tracking-tight hover:bg-gray-50 hover:scale-[1.02] active:scale-[0.98] transition-all shadow-sm"
                    >
                        <Send size={16} className="text-indigo-600" /> Send Individual
                    </button>

                    <button
                        onClick={() => {
                            setEditingCampaign(null)
                            setForm({
                                name: '',
                                subject: '',
                                templateBody: '',
                                targetAudience: { type: 'AMBASSADORS', role: 'All', campus: 'All', activityStatus: 'All', accountHealth: 'Active', referralMilestone: 'All', leadFunnelStatus: 'All', leadStatus: 'All', programLeadStatus: 'All', programId: 'All', missingInfo: 'None' },
                                channels: ['EMAIL'],
                                waTemplateName: '',
                                waVariableMapping: {},
                                waHeaderUrl: ''
                            })
                            setShowModal(true)
                        }}
                        className="flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 border border-white/10 text-white rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-black hover:scale-[1.02] active:scale-[0.98] transition-all shadow-xl shadow-gray-200"
                    >
                        <Plus size={16} /> Create Workflow
                    </button>
                </div>
            </div>

            {viewMode === 'analytics' ? (
                <CampaignAnalytics />
            ) : (
                <div className="space-y-6">


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
                                            <button onClick={() => openPreview(c)} className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 hover:shadow-sm transition-all" title="Preview Sandbox"><Eye size={16} /></button>
                                            <button onClick={() => handleExport(c.id)} className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-blue-600 hover:shadow-sm transition-all" title="Download Report"><Download size={16} /></button>
                                            <button onClick={() => openEdit(c)} className="p-2.5 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-indigo-600 hover:shadow-sm transition-all" title="Edit Logic"><Edit size={16} /></button>
                                            {(c.status === 'SCHEDULED' || c.logs?.[0]?.status === 'PROCESSING') && (
                                                <button onClick={() => handleReset(c.id, c.name)} className="p-2.5 bg-amber-50 border border-amber-100 rounded-xl text-amber-500 hover:bg-amber-100 hover:shadow-sm transition-all" title="Reset Stuck State"><AlertTriangle size={16} /></button>
                                            )}
                                            {c.channels?.includes('WHATSAPP') && c.logs?.[0] && (
                                                <button
                                                    onClick={async () => {
                                                        const res = await syncCampaignMetrics(c.id);
                                                        if (res.success) {
                                                            toast.success('Metrics Synced Perfectly');
                                                            loadCampaigns();
                                                        } else {
                                                            toast.error(res.error || 'Sync Failed');
                                                        }
                                                    }}
                                                    className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-400 hover:bg-indigo-600 hover:text-white hover:shadow-sm transition-all"
                                                    title="Sync Live Metrics"
                                                >
                                                    <Database size={16} />
                                                </button>
                                            )}
                                            {c.channels?.includes('WHATSAPP') && c.logs?.[0]?.refId && (
                                                <button
                                                    onClick={() => {
                                                        setSelectedRefId(c.logs[0].refId);
                                                        setShowLogsModal(true);
                                                    }}
                                                    className="p-2.5 bg-emerald-50 border border-emerald-100 rounded-xl text-emerald-600 hover:bg-emerald-600 hover:text-white hover:shadow-sm transition-all"
                                                    title="Delivery Logs"
                                                >
                                                    <MessageSquare size={16} />
                                                </button>
                                            )}
                                            <button onClick={() => handleDelete(c.id)} className="p-2.5 bg-rose-50 border border-rose-100 rounded-xl text-rose-400 hover:bg-rose-600 hover:text-white hover:shadow-sm transition-all" title="Purge Artifact"><Trash2 size={16} /></button>
                                        </div>
                                    </div>

                                    <div className="mb-6">
                                        <h3 className="font-black text-gray-900 text-lg uppercase tracking-tight truncate group-hover:text-indigo-600 transition-colors">{c.name}</h3>
                                        <p className="text-[11px] text-gray-400 font-bold font-mono tracking-wider truncate mb-2">{c.subject}</p>
                                        <div className="flex items-center gap-2 inline-flex border border-gray-100 bg-gray-50/50 px-2.5 py-1 rounded-full">
                                            <Target size={12} className="text-indigo-400" />
                                            <span className="text-[10px] font-black text-gray-600 uppercase tracking-widest">{getAudienceDescription(c.targetAudience)}</span>
                                        </div>
                                        <div className="mt-2 flex gap-1">
                                            {c.channels?.includes('EMAIL') && <span className="bg-blue-50 text-blue-600 px-2 py-0.5 rounded text-[9px] font-bold border border-blue-100 flex items-center gap-1"><Mail size={10} /> Email</span>}
                                            {c.channels?.includes('PUSH') && <span className="bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded text-[9px] font-bold border border-indigo-100 flex items-center gap-1"><Smartphone size={10} /> Push</span>}
                                            {c.channels?.includes('IN_APP') && <span className="bg-amber-50 text-amber-600 px-2 py-0.5 rounded text-[9px] font-bold border border-amber-100 flex items-center gap-1"><Bell size={10} /> In-App</span>}
                                            {c.channels?.includes('WHATSAPP') && <span className="bg-green-50 text-green-600 px-2 py-0.5 rounded text-[9px] font-bold border border-green-100 flex items-center gap-1"><Smartphone size={10} /> WhatsApp</span>}
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
                                                    {log.status === 'PROCESSING' && (
                                                        <div className="space-y-1.5">
                                                            <div className="flex justify-between items-center text-[9px] font-black text-indigo-500 uppercase tracking-widest">
                                                                <span>Live Dispatching...</span>
                                                                <span>{log.recipientCount > 0 ? Math.min(100, Math.round((log.sentCount / log.recipientCount) * 100)) : 0}%</span>
                                                                <span>{log.sentCount} / {log.recipientCount}</span>
                                                            </div>
                                                            <div className="h-1 w-full bg-gray-100 rounded-full overflow-hidden">
                                                                <motion.div
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${log.recipientCount > 0 ? (log.sentCount / log.recipientCount) * 100 : 0}%` }}
                                                                    className="h-full bg-indigo-500 rounded-full"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                    <div className="flex flex-col gap-3">
                                                        <div className="flex items-end justify-between">
                                                            <div className="flex-1">
                                                                <div className="flex items-center gap-3 mb-1">
                                                                    <span className="text-[20px] font-black text-gray-900 leading-none">{log.sentCount}</span>
                                                                    <span className="text-[9px] font-black text-gray-300">TOTAL</span>
                                                                </div>
                                                                <div className="flex gap-2">
                                                                    {log.emailSent > 0 && <span className="text-[9px] font-bold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">📧 {log.emailSent}</span>}
                                                                    {log.pushSent > 0 && <span className="text-[9px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">🔔 {log.pushSent}</span>}
                                                                    {log.inAppSent > 0 && <span className="text-[9px] font-bold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">📱 {log.inAppSent}</span>}
                                                                    {log.whatsappSent > 0 && (
                                                                        <div className="flex flex-col gap-1 mt-1 p-2 bg-green-50/50 rounded-lg border border-green-100">
                                                                            <div className="flex items-center justify-between">
                                                                                <span className="text-[9px] font-bold text-green-700 flex items-center gap-1">
                                                                                    <span className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></span>
                                                                                    WHATSAPP
                                                                                </span>
                                                                            </div>
                                                                            <div className="grid grid-cols-3 gap-2 text-[9px] font-medium text-green-600/80">
                                                                                <div className="flex items-center justify-between gap-1 bg-white/50 px-1.5 py-0.5 rounded">
                                                                                    <span>Sent</span>
                                                                                    <span className="font-bold">{log.whatsappSent || 0}</span>
                                                                                </div>
                                                                                <div className="flex items-center justify-between gap-1 bg-white/50 px-1.5 py-0.5 rounded">
                                                                                    <span>Delivered</span>
                                                                                    <span className="font-bold">{log.whatsappDelivered || 0}</span>
                                                                                </div>
                                                                                <div className="flex items-center justify-between gap-1 bg-white/50 px-1.5 py-0.5 rounded">
                                                                                    <span>Read</span>
                                                                                    <span className="font-bold text-green-700">{log.whatsappRead || 0}</span>
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            </div>
                                                            <div className="text-right">
                                                                <p className={`text-[20px] font-black leading-none ${log.failedCount > 0 ? 'text-rose-500' : 'text-gray-200'}`}>{log.failedCount}</p>
                                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mt-1">Failed</p>
                                                            </div>
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
                                        disabled={isProcessing || c.status === 'SCHEDULED' || c.logs?.[0]?.status === 'PROCESSING'}
                                        className="w-full py-4 bg-gray-900 text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all shadow-xl shadow-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {c.logs?.[0]?.status === 'PROCESSING' || c.status === 'SCHEDULED' ? (
                                            <><Loader2 size={12} className="animate-spin" /> Dispatching...</>
                                        ) : (
                                            <><Play size={12} fill="currentColor" /> Initiate Dispatch</>
                                        )}
                                    </button>
                                </motion.div>
                            ))}
                        </div>
                    )}

                    {/* Modal Layer UI (Glassmorphism Modal) - portaled to escape motion.div transform */}
                    <ClientPortal show={showModal}>
                        <AnimatePresence>
                        {showModal && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
                                    {/* Modal Header - Light */}
                                    <div className="bg-white border-b border-gray-100 px-6 py-5">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 bg-gray-100 rounded-xl flex items-center justify-center">
                                                    {editingCampaign ? <Edit size={18} className="text-gray-600" /> : <Sparkles size={18} className="text-gray-600" />}
                                                </div>
                                                <div>
                                                    <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">{editingCampaign ? 'Edit Campaign' : 'Ignite Workflow'}</h2>
                                                    <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.15em]">Precision Marketing Automation</p>
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => setShowModal(false)}
                                                aria-label="Close modal"
                                                className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
                                            >
                                                <X size={18} className="text-gray-500" />
                                            </button>
                                        </div>
                                    </div>

                                    {/* Scrollable Form Body */}
                                    <div className="p-8 overflow-y-auto space-y-8">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Audience Type Selector */}
                                            <div className="space-y-2 col-span-2">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Audience Group</label>
                                                <div className="flex flex-wrap gap-2">
                                                    {['AMBASSADORS', 'STUDENTS', 'REFERRALS', 'PROGRAM_LEADS'].map((type) => (
                                                        <button
                                                            key={type}
                                                            type="button"
                                                            onClick={() => setForm({ ...form, targetAudience: { ...form.targetAudience, type } })}
                                                            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${(form.targetAudience.type || 'AMBASSADORS') === type
                                                                ? 'bg-indigo-600 text-white border-indigo-600 shadow-md transform scale-105'
                                                                : 'bg-white text-gray-500 border-gray-200 hover:border-gray-300'
                                                                }`}
                                                        >
                                                            {type.replace('_', ' ')}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

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
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all placeholder:text-gray-300"
                                                    placeholder="Headline for the recipient..."
                                                    value={form.subject}
                                                    onChange={e => setForm({ ...form, subject: e.target.value })}
                                                />
                                            </div>

                                            <div className="space-y-2 col-span-2">
                                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Dispatch Channels</label>
                                                <div className="flex gap-4">
                                                    <button
                                                        onClick={() => toggleChannel('EMAIL')}
                                                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${form.channels.includes('EMAIL') ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-100 text-gray-400'}`}
                                                    >
                                                        <Mail size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Email</span>
                                                    </button>
                                                    <button
                                                        onClick={() => toggleChannel('PUSH')}
                                                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${form.channels.includes('PUSH') ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-100 text-gray-400'}`}
                                                    >
                                                        <Smartphone size={16} /> <span className="text-xs font-bold uppercase tracking-wider">Mobile Push</span>
                                                    </button>
                                                    <button
                                                        onClick={() => toggleChannel('IN_APP')}
                                                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${form.channels.includes('IN_APP') ? 'bg-blue-50 border-blue-200 text-blue-700' : 'bg-white border-gray-100 text-gray-400'}`}
                                                    >
                                                        <Bell size={16} /> <span className="text-xs font-bold uppercase tracking-wider">In-App</span>
                                                    </button>
                                                    <button
                                                        onClick={() => toggleChannel('WHATSAPP')}
                                                        className={`flex-1 py-3 rounded-xl border flex items-center justify-center gap-2 transition-all ${form.channels.includes('WHATSAPP') ? 'bg-green-50 border-green-200 text-green-700' : 'bg-white border-gray-100 text-gray-400'}`}
                                                    >
                                                        <Smartphone size={16} /> <span className="text-xs font-bold uppercase tracking-wider">WhatsApp</span>
                                                    </button>
                                                </div>
                                            </div>

                                            {form.channels.includes('WHATSAPP') && (
                                                <div className="space-y-4 col-span-2 animate-in slide-in-from-top-2 duration-300">
                                                    <div className="flex items-center justify-between px-1">
                                                        <label className="block text-[10px] font-black text-green-600 uppercase tracking-widest flex items-center gap-2">
                                                            <Smartphone size={12} /> WhatsApp Messaging Blueprint
                                                        </label>
                                                        {form.waTemplateName && (
                                                            <span className="text-[9px] font-black text-green-500 bg-green-50 px-2 py-0.5 rounded-full border border-green-100 uppercase tracking-tight">
                                                                Template Locked
                                                            </span>
                                                        )}
                                                    </div>
                                                    <div className="relative">
                                                        <label htmlFor="wa-template-select" className="sr-only">Select WhatsApp Template</label>
                                                        <select
                                                            id="wa-template-select"
                                                            className="w-full bg-green-50/30 border border-green-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-green-50 focus:border-green-200 transition-all appearance-none cursor-pointer"
                                                            value={form.waTemplateName}
                                                            onChange={e => setForm({ ...form, waTemplateName: e.target.value })}
                                                        >
                                                            <option value="">Select an approved MSG91 Template...</option>
                                                            {availableTemplates.map(t => (
                                                                <option key={t.id} value={t.templateName}>
                                                                    {t.templateName.replace(/_/g, ' ')} ({t.requiredVariablesCount} variables)
                                                                </option>
                                                            ))}
                                                        </select>
                                                    </div>
                                                    
                                                    {form.waTemplateName && (
                                                        <div className="space-y-4 animate-in slide-in-from-top-1 duration-300">
                                                            <div className="space-y-1.5">
                                                                <label className="block text-[10px] font-black text-green-600 uppercase tracking-widest px-1">Header Media URL (Optional Rich Preview)</label>
                                                                <input
                                                                    className="w-full bg-white border border-green-100 rounded-2xl px-5 py-3 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-green-50 focus:border-green-200 transition-all placeholder:text-gray-300"
                                                                    placeholder="Direct image link or video link (.mp4, .pdf etc)"
                                                                    value={form.waHeaderUrl}
                                                                    onChange={e => setForm({ ...form, waHeaderUrl: e.target.value })}
                                                                />
                                                                <p className="text-[9px] font-bold text-green-700/60 px-1 italic">Providing an image or video URL here enables a rich visual header on top of the message.</p>
                                                            </div>

                                                            <div className="p-4 bg-green-50/50 rounded-2xl border border-green-100 space-y-4">
                                                                <div className="flex items-center gap-2 text-[10px] font-black text-green-700 uppercase tracking-widest">
                                                                    <Sparkles size={12} /> Variable Precision Mapping
                                                                </div>
                                                                <p className="text-[11px] font-medium text-green-800 leading-relaxed italic">
                                                                    &ldquo;{availableTemplates.find(t => t.templateName === form.waTemplateName)?.description || 'Approved business communication blueprint.'}&rdquo;
                                                                </p>
                                                                
                                                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                                                                    {((): { label: string; variableKey: string }[] => {
                                                                        const count = availableTemplates.find(t => t.templateName === form.waTemplateName)?.requiredVariablesCount || 0;
                                                                        const fields = [];
                                                                        for (let i = 1; i <= count; i++) {
                                                                            fields.push({ label: `Variable ${i} ({{${i}}})`, variableKey: i.toString() });
                                                                        }
                                                                        return fields;
                                                                    })().map((v) => (
                                                                        <div key={v.variableKey} className="bg-white/60 p-3 rounded-2xl border border-green-100 shadow-sm transition-all hover:border-green-300">
                                                                            <label htmlFor={`wa-var-map-${v.variableKey}`} className="text-[9px] font-black text-green-600 uppercase mb-2 px-1 tracking-wider block">{v.label}</label>
                                                                            <select
                                                                                id={`wa-var-map-${v.variableKey}`}
                                                                                value={form.waVariableMapping[v.variableKey]?.startsWith('{ProgramLink') ? '{ProgramLink}' : (form.waVariableMapping[v.variableKey] || '')}
                                                                                onChange={e => {
                                                                                    const val = e.target.value
                                                                                    // 🛡️ AUTHORITATIVE INIT: If selecting Program Link, wrap it immediately to trigger the slug picker
                                                                                    const finalVal = (val === 'ProgramLink' || val === 'programLink') ? '{ProgramLink}' : val
                                                                                    setForm({ 
                                                                                        ...form, 
                                                                                        waVariableMapping: { ...form.waVariableMapping, [v.variableKey]: finalVal } 
                                                                                    })
                                                                                }}
                                                                                className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-[11px] font-bold text-gray-700 focus:ring-2 focus:ring-green-100 transition-all outline-none"
                                                                            >
                                                                                <option value="">Select Field...</option>
                                                                                {((): { value: string; label: string }[] => {
                                                                                    const type = form.targetAudience.type || 'AMBASSADORS'
                                                                                    const fieldMap: Record<string, { value: string, label: string }[]> = {
                                                                                        AMBASSADORS: [
                                                                                            { value: 'Name', label: 'Ambassador Name' },
                                                                                            { value: 'ReferralCode', label: 'Referral Code' },
                                                                                            { value: 'ReferralLink', label: 'Referral Link' },
                                                                                            { value: 'ProgramLink', label: 'External Program Link' },
                                                                                            { value: 'Campus', label: 'Campus' },
                                                                                            { value: 'Role', label: 'Role' },
                                                                                            { value: 'Mobile', label: 'Mobile Number' },
                                                                                            { value: 'referralCount', label: 'Confirmed Referrals' },
                                                                                            { value: 'pendingReferrals', label: 'Pending Referrals' }
                                                                                        ],
                                                                                        STUDENTS: [
                                                                                            { value: 'Name', label: 'Student Name' },
                                                                                            { value: 'Campus', label: 'Campus' },
                                                                                            { value: 'Grade', label: 'Grade' },
                                                                                            { value: 'Mobile', label: 'Parent Mobile' },
                                                                                            { value: 'admissionDate', label: 'Admission Date' }
                                                                                        ],
                                                                                        REFERRALS: [
                                                                                            { value: 'Name', label: 'Parent Name' },
                                                                                            { value: 'studentName', label: 'Student Name' },
                                                                                            { value: 'Mobile', label: 'Mobile Number' },
                                                                                            { value: 'Campus', label: 'Campus' },
                                                                                            { value: 'Grade', label: 'Grade Interested' },
                                                                                            { value: 'academicYear', label: 'Academic Year' },
                                                                                            { value: 'leadStatus', label: 'Lead Status' },
                                                                                            { value: 'ambassadorName', label: 'Ambassador Name' },
                                                                                            { value: 'referrerLink', label: 'Referrer Link' },
                                                                                            { value: 'ProgramLink', label: 'Program Link (Optional)' }
                                                                                        ],
                                                                                        PROGRAM_LEADS: [
                                                                                            { value: 'Name', label: 'Lead Name' },
                                                                                            { value: 'studentName', label: 'Student Name' },
                                                                                            { value: 'Mobile', label: 'Mobile Number' },
                                                                                            { value: 'Campus', label: 'Campus' },
                                                                                            { value: 'programName', label: 'Program Name' },
                                                                                            { value: 'programLink', label: 'Program Link (Automatic)' },
                                                                                            { value: 'status', label: 'Lead Status' },
                                                                                            { value: 'source', label: 'Source (Ambassador)' },
                                                                                            { value: 'enquiryDate', label: 'Enquiry Date' },
                                                                                            { value: 'referrerLink', label: 'Referrer Link' },
                                                                                            { value: 'ProgramLink', label: 'Program Link (Picker)' }
                                                                                        ]
                                                                                    }
                                                                                    return fieldMap[type] || fieldMap['AMBASSADORS']
                                                                                })().map(field => (
                                                                                    <option key={field.value} value={`{${field.value}}`}>{field.label}</option>
                                                                                ))}
                                                                                <option value="STATIC">Custom / Static Text</option>
                                                                            </select>
                                                                            {form.waVariableMapping[v.variableKey]?.startsWith('{ProgramLink') && (
                                                                                <>
                                                                                <label htmlFor={`wa-var-prog-map-${v.variableKey}`} className="sr-only">Select Program for Variable</label>
                                                                                <select
                                                                                    id={`wa-var-prog-map-${v.variableKey}`}
                                                                                    className="w-full mt-2 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1.5 text-[10px] font-bold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                                                                                    value={form.waVariableMapping[v.variableKey]?.match(/:([^}]+)/)?.[1] || ''}
                                                                                    onChange={e => setForm({
                                                                                        ...form,
                                                                                        waVariableMapping: { ...form.waVariableMapping, [v.variableKey]: `{ProgramLink:${e.target.value}}` }
                                                                                    })}
                                                                                >
                                                                                    <option value="">Select Target Program...</option>
                                                                                    {programs.map(p => (
                                                                                        <option key={p.id} value={p.slug}>{p.title}</option>
                                                                                    ))}
                                                                                </select>
                                                                                </>
                                                                            )}
                                                                            {form.waVariableMapping[v.variableKey] === '{programLink}' && (
                                                                                <p className="mt-2 text-[10px] font-bold text-indigo-500 italic px-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                                                                    <Sparkles size={10} /> Syncs with Campaign Program automatically.
                                                                                </p>
                                                                            )}
                                                                            {form.waVariableMapping[v.variableKey] === 'STATIC' && (
                                                                                <input 
                                                                                    className="w-full mt-2 bg-white border border-gray-100 rounded-lg px-2 py-1 text-[10px] font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-200"
                                                                                    placeholder="Type static value..."
                                                                                    value={form.waVariableMapping[`static_${v.variableKey}`] || ''}
                                                                                    onChange={e => setForm({ 
                                                                                        ...form, 
                                                                                        waVariableMapping: { ...form.waVariableMapping, [`static_${v.variableKey}`]: e.target.value } 
                                                                                    })}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    ))}
                                                                </div>

                                                                {/* Interactive Button Section */}
                                                                <div className="mt-4 pt-4 border-t border-green-100 space-y-3">
                                                                    <div className="flex items-center gap-2 text-[10px] font-black text-green-700 uppercase tracking-widest">
                                                                        <ExternalLink size={12} /> Interactive Action Button (Optional)
                                                                    </div>
                                                                    <div className="bg-white/60 p-4 rounded-2xl border border-green-100 shadow-sm">
                                                                        <label htmlFor="wa-btn-1-map" className="text-[9px] font-black text-green-600 uppercase mb-2 px-1 tracking-wider block">Button 1 Link (Call-to-Action)</label>
                                                                        <select
                                                                            id="wa-btn-1-map"
                                                                            value={form.waVariableMapping['button_1']?.startsWith('{ProgramLink') ? '{ProgramLink}' : (form.waVariableMapping['button_1'] || '')}
                                                                            onChange={e => {
                                                                                const val = e.target.value
                                                                                // 🛡️ PERSISTENCE FIX: If switching to ProgramLink, check if a slug already exists in current state
                                                                                const currentMap = form.waVariableMapping['button_1'] || ''
                                                                                const preservedValue = (val === '{ProgramLink}' && currentMap.includes(':')) ? currentMap : val
                                                                                
                                                                                setForm({ 
                                                                                    ...form, 
                                                                                    waVariableMapping: { ...form.waVariableMapping, ['button_1']: preservedValue } 
                                                                                })
                                                                            }}
                                                                            className="w-full bg-white border border-gray-100 rounded-xl px-3 py-2 text-[11px] font-bold text-gray-700 focus:ring-2 focus:ring-green-100 transition-all outline-none"
                                                                        >
                                                                            <option value="">No Button Variable...</option>
                                                                            {((): { value: string; label: string }[] => {
                                                                                const type = form.targetAudience.type || 'AMBASSADORS'
                                                                                const fieldMap: Record<string, { value: string, label: string }[]> = {
                                                                                    AMBASSADORS: [
                                                                                        { value: 'ReferralLink', label: 'Referral Link' },
                                                                                        { value: 'ProgramLink', label: 'External Program Link' },
                                                                                        { value: 'Name', label: 'Ambassador Name' }
                                                                                    ],
                                                                                    REFERRALS: [
                                                                                        { value: 'referrerLink', label: 'Referrer Link' },
                                                                                        { value: 'ProgramLink', label: 'Program Link (Optional)' }
                                                                                    ],
                                                                                    PROGRAM_LEADS: [
                                                                                        { value: 'referrerLink', label: 'Referrer Link' },
                                                                                        { value: 'programLink', label: 'Program Link (Automatic)' },
                                                                                        { value: 'ProgramLink', label: 'Program Link (Picker)' }
                                                                                    ]
                                                                                }
                                                                                return fieldMap[type] || fieldMap['AMBASSADORS']
                                                                            })().map(field => (
                                                                                <option key={field.value} value={`{${field.value}}`}>{field.label}</option>
                                                                            ))}
                                                                            <option value="STATIC">Custom Static URL</option>
                                                                        </select>
                                                                        
                                                                        {form.waVariableMapping['button_1']?.startsWith('{ProgramLink') && (
                                                                            <>
                                                                            <label htmlFor="wa-btn-1-prog" className="sr-only">Select Program for Button</label>
                                                                            <select
                                                                                id="wa-btn-1-prog"
                                                                                className="w-full mt-2 bg-indigo-50 border border-indigo-100 rounded-lg px-2 py-1.5 text-[10px] font-bold text-indigo-700 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                                                                                value={form.waVariableMapping['button_1']?.match(/:([^}]+)/)?.[1] || ''}
                                                                                onChange={e => setForm({
                                                                                    ...form,
                                                                                    waVariableMapping: { ...form.waVariableMapping, ['button_1']: `{ProgramLink:${e.target.value}}` }
                                                                                })}
                                                                            >
                                                                                <option value="">Select Target Program...</option>
                                                                                {programs.map(p => (
                                                                                    <option key={p.id} value={p.slug}>{p.title}</option>
                                                                                ))}
                                                                            </select>
                                                                            </>
                                                                        )}
                                                                        {form.waVariableMapping['button_1'] === '{programLink}' && (
                                                                            <p className="mt-2 text-[10px] font-bold text-indigo-500 italic px-1 flex items-center gap-1 animate-in fade-in slide-in-from-top-1">
                                                                                <Sparkles size={10} /> Syncs with Campaign Program automatically.
                                                                            </p>
                                                                        )}
                                                                        
                                                                        {form.waVariableMapping['button_1'] === 'STATIC' && (
                                                                            <input 
                                                                                className="w-full mt-2 bg-white border border-gray-100 rounded-lg px-2 py-1 text-[10px] font-semibold text-gray-600 focus:outline-none focus:ring-1 focus:ring-green-200"
                                                                                placeholder="https://example.com/..."
                                                                                value={form.waVariableMapping['static_button_1'] || ''}
                                                                                onChange={e => setForm({ 
                                                                                    ...form, 
                                                                                    waVariableMapping: { ...form.waVariableMapping, ['static_button_1']: e.target.value } 
                                                                                })}
                                                                            />
                                                                        )}
                                                                        <p className="text-[8px] font-bold text-green-700/50 mt-2 italic px-1">Mapping a link correctly to 'Button 1' is required to make image headers clickable.</p>
                                                                    </div>
                                                                </div>

                                                                <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 flex items-center gap-2">
                                                                    <div className="w-6 h-6 bg-white rounded-lg flex items-center justify-center text-indigo-500 shadow-sm border border-indigo-100">
                                                                        <Database size={12} />
                                                                    </div>
                                                                    <p className="text-[10px] font-black text-indigo-700 uppercase tracking-widest">
                                                                        Aligning App Data for {estimatedReach || 0} Recipients
                                                                    </p>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        {/* Advanced Audience Partitioning */}
                                        <div className="bg-gray-50 border border-gray-200 rounded-2xl p-5 space-y-5">
                                            <div className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    <Target size={14} className="text-gray-500" />
                                                    <h4 className="text-[10px] font-black text-gray-600 uppercase tracking-widest">Audience Segmentation</h4>
                                                </div>
                                                <div className="flex items-center gap-1.5 bg-white border border-gray-200 px-3 py-1 rounded-full shadow-sm">
                                                    <span className="text-[9px] font-bold text-gray-400 uppercase tracking-widest">Est. Impact:</span>
                                                    <span className="text-[10px] font-black text-gray-800 uppercase tracking-widest">{estimatedReach !== null ? `${estimatedReach} Profiles` : '...'}</span>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {(form.targetAudience.type === 'AMBASSADORS' || !form.targetAudience.type) && (
                                                    <div className="space-y-1.5">
                                                        <label htmlFor="audience-role-select" className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1">Structural Role</label>
                                                        <select
                                                            id="audience-role-select"
                                                            value={form.targetAudience.role}
                                                            onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, role: e.target.value } })}
                                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-gray-300 focus:border-gray-300 transition-all"
                                                        >
                                                            <option value="All">Global (All Roles)</option>
                                                            <option value="Staff">Internal Staff</option>
                                                            <option value="Parent">Parent Network</option>
                                                            <option value="Alumni">Alumni Circle</option>
                                                            <option value="Others">Others</option>
                                                        </select>
                                                    </div>
                                                )}

                                                {form.targetAudience.type === 'REFERRALS' && (
                                                    <div className="space-y-1.5">
                                                        <label htmlFor="referral-stage-select" className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1">Referral Stage</label>
                                                        <select
                                                            id="referral-stage-select"
                                                            value={(form.targetAudience as any).leadStatus || 'All'}
                                                            onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, leadStatus: e.target.value } as any })}
                                                            className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-gray-300 focus:border-gray-300 transition-all font-bold text-indigo-600"
                                                        >
                                                            <option value="All">Global (All Stages)</option>
                                                            <option value="New">New Lead</option>
                                                            <option value="Contacted">Contacted / Follow-up</option>
                                                            <option value="Admitted_Confirmed">Admitted / Confirmed</option>
                                                            <option value="Rejected">Rejected</option>
                                                        </select>
                                                    </div>
                                                )}

                                                {form.targetAudience.type === 'PROGRAM_LEADS' && (
                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                        <div className="space-y-1.5">
                                                            <label htmlFor="target-program-select" className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1">Target Program</label>
                                                            <select
                                                                id="target-program-select"
                                                                value={(form.targetAudience as any).programId || 'All'}
                                                                onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, programId: e.target.value } as any })}
                                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-gray-300 focus:border-gray-300 transition-all font-bold text-indigo-600"
                                                            >
                                                                <option value="All">Global (All Programs)</option>
                                                                {programs.map(p => (
                                                                    <option key={p.id} value={p.id}>{p.title}</option>
                                                                ))}
                                                            </select>
                                                        </div>
                                                        <div className="space-y-1.5">
                                                            <label htmlFor="campaign-stage-select" className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1">Campaign Stage</label>
                                                            <select
                                                                id="campaign-stage-select"
                                                                value={(form.targetAudience as any).programLeadStatus || 'All'}
                                                                onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, programLeadStatus: e.target.value } as any })}
                                                                className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-gray-300 focus:border-gray-300 transition-all font-bold text-emerald-600"
                                                            >
                                                                <option value="All">Global (All Stages)</option>
                                                                <option value="CLICKED">Clicked (Interested)</option>
                                                                <option value="REGISTERED">Registered / Converted</option>
                                                            </select>
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-1.5">
                                                    <label htmlFor="audience-campus-select" className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1">Institutional Node</label>
                                                    <select
                                                        id="audience-campus-select"
                                                        value={form.targetAudience.campus}
                                                        onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, campus: e.target.value } })}
                                                        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-gray-300 focus:border-gray-300 transition-all"
                                                    >
                                                        <option value="All">Global (All Nodes)</option>
                                                        {campuses.map((c: any) => (
                                                            <option key={c.id} value={c.campusName}>{c.campusName}</option>
                                                        ))}
                                                    </select>
                                                </div>
                                            </div>

                                            {/* ── Row 2: Enterprise Filters (AMBASSADORS only) ─── */}
                                            {(form.targetAudience.type === 'AMBASSADORS' || !form.targetAudience.type) && (
                                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-4 border-t border-gray-200">
                                                    <div className="space-y-1.5">
                                                        <label htmlFor="account-health-select" className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1">Account Health</label>
                                                        <select
                                                            id="account-health-select"
                                                            value={(form.targetAudience as any).accountHealth || 'Active'}
                                                            onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, accountHealth: e.target.value } as any })}
                                                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-gray-300 transition-all"
                                                        >
                                                            <option value="Active">Active Only (Default)</option>
                                                            <option value="Inactive">Inactive / Unverified</option>
                                                            <option value="All">All Accounts</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label htmlFor="referral-milestone-select" className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1">Referral Milestone</label>
                                                        <select
                                                            id="referral-milestone-select"
                                                            value={(form.targetAudience as any).referralMilestone || 'All'}
                                                            onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, referralMilestone: e.target.value } as any })}
                                                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-gray-300 transition-all"
                                                        >
                                                            <option value="All">All Referral Counts</option>
                                                            <option value="0">0 Referrals (No activity)</option>
                                                            <option value="1">Exactly 1 Referral</option>
                                                            <option value="2">Exactly 2 Referrals</option>
                                                            <option value="3">Exactly 3 Referrals</option>
                                                            <option value="4">Exactly 4 Referrals</option>
                                                            <option value="5+">5+ Referrals (VIPs)</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label htmlFor="missing-info-select" className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1">Missing Info</label>
                                                        <select
                                                            id="missing-info-select"
                                                            value={(form.targetAudience as any).missingInfo || 'None'}
                                                            onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, missingInfo: e.target.value } as any })}
                                                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-gray-300 transition-all"
                                                        >
                                                            <option value="None">No Filter</option>
                                                            <option value="bankDetails">Missing Bank Details</option>
                                                            <option value="childDetails">Missing Child Details</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label htmlFor="lead-funnel-status-select" className="block text-[9px] font-bold text-gray-400 uppercase tracking-[0.15em] px-1">Lead Funnel Stage</label>
                                                        <select
                                                            id="lead-funnel-status-select"
                                                            value={(form.targetAudience as any).leadFunnelStatus || 'All'}
                                                            onChange={e => setForm({ ...form, targetAudience: { ...form.targetAudience, leadFunnelStatus: e.target.value } as any })}
                                                            className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2.5 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-gray-300 transition-all"
                                                        >
                                                            <option value="All">All Lead Stages</option>
                                                            <option value="hasNoLeads">No Leads Added Yet (Dormant)</option>
                                                            <option value="hasSubmittedNotConfirmed">Submitted Leads — Not Yet Confirmed</option>
                                                            <option value="hasPendingLeads">Has New / Pending Leads</option>
                                                            <option value="hasVisitedLeads">Has Contacted Leads</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>

                                        {/* Payload Content - Only show if Email, Push, or In-App are active */}
                                        {(form.channels.includes('EMAIL') || form.channels.includes('PUSH') || form.channels.includes('IN_APP')) && (
                                            <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-500">
                                                <div className="flex justify-between px-1">
                                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Multi-Channel Payload</label>
                                                    <div className="flex flex-wrap gap-x-3 gap-y-2 justify-end">
                                                        {((): { tag: string; label: string }[] => {
                                                            const type = form.targetAudience.type || 'AMBASSADORS'
                                                            const varMap: Record<string, { tag: string; label: string }[]> = {
                                                                AMBASSADORS: [
                                                                    { tag: '{userName}', label: 'Name' },
                                                                    { tag: '{referralCode}', label: 'Code' },
                                                                    { tag: '{campus}', label: 'Campus' },
                                                                    { tag: '{role}', label: 'Role' },
                                                                    { tag: '{referralCount}', label: 'Confirmed' },
                                                                    { tag: '{pendingReferrals}', label: 'Pending' },
                                                                    { tag: '{mobile}', label: 'Mobile' }
                                                                ],
                                                                STUDENTS: [
                                                                    { tag: '{studentName}', label: 'Name' },
                                                                    { tag: '{campus}', label: 'Campus' },
                                                                    { tag: '{grade}', label: 'Grade' },
                                                                    { tag: '{mobile}', label: 'Mobile' },
                                                                    { tag: '{admissionDate}', label: 'Admission Date' }
                                                                ],
                                                                REFERRALS: [
                                                                    { tag: '{parentName}', label: 'Parent Name' },
                                                                    { tag: '{studentName}', label: 'Student Name' },
                                                                    { tag: '{parentMobile}', label: 'Mobile' },
                                                                    { tag: '{campus}', label: 'Campus' },
                                                                    { tag: '{grade}', label: 'Grade' },
                                                                    { tag: '{academicYear}', label: 'Academic Year' },
                                                                    { tag: '{leadStatus}', label: 'Lead Status' },
                                                                    { tag: '{ambassadorName}', label: 'Ambassador' },
                                                                    { tag: '{referrerLink}', label: 'Referrer Link' }
                                                                ],
                                                                PROGRAM_LEADS: [
                                                                    { tag: '{leadName}', label: 'Lead Name' },
                                                                    { tag: '{studentName}', label: 'Student Name' },
                                                                    { tag: '{mobile}', label: 'Mobile' },
                                                                    { tag: '{campus}', label: 'Campus' },
                                                                    { tag: '{programName}', label: 'Program Name' },
                                                                    { tag: '{programLink}', label: 'Program Link' },
                                                                    { tag: '{status}', label: 'Lead Status' },
                                                                    { tag: '{source}', label: 'Source' },
                                                                    { tag: '{enquiryDate}', label: 'Enquiry Date' },
                                                                    { tag: '{referrerLink}', label: 'Referrer Link' }
                                                                ]
                                                            }
                                                            return varMap[type] || varMap['AMBASSADORS']
                                                        })().map(item => (
                                                            <button
                                                                key={item.tag}
                                                                onClick={() => {
                                                                    const textarea = document.getElementById('payload-textarea') as HTMLTextAreaElement;
                                                                    if (textarea) {
                                                                        const start = textarea.selectionStart;
                                                                        const end = textarea.selectionEnd;
                                                                        const text = form.templateBody;
                                                                        const before = text.substring(0, start);
                                                                        const after = text.substring(end, text.length);
                                                                        const newText = before + item.tag + after;
                                                                        setForm({ ...form, templateBody: newText });
                                                                        setTimeout(() => {
                                                                            textarea.focus();
                                                                            textarea.setSelectionRange(start + item.tag.length, start + item.tag.length);
                                                                        }, 0);
                                                                    }
                                                                }}
                                                                className="text-[9px] font-black text-gray-400 hover:text-gray-700 uppercase tracking-widest font-mono transition-colors px-1.5 py-0.5 bg-gray-100 hover:bg-gray-200 rounded"
                                                            >
                                                                {item.tag}
                                                            </button>
                                                        ))}
                                                    </div>
                                                </div>
                                                <textarea
                                                    id="payload-textarea"
                                                    className="w-full bg-gray-50 border border-gray-100 rounded-[32px] px-6 py-5 text-sm font-bold text-gray-900 h-48 focus:outline-none focus:ring-4 focus:ring-blue-50 focus:border-blue-200 transition-all font-mono leading-relaxed resize-none shadow-inner"
                                                    placeholder="Inject HTML or standard text template here..."
                                                    value={form.templateBody}
                                                    onChange={e => setForm({ ...form, templateBody: e.target.value })}
                                                />
                                                <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-3">
                                                    <AlertTriangle size={18} className="text-amber-600 shrink-0" />
                                                    <div className="space-y-1">
                                                        <p className="text-[10px] font-bold text-amber-700 leading-normal">Precision Dispatch ensures variables are merged server-side. Validate syntax before deploying.</p>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* Modal Footer */}
                                    <div className="px-6 py-4 bg-white border-t border-gray-100 flex gap-3">
                                        <button
                                            onClick={() => setShowModal(false)}
                                            className="flex-1 py-3 bg-gray-100 border border-gray-200 text-gray-500 rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-gray-200 transition-all"
                                        >
                                            Dismiss
                                        </button>
                                        <button
                                            onClick={handleSubmit}
                                            disabled={isProcessing}
                                            className="flex-1 py-3 bg-gray-900 text-white rounded-xl font-bold text-xs uppercase tracking-widest hover:bg-black active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
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
                    </ClientPortal>

                    {/* Preview Modal Layer - portaled to escape motion.div transform */}
                    <ClientPortal show={!!(showPreviewModal && previewCampaign)}>
                        <AnimatePresence>
                        {showPreviewModal && previewCampaign && (
                        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
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
                                    <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                                        <h3 className="text-md font-black text-gray-900 uppercase tracking-tighter italic">Workflow Output Preview</h3>
                                        <button onClick={() => setShowPreviewModal(false)} aria-label="Close Preview" className="p-2 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-black transition-colors">
                                            <X size={20} />
                                        </button>
                                    </div>

                                    <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
                                        {/* Test Dispatch Mechanism */}
                                        <div className="p-5 bg-blue-50/50 border border-blue-100/50 rounded-3xl space-y-4">
                                            <div className="flex items-center gap-2">
                                                <div className="p-1.5 bg-blue-600 rounded-lg text-white">
                                                    <Smartphone size={14} />
                                                </div>
                                                <h4 className="text-[10px] font-black text-blue-900 uppercase tracking-widest">Real-World Test Dispatch</h4>
                                            </div>
                                            
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <input 
                                                        type="text"
                                                        placeholder="Enter Mobile (e.g. 919876543210)"
                                                        value={testMobile}
                                                        onChange={e => setTestMobile(e.target.value)}
                                                        className="w-full bg-white border border-blue-100 rounded-xl px-4 py-2.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-100 placeholder:text-gray-300 transition-all font-mono"
                                                    />
                                                </div>
                                                <button
                                                    onClick={handleSendTest}
                                                    disabled={isSendingTest || !previewCampaign.channels?.includes('WHATSAPP')}
                                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-[10px] uppercase tracking-widest hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center gap-2 disabled:opacity-50 disabled:grayscale"
                                                >
                                                    {isSendingTest ? <Loader2 size={12} className="animate-spin" /> : <Send size={12} />}
                                                    {isSendingTest ? 'Sending...' : 'Send Test'}
                                                </button>
                                            </div>
                                            
                                            {!previewCampaign.channels?.includes('WHATSAPP') && (
                                                <p className="text-[8px] font-bold text-amber-600 uppercase tracking-tight">WhatsApp channel must be enabled for this campaign to send tests.</p>
                                            )}
                                            <p className="text-[9px] font-medium text-blue-700/60 italic leading-relaxed">System will use a sample recipient from your audience to populate variables ({previewCampaign.targetAudience.type}).</p>
                                        </div>

                                        <div className="space-y-1.5">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">Simulated Inbox View</p>
                                            <div className="bg-white border border-gray-200 rounded-2xl p-4 shadow-inner">
                                                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1 italic">Subject:</p>
                                                <p className="text-sm font-black text-gray-900">
                                                    {previewCampaign.subject
                                                        .replace(/{userName}|{Ambassador}/gi, 'Prof. John Doe')
                                                        .replace(/{campus}/gi, 'ASM - VILLIANUR')
                                                        .replace(/{role}/gi, 'Staff')
                                                        .replace(/{referralCount}/gi, '12')
                                                        .replace(/{mobile}/gi, '+91 98765 43210')
                                                    }
                                                </p>
                                            </div>
                                        </div>

                                        <div className="space-y-1.5">
                                            <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest font-mono">Payload Execution</p>
                                            <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm min-h-[200px] max-h-[300px] overflow-y-auto font-mono text-sm leading-relaxed text-gray-700 scrollbar-hide text-wrap break-words">
                                                {previewCampaign.templateBody
                                                    .replace(/{userName}|{Ambassador}/gi, 'Prof. John Doe')
                                                    .replace(/{referralCode}|{code}/gi, 'AMB_X99P')
                                                    .replace(/{campus}/gi, 'ASM - VILLIANUR')
                                                    .replace(/{role}/gi, 'Staff')
                                                    .replace(/{referralCount}/gi, '12')
                                                    .replace(/{mobile}/gi, '+91 98765 43210')
                                                }
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-blue-600 shadow-sm border border-blue-100">
                                                <Activity size={20} />
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black text-blue-900 uppercase tracking-tight italic">Active Channels</p>
                                                <div className="flex gap-1 mt-1">
                                                    {previewCampaign.channels?.includes('EMAIL') && <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100 text-blue-600">Email</span>}
                                                    {previewCampaign.channels?.includes('PUSH') && <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100 text-blue-600">Push</span>}
                                                    {previewCampaign.channels?.includes('IN_APP') && <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100 text-blue-600">In-App</span>}
                                                    {previewCampaign.channels?.includes('WHATSAPP') && <span className="bg-white px-2 py-0.5 rounded text-[10px] font-bold border border-blue-100 text-green-600">WhatsApp</span>}
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="p-6 pt-0 flex">
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
                    </ClientPortal>

                    <ConfirmDialog
                        isOpen={confirmState.isOpen}
                        title={confirmState.type === 'run' ? 'Fire Workflow Dispatch?' : confirmState.type === 'reset' ? 'Emergency Reset Workflow?' : 'Purge Campaign Artifact?'}
                        description={
                            confirmState.type === 'run' ? (
                                <p className="font-medium text-gray-500 italic">
                                    Final warning: Initiating dispatch for <strong className="text-gray-900 underline decoration-indigo-200">{confirmState.data?.name}</strong> will push to <strong className="text-indigo-600">{(campaigns.find(c => c.id === confirmState.data?.id)?.channels || ['EMAIL']).join(', ')}</strong> instantly.
                                </p>
                            ) : confirmState.type === 'reset' ? (
                                <p className="font-medium text-gray-500 italic">
                                    This will forcefully terminate the current dispatch process for <strong className="text-gray-900 underline decoration-amber-200">{confirmState.data?.name}</strong>. Use only if the campaign is stuck in "Dispatching" for more than 10 minutes.
                                </p>
                            ) : (
                                <p className="font-medium text-gray-500 italic">
                                    Terminating the campaign archive for <strong className="text-gray-900 underline decoration-rose-200 whitespace-nowrap">{confirmState.data?.name || 'this workflow'}</strong>.
                                    <br /><span className="text-rose-600 font-black uppercase text-[10px] tracking-widest mt-2 block not-italic">CRITICAL: DATA LOSS DETECTED</span>
                                </p>
                            )
                        }
                        confirmText={confirmState.type === 'run' ? 'Commence Dispatch' : confirmState.type === 'reset' ? 'Force Reset State' : 'Confirm Purge'}
                        variant={confirmState.type === 'run' ? 'info' : confirmState.type === 'reset' ? 'warning' : 'danger'}
                        onConfirm={() => {
                            if (confirmState.type === 'run') executeRun()
                            else if (confirmState.type === 'reset') executeReset()
                            else executeDelete()
                        }}
                        onCancel={() => setConfirmState({ isOpen: false, type: null })}
                    />

                    {/* Individual Message Modal - portaled to escape motion.div transform */}
                    <ClientPortal show={showIndividualModal}>
                        <AnimatePresence>
                            {showIndividualModal && (
                                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        onClick={() => setShowIndividualModal(false)}
                                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm"
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 30 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 30 }}
                                        className="bg-white/95 backdrop-blur-xl border border-white/20 rounded-[40px] w-full max-w-lg shadow-2xl relative overflow-hidden"
                                    >
                                        <div className="bg-white border-b border-gray-100 px-6 py-5">
                                            <div className="flex justify-between items-center">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-9 h-9 bg-indigo-50 rounded-xl flex items-center justify-center">
                                                        <Send size={18} className="text-indigo-600" />
                                                    </div>
                                                    <div>
                                                        <h2 className="text-sm font-black text-gray-900 uppercase tracking-wider">Direct WhatsApp</h2>
                                                        <p className="text-[9px] font-semibold text-gray-400 uppercase tracking-[0.15em]">One-off individual message</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => setShowIndividualModal(false)} aria-label="Close Individual Message Modal" className="p-2 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors">
                                                    <X size={18} className="text-gray-500" />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="p-8 space-y-6">
                                            <div className="space-y-4">
                                                <div className="space-y-1.5">
                                                    <label htmlFor="indiv-mobile-input" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Recipient Mobile</label>
                                                    <input
                                                        id="indiv-mobile-input"
                                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-indigo-50 focus:border-indigo-200 transition-all placeholder:text-gray-300"
                                                        placeholder="e.g. 9876543210"
                                                        value={individualForm.mobile}
                                                        onChange={e => setIndividualForm({ ...individualForm, mobile: e.target.value })}
                                                    />
                                                </div>

                                                <div className="space-y-1.5">
                                                    <label htmlFor="indiv-template-select" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">Select Template</label>
                                                    <select
                                                        id="indiv-template-select"
                                                        className="w-full bg-gray-50 border border-gray-100 rounded-2xl px-5 py-3.5 text-sm font-bold text-gray-900 focus:outline-none focus:ring-4 focus:ring-green-50 focus:border-green-100 transition-all"
                                                        value={individualForm.templateName}
                                                        onChange={e => {
                                                            const templ = availableTemplates.find(t => t.templateName === e.target.value);
                                                            setIndividualForm({ 
                                                                ...individualForm, 
                                                                templateName: e.target.value,
                                                                variables: Array(templ?.requiredVariablesCount || 0).fill('')
                                                            });
                                                        }}
                                                    >
                                                        <option value="">Choose a template...</option>
                                                        {availableTemplates.map(t => (
                                                            <option key={t.id} value={t.templateName}>
                                                                {t.templateName.replace(/_/g, ' ')} ({t.requiredVariablesCount} vars)
                                                            </option>
                                                        ))}
                                                    </select>
                                                </div>

                                                {individualForm.variables.length > 0 && (
                                                    <div className="space-y-3 pt-2">
                                                        <div className="flex justify-between items-center px-1">
                                                           <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Variables Required ({individualForm.variables.length})</label>
                                                        </div>
                                                        <div className="grid grid-cols-2 gap-3">
                                                            {individualForm.variables.map((v, idx) => (
                                                                <div key={idx} className="space-y-1">
                                                                    <label htmlFor={`indiv-var-${idx}`} className="sr-only">Variable {idx + 1}</label>
                                                                    <input
                                                                        id={`indiv-var-${idx}`}
                                                                        className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-2 text-xs font-semibold text-gray-700 focus:ring-2 focus:ring-indigo-100"
                                                                        placeholder={`Variable ${idx + 1}`}
                                                                        value={v}
                                                                        onChange={e => {
                                                                            const newVars = [...individualForm.variables]
                                                                            newVars[idx] = e.target.value
                                                                            setIndividualForm({ ...individualForm, variables: newVars })
                                                                        }}
                                                                    />
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                <div className="space-y-3 pt-2">
                                                    <div className="flex items-center gap-2 text-[10px] font-black text-indigo-700 uppercase tracking-widest px-1">
                                                        <ExternalLink size={12} /> <label htmlFor="indiv-btn-input">Action Button Link (Optional)</label>
                                                    </div>
                                                    <input
                                                        id="indiv-btn-input"
                                                        className="w-full bg-gray-50/50 border border-gray-100 rounded-xl px-4 py-2.5 text-xs font-bold text-indigo-600 placeholder:text-gray-300 focus:ring-2 focus:ring-indigo-100 transition-all font-mono"
                                                        placeholder="https://clickable-image-link.com"
                                                        value={individualForm.button_1 || ''}
                                                        onChange={e => setIndividualForm({ 
                                                            ...individualForm, 
                                                            button_1: e.target.value 
                                                        })}
                                                    />
                                                    <p className="text-[8px] font-bold text-gray-400 uppercase tracking-tight px-1 italic">Providing a link here enables the clickable image header.</p>
                                                </div>
                                            </div>

                                            <div className="pt-4 flex gap-3">
                                                <button
                                                    onClick={() => setShowIndividualModal(false)}
                                                    className="flex-1 px-5 py-3 border border-gray-100 text-gray-400 font-bold text-xs uppercase tracking-widest rounded-2xl hover:bg-gray-50 transition-all font-black"
                                                >
                                                    Cancel
                                                </button>
                                                <button
                                                    onClick={async () => {
                                                        if (!individualForm.mobile || !individualForm.templateName) {
                                                            toast.error('Mobile and template are required');
                                                            return;
                                                        }
                                                        setIsIndividualProcessing(true);
                                                        const res = await sendIndividualWhatsApp({
                                                            mobile: individualForm.mobile,
                                                            templateName: individualForm.templateName,
                                                            variables: individualForm.variables,
                                                            buttonVariables: individualForm.button_1 ? [individualForm.button_1] : []
                                                        });
                                                        setIsIndividualProcessing(false);

                                                        if (res.success) {
                                                            toast.success('Message Dispatched Successfully');
                                                            setShowIndividualModal(false);
                                                        } else {
                                                            toast.error(res.error || 'Dispatch Failed');
                                                        }
                                                    }}
                                                    disabled={isIndividualProcessing}
                                                    className="flex-1 py-4 bg-gray-900 text-white rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-black active:scale-[0.98] transition-all shadow-xl shadow-gray-100 disabled:opacity-50"
                                                >
                                                    {isIndividualProcessing ? <Loader2 size={14} className="animate-spin" /> : <><Send size={14} /> Send Now</>}
                                                </button>
                                            </div>
                                        </div>
                                    </motion.div>
                                </div>
                            )}
                        </AnimatePresence>
                    </ClientPortal>

                    <ClientPortal show={showLogsModal}>
                        <Modal
                            isOpen={showLogsModal}
                            onClose={() => setShowLogsModal(false)}
                            title="WhatsApp Delivery Status"
                            subtitle="Granular performance tracking for this campaign run"
                            icon={<MessageSquare size={20} />}
                            variant="indigo"
                            maxWidth="5xl"
                        >
                            <div className="py-4">
                                {selectedRefId ? (
                                    <WhatsAppLogTable refId={selectedRefId} defaultType="CAMPAIGN" />
                                ) : (
                                    <div className="p-12 text-center text-slate-400 font-bold italic">
                                        No request ID found for this campaign run.
                                    </div>
                                )}
                            </div>
                        </Modal>
                    </ClientPortal>
                </div>
            )}

            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.type === 'run' ? 'Fire Workflow Dispatch?' : confirmState.type === 'reset' ? 'Emergency Reset Workflow?' : 'Purge Campaign Artifact?'}
                description={
                    confirmState.type === 'run' ? (
                        <p className="font-medium text-gray-500 italic">
                            Final warning: Initiating dispatch for <strong className="text-gray-900 underline decoration-indigo-200">{confirmState.data?.name}</strong> will push to <strong className="text-indigo-600">{(campaigns.find(c => c.id === confirmState.data?.id)?.channels || ['EMAIL']).join(', ')}</strong> instantly.
                        </p>
                    ) : confirmState.type === 'reset' ? (
                        <p className="font-medium text-gray-500 italic">
                            This will forcefully terminate the current dispatch process for <strong className="text-gray-900 underline decoration-amber-200">{confirmState.data?.name}</strong>. Use only if the campaign is stuck in "Dispatching" for more than 10 minutes.
                        </p>
                    ) : (
                        <p className="font-medium text-gray-500 italic">
                            Terminating the campaign archive for <strong className="text-gray-900 underline decoration-rose-200 whitespace-nowrap">{confirmState.data?.name || 'this workflow'}</strong>.
                            <br /><span className="text-rose-600 font-black uppercase text-[10px] tracking-widest mt-2 block not-italic">CRITICAL: DATA LOSS DETECTED</span>
                        </p>
                    )
                }
                confirmText={confirmState.type === 'run' ? 'Commence Dispatch' : confirmState.type === 'reset' ? 'Force Reset State' : 'Confirm Purge'}
                variant={confirmState.type === 'run' ? 'info' : confirmState.type === 'reset' ? 'warning' : 'danger'}
                onConfirm={() => {
                    if (confirmState.type === 'run') executeRun()
                    else if (confirmState.type === 'reset') executeReset()
                    else executeDelete()
                }}
                onCancel={() => setConfirmState({ isOpen: false, type: null })}
            />
        </div>
    )
}
