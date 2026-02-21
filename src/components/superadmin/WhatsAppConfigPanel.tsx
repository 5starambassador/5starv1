'use client'

import { useState, useEffect } from 'react'
import { Save, RefreshCcw, Check, X, AlertTriangle, ToggleLeft, ToggleRight, MessageSquare, Plus, Info, Loader2 as LoaderIcon } from 'lucide-react'
import { toast } from 'sonner'
import { getWhatsAppConfigs, updateWhatsAppConfig, createWhatsAppConfig, seedDefaultConfigs, WhatsAppConfigData } from '@/app/whatsapp-config-actions'

export default function WhatsAppConfigPanel() {
    const [configs, setConfigs] = useState<WhatsAppConfigData[]>([])
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState<number | null>(null)
    const [showAddForm, setShowAddForm] = useState(false)
    const [isCreating, setIsCreating] = useState(false)
    const [newConfig, setNewConfig] = useState({ eventKey: '', templateName: '', description: '' })

    const fetchConfigs = async () => {
        setLoading(true)
        const data = await getWhatsAppConfigs()
        if (data.length === 0) {
            // If no configs, offer to seed
            setConfigs([])
        } else {
            setConfigs(data)
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchConfigs()
    }, [])

    const handleUpdate = async (id: number, templateName: string, isEnabled: boolean) => {
        setSaving(id)
        const res = await updateWhatsAppConfig(id, { templateName, isEnabled })
        if (res.success) {
            toast.success('Configuration updated')
            setConfigs(configs.map(c => c.id === id ? { ...c, templateName, isEnabled } : c))
        } else {
            toast.error('Failed to update')
        }
        setSaving(null)
    }

    const handleSeed = async () => {
        setLoading(true)
        const res = await seedDefaultConfigs()
        if (res.success) {
            toast.success('Default configurations seeded')
            await fetchConfigs()
        } else {
            toast.error('Failed to seed defaults')
        }
        setLoading(false)
    }

    const handleCreate = async () => {
        if (!newConfig.eventKey || !newConfig.templateName) {
            toast.error('Event Key and Template Name are required')
            return
        }
        setIsCreating(true)
        const res = await createWhatsAppConfig({ ...newConfig, isEnabled: true })
        if (res.success) {
            toast.success('Mapping created successfully')
            setNewConfig({ eventKey: '', templateName: '', description: '' })
            setShowAddForm(false)
            await fetchConfigs()
        } else {
            toast.error(res.error || 'Failed to create')
        }
        setIsCreating(false)
    }

    if (loading) {
        return (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-4">
                <RefreshCcw className="h-8 w-8 text-indigo-500 animate-spin" />
                <p className="text-slate-500 font-medium italic">Loading Automation Settings...</p>
            </div>
        )
    }

    if (configs.length === 0) {
        return (
            <div className="bg-white rounded-3xl p-12 border border-slate-100 shadow-sm flex flex-col items-center justify-center text-center space-y-6">
                <div className="bg-amber-50 p-4 rounded-full">
                    <AlertTriangle className="h-10 w-10 text-amber-500" />
                </div>
                <div>
                    <h3 className="text-xl font-bold text-slate-800">No Configurations Found</h3>
                    <p className="text-slate-500 max-w-md mx-auto mt-2">
                        It looks like the automation engine hasn't been initialized with default event mappings yet.
                    </p>
                </div>
                <button
                    onClick={handleSeed}
                    className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-semibold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-200 flex items-center gap-2"
                >
                    <RefreshCcw className="h-5 w-5" />
                    Initialize Default Mappings
                </button>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between mb-2">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
                        <MessageSquare className="h-6 w-6 text-indigo-500" />
                        WhatsApp Automation Settings
                    </h2>
                    <p className="text-slate-500 mt-1">Manage event-to-template mappings and toggle automated messages.</p>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setShowAddForm(!showAddForm)}
                        className={`px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 ${showAddForm ? 'bg-slate-100 text-slate-600' : 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 hover:bg-indigo-700'}`}
                    >
                        {showAddForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
                        {showAddForm ? 'Cancel' : 'Add New Mapping'}
                    </button>
                    <button
                        onClick={fetchConfigs}
                        className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                        title="Refresh List"
                    >
                        <RefreshCcw className="h-5 w-5" />
                    </button>
                </div>
            </div>

            {/* Add New Mapping Form */}
            {showAddForm && (
                <div className="bg-white border-2 border-dashed border-indigo-100 rounded-3xl p-6 mb-8 mt-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Event Key</label>
                            <input
                                type="text"
                                value={newConfig.eventKey}
                                onChange={(e) => setNewConfig({ ...newConfig, eventKey: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-2 focus:ring-indigo-500 text-indigo-600 uppercase"
                                placeholder="E.G. NEW_OFFER_ALERT"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">MSG91 Template Name</label>
                            <input
                                type="text"
                                value={newConfig.templateName}
                                onChange={(e) => setNewConfig({ ...newConfig, templateName: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                                placeholder="e.g. discount_v1"
                            />
                        </div>
                        <div className="space-y-1">
                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider ml-1">Short Description</label>
                            <input
                                type="text"
                                value={newConfig.description}
                                onChange={(e) => setNewConfig({ ...newConfig, description: e.target.value })}
                                className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-indigo-500"
                                placeholder="Used for..."
                            />
                        </div>
                    </div>
                    <div className="flex justify-end mt-4">
                        <button
                            disabled={isCreating}
                            onClick={handleCreate}
                            className="bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-indigo-700 transition-all flex items-center gap-2 disabled:opacity-50 shadow-lg shadow-indigo-100"
                        >
                            {isCreating ? <LoaderIcon className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                            Create Mapping
                        </button>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {configs.map((config) => (
                    <ConfigCard
                        key={config.id}
                        config={config}
                        onSave={(tpl, en) => handleUpdate(config.id, tpl, en)}
                        isSaving={saving === config.id}
                    />
                ))}
            </div>

            <div className="bg-indigo-50 rounded-2xl p-4 border border-indigo-100 flex items-start gap-3 mt-8">
                <AlertTriangle className="h-5 w-5 text-indigo-600 mt-0.5" />
                <p className="text-sm text-indigo-700 leading-relaxed">
                    <span className="font-bold">Crucial:</span> Ensure the Template Names match exactly with your approved templates in MSG91.
                    Changes here take effect instantly across all automated services.
                </p>
            </div>
        </div>
    )
}

function ConfigCard({ config, onSave, isSaving }: {
    config: WhatsAppConfigData,
    onSave: (tpl: string, en: boolean) => void,
    isSaving: boolean
}) {
    const [template, setTemplate] = useState(config.templateName)
    const [enabled, setEnabled] = useState(config.isEnabled)
    const hasChanges = template !== config.templateName || enabled !== config.isEnabled

    return (
        <div className={`bg-white rounded-2xl p-5 border transition-all ${config.isEnabled ? 'border-slate-100 shadow-sm' : 'border-slate-100 opacity-75 grayscale-[0.5]'}`}>
            <div className="flex items-start justify-between mb-4">
                <div className="space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 bg-indigo-50 px-2 py-0.5 rounded-md">
                        {config.eventKey.replace(/_/g, ' ')}
                    </span>
                    <h4 className="font-bold text-slate-800">{config.description || 'System Event'}</h4>
                </div>
                <button
                    onClick={() => setEnabled(!enabled)}
                    className={`transition-colors p-1 ${enabled ? 'text-emerald-500' : 'text-slate-300'}`}
                >
                    {enabled ? <ToggleRight className="h-8 w-8" /> : <ToggleLeft className="h-8 w-8" />}
                </button>
            </div>

            <div className="space-y-3">
                <div className="space-y-1">
                    <label className="text-xs font-semibold text-slate-400 ml-1">MSG91 Template Name</label>
                    <div className="relative">
                        <input
                            type="text"
                            value={template}
                            onChange={(e) => setTemplate(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500 transition-all text-slate-700"
                            placeholder="e.g. welcome_v1"
                        />
                        {hasChanges && (
                            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
                                <button
                                    disabled={isSaving}
                                    onClick={() => onSave(template, enabled)}
                                    className="p-1.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-sm"
                                >
                                    {isSaving ? <Loader2 className="h-3 w-3 animate-spin" /> : <Check className="h-3 w-3" />}
                                </button>
                                <button
                                    onClick={() => { setTemplate(config.templateName); setEnabled(config.isEnabled); }}
                                    className="p-1.5 bg-slate-200 text-slate-600 rounded-lg hover:bg-slate-300"
                                >
                                    <X className="h-3 w-3" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

function Loader2({ className }: { className?: string }) {
    return <RefreshCcw className={className} />
}
