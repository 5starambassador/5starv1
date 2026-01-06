'use client'

import { useState, useEffect } from 'react'
import {
    Settings, Shield, Zap, Clock, Save, Loader2,
    Smartphone, Mail, Lock, Globe, Database,
    AlertCircle, CheckCircle2, UserCheck, Bell, Calendar, Plus
} from 'lucide-react'
import {
    getSystemSettings, updateSystemSettings,
    getSecuritySettings, updateSecuritySettings,
    getLeadManagementSettings, updateLeadManagementSettings,
    getAcademicYears, addAcademicYear, setCurrentAcademicYear
} from '@/app/settings-actions'
import { getNotificationSettings, updateNotificationSettings } from '@/app/notification-actions'
import { getRetentionSettings, updateRetentionSettings } from '@/app/security-actions'
import { toast } from 'sonner'
import { SecurityPanel } from './SecurityPanel'

export function SettingsPanel() {
    const [activeTab, setActiveTab] = useState<'general' | 'dashboards' | 'security' | 'logic' | 'notifications' | 'retention' | 'years'>('general')
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)

    // States for different models
    const [systemSettings, setSystemSettings] = useState<any>(null)
    const [securitySettings, setSecuritySettings] = useState<any>(null)
    const [leadSettings, setLeadSettings] = useState<any>(null)
    const [notificationSettings, setNotificationSettings] = useState<any>(null)
    const [retentionSettings, setRetentionSettings] = useState<any>(null)
    const [academicYearsList, setAcademicYearsList] = useState<any[]>([])
    const [newYearForm, setNewYearForm] = useState({ year: '', startDate: '', endDate: '' })

    const fetchData = async () => {
        setLoading(true)
        try {
            const [sys, sec, lead, notif, ret, yearsRes] = await Promise.all([
                getSystemSettings(),
                getSecuritySettings(),
                getLeadManagementSettings(),
                getNotificationSettings(),
                getRetentionSettings(),
                getAcademicYears()
            ])
            setSystemSettings(sys)
            setSecuritySettings(sec)
            setLeadSettings(lead)
            setNotificationSettings(notif)
            setRetentionSettings(ret)
            if (yearsRes.success && yearsRes.data) {
                setAcademicYearsList(yearsRes.data)
            }
        } catch (error) {
            console.error('Failed to fetch settings:', error)
            toast.error('Partial failure in loading settings')
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [])

    const handleSaveSystem = async () => {
        setSaving(true)
        const res = await updateSystemSettings(systemSettings)
        if (res.success) toast.success('General settings updated')
        else toast.error(res.error || 'Update failed')
        setSaving(false)
    }

    const handleSaveSecurity = async () => {
        setSaving(true)
        const res = await updateSecuritySettings(securitySettings)
        if (res.success) toast.success('Security settings updated')
        else toast.error(res.error || 'Update failed')
        setSaving(false)
    }

    const handleSaveLeadLogic = async () => {
        setSaving(true)
        const res = await updateLeadManagementSettings(leadSettings)
        if (res.success) toast.success('Lead management settings updated')
        else toast.error(res.error || 'Update failed')
        setSaving(false)
    }

    const handleSaveNotifications = async () => {
        setSaving(true)
        const res = await updateNotificationSettings(notificationSettings)
        if (res.success) toast.success('Notification settings updated')
        else toast.error(res.error || 'Update failed')
        setSaving(false)
    }

    const handleSaveRetention = async () => {
        setSaving(true)
        const res = await updateRetentionSettings(retentionSettings)
        if (res.success) toast.success('Data retention policy updated')
        else toast.error(res.error || 'Update failed')
        setSaving(false)
    }

    if (loading) return (
        <div className="flex flex-col items-center justify-center p-20 space-y-4">
            <Loader2 className="animate-spin text-red-600" size={40} />
            <p className="text-gray-500 font-bold animate-pulse">Loading Mission Control...</p>
        </div>
    )

    return (
        <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex justify-between items-center bg-gray-900 p-8 rounded-[2rem] text-white shadow-2xl relative overflow-hidden">
                <div className="relative z-10">
                    <h2 className="text-3xl font-black tracking-tight flex items-center gap-3">
                        <Settings className="text-red-500" size={32} />
                        System Control
                    </h2>
                    <p className="text-gray-400 font-medium mt-1">Configure core engine and security protocols</p>
                </div>
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-600 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/2 opacity-20" />
            </div>

            {/* Navigation Tabs */}
            <div className="flex flex-wrap gap-2 bg-gray-100 p-2 rounded-2xl w-fit">
                {[
                    { id: 'general', label: 'General', icon: Settings },
                    { id: 'dashboards', label: 'Dashboards', icon: Globe },
                    { id: 'security', label: 'Security & Auth', icon: Shield },
                    { id: 'logic', label: 'Lead Logic', icon: Zap },
                    { id: 'notifications', label: 'Notifications', icon: Bell },
                    { id: 'retention', label: 'Data Retention', icon: Database },
                    { id: 'years', label: 'Academic Years', icon: Calendar },
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id as any)}
                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all ${activeTab === tab.id
                            ? 'bg-white text-gray-900 shadow-md scale-105'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-200/50'
                            }`}
                    >
                        <tab.icon size={16} />
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Main Content Area */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Academic Years Settings */}
                    {activeTab === 'years' && (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 space-y-8">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    <Calendar className="text-blue-600" size={24} />
                                    Academic Cycles
                                </h3>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                {/* Year List */}
                                <div className="lg:col-span-2 space-y-4">
                                    <h4 className="font-bold text-gray-900 text-sm">Registered Years</h4>
                                    {academicYearsList.length > 0 ? (
                                        <div className="space-y-3">
                                            {academicYearsList.map((year: any) => (
                                                <div
                                                    key={year.id}
                                                    className={`group p-4 rounded-xl border transition-all flex items-center justify-between ${year.isCurrent
                                                        ? 'bg-blue-50 border-blue-200 shadow-sm'
                                                        : 'bg-white border-gray-100 hover:border-gray-200'
                                                        }`}
                                                >
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`text-lg font-black ${year.isCurrent ? 'text-blue-700' : 'text-gray-700'}`}>
                                                                {year.year}
                                                            </span>
                                                            {year.isCurrent && (
                                                                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] uppercase font-black tracking-wider rounded-full">
                                                                    Active
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-3 mt-1 text-xs font-medium text-gray-500">
                                                            <span>{new Date(year.startDate).toLocaleDateString()}</span>
                                                            <span>→</span>
                                                            <span>{new Date(year.endDate).toLocaleDateString()}</span>
                                                        </div>
                                                    </div>

                                                    {!year.isCurrent && (
                                                        <button
                                                            onClick={async () => {
                                                                setSaving(true)
                                                                const res = await setCurrentAcademicYear(year.year)
                                                                if (res.success) {
                                                                    toast.success(`Active year set to ${year.year}`)
                                                                    fetchData()
                                                                } else {
                                                                    toast.error('Failed to update')
                                                                }
                                                                setSaving(false)
                                                            }}
                                                            className="opacity-0 group-hover:opacity-100 transition-opacity px-4 py-2 bg-gray-900 text-white rounded-lg text-xs font-bold"
                                                        >
                                                            Set Active
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="p-8 text-center bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                            <p className="text-sm text-gray-400 font-bold">No academic years defined.</p>
                                        </div>
                                    )}
                                </div>

                                {/* Add New Year */}
                                <div className="p-6 bg-gray-50 rounded-2xl border border-gray-100 h-fit">
                                    <h4 className="font-bold text-gray-900 text-sm mb-4 flex items-center gap-2">
                                        <Plus size={16} /> Add Cycle
                                    </h4>
                                    <div className="space-y-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Year Label</label>
                                            <input
                                                placeholder="e.g. 2026-2027"
                                                className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-sm font-bold"
                                                value={newYearForm.year}
                                                onChange={e => setNewYearForm({ ...newYearForm, year: e.target.value })}
                                            />
                                        </div>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Start</label>
                                                <input
                                                    type="date"
                                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs"
                                                    value={newYearForm.startDate}
                                                    onChange={e => setNewYearForm({ ...newYearForm, startDate: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">End</label>
                                                <input
                                                    type="date"
                                                    className="w-full p-2.5 bg-white border border-gray-200 rounded-lg text-xs"
                                                    value={newYearForm.endDate}
                                                    onChange={e => setNewYearForm({ ...newYearForm, endDate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                        <button
                                            onClick={async () => {
                                                if (!newYearForm.year || !newYearForm.startDate || !newYearForm.endDate) {
                                                    toast.error('Please fill all fields')
                                                    return
                                                }
                                                setSaving(true)
                                                const res = await addAcademicYear({
                                                    year: newYearForm.year,
                                                    startDate: new Date(newYearForm.startDate),
                                                    endDate: new Date(newYearForm.endDate)
                                                })
                                                if (res.success) {
                                                    toast.success('Academic year added')
                                                    setNewYearForm({ year: '', startDate: '', endDate: '' })
                                                    fetchData()
                                                } else {
                                                    toast.error(res.error || 'Failed to add')
                                                }
                                                setSaving(false)
                                            }}
                                            disabled={saving}
                                            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 transition-all flex justify-center"
                                        >
                                            {saving ? <Loader2 className="animate-spin" size={16} /> : 'Create Cycle'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* General Settings */}
                    {activeTab === 'general' && (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 space-y-8">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-gray-900">Global Configuration</h3>
                                <button
                                    onClick={handleSaveSystem}
                                    disabled={saving}
                                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-red-200"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                    Save General
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="p-6 bg-red-50 rounded-2xl border border-red-100 flex items-center justify-between">
                                    <div>
                                        <p className="font-black text-red-900 uppercase tracking-widest text-[10px] mb-1">Engine Status</p>
                                        <h4 className="font-bold text-gray-900">Maintenance Mode</h4>
                                        <p className="text-xs text-red-700 mt-1 opacity-70 italic">Lock all public access</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={systemSettings.maintenanceMode}
                                            onChange={(e) => setSystemSettings({ ...systemSettings, maintenanceMode: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-red-600"></div>
                                    </label>
                                </div>

                                <div className="p-6 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between">
                                    <div>
                                        <p className="font-black text-emerald-900 uppercase tracking-widest text-[10px] mb-1">Admissions</p>
                                        <h4 className="font-bold text-gray-900">Public Registration</h4>
                                        <p className="text-xs text-emerald-700 mt-1 opacity-70 italic">Allow new ambassador signups</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={systemSettings.allowNewRegistrations}
                                            onChange={(e) => setSystemSettings({ ...systemSettings, allowNewRegistrations: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
                                    </label>
                                </div>
                            </div>

                            <div>
                                <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2">Default Student Fee</label>
                                <div className="relative">
                                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-gray-400">₹</div>
                                    <input
                                        type="number"
                                        value={systemSettings.defaultStudentFee}
                                        onChange={(e) => setSystemSettings({ ...systemSettings, defaultStudentFee: parseInt(e.target.value) })}
                                        className="w-full pl-10 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 outline-none font-bold text-gray-800"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Dashboard Settings */}
                    {activeTab === 'dashboards' && (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 space-y-8">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-gray-900">Experience Control</h3>
                                <button
                                    onClick={handleSaveSystem}
                                    disabled={saving}
                                    className="px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-red-200"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                    Save UI
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                                        <h4 className="font-bold text-blue-900 text-sm mb-3 flex items-center gap-2">
                                            <Globe size={16} /> Staff Welcome Message
                                        </h4>
                                        <input
                                            value={systemSettings.staffWelcomeMessage}
                                            onChange={(e) => setSystemSettings({ ...systemSettings, staffWelcomeMessage: e.target.value })}
                                            className="w-full p-3 bg-white border border-blue-100 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
                                        />
                                    </div>
                                    <div className="p-4 bg-purple-50/50 rounded-2xl border border-purple-100">
                                        <h4 className="font-bold text-purple-900 text-sm mb-3 flex items-center gap-2">
                                            <Globe size={16} /> Parent Welcome Message
                                        </h4>
                                        <input
                                            value={systemSettings.parentWelcomeMessage}
                                            onChange={(e) => setSystemSettings({ ...systemSettings, parentWelcomeMessage: e.target.value })}
                                            className="w-full p-3 bg-white border border-purple-100 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 text-sm font-medium"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-gray-100">
                                    <h4 className="font-black text-gray-500 uppercase tracking-widest text-[10px]">Social Sharing Templates</h4>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-2">Staff Referral Text</label>
                                        <textarea
                                            rows={3}
                                            value={systemSettings.staffReferralText}
                                            onChange={(e) => setSystemSettings({ ...systemSettings, staffReferralText: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-gray-600 mb-2">Parent Referral Text</label>
                                        <textarea
                                            rows={3}
                                            value={systemSettings.parentReferralText}
                                            onChange={(e) => setSystemSettings({ ...systemSettings, parentReferralText: e.target.value })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-sm"
                                        />
                                    </div>
                                    <p className="text-[10px] text-gray-400 italic">Tip: Use {'{referralLink}'} placeholder.</p>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Security Settings - Using SecurityPanel Component */}
                    {activeTab === 'security' && (
                        <SecurityPanel />
                    )}

                    {/* Lead Logic Settings */}
                    {activeTab === 'logic' && (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 space-y-8">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    <Zap className="text-amber-500" size={24} />
                                    Lead Engine Logic
                                </h3>
                                <button
                                    onClick={handleSaveLeadLogic}
                                    disabled={saving}
                                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-amber-200"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                    Save Logic
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="p-6 bg-amber-50 rounded-2xl border border-amber-100 flex items-center justify-between">
                                    <div>
                                        <h4 className="font-bold text-gray-900">Auto-Assign Leads</h4>
                                        <p className="text-xs text-amber-700 opacity-70 italic">Round-robin assignment to Campus Heads</p>
                                    </div>
                                    <label className="relative inline-flex items-center cursor-pointer">
                                        <input
                                            type="checkbox"
                                            className="sr-only peer"
                                            checked={leadSettings.autoAssignLeads}
                                            onChange={(e) => setLeadSettings({ ...leadSettings, autoAssignLeads: e.target.checked })}
                                        />
                                        <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                                    </label>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div>
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <Database size={14} /> Lead Stale Days
                                        </label>
                                        <input
                                            type="number"
                                            value={leadSettings.leadStaleDays}
                                            onChange={(e) => setLeadSettings({ ...leadSettings, leadStaleDays: parseInt(e.target.value) })}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Days before a lead is marked "Inactive"</p>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-black text-gray-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                                            <UserCheck size={14} /> Escalation Days
                                        </label>
                                        <input
                                            type="number"
                                            value={leadSettings.followupEscalationDays}
                                            onChange={(e) => setLeadSettings({ ...leadSettings, followupEscalationDays: parseInt(e.target.value) })}
                                            className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl font-bold text-sm"
                                        />
                                        <p className="text-[10px] text-gray-400 mt-1">Alert Super Admin if no action taken</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Notifications Settings */}
                    {activeTab === 'notifications' && notificationSettings && (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 space-y-8">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    <Bell className="text-amber-500" size={24} />
                                    Notification Center
                                </h3>
                                <button
                                    onClick={handleSaveNotifications}
                                    disabled={saving}
                                    className="px-6 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all shadow-lg shadow-amber-200"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                    Save Channels
                                </button>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {[
                                    { key: 'emailNotifications', label: 'Email Alerts' },
                                    { key: 'smsNotifications', label: 'SMS Gateway' },
                                    { key: 'whatsappNotifications', label: 'WhatsApp Bot' },
                                    { key: 'notifySuperAdminOnNewAdmins', label: 'New Admin Alerts' },
                                    { key: 'notifyCampusHeadOnNewLeads', label: 'New Lead Alerts' }
                                ].map((item) => (
                                    <div key={item.key} className="flex items-center justify-between p-5 bg-gray-50 rounded-[24px] hover:bg-white hover:shadow-lg transition-all border border-transparent hover:border-gray-100 cursor-pointer" onClick={() => setNotificationSettings({ ...notificationSettings, [item.key]: !notificationSettings[item.key] })}>
                                        <span className="font-bold text-gray-700">{item.label}</span>
                                        <div
                                            className={`w-14 h-8 rounded-full transition-all duration-300 relative shadow-inner ${notificationSettings[item.key] ? 'bg-amber-500' : 'bg-gray-300'}`}
                                        >
                                            <div className={`absolute top-1 w-6 h-6 bg-white rounded-full transition-all duration-300 shadow-sm ${notificationSettings[item.key] ? 'left-7' : 'left-1'}`} />
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Retention Settings */}
                    {activeTab === 'retention' && retentionSettings && (
                        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl p-8 space-y-8">
                            <div className="flex justify-between items-center">
                                <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                                    <Database className="text-gray-700" size={24} />
                                    Data Retention & Purge
                                </h3>
                                <button
                                    onClick={handleSaveRetention}
                                    disabled={saving}
                                    className="px-6 py-2 bg-gray-900 hover:bg-black text-white rounded-xl font-black text-xs uppercase tracking-widest flex items-center gap-2 transition-all"
                                >
                                    {saving ? <Loader2 className="animate-spin" size={14} /> : <Save size={14} />}
                                    Update Policy
                                </button>
                            </div>

                            <div className="space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Keep Inactive Data (Months)</label>
                                        <input
                                            type="number"
                                            value={retentionSettings.keepInactiveDataMonths}
                                            onChange={(e) => setRetentionSettings({ ...retentionSettings, keepInactiveDataMonths: parseInt(e.target.value) })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Archive Leads After (Days)</label>
                                        <input
                                            type="number"
                                            value={retentionSettings.archiveLeadsAfterDays}
                                            onChange={(e) => setRetentionSettings({ ...retentionSettings, archiveLeadsAfterDays: parseInt(e.target.value) })}
                                            className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl font-bold"
                                        />
                                    </div>
                                </div>
                                <div className="p-4 bg-red-50 rounded-2xl border border-red-100 flex gap-3">
                                    <AlertCircle className="text-red-600 shrink-0" />
                                    <p className="text-[11px] text-red-900 font-medium">Compliance: Data older than these thresholds will be automatically moved to cold storage or purged per regional guidelines.</p>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Info Sidebar */}
                <div className="space-y-6">
                    <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
                        <div className="relative z-10">
                            <h4 className="font-black uppercase tracking-widest text-xs opacity-70 mb-4">Operational Pulse</h4>
                            <div className="space-y-4">
                                <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                                    <span className="text-xs font-bold">Registration</span>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${systemSettings.allowNewRegistrations ? 'bg-emerald-400 text-emerald-900' : 'bg-red-400 text-red-900'}`}>
                                        {systemSettings.allowNewRegistrations ? 'Live' : 'Stopped'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                                    <span className="text-xs font-bold">Current Cycle</span>
                                    <span className="font-black text-sm">{systemSettings.currentAcademicYear}</span>
                                </div>
                                <div className="flex justify-between items-center bg-white/10 p-4 rounded-2xl backdrop-blur-md">
                                    <span className="text-xs font-bold">2FA Status</span>
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${securitySettings.twoFactorAuthEnabled ? 'bg-emerald-400 text-emerald-900' : 'bg-amber-400 text-amber-900'}`}>
                                        {securitySettings.twoFactorAuthEnabled ? 'Strict' : 'Disabled'}
                                    </span>
                                </div>
                            </div>
                        </div>
                        <CheckCircle2 className="absolute -bottom-8 -left-8 text-white/5" size={160} />
                    </div>

                    <div className="bg-white rounded-3xl p-6 border border-gray-100 shadow-sm border-l-4 border-l-red-600">
                        <h4 className="font-black text-gray-900 text-sm mb-4">Audit Insight</h4>
                        <div className="space-y-4">
                            <div className="flex gap-3">
                                <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 shrink-0" />
                                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                                    System updates are logged in the <strong>Audit Trail</strong>.
                                </p>
                            </div>
                            <div className="flex gap-3">
                                <div className="w-1.5 h-1.5 bg-red-600 rounded-full mt-1.5 shrink-0" />
                                <p className="text-xs text-gray-600 leading-relaxed font-medium">
                                    Changing student fee affects <strong>new</strong> leads only.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div >
        </div >
    )
}
