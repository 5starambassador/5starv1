'use client'

import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Play, RefreshCcw, Check, ToggleLeft, ToggleRight, AlertTriangle, Users, Edit2, ChevronDown, ChevronUp, Filter, Calendar, MapPin, Target, Wallet, Pause, ShieldCheck, Star, UserPlus, GraduationCap, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import {
    AutomationRuleData,
    getAutomationRules,
    createAutomationRule,
    updateAutomationRule,
    deleteAutomationRule,
    testAutomationRule
} from '@/app/automation-rule-actions'
import { getWhatsAppConfigs, WhatsAppConfigData } from '@/app/whatsapp-config-actions'
import { getCampusNames } from '@/app/campus-actions'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { PromptDialog } from '@/components/ui/PromptDialog'

export default function RuleBuilderPanel() {
    const [rules, setRules] = useState<AutomationRuleData[]>([])
    const [availableCampuses, setAvailableCampuses] = useState<{id: number; campusName: string}[]>([])
    const [availableMappings, setAvailableMappings] = useState<WhatsAppConfigData[]>([])
    const [loading, setLoading] = useState(true)
    const [showForm, setShowForm] = useState(false)
    const [isSaving, setIsSaving] = useState(false)
    const [editingRuleId, setEditingRuleId] = useState<number | null>(null)

    // Dialog state for "Premium" experience
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
    const [ruleToDeleteId, setRuleToDeleteId] = useState<number | null>(null)
    const [isTestPromptOpen, setIsTestPromptOpen] = useState(false)
    const [ruleToTest, setRuleToTest] = useState<AutomationRuleData | null>(null)
    const [isProcessingDialog, setIsProcessingDialog] = useState(false)

    // Form State
    const [name, setName] = useState('')
    const [description, setDescription] = useState('')
    const [triggerType, setTriggerType] = useState('CRON_DAILY')
    const [triggerEvent, setTriggerEvent] = useState('')
    const [actionTarget, setActionTarget] = useState('') // The Template Key
    
    // Condition State
    const [targetEntity, setTargetEntity] = useState('USER')
    const [roles, setRoles] = useState<string[]>([])
    const [statuses, setStatuses] = useState<string[]>([])
    const [benefitStatuses, setBenefitStatuses] = useState<string[]>([])
    const [campuses, setCampuses] = useState<string[]>([])
    const [reqBankDetails, setReqBankDetails] = useState<string>('')
    const [reqChildDetails, setReqChildDetails] = useState<string>('')
    const [daysInactive, setDaysInactive] = useState<number | ''>('')
    const [minReferrals, setMinReferrals] = useState<number | ''>('')
    const [maxReferrals, setMaxReferrals] = useState<number | ''>('')
    
    // Advanced CRM Filters
    const [registeredAfter, setRegisteredAfter] = useState<string>('')
    const [registeredBefore, setRegisteredBefore] = useState<string>('')
    const [paymentStatus, setPaymentStatus] = useState<string[]>([])
    const [leadStatuses, setLeadStatuses] = useState<string[]>([])
    const [gradeInterested, setGradeInterested] = useState<string[]>([])
    const [programLeadStatuses, setProgramLeadStatuses] = useState<string[]>([])
    const [daysSinceClick, setDaysSinceClick] = useState<number | ''>('')
    const [leadFunnelStatus, setLeadFunnelStatus] = useState('All')
    const [activityStatus, setActivityStatus] = useState('All')
    const [intervalDay, setIntervalDay] = useState<number | ''>('')
    const [isFiveStarOnly, setIsFiveStarOnly] = useState(false)
    const [minAmount, setMinAmount] = useState<number | ''>('')
    const [maxAmount, setMaxAmount] = useState<number | ''>('')
    const [ticketCategories, setTicketCategories] = useState<string[]>([])
    const [payoutCategories, setPayoutCategories] = useState<string[]>([])
    const [openSections, setOpenSections] = useState<string[]>(['basic', 'funnel'])

    const toggleSection = (section: string) => {
        setOpenSections(prev => 
            prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
        )
    }

    const fetchInitialData = async () => {
        setLoading(true)
        const [rulesRes, campusRes, mappingsRes] = await Promise.all([
            getAutomationRules(),
            getCampusNames(),
            getWhatsAppConfigs()
        ])
        
        if (rulesRes.success && rulesRes.data) {
            setRules(rulesRes.data)
        }
        if (campusRes.success && campusRes.campuses) {
            setAvailableCampuses(campusRes.campuses)
        }
        if (mappingsRes && Array.isArray(mappingsRes)) {
            setAvailableMappings(mappingsRes.filter(m => m.isEnabled))
        }
        setLoading(false)
    }

    useEffect(() => {
        fetchInitialData()
    }, [])

    const handleSave = async () => {
        if (!name || !triggerEvent) {
            toast.error('Rule Name and Trigger Event (Template) are required')
            return
        }

        setIsSaving(true)
        const conditions: any = {}
        if (targetEntity !== 'USER') conditions.targetEntity = targetEntity
        if (roles.length > 0) conditions.role = roles
        if (statuses.length > 0) conditions.status = statuses
        if (benefitStatuses.length > 0) conditions.benefitStatus = benefitStatuses
        if (campuses.length > 0) conditions.campus = campuses
        if (reqBankDetails === 'MISSING') conditions.missingBankDetails = true
        if (reqChildDetails === 'MISSING') conditions.missingChildDetails = true
        if (daysInactive !== '') conditions.daysSinceRegistration = Number(daysInactive)
        if (minReferrals !== '') conditions.minReferrals = Number(minReferrals)
        if (maxReferrals !== '') conditions.maxReferrals = Number(maxReferrals)
        
        // Phase 10: Advanced Contextual Filters
        if (targetEntity === 'USER' && isFiveStarOnly) conditions.isFiveStarOnly = true
        if (minAmount !== '') conditions.minAmount = Number(minAmount)
        if (maxAmount !== '') conditions.maxAmount = Number(maxAmount)
        if (ticketCategories.length > 0) conditions.ticketCategories = ticketCategories
        if (payoutCategories.length > 0) conditions.payoutCategories = payoutCategories
        
        // Save Advanced CRM Filters
        if (registeredAfter) conditions.registeredAfter = registeredAfter
        if (registeredBefore) conditions.registeredBefore = registeredBefore
        if (paymentStatus.length > 0) conditions.paymentStatus = paymentStatus
        if (targetEntity === 'REFERRAL_LEAD') {
            if (leadStatuses.length > 0) conditions.leadStatuses = leadStatuses
            if (gradeInterested.length > 0) conditions.gradeInterested = gradeInterested
        }
        if (targetEntity === 'PROGRAM_LEAD') {
            if (programLeadStatuses.length > 0) conditions.programLeadStatuses = programLeadStatuses
            if (daysSinceClick !== '') conditions.daysSinceClick = Number(daysSinceClick)
        }
        if (leadFunnelStatus !== 'All') conditions.leadFunnelStatus = leadFunnelStatus
        if (activityStatus !== 'All') conditions.activityStatus = activityStatus
        if (intervalDay !== '') conditions.intervalDay = Number(intervalDay)

        let res;
        if (editingRuleId) {
            res = await updateAutomationRule(editingRuleId, {
                name,
                description,
                triggerType,
                triggerEvent,
                actionType: 'SEND_WHATSAPP',
                actionTarget: triggerType === 'CRON_DAILY' ? triggerEvent : actionTarget,
                conditions
            })
        } else {
            res = await createAutomationRule({
                name,
                description,
                triggerType,
                triggerEvent,
                actionType: 'SEND_WHATSAPP',
                actionTarget: triggerType === 'CRON_DAILY' ? triggerEvent : actionTarget,
                conditions
            })
        }

        if (res.success) {
            toast.success(editingRuleId ? 'Rule updated successfully' : 'Rule created successfully')
            setShowForm(false)
            resetForm()
            // Just refresh rules, not campuses
            const freshRules = await getAutomationRules()
            if (freshRules.success && freshRules.data) setRules(freshRules.data)
        } else {
            toast.error(res.error || (editingRuleId ? 'Failed to update rule' : 'Failed to create rule'))
        }
        setIsSaving(false)
    }

    const handleDelete = (id: number) => {
        setRuleToDeleteId(id)
        setIsDeleteDialogOpen(true)
    }

    const confirmDelete = async () => {
        if (!ruleToDeleteId) return
        setIsProcessingDialog(true)
        const res = await deleteAutomationRule(ruleToDeleteId)
        if (res.success) {
            toast.success('Rule deleted')
            setRules(prev => prev.filter(r => r.id !== ruleToDeleteId))
            if (editingRuleId === ruleToDeleteId) {
                setShowForm(false)
                resetForm()
            }
            setIsDeleteDialogOpen(false)
        } else {
            toast.error(res.error || 'Failed to delete')
        }
        setIsProcessingDialog(false)
    }

    const toggleRule = async (rule: AutomationRuleData) => {
        const res = await updateAutomationRule(rule.id, { isActive: !rule.isActive })
        if (res.success) {
            toast.success(`Rule ${!rule.isActive ? 'activated' : 'paused'}`)
            setRules(prev => prev.map(r => r.id === rule.id ? { ...r, isActive: !rule.isActive } : r))
        } else {
            toast.error(res.error || 'Failed to update')
        }
    }

    const editRule = (rule: AutomationRuleData) => {
        setEditingRuleId(rule.id)
        setName(rule.name)
        setDescription(rule.description || '')
        setTriggerType(rule.triggerType)
        setTriggerEvent(rule.triggerEvent || '')
        setActionTarget(rule.actionTarget || '')

        const conds = (rule.conditions || {}) as any
        setTargetEntity(conds.targetEntity || 'USER')
        setRoles(conds.role || [])
        setStatuses(conds.status || [])
        setBenefitStatuses(conds.benefitStatus || [])
        setCampuses(conds.campus || [])
        setReqBankDetails(conds.missingBankDetails ? 'MISSING' : '')
        setReqChildDetails(conds.missingChildDetails ? 'MISSING' : '')
        setDaysInactive(conds.daysSinceRegistration !== undefined ? conds.daysSinceRegistration : '')
        setMinReferrals(conds.minReferrals !== undefined ? conds.minReferrals : '')
        setMaxReferrals(conds.maxReferrals !== undefined ? conds.maxReferrals : '')
        
        // Load Advanced Filters
        setRegisteredAfter(conds.registeredAfter || '')
        setRegisteredBefore(conds.registeredBefore || '')
        setPaymentStatus(conds.paymentStatus || [])
        setLeadStatuses(conds.leadStatuses || [])
        setGradeInterested(conds.gradeInterested || [])
        setProgramLeadStatuses(conds.programLeadStatuses || [])
        setDaysSinceClick(conds.daysSinceClick !== undefined ? conds.daysSinceClick : '')

        setLeadFunnelStatus(conds.leadFunnelStatus || 'All')
        setActivityStatus(conds.activityStatus || 'All')
        setIntervalDay(conds.intervalDay !== undefined ? conds.intervalDay : '')
        setIsFiveStarOnly(conds.isFiveStarOnly || false)
        setMinAmount(conds.minAmount || '')
        setMaxAmount(conds.maxAmount || '')
        setTicketCategories(conds.ticketCategories || [])
        setPayoutCategories(conds.payoutCategories || [])
        setShowForm(true)
        // Scroll to top to see the form
        window.scrollTo({ top: 0, behavior: 'smooth' })
    }

    const resetForm = () => {
        setLeadFunnelStatus('All')
        setActivityStatus('All')
        setIntervalDay('')
        setIsFiveStarOnly(false)
        setMinAmount('')
        setMaxAmount('')
        setTicketCategories([])
        setPayoutCategories([])
        setEditingRuleId(null)
        setName('')
        setDescription('')
        setTriggerEvent('')
        setActionTarget('')
        setTargetEntity('USER')
        setRoles([])
        setStatuses([])
        setBenefitStatuses([])
        setCampuses([])
        setReqBankDetails('')
        setReqChildDetails('')
        setDaysInactive('')
        setMinReferrals('')
        setMaxReferrals('')
        
        // Reset Advanced Filters
        setRegisteredAfter('')
        setRegisteredBefore('')
        setPaymentStatus([])
        setLeadStatuses([])
        setGradeInterested([])
        setProgramLeadStatuses([])
        setDaysSinceClick('')
    }

    const toggleRole = (r: string) => {
        setRoles(prev => prev.includes(r) ? prev.filter(x => x !== r) : [...prev, r])
    }

    const handleTestRun = (rule: AutomationRuleData) => {
        setRuleToTest(rule)
        setIsTestPromptOpen(true)
    }

    const confirmTestRun = async (mobile: string) => {
        if (!ruleToTest) return
        if (mobile.replace(/\D/g, '').length < 10) {
            toast.error("Please enter a valid 10-digit mobile number")
            return
        }

        setIsProcessingDialog(true)
        const toastId = toast.loading('Firing test message through MSG91...')
        const res = await testAutomationRule(ruleToTest.id, mobile)
        if (res.success) {
            toast.success(`100% Delivered! Test signal hit MSG91 for ${mobile}`, { id: toastId })
            setIsTestPromptOpen(false)
        } else {
            toast.error((res as any).error || 'Failed to send test message', { id: toastId })
        }
        setIsProcessingDialog(false)
    }
    const toggleStatus = (s: string) => {
        setStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
    }
    const toggleBenefitStatus = (s: string) => {
        setBenefitStatuses(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s])
    }
    const toggleCampus = (c: string) => {
        setCampuses(prev => prev.includes(c) ? prev.filter(x => x !== c) : [...prev, c])
    }

    if (loading) {
        return (
            <div className="flex justify-center items-center p-12">
                <RefreshCcw className="h-8 w-8 text-indigo-500 animate-spin" />
            </div>
        )
    }

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between mb-4 px-2">
                <div className="flex flex-col">
                    <h3 className="text-lg font-black italic text-slate-800 uppercase tracking-tight">Smart Rules Engine</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Build no-code targeting rules for WhatsApp events</p>
                </div>
                <button
                    onClick={() => { setShowForm(!showForm); resetForm() }}
                    className="bg-indigo-600 text-white px-4 py-2 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 flex items-center gap-2"
                >
                    {showForm ? 'Cancel' : <><Plus className="h-3.5 w-3.5" /> Create Visual Rule</>}
                </button>
            </div>

            {showForm && (
                <div className="bg-white rounded-3xl p-6 border-2 border-dashed border-indigo-200 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-lg">
                            <Play className="h-5 w-5" />
                        </div>
                        <div>
                            <h4 className="font-bold text-slate-800 text-lg">
                                {editingRuleId ? 'Edit Automation Flow' : 'New Automation Flow'}
                            </h4>
                            <p className="text-xs text-slate-500">Configure triggers and audience conditions visually.</p>
                        </div>
                    </div>

                    <div className="space-y-6">
                        {/* Step 1: Basics */}
                        <div className="bg-slate-50 p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5">
                            <h5 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-2 flex items-center gap-2">
                                <span className="flex items-center justify-center w-5 h-5 bg-slate-200 rounded-full text-[10px] text-slate-600">1</span>
                                The Action
                            </h5>
                                <div className="lg:col-span-12">
                                    <label className="text-xs font-bold text-slate-700 mb-2 block italic">Automation Trigger Mode</label>
                                    <div className="flex gap-4">
                                        {triggerType === "CRON_DAILY" ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTriggerType('CRON_DAILY')
                                                    setTriggerEvent('')
                                                }}
                                                aria-pressed="true"
                                                aria-label="Daily Scan - Trigger rule every night"
                                                className="flex-1 p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 border-indigo-600 bg-indigo-50 shadow-md"
                                            >
                                                <div className="p-3 rounded-xl bg-indigo-600 text-white">
                                                    <Calendar className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Daily Scan</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">Runs every night for all matching users.</p>
                                                </div>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTriggerType('CRON_DAILY')
                                                    setTriggerEvent('')
                                                }}
                                                aria-pressed="false"
                                                aria-label="Daily Scan - Trigger rule every night"
                                                className="flex-1 p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 border-slate-100 bg-white hover:border-slate-200"
                                            >
                                                <div className="p-3 rounded-xl bg-slate-100 text-slate-400">
                                                    <Calendar className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Daily Scan</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">Runs every night for all matching users.</p>
                                                </div>
                                            </button>
                                        )}
                                        {triggerType === "EVENT" ? (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTriggerType('EVENT')
                                                    setTriggerEvent('')
                                                }}
                                                aria-pressed="true"
                                                aria-label="Instant Event - Trigger rule on specific system actions"
                                                className="flex-1 p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 border-orange-600 bg-orange-50 shadow-md"
                                            >
                                                <div className="p-3 rounded-xl bg-orange-600 text-white">
                                                    <RefreshCcw className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Instant Event</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">Triggers instantly on specific actions.</p>
                                                </div>
                                            </button>
                                        ) : (
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setTriggerType('EVENT')
                                                    setTriggerEvent('')
                                                }}
                                                aria-pressed="false"
                                                aria-label="Instant Event - Trigger rule on specific system actions"
                                                className="flex-1 p-4 rounded-2xl border-2 transition-all text-left flex items-center gap-4 border-slate-100 bg-white hover:border-slate-200"
                                            >
                                                <div className="p-3 rounded-xl bg-slate-100 text-slate-400">
                                                    <RefreshCcw className="h-5 w-5" />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-black text-slate-800 uppercase tracking-tight">Instant Event</p>
                                                    <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest leading-tight">Triggers instantly on specific actions.</p>
                                                </div>
                                            </button>
                                        )}
                                    </div>
                                </div>
                                <div className="lg:col-span-5">
                                    <label htmlFor="rule-trigger-event" className="text-xs font-bold text-slate-700 mb-2 block">
                                        {triggerType === 'CRON_DAILY' ? '1. MSG91 Template Key' : '1. System Event Trigger'}
                                    </label>
                                    <select 
                                        id="rule-trigger-event"
                                        value={triggerEvent} onChange={e => {
                                            setTriggerEvent(e.target.value)
                                            if (triggerType === 'CRON_DAILY') setActionTarget(e.target.value)
                                        }}
                                        className={`w-full rounded-xl border-2 text-sm font-bold py-2.5 shadow-sm transition-all ${triggerType === 'EVENT' ? 'border-orange-200 bg-orange-50 text-orange-700 focus:ring-orange-500' : 'border-indigo-200 bg-indigo-50 text-indigo-700 focus:ring-indigo-500'}`}
                                    >
                                        <option value="">-- Select {triggerType === 'CRON_DAILY' ? 'Template Mapping' : 'System Event'} --</option>
                                        {triggerType === 'CRON_DAILY' ? (
                                            <optgroup label="Available Templates">
                                                {availableMappings.map(mapping => (
                                                    <option key={mapping.id} value={mapping.eventKey}>
                                                        {mapping.eventKey} ({mapping.templateName})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        ) : (
                                            <optgroup label="Real-time Event Hooks">
                                                <option value="ON_USER_REGISTERED">ON_USER_REGISTERED (Signup/Upgrade)</option>
                                                <option value="ON_PAYMENT_SUCCESS">ON_PAYMENT_SUCCESS (Verification)</option>
                                                <option value="ON_LEAD_SUBMITTED">ON_LEAD_SUBMITTED (New Referral)</option>
                                                <option value="ON_LEAD_CONFIRMED">ON_LEAD_CONFIRMED (Admin Verified)</option>
                                                <option value="ON_SETTLEMENT_PROCESSED">ON_SETTLEMENT_PROCESSED (Payout)</option>
                                                <option value="ON_TICKET_CREATED">ON_TICKET_CREATED (Support)</option>
                                            </optgroup>
                                        )}
                                    </select>
                                </div>

                                {triggerType === 'EVENT' && (
                                    <div className="lg:col-span-7">
                                        <label htmlFor="rule-action-template" className="text-xs font-bold text-slate-700 mb-2 block">2. MSG91 Template to SEND</label>
                                        <select 
                                            id="rule-action-template"
                                            value={actionTarget} onChange={e => setActionTarget(e.target.value)}
                                            className="w-full rounded-xl border-2 border-indigo-200 text-sm font-bold py-2.5 shadow-sm bg-indigo-50 text-indigo-700 focus:ring-indigo-500"
                                        >
                                            <option value="">-- Select Template Mapping --</option>
                                            <optgroup label="Available Templates">
                                                {availableMappings.map(mapping => (
                                                    <option key={mapping.id} value={mapping.eventKey}>
                                                        {mapping.eventKey} ({mapping.templateName})
                                                    </option>
                                                ))}
                                            </optgroup>
                                        </select>
                                    </div>
                                )}
                                
                                <div className={triggerType === 'EVENT' ? 'lg:col-span-5' : 'lg:col-span-7'}>
                                    <label htmlFor="rule-internal-name" className="text-xs font-bold text-slate-700 mb-2 block">Rule Name (Internal)</label>
                                    <input 
                                        id="rule-internal-name"
                                        type="text" value={name} onChange={e => setName(e.target.value)}
                                        className="w-full rounded-xl border-slate-200 text-sm focus:ring-indigo-500 py-2.5 shadow-sm bg-white"
                                        placeholder="e.g. Welcome Message"
                                    />
                                </div>
                        </div>

                        {/* Step 2: Audience Builder */}
                        <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-100 space-y-4 relative overflow-hidden">
                            <div className="absolute top-4 right-4 text-indigo-200">
                                <Users className="h-24 w-24 opacity-20" />
                            </div>
                            <h5 className="text-xs font-black uppercase tracking-widest text-indigo-500 mb-2">2. Who Should Receive This? (Conditions)</h5>
                            
                            <div className="space-y-4 relative z-10">
                                {/* -- Target Entity Selector -- */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { id: 'USER', label: 'Ambassadors', icon: Users, color: 'indigo', desc: 'Target Ambassadors and registered users' },
                                        { id: 'REFERRAL_LEAD', label: 'Referrals', icon: UserPlus, color: 'blue', desc: 'Target Prospective Referral Leads' },
                                        { id: 'PROGRAM_LEAD', label: 'Program Leads', icon: Target, color: 'orange', desc: 'Target Direct Enrollment Leads' },
                                        { id: 'STUDENT', label: 'Students', icon: GraduationCap, color: 'purple', desc: 'Target Enrolled Students' },
                                    ].map((entity) => {
                                        const Icon = entity.icon
                                        const isActive = targetEntity === entity.id
                                        return isActive ? (
                                            <button
                                                key={entity.id}
                                                type="button"
                                                onClick={() => setTargetEntity(entity.id)}
                                                aria-pressed="true"
                                                aria-label={entity.desc}
                                                className={`flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all border-${entity.color}-600 bg-white shadow-sm ring-1 ring-${entity.color}-600/20`}
                                            >
                                                <div className={`p-1.5 rounded-lg bg-${entity.color}-600 text-white`}>
                                                    <Icon size={14} />
                                                </div>
                                                <span className={`text-[9px] font-black uppercase tracking-tight text-${entity.color}-700`}>
                                                    {entity.label}
                                                </span>
                                            </button>
                                        ) : (
                                                <button
                                                    key={entity.id}
                                                    type="button"
                                                    onClick={() => setTargetEntity(entity.id)}
                                                    aria-pressed="false"
                                                    aria-label={entity.desc}
                                                    className="flex-1 flex flex-col items-center gap-1.5 p-2 rounded-xl border transition-all border-slate-100 bg-slate-50 opacity-40 hover:opacity-100 hover:border-slate-200"
                                                >
                                                    <div className="p-1.5 rounded-lg bg-slate-200 text-slate-500">
                                                        <Icon size={14} />
                                                    </div>
                                                    <span className="text-[9px] font-black uppercase tracking-tight text-slate-500">
                                                        {entity.label}
                                                    </span>
                                                </button>
                                        )
                                    })}
                                </div>

                                {/* -- Basic Demographics -- */}
                                <div className="border border-indigo-100 rounded-xl bg-white overflow-hidden shadow-sm">
                                    <button 
                                        type="button"
                                        onClick={() => toggleSection('basic')}
                                        className="w-full flex items-center justify-between p-4 bg-indigo-50/30 hover:bg-indigo-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100/50 rounded-lg text-indigo-600">
                                                <Users size={16} />
                                            </div>
                                            <div className="text-left">
                                                <div className="flex items-center gap-3">
                                                    <h6 className="text-sm font-black text-slate-800 uppercase tracking-tight">Audience Segmentation</h6>
                                                </div>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Role, Campus, Health & Funnel Logic</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {!openSections.includes('basic') && (
                                                <div className="hidden md:flex gap-1.5 items-center">
                                                    {roles.length > 0 && <span className="px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded text-[9px] font-black uppercase">{roles.length} Roles</span>}
                                                    {paymentStatus.length > 0 && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-black uppercase">{paymentStatus.length} Payments</span>}
                                                    {statuses.length > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black uppercase">Status: {statuses.join(', ')}</span>}
                                                </div>
                                            )}
                                            {openSections.includes('basic') ? <ChevronUp size={18} className="text-indigo-400" /> : <ChevronDown size={18} className="text-indigo-400" />}
                                        </div>
                                    </button>

                                    {openSections.includes('basic') && (
                                        <div className="p-5 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 border-t border-indigo-50 animate-in fade-in slide-in-from-top-2 duration-300">
                                            {(targetEntity === 'USER' || targetEntity === 'STUDENT') && (
                                                <>
                                                    {/* Row 1: Structural Role & Institutional Node */}
                                                    <div className="space-y-3">
                                                        <label htmlFor="filter-user-role" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                            <Filter size={12} /> Structural Role
                                                        </label>
                                                        <select 
                                                            id="filter-user-role"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === 'Global (All Roles)') setRoles([]);
                                                                else setRoles([val]);
                                                            }}
                                                            value={roles.length === 0 ? 'Global (All Roles)' : roles[0]}
                                                        >
                                                            <option>Global (All Roles)</option>
                                                            <option>Internal Staff</option>
                                                            <option>Parent Network</option>
                                                            <option>Alumni Circle</option>
                                                            <option>Others</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-3">
                                                        <label htmlFor="filter-institutional-node" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                            <MapPin size={12} /> Institutional Node
                                                        </label>
                                                        <select 
                                                            id="filter-institutional-node"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === 'Global (All Nodes)') setCampuses([]);
                                                                else setCampuses([val]);
                                                            }}
                                                            value={campuses.length === 0 ? 'Global (All Nodes)' : campuses[0]}
                                                        >
                                                            <option>Global (All Nodes)</option>
                                                            {availableCampuses.map(c => (
                                                                <option key={c.id} value={c.campusName}>{c.campusName}</option>
                                                            ))}
                                                        </select>
                                                    </div>

                                                    {/* Row 2: Account Health & Payment Status */}
                                                    <div className="space-y-3">
                                                        <label htmlFor="filter-account-health" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1 italic">
                                                            <Filter size={10} /> Account Health
                                                        </label>
                                                        <select 
                                                            id="filter-account-health"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                                            onChange={(e) => setStatuses(e.target.value === 'All Accounts' ? [] : [e.target.value])}
                                                            value={statuses.length === 0 ? 'All Accounts' : statuses[0]}
                                                        >
                                                            <option>Active Only (Default)</option>
                                                            <option>Inactive / Unverified</option>
                                                            <option>All Accounts</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <label htmlFor="filter-payment-status" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                            <Wallet size={12} /> Payment Status
                                                        </label>
                                                        <select 
                                                            id="filter-payment-status"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                                            onChange={(e) => setPaymentStatus(e.target.value === 'All Statuses' ? [] : [e.target.value])}
                                                            value={paymentStatus.length === 0 ? 'All Statuses' : paymentStatus[0]}
                                                        >
                                                            <option>All Statuses</option>
                                                            <option>Success</option>
                                                            <option>Pending</option>
                                                            <option>Pending Approval</option>
                                                        </select>
                                                    </div>

                                                    {/* Row 3: Benefit Eligibility & Referral Milestone */}
                                                    <div className="space-y-3">
                                                        <label htmlFor="filter-benefit-eligibility" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1 italic">
                                                            <ShieldCheck size={10} /> Benefit Eligibility
                                                        </label>
                                                        <select 
                                                            id="filter-benefit-eligibility"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                                            onChange={(e) => {
                                                                const s = e.target.value;
                                                                if (s === 'All Eligibility') setBenefitStatuses([]);
                                                                else setBenefitStatuses([s]);
                                                            }}
                                                            value={benefitStatuses.length === 0 ? 'All Eligibility' : benefitStatuses[0]}
                                                        >
                                                            <option>All Eligibility</option>
                                                            <option>Active</option>
                                                            <option>Pending</option>
                                                            <option>Inactive</option>
                                                        </select>
                                                    </div>

                                                    <div className="space-y-3">
                                                        <label htmlFor="filter-referral-milestone" className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2 px-1 italic">
                                                            <Trophy size={10} /> Referral Milestone
                                                        </label>
                                                        <select 
                                                            id="filter-referral-milestone"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === 'No Filter') {
                                                                    setMinReferrals('');
                                                                    setMaxReferrals('');
                                                                } else if (val === '0 Referrals') {
                                                                    setMinReferrals(0);
                                                                    setMaxReferrals(0);
                                                                } else if (val === '5+ Referrals (VIPs)') {
                                                                    setMinReferrals(5);
                                                                    setMaxReferrals('');
                                                                } else {
                                                                    const count = parseInt(val.match(/\d+/)?.[0] || '0');
                                                                    setMinReferrals(count);
                                                                    setMaxReferrals(count);
                                                                }
                                                            }}
                                                            value={
                                                                minReferrals === '' ? 'No Filter' :
                                                                minReferrals === 0 && maxReferrals === 0 ? '0 Referrals' :
                                                                minReferrals === 5 && maxReferrals === '' ? '5+ Referrals (VIPs)' :
                                                                `Exactly ${minReferrals} Referral${minReferrals === 1 ? '' : 's'}`
                                                            }
                                                        >
                                                            <option>No Filter</option>
                                                            <option>0 Referrals</option>
                                                            <option>Exactly 1 Referral</option>
                                                            <option>Exactly 2 Referrals</option>
                                                            <option>Exactly 3 Referrals</option>
                                                            <option>Exactly 4 Referrals</option>
                                                            <option>5+ Referrals (VIPs)</option>
                                                        </select>
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* -- Engagement & CRM (High priority for expert) -- */}
                                <div className="border border-indigo-100 rounded-xl bg-white overflow-hidden shadow-sm">
                                    <button 
                                        type="button"
                                        onClick={() => toggleSection('funnel')}
                                        className="w-full flex items-center justify-between p-4 bg-indigo-50/30 hover:bg-indigo-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100/50 rounded-lg text-indigo-600">
                                                <Target size={16} />
                                            </div>
                                            <div className="text-left">
                                                <h6 className="text-sm font-black text-slate-800 uppercase tracking-tight">Expert CRM Context</h6>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                    {targetEntity === 'REFERRAL_LEAD' ? 'Lead Funnel, Sources' : 
                                                     targetEntity === 'PROGRAM_LEAD' ? 'Platform Tracking' : 
                                                     'Ambassador Funnel, Activity Tracking'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {!openSections.includes('funnel') && (
                                                <div className="hidden md:flex gap-1.5 items-center">
                                                    {leadFunnelStatus !== 'All' && <span className="px-2 py-0.5 bg-indigo-600 text-white rounded text-[9px] font-black uppercase italic">Stage: {leadFunnelStatus}</span>}
                                                    {activityStatus !== 'All' && <span className="px-2 py-0.5 bg-orange-100 text-orange-700 rounded text-[9px] font-black uppercase">{activityStatus} Users</span>}
                                                </div>
                                            )}
                                            {openSections.includes('funnel') ? <ChevronUp size={18} className="text-indigo-400" /> : <ChevronDown size={18} className="text-indigo-400" />}
                                        </div>
                                    </button>

                                    {openSections.includes('funnel') && (
                                        <div className="p-5 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-indigo-50">
                                             {targetEntity === 'USER' || targetEntity === 'STUDENT' ? (
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                    <div className="space-y-1.5">
                                                        <label htmlFor="crm-filter-funnel-stage" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic flex items-center gap-2">
                                                            <Filter size={10} /> {targetEntity === 'STUDENT' ? 'Parent Engagement Stage' : 'Lead Funnel Stage'}
                                                        </label>
                                                        <select
                                                            id="crm-filter-funnel-stage"
                                                            value={leadFunnelStatus}
                                                            onChange={e => setLeadFunnelStatus(e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                                        >
                                                            <option value="All">All Lead Stages</option>
                                                            <option value="hasNoLeads">No Leads Added Yet (Dormant)</option>
                                                            <option value="hasSubmittedNotConfirmed">Submitted Leads — Not Yet Confirmed</option>
                                                            <option value="hasPendingLeads">Has New / Pending Leads</option>
                                                            <option value="hasVisitedLeads">Has Contacted Leads</option>
                                                        </select>
                                                    </div>
                                                    <div className="space-y-1.5">
                                                        <label htmlFor="crm-filter-activity-phase" className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic flex items-center gap-2">
                                                            <RefreshCcw size={10} /> Target Activity Phase
                                                        </label>
                                                        <select
                                                            id="crm-filter-activity-phase"
                                                            value={activityStatus}
                                                            onChange={e => setActivityStatus(e.target.value)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                                        >
                                                            <option value="All">All User Activity</option>
                                                            <option value="Active">Recently Engaged (14 days)</option>
                                                            <option value="Dormant">Ghost Accounts (&gt;14 days)</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            ) : targetEntity === 'REFERRAL_LEAD' ? (
                                                <div className="space-y-4">
                                                    <label className="block text-[10px] font-black text-indigo-500 uppercase tracking-widest px-1 italic mb-2">Target Referral Stages</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            { id: 'NEW', label: 'New', values: ['New'] },
                                                            { id: 'CONTACTED', label: 'Contacted', values: ['Contacted', 'Follow_up', 'Interested'] },
                                                            { id: 'ADMITTED_CONFIRMED', label: 'Admitted / Confirmed', values: ['Admitted', 'Confirmed'] },
                                                            { id: 'REJECTED', label: 'Rejected', values: ['Rejected'] }
                                                        ].map(stage => {
                                                            const isActive = stage.values.every(v => leadStatuses.includes(v))
                                                            return isActive ? (
                                                                    <button
                                                                        key={stage.id} type="button"
                                                                        onClick={() => {
                                                                            setLeadStatuses(prev => {
                                                                                if (isActive) return prev.filter(v => !stage.values.includes(v))
                                                                                return [...new Set([...prev, ...stage.values])]
                                                                            })
                                                                        }}
                                                                        aria-pressed="true"
                                                                        aria-label={`Target stage: ${stage.label}`}
                                                                        className="px-4 py-2 text-[10px] font-black rounded-xl border transition-all uppercase tracking-tight bg-indigo-600 text-white border-indigo-600 shadow-md"
                                                                    >
                                                                        {stage.label}
                                                                    </button>
                                                                ) : (
                                                                    <button
                                                                        key={stage.id} type="button"
                                                                        onClick={() => {
                                                                            setLeadStatuses(prev => {
                                                                                if (isActive) return prev.filter(v => !stage.values.includes(v))
                                                                                return [...new Set([...prev, ...stage.values])]
                                                                            })
                                                                        }}
                                                                        aria-pressed="false"
                                                                        aria-label={`Target stage: ${stage.label}`}
                                                                        className="px-4 py-2 text-[10px] font-black rounded-xl border transition-all uppercase tracking-tight bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-300"
                                                                    >
                                                                        {stage.label}
                                                                    </button>
                                                                )
                                                            })}
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight px-1 italic">Multi-select enabled. Leaves blank to target all leads.</p>
                                                </div>
                                            ) : (
                                                <div className="p-10 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Experimental: CRM Metrics not applicable for Program Leads yet</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                                
                                {/* -- Phase 10: Membership & Context (New) -- */}
                                <div className="border border-orange-100 rounded-xl bg-white overflow-hidden shadow-sm">
                                    <button 
                                        type="button"
                                        onClick={() => toggleSection('context')}
                                        className="w-full flex items-center justify-between p-4 bg-orange-50/30 hover:bg-orange-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-orange-100/50 rounded-lg text-orange-600">
                                                <ShieldCheck size={16} />
                                            </div>
                                            <div className="text-left">
                                                <h6 className="text-sm font-black text-slate-800 uppercase tracking-tight">Membership & Context</h6>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                    {targetEntity === 'USER' ? 'Five Star Members, Amounts' : 
                                                     targetEntity === 'PROGRAM_LEAD' || targetEntity === 'REFERRAL_LEAD' ? 'Amounts, Trigger Context' :
                                                     'Student Parent Context, Amounts'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {!openSections.includes('context') && (
                                                <div className="hidden md:flex gap-1.5 items-center">
                                                    {isFiveStarOnly && <span className="px-2 py-0.5 bg-orange-600 text-white rounded text-[9px] font-black uppercase italic">Five Star Only</span>}
                                                    {minAmount !== '' && <span className="px-2 py-0.5 bg-green-100 text-green-700 rounded text-[9px] font-black uppercase">Min: ₹{minAmount}</span>}
                                                    {ticketCategories.length > 0 && <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-[9px] font-black uppercase">{ticketCategories.length} Categories</span>}
                                                </div>
                                            )}
                                            {openSections.includes('context') ? <ChevronUp size={18} className="text-orange-400" /> : <ChevronDown size={18} className="text-orange-400" />}
                                        </div>
                                    </button>

                                    {openSections.includes('context') && (
                                        <div className="p-5 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-orange-50 space-y-6">
                                            {targetEntity === 'USER' && (
                                                <div className="flex items-center justify-between p-4 bg-orange-50 rounded-xl border border-orange-100">
                                                    <div className="flex items-center gap-3">
                                                        <div className="p-2 bg-white rounded-lg shadow-sm">
                                                            <Star className="h-4 w-4 text-orange-500 fill-orange-500" />
                                                        </div>
                                                        <div>
                                                            <h6 className="text-[10px] font-black text-slate-700 uppercase tracking-tight">Five Star Ambassadors Only</h6>
                                                            <p className="text-[9px] text-slate-500 font-bold uppercase">Only trigger for verified Five Star members</p>
                                                        </div>
                                                    </div>
                                                        {isFiveStarOnly ? (
                                                            <button 
                                                                type="button"
                                                                onClick={() => setIsFiveStarOnly(false)}
                                                                className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-orange-600"
                                                                role="switch"
                                                                aria-checked="true"
                                                                aria-label="Five Star Ambassadors Only"
                                                            >
                                                                <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-5" />
                                                            </button>
                                                        ) : (
                                                            <button 
                                                                type="button"
                                                                onClick={() => setIsFiveStarOnly(true)}
                                                                className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none bg-slate-300"
                                                                role="switch"
                                                                aria-checked="false"
                                                                aria-label="Five Star Ambassadors Only"
                                                            >
                                                                <span className="pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out translate-x-0" />
                                                            </button>
                                                        )}
                                                </div>
                                            )}

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                <div className="space-y-1.5">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">Event Amount Threshold (Min)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                                                        <input 
                                                            type="number" value={minAmount} onChange={e => setMinAmount(e.target.value as any)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-orange-100 transition-all outline-none"
                                                            placeholder="0"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1 italic">Event Amount Threshold (Max)</label>
                                                    <div className="relative">
                                                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold text-xs">₹</span>
                                                        <input 
                                                            type="number" value={maxAmount} onChange={e => setMaxAmount(e.target.value as any)}
                                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-8 pr-4 py-3 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-orange-100 transition-all outline-none"
                                                            placeholder="No Max"
                                                        />
                                                    </div>
                                                </div>
                                            </div>

                                            {triggerEvent === 'ON_TICKET_CREATED' && (
                                                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Specific Ticket Categories</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {['Technical Issue', 'Benefit Discrepancy', 'Fee / Payment Query', 'Login / Account Issue', 'Referral Not Showing', 'General Query'].map(cat => (
                                                            <button 
                                                                key={cat} type="button"
                                                                onClick={() => setTicketCategories(prev => prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat])}
                                                                className={`px-3 py-1.5 text-[9px] font-black rounded-lg border transition-all uppercase tracking-tight ${ticketCategories.includes(cat) ? 'bg-orange-600 text-white border-orange-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-orange-300'}`}
                                                            >
                                                                {cat}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 italic">Leaves blank to apply to all categories</p>
                                                </div>
                                            )}

                                            {triggerEvent === 'ON_SETTLEMENT_PROCESSED' && (
                                                <div className="space-y-3 p-4 bg-slate-50 rounded-xl border border-slate-100">
                                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] block mb-2 px-1">Specific Payout Categories</label>
                                                    <div className="flex flex-wrap gap-2">
                                                        {[
                                                            { id: 'ADMISSION_SHARE', label: 'Admission Share' },
                                                            { id: 'DONATION_SHARE', label: 'Donation Share' },
                                                            { id: 'SPECIAL_BONUS', label: 'Special Bonus' },
                                                            { id: 'SLAB_SHARE', label: 'Slab Benefit' },
                                                            { id: 'OTHER', label: 'Other' }
                                                        ].map(cat => (
                                                            <button 
                                                                key={cat.id} type="button"
                                                                onClick={() => setPayoutCategories(prev => prev.includes(cat.id) ? prev.filter(x => x !== cat.id) : [...prev, cat.id])}
                                                                className={`px-3 py-1.5 text-[9px] font-black rounded-lg border transition-all uppercase tracking-tight ${payoutCategories.includes(cat.id) ? 'bg-orange-600 text-white border-orange-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-orange-300'}`}
                                                            >
                                                                {cat.label}
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <p className="text-[9px] text-slate-400 italic">Leaves blank to apply to all payout types</p>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                {/* -- Requirements & Temporal (Advanced) -- */}
                                <div className="border border-indigo-100 rounded-xl bg-white overflow-hidden shadow-sm">
                                    <button 
                                        type="button"
                                        onClick={() => toggleSection('advanced')}
                                        className="w-full flex items-center justify-between p-4 bg-indigo-50/30 hover:bg-indigo-50 transition-colors"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="p-2 bg-indigo-100/50 rounded-lg text-indigo-600">
                                                <Calendar size={16} />
                                            </div>
                                            <div className="text-left">
                                                <h6 className="text-sm font-black text-slate-800 uppercase tracking-tight">Advanced Logic</h6>
                                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest">
                                                    {targetEntity === 'REFERRAL_LEAD' || targetEntity === 'PROGRAM_LEAD' ? 'Timeline, Validation' : 'Date Ranges, Validation, Caps'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            {!openSections.includes('advanced') && (
                                                <div className="hidden md:flex gap-1.5 items-center">
                                                    {(registeredAfter || registeredBefore) && <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-black uppercase italic">Date Locked</span>}
                                                    {reqBankDetails && <span className="px-2 py-0.5 bg-red-50 text-red-600 rounded text-[9px] font-black uppercase">Missing Bank</span>}
                                                    {minReferrals !== '' && <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded text-[9px] font-black uppercase">Ref Min: {minReferrals}</span>}
                                                </div>
                                            )}
                                            {openSections.includes('advanced') ? <ChevronUp size={18} className="text-indigo-400" /> : <ChevronDown size={18} className="text-indigo-400" />}
                                        </div>
                                    </button>

                                    {openSections.includes('advanced') && (
                                        <div className="p-5 animate-in fade-in slide-in-from-top-2 duration-300 border-t border-indigo-50 space-y-6">
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-slate-50 rounded-xl">
                                                <div>
                                                    <label htmlFor="registeredAfter" className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Registered After</label>
                                                    <input 
                                                        id="registeredAfter"
                                                        type="date" value={registeredAfter} onChange={e => setRegisteredAfter(e.target.value)}
                                                        className="w-full rounded-xl border-slate-200 text-sm focus:ring-4 focus:ring-indigo-100 py-3 bg-white shadow-sm outline-none"
                                                    />
                                                </div>
                                                <div>
                                                    <label htmlFor="registeredBefore" className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Registered Before</label>
                                                    <input 
                                                        id="registeredBefore"
                                                        type="date" value={registeredBefore} onChange={e => setRegisteredBefore(e.target.value)}
                                                        className="w-full rounded-xl border-slate-200 text-sm focus:ring-4 focus:ring-indigo-100 py-3 bg-white shadow-sm outline-none"
                                                    />
                                                </div>
                                            </div>

                                            {/* Interval Logic */}
                                            <div className="p-4 bg-orange-50/30 rounded-xl border border-orange-100/50 space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <label className="text-[10px] font-black text-orange-900/50 uppercase tracking-widest block italic">Touchpoint Interval (Exact Day)</label>
                                                    {intervalDay !== '' && (
                                                        <button onClick={() => setIntervalDay('')} className="text-[9px] font-bold text-orange-600 uppercase hover:underline">Clear</button>
                                                    )}
                                                </div>
                                                <div className="flex flex-wrap gap-2">
                                                    {[1, 2, 3, 4, 5, 6, 7, 10, 15, 20, 30].map(day => (
                                                        <button
                                                            key={day} type="button"
                                                            onClick={() => setIntervalDay(day)}
                                                            className={`px-3 py-1.5 text-[10px] font-black rounded-lg border transition-all ${intervalDay === day ? 'bg-orange-600 text-white border-orange-600 shadow-md' : 'bg-white text-slate-500 border-slate-200 hover:border-orange-300'}`}
                                                        >
                                                            Day {day}
                                                        </button>
                                                    ))}
                                                    <div className="relative flex-1 min-w-[100px]">
                                                        <input 
                                                            type="number" 
                                                            value={![1, 2, 3, 4, 5, 6, 7, 10, 15, 20, 30].includes(Number(intervalDay)) ? intervalDay : ''} 
                                                            onChange={e => setIntervalDay(e.target.value === '' ? '' : Number(e.target.value))}
                                                            placeholder="Custom..."
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-[10px] font-bold text-slate-700 outline-none focus:border-orange-300"
                                                        />
                                                    </div>
                                                </div>
                                                <p className="text-[9px] text-orange-800/60 font-medium italic">Targets users every N days as long as conditions match. Perfect for repeated re-engagement.</p>
                                            </div>

                                            {(targetEntity === 'USER' || targetEntity === 'STUDENT') && (
                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 p-4 bg-indigo-50/30 rounded-xl border border-indigo-100/50">
                                                    <div>
                                                        <label htmlFor="accountAge" className="text-[10px] font-black text-indigo-900/50 uppercase tracking-widest mb-2 block italic">Account Age (Days)</label>
                                                        <input 
                                                            id="accountAge"
                                                            type="number" value={daysInactive} onChange={e => setDaysInactive(e.target.value as any)}
                                                            className="w-full rounded-xl border-indigo-100 text-sm focus:ring-4 focus:ring-indigo-200 py-2.5 bg-white shadow-sm outline-none"
                                                            placeholder="e.g. 7" min="1"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label htmlFor="referralMilestone" className="text-[10px] font-black text-indigo-900/50 uppercase tracking-widest mb-2 block italic">Referral Milestone</label>
                                                        <select 
                                                            id="referralMilestone"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                                            aria-label="Filter by referral milestone"
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === 'All Referral Counts') { setMinReferrals(''); setMaxReferrals(''); }
                                                                else if (val === '0 Referrals (No activity)') { setMinReferrals(0); setMaxReferrals(0); }
                                                                else if (val === 'Exactly 1 Referral') { setMinReferrals(1); setMaxReferrals(1); }
                                                                else if (val === 'Exactly 2 Referrals') { setMinReferrals(2); setMaxReferrals(2); }
                                                                else if (val === 'Exactly 3 Referrals') { setMinReferrals(3); setMaxReferrals(3); }
                                                                else if (val === 'Exactly 4 Referrals') { setMinReferrals(4); setMaxReferrals(4); }
                                                                else if (val === '5+ Referrals (VIPs)') { setMinReferrals(5); setMaxReferrals(''); }
                                                            }}
                                                            value={
                                                                minReferrals === '' && maxReferrals === '' ? 'All Referral Counts' :
                                                                minReferrals === 0 && maxReferrals === 0 ? '0 Referrals (No activity)' :
                                                                minReferrals === 1 && maxReferrals === 1 ? 'Exactly 1 Referral' :
                                                                minReferrals === 2 && maxReferrals === 2 ? 'Exactly 2 Referrals' :
                                                                minReferrals === 3 && maxReferrals === 3 ? 'Exactly 3 Referral' :
                                                                minReferrals === 4 && maxReferrals === 4 ? 'Exactly 4 Referral' :
                                                                minReferrals === 5 && maxReferrals === '' ? '5+ Referrals (VIPs)' : 'All Referral Counts'
                                                            }
                                                        >
                                                            <option>All Referral Counts</option>
                                                            <option>0 Referrals (No activity)</option>
                                                            <option>Exactly 1 Referral</option>
                                                            <option>Exactly 2 Referrals</option>
                                                            <option>Exactly 3 Referrals</option>
                                                            <option>Exactly 4 Referrals</option>
                                                            <option>5+ Referrals (VIPs)</option>
                                                        </select>
                                                    </div>
                                                    <div>
                                                        <label htmlFor="missingInfo" className="text-[10px] font-black text-indigo-900/50 uppercase tracking-widest mb-2 block italic">Missing Info</label>
                                                        <select 
                                                            id="missingInfo"
                                                            className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 focus:ring-4 focus:ring-indigo-100 transition-all outline-none"
                                                            aria-label="Filter by missing information"
                                                            onChange={(e) => {
                                                                const val = e.target.value;
                                                                if (val === 'No Filter') { setReqBankDetails(''); setReqChildDetails(''); }
                                                                else if (val === 'Missing Bank Details') { setReqBankDetails('MISSING'); setReqChildDetails(''); }
                                                                else if (val === 'Missing Child Details') { setReqBankDetails(''); setReqChildDetails('MISSING'); }
                                                            }}
                                                            value={
                                                                reqBankDetails === 'MISSING' ? 'Missing Bank Details' :
                                                                reqChildDetails === 'MISSING' ? 'Missing Child Details' : 'No Filter'
                                                            }
                                                        >
                                                            <option>No Filter</option>
                                                            <option>Missing Bank Details</option>
                                                            <option>Missing Child Details</option>
                                                        </select>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Save */}
                        <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
                             <button
                                disabled={isSaving}
                                onClick={handleSave}
                                className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-black text-sm uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-200"
                            >
                                {isSaving ? <RefreshCcw className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                                {editingRuleId ? 'Save Changes' : 'Save & Activate Rule'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 gap-4">
                {rules.length === 0 && !showForm && (
                     <div className="text-center p-12 bg-slate-50 rounded-3xl border border-dashed border-slate-200">
                         <h3 className="text-slate-500 font-bold mb-2">No Smart Rules Configured</h3>
                         <p className="text-sm text-slate-400">Create a visual rule above to dynamically trigger WhatsApp messages based on user data.</p>
                     </div>
                )}
                
                {rules.map(rule => (
                    <div key={rule.id} className={`bg-white rounded-2xl p-5 border transition-all flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${rule.isActive ? 'border-slate-200 shadow-sm' : 'border-slate-100 opacity-60 grayscale'}`}>
                        <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                                <span className={`h-2.5 w-2.5 rounded-full ${rule.isActive ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-slate-300'}`} />
                                <h4 className="font-bold text-slate-800 text-lg">{rule.name}</h4>
                            </div>
                            <div className="flex items-center gap-2 text-xs font-medium text-slate-500 ml-4 mb-3">
                                <span className={`px-2 py-0.5 rounded-md border font-black uppercase tracking-tight ${rule.triggerType === 'EVENT' ? 'bg-orange-50 text-orange-600 border-orange-100' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>
                                    {rule.triggerType === 'EVENT' ? '⚡ Instant' : '⏰ Daily'}
                                </span>
                                <span>→</span>
                                <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 font-bold uppercase rounded-md border border-indigo-100">
                                    {rule.triggerType === 'EVENT' ? rule.triggerEvent : 'Daily Sweep'}
                                </span>
                                <span>→</span>
                                <span className="px-2 py-0.5 bg-green-50 text-green-700 font-bold uppercase rounded-md border border-green-100">
                                    Send: {rule.actionTarget || rule.triggerEvent}
                                </span>
                            </div>
                            
                            <div className="ml-4 flex flex-wrap gap-2">
                                {rule.conditions?.targetEntity && rule.conditions.targetEntity !== 'USER' && (
                                     <span className="text-[10px] font-bold text-indigo-500 uppercase bg-indigo-50 px-2 py-1 rounded-lg border border-indigo-100">Targeting: {rule.conditions.targetEntity}</span>
                                )}
                                {/* Format conditions nicely */}
                                {rule.conditions?.role && (
                                     <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg">Role: {rule.conditions.role.join(', ')}</span>
                                )}
                                {rule.conditions?.status && (
                                     <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg">Status: {rule.conditions.status.join(', ')}</span>
                                )}
                                {rule.conditions?.benefitStatus && (
                                     <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg">Benefit Status: {rule.conditions.benefitStatus.join(', ')}</span>
                                )}
                                {rule.conditions?.campus && (
                                     <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg">Campus: {rule.conditions.campus.join(', ')}</span>
                                )}
                                {rule.conditions?.missingBankDetails && (
                                     <span className="text-[10px] font-bold text-red-500 uppercase bg-red-50 px-2 py-1 rounded-lg">Condition: Missing Bank Details</span>
                                )}
                                {rule.conditions?.missingChildDetails && (
                                     <span className="text-[10px] font-bold text-red-500 uppercase bg-red-50 px-2 py-1 rounded-lg">Condition: Missing Child Details</span>
                                )}
                                {rule.conditions?.daysSinceRegistration && (
                                     <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg">Account Age: &gt; {rule.conditions.daysSinceRegistration} Days</span>
                                )}
                                {rule.conditions?.minReferrals !== undefined && (
                                     <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg">Min Referrals: {rule.conditions.minReferrals}</span>
                                )}
                                {rule.conditions?.maxReferrals !== undefined && (
                                     <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-50 px-2 py-1 rounded-lg border border-slate-100">Max Referrals: {rule.conditions.maxReferrals}</span>
                                )}
                                {rule.conditions?.registeredAfter && (
                                     <span className="text-[10px] font-bold text-blue-500 uppercase bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">After: {rule.conditions.registeredAfter}</span>
                                )}
                                {rule.conditions?.registeredBefore && (
                                     <span className="text-[10px] font-bold text-blue-500 uppercase bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">Before: {rule.conditions.registeredBefore}</span>
                                )}
                                {rule.conditions?.paymentStatus && rule.conditions.paymentStatus.length > 0 && (
                                     <span className="text-[10px] font-bold text-emerald-600 uppercase bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-100">Payment: {rule.conditions.paymentStatus.join(', ')}</span>
                                )}
                                {rule.conditions?.leadStatuses && rule.conditions.leadStatuses.length > 0 && (
                                     <span className="text-[10px] font-bold text-amber-600 uppercase bg-amber-50 px-2 py-1 rounded-lg border border-amber-100">Lead Status: {rule.conditions.leadStatuses.join(', ')}</span>
                                )}
                                {rule.conditions?.gradeInterested && rule.conditions.gradeInterested.length > 0 && (
                                     <span className="text-[10px] font-bold text-purple-600 uppercase bg-purple-50 px-2 py-1 rounded-lg border border-purple-100">Grade: {rule.conditions.gradeInterested.join(', ')}</span>
                                )}
                                {rule.conditions?.programLeadStatuses && rule.conditions.programLeadStatuses.length > 0 && (
                                     <span className="text-[10px] font-bold text-pink-600 uppercase bg-pink-50 px-2 py-1 rounded-lg border border-pink-100">Prog Status: {rule.conditions.programLeadStatuses.join(', ')}</span>
                                )}
                                {rule.conditions?.daysSinceClick && (
                                     <span className="text-[10px] font-bold text-slate-500 uppercase bg-slate-100 px-2 py-1 rounded-lg border border-slate-200">Clicked &gt; {rule.conditions.daysSinceClick} Days ago</span>
                                )}
                                {rule.conditions?.leadFunnelStatus && rule.conditions.leadFunnelStatus !== 'All' && (
                                     <span className="text-[10px] font-bold text-orange-600 uppercase bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">Funnel: {rule.conditions.leadFunnelStatus}</span>
                                )}
                                {rule.conditions?.activityStatus && rule.conditions.activityStatus !== 'All' && (
                                     <span className="text-[10px] font-bold text-slate-600 uppercase bg-slate-50 px-2 py-1 rounded-lg border border-slate-200">{rule.conditions.activityStatus} Activity</span>
                                )}
                                {rule.conditions?.intervalDay && (
                                     <span className="text-[10px] font-bold text-orange-600 uppercase bg-orange-50 px-2 py-1 rounded-lg border border-orange-100 italic">Day {rule.conditions.intervalDay} Targeting</span>
                                )}
                                {rule.conditions?.minAmount && (
                                     <span className="text-[10px] font-bold text-green-600 uppercase bg-green-50 px-2 py-1 rounded-lg border border-green-100">Min: ₹{rule.conditions.minAmount}</span>
                                )}
                                {rule.conditions?.ticketCategories && rule.conditions.ticketCategories.length > 0 && (
                                     <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-2 py-1 rounded-lg border border-blue-100">Tickets: {rule.conditions.ticketCategories.length} Cats</span>
                                )}
                                {rule.conditions?.payoutCategories && rule.conditions.payoutCategories.length > 0 && (
                                     <span className="text-[10px] font-bold text-orange-600 uppercase bg-orange-50 px-2 py-1 rounded-lg border border-orange-100">Payouts: {rule.conditions.payoutCategories.length} Types</span>
                                )}
                            </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                            <button
                                onClick={() => handleTestRun(rule)}
                                className="px-3 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 rounded-xl transition-all text-xs font-bold flex items-center gap-1.5"
                                title="Trigger Instant Test Message"
                            >
                                <Play className="h-4 w-4" />
                                Test Run
                            </button>
                            <button
                                onClick={() => editRule(rule)}
                                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"
                                title="Edit Rule"
                            >
                                <Edit2 className="h-4 w-4" />
                            </button>
                            <button
                                onClick={() => toggleRule(rule)}
                                className={`flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${rule.isActive ? 'bg-slate-100 text-slate-600 hover:bg-slate-200' : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100'}`}
                            >
                                {rule.isActive ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                                {rule.isActive ? 'Pause' : 'Activate'}
                            </button>
                            <button
                                onClick={() => handleDelete(rule.id)}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                                title="Delete Rule"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <div className="mt-8 bg-indigo-50/50 rounded-2xl p-4 border border-indigo-100 flex items-start gap-3">
                <Check className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                <p className="text-sm text-indigo-800 leading-relaxed">
                    <span className="font-bold">Live Testing Enabled:</span> Use the "Test Run" button on any rule to fire a live signal to your mobile number. Ensure your templates are approved in the MSG91 portal.
                </p>
            </div>

            {/* Premium Dialogs */}
            <ConfirmDialog 
                isOpen={isDeleteDialogOpen}
                title="Delete Automation Rule?"
                description={<p>This action cannot be undone. Rule <span className="font-black text-slate-900">"{rules.find(r => r.id === ruleToDeleteId)?.name}"</span> will be permanently removed.</p>}
                confirmText="Delete Rule"
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteDialogOpen(false)}
                isLoading={isProcessingDialog}
                variant="danger"
            />

            <PromptDialog 
                isOpen={isTestPromptOpen}
                title="Trigger Test Message"
                description={`Enter a 10-digit mobile number to send a live test message for rule \"${ruleToTest?.name}\":`}
                placeholder="e.g. 9876543210"
                confirmText="Fire Test Signal"
                onConfirm={confirmTestRun}
                onCancel={() => {
                    setIsTestPromptOpen(false)
                    setRuleToTest(null)
                }}
                isLoading={isProcessingDialog}
                variant="info"
            />
        </div>
    )
}
