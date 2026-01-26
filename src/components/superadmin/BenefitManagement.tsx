'use client'

import React, { useState, useMemo, useEffect } from 'react'
import { BenefitSlabData, updateBenefitSlab, resetDefaultSlabs } from '@/app/benefit-actions'
import { toast } from 'sonner'
import {
    CheckCircle2, RefreshCw, Calculator, DollarSign, Save, Info,
    User, HelpCircle, History, Sparkles, Activity, Layers,
    ChevronRight, Zap, Target, ShieldCheck, TrendingUp, Cpu,
    ArrowUpRight, AlertCircle, Percent, Coins
} from 'lucide-react'
import { Badge } from '@/components/ui/Badge'
import { motion, AnimatePresence } from 'framer-motion'
import { PolicyVisualizer } from './PolicyVisualizer'
import { GrowthCoreView } from './GrowthCoreView'
import { LegacyVaultView } from './LegacyVaultView'

interface Props {
    initialSlabs: BenefitSlabData[]
}

export function BenefitManagement({ initialSlabs }: Props) {
    const [isMounted, setIsMounted] = useState(false)
    const [slabs, setSlabs] = useState<BenefitSlabData[]>(initialSlabs || [])
    const [isSaving, setIsSaving] = useState(false)
    const [activeView, setActiveView] = useState<'Standard' | 'Long Term'>('Standard')

    useEffect(() => {
        setIsMounted(true)
    }, [])

    // Simulator State
    const [simCount, setSimCount] = useState<number>(3)
    const [simFee, setSimFee] = useState<number>(60000)
    const [simRole, setSimRole] = useState<'Parent' | 'Staff' | 'Alumni' | 'Others'>('Parent')
    const [simHasChild, setSimHasChild] = useState(true)
    const [simPartnerType, setSimPartnerType] = useState<'Standard' | 'Long Term'>('Standard')
    const [simPrevFee, setSimPrevFee] = useState<number>(120000)

    // Strategic Parameter State (Global Policies)
    const [globalAppBonus, setGlobalAppBonus] = useState<number>(slabs[0]?.appBonusPercent ?? 5)
    const [globalAppBonusEligibility, setGlobalAppBonusEligibility] = useState<string>(slabs[0]?.appBonusEligibility ?? "PARENT,STAFF_CHILD")
    const [globalHistoricBase, setGlobalHistoricBase] = useState<number>(slabs[0]?.longTermExtraPercent ?? 3)

    // Hydrate globals if slabs change (with safety fallbacks)
    useEffect(() => {
        if (slabs.length > 0) {
            setGlobalAppBonus(slabs[0].appBonusPercent ?? 5)
            setGlobalAppBonusEligibility(slabs[0].appBonusEligibility ?? "PARENT,STAFF_CHILD")
            setGlobalHistoricBase(slabs[0].longTermExtraPercent ?? 3)
        }
    }, [slabs])

    // INSTITUTIONAL LOGIC ENGINE
    const simResult = useMemo(() => {
        if (simCount <= 0 || !slabs.length) return { percent: 0, amount: 0, breakdown: [], bonus: 0, longTermBase: 0 }

        const isLongTerm = simPartnerType === 'Long Term'
        const sorted = [...slabs].sort((a, b) => a.referralCount - b.referralCount)
        const getPercent = (count: number) => {
            const slab = sorted.find(s => s.referralCount === count) || sorted[sorted.length - 1]
            return isLongTerm ? (slab?.baseLongTermPercent || 0) : (slab?.yearFeeBenefitPercent || 0)
        }

        let totalAmount = 0
        const breakdown: string[] = []
        let applicablePercent = 0
        let appBonusAmount = 0
        let longTermBaseAmount = 0

        // 1. Long Term 5-Star Base Logic (Fixed SUM derived from 3% yields of top 5 prev referrals)
        if (isLongTerm) {
            longTermBaseAmount = globalHistoricBase // Sum entered by user: e.g. ₹6,939.75
            breakdown.push(`HISTORIC-BASE-SUM: ₹${longTermBaseAmount.toLocaleString()} (Added per 5-Star Protocol)`)
        }

        // 2. Core Yield Logic (Group A vs Group B)
        const isGroupAWaiver = simRole === 'Parent' || (simRole === 'Staff' && simHasChild)

        if (isGroupAWaiver) {
            // Group A: Direct Fee Discount (Waiver Track)
            applicablePercent = getPercent(Math.min(simCount, 5))
            totalAmount = (simFee * applicablePercent) / 100

            if (isLongTerm) {
                breakdown.push(`WAIVER-TIER-YIELD: ${applicablePercent}% on base ₹${simFee.toLocaleString()} (₹${totalAmount.toLocaleString()})`)
            } else {
                breakdown.push(`WAIVER-TIER-YIELD: ${applicablePercent}% on base ₹${simFee.toLocaleString()} (₹${totalAmount.toLocaleString()})`)
            }

            // 3. App Enrollment Bonus (STRICTLY EXCLUDE from Long Term)
            if (!isLongTerm) {
                const eligibility = globalAppBonusEligibility.split(',')
                const isEligible =
                    (simRole === 'Parent' && eligibility.includes('PARENT')) ||
                    (simRole === 'Staff' && eligibility.includes('STAFF_CHILD'))

                if (isEligible) {
                    appBonusAmount = (simFee * globalAppBonus) / 100
                    breakdown.push(`APP-PROMO-BONUS: ${globalAppBonus.toFixed(1)}% flat extra (₹${appBonusAmount.toLocaleString()})`)
                } else {
                    breakdown.push(`APP-PROMO-BONUS: 0% (Protocol: Targeting Restriction)`)
                }
            } else {
                // Add a hidden note or explicit 0 if needed for clarity
                breakdown.push(`APP-PROMO-BONUS: 0% (Protocol: Parent/Staff-Child Only)`)
            }
        } else {
            // Group B: Liquidity Payout (Marginal Track)
            const getMarginalPercent = (n: number) => {
                const current = getPercent(n)
                const prev = n === 1 ? 0 : getPercent(n - 1)
                return Math.max(0, current - prev)
            }

            for (let i = 1; i <= Math.min(simCount, 5); i++) {
                const slicePercent = getMarginalPercent(i)
                const sliceAmount = (simFee * slicePercent) / 100
                totalAmount += sliceAmount
                breakdown.push(`MARGINAL-REF-${i}: ${slicePercent}% yield (₹${sliceAmount.toLocaleString()})`)
            }

            // App Bonus for Payout Track
            const eligibility = globalAppBonusEligibility.split(',')
            const isEligible =
                (simRole === 'Staff' && eligibility.includes('STAFF_PAYOUT')) ||
                ((simRole === 'Alumni' || simRole === 'Others') && eligibility.includes('ALUMNI_OTHERS'))

            if (isEligible) {
                appBonusAmount = (simFee * globalAppBonus) / 100
                breakdown.push(`APP-PROMO-BONUS: ${globalAppBonus.toFixed(1)}% flat extra (₹${appBonusAmount.toLocaleString()})`)
            } else {
                breakdown.push(`APP-PROMO-BONUS: 0% (Protocol: Targeting Restriction)`)
            }
        }

        return {
            percent: applicablePercent,
            amount: totalAmount + appBonusAmount + longTermBaseAmount,
            breakdown,
            bonus: appBonusAmount,
            longTermBase: longTermBaseAmount
        }
    }, [simCount, simFee, simRole, simHasChild, simPartnerType, slabs, globalAppBonus, globalAppBonusEligibility, globalHistoricBase])

    const handleUpdateSlabField = (id: number, field: string, value: any) => {
        const newSlabs = slabs.map(s => s.slabId === id ? { ...s, [field]: value } : s)
        setSlabs(newSlabs)
    }

    const handleSaveSlab = async (slab: BenefitSlabData) => {
        setIsSaving(true)
        const res = await updateBenefitSlab(slab.slabId, slab)
        setIsSaving(false)
        if (res.success) toast.success('Institutional Delta Committed')
        else toast.error('Commitment Failed')
    }

    const handleSaveGlobalPolicies = async () => {
        setIsSaving(true)
        // Sync globals to all slabs
        const promises = slabs.map(s => updateBenefitSlab(s.slabId, {
            ...s,
            appBonusPercent: globalAppBonus,
            appBonusEligibility: globalAppBonusEligibility,
            longTermExtraPercent: globalHistoricBase
        }))
        const results = await Promise.all(promises)
        setIsSaving(false)
        if (results.every(r => r.success)) toast.success('Strategic Overrides Validated Globally')
        else toast.error('Partial Sync Failure')
    }

    const handleReset = async () => {
        if (!confirm('Reverting to factory defaults will wipe all custom institutional policies. Proceed?')) return
        setIsSaving(true)
        const res = await resetDefaultSlabs()
        if (res.success) window.location.reload()
    }

    if (!isMounted) {
        return <div className="min-h-screen bg-slate-50 p-12 flex items-center justify-center">
            <div className="flex flex-col items-center gap-4 text-slate-400">
                <RefreshCw className="animate-spin" size={32} />
                <p className="font-black uppercase tracking-widest text-[10px]">Syncing Governance Layer...</p>
            </div>
        </div>
    }

    if (!slabs.length) return <div className="p-20 text-center font-black uppercase tracking-widest text-slate-400">Loading Policy Data...</div>

    return (
        <div className="min-h-screen bg-slate-50 text-gray-900 p-8 space-y-12 animate-in fade-in duration-1000">
            {/* FUTURISTIC COMMAND HEADER */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-8 bg-slate-900 text-white p-10 rounded-[48px] border border-slate-800 shadow-2xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-[120px] -mr-48 -mt-48 group-hover:bg-blue-600/20 transition-all duration-700" />
                <div className="relative z-10 space-y-2">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-500 rounded-lg shadow-[0_0_20px_rgba(59,130,246,0.5)]">
                            <Cpu size={24} strokeWidth={2.5} className="animate-pulse" />
                        </div>
                        <h1 className="text-4xl font-black tracking-tighter uppercase italic bg-gradient-to-r from-white via-white to-white/40 bg-clip-text text-transparent">
                            Policy Command Center
                        </h1>
                    </div>
                    <p className="text-[11px] font-black text-blue-400/60 uppercase tracking-[0.4em] font-mono ml-12">
                        Institutional Governance Engine <span className="opacity-40">// v3.0.0-BETA</span>
                    </p>
                </div>

                <div className="relative z-10 flex items-center gap-6">
                    {/* WING SWITCHER */}
                    <div className="flex bg-white/5 p-1.5 rounded-[28px] border border-white/10 backdrop-blur-xl">
                        {(['Standard', 'Long Term'] as const).map((wing) => (
                            <button
                                key={wing}
                                onClick={() => setActiveView(wing)}
                                className={`px-8 py-3 rounded-[22px] text-[10px] font-black uppercase tracking-[0.15em] transition-all duration-500 ${activeView === wing ? 'bg-white text-slate-900 shadow-xl scale-[1.02]' : 'text-white/40 hover:text-white/60'}`}
                            >
                                {wing === 'Standard' ? 'Growth Core' : 'Legacy Vault'}
                            </button>
                        ))}
                    </div>

                    <div className="h-10 w-[1px] bg-white/10 mx-2" />

                    <button
                        onClick={handleReset}
                        className="group relative px-6 py-3 bg-white/5 border border-white/10 rounded-2xl overflow-hidden hover:border-red-500/30 transition-all duration-300"
                    >
                        <div className="relative flex items-center gap-3 text-[9px] font-black uppercase tracking-widest text-white/40 group-hover:text-red-400">
                            <Zap size={14} className="group-hover:animate-bounce" />
                            Purge
                        </div>
                    </button>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {activeView === 'Standard' ? (
                    <motion.div
                        key="growth"
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 20 }}
                        transition={{ duration: 0.5 }}
                    >
                        <GrowthCoreView
                            slabs={slabs}
                            globalAppBonus={globalAppBonus}
                            globalAppBonusEligibility={globalAppBonusEligibility}
                            setGlobalAppBonus={setGlobalAppBonus}
                            setGlobalAppBonusEligibility={setGlobalAppBonusEligibility}
                            onSaveGlobal={handleSaveGlobalPolicies}
                            onUpdateSlab={handleUpdateSlabField}
                            onSaveSlab={handleSaveSlab}
                            isSaving={isSaving}
                            simState={{ count: simCount, fee: simFee, role: simRole, hasChild: simHasChild }}
                            setSimState={(s: any) => {
                                if (s.count !== undefined) setSimCount(s.count)
                                if (s.fee !== undefined) setSimFee(s.fee)
                                if (s.role !== undefined) setSimRole(s.role)
                                if (s.hasChild !== undefined) setSimHasChild(s.hasChild)
                            }}
                        />
                    </motion.div>
                ) : (
                    <motion.div
                        key="vault"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        transition={{ duration: 0.5 }}
                    >
                        <LegacyVaultView
                            slabs={slabs}
                            globalHistoricBase={globalHistoricBase}
                            setGlobalHistoricBase={setGlobalHistoricBase}
                            onSaveGlobal={handleSaveGlobalPolicies}
                            onUpdateSlab={handleUpdateSlabField}
                            onSaveSlab={handleSaveSlab}
                            isSaving={isSaving}
                            simState={{ count: simCount, fee: simFee, role: simRole, hasChild: simHasChild, prevFee: simPrevFee }}
                            setSimState={(s: any) => {
                                setSimCount(s.count)
                                setSimFee(s.fee)
                                setSimRole(s.role)
                                setSimHasChild(s.hasChild)
                                setSimPrevFee(s.prevFee)
                            }}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
