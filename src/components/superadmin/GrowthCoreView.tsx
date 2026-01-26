'use client'

import React, { useMemo } from 'react'
import { BenefitSlabData } from '@/app/benefit-actions'
import {
    Zap, Sparkles, User, DollarSign, Calculator,
    Target, Layers, Save, Percent
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { PolicyVisualizer } from './PolicyVisualizer'

interface Props {
    slabs: BenefitSlabData[]
    globalAppBonus: number
    globalAppBonusEligibility: string
    setGlobalAppBonus: (val: number) => void
    setGlobalAppBonusEligibility: (val: string) => void
    onSaveGlobal: () => void
    onUpdateSlab: (id: number, field: string, value: any) => void
    onSaveSlab: (slab: BenefitSlabData) => void
    isSaving: boolean
    // Simulator Props passed from parent or managed locally?
    // Let's keep simulator internal for better encapsulation if possible, 
    // or pass state if we want persistence between wing switches.
    // Persistence is better for UX.
    simState: {
        count: number
        fee: number
        role: 'Parent' | 'Staff' | 'Alumni' | 'Others'
        hasChild: boolean
    }
    setSimState: (state: any) => void
}

export function GrowthCoreView({
    slabs,
    globalAppBonus,
    globalAppBonusEligibility,
    setGlobalAppBonus,
    setGlobalAppBonusEligibility,
    onSaveGlobal,
    onUpdateSlab,
    onSaveSlab,
    isSaving,
    simState,
    setSimState
}: Props) {

    const simResult = useMemo(() => {
        if (simState.count <= 0 || !slabs.length) return { percent: 0, amount: 0, breakdown: [], bonus: 0 }

        const sorted = [...slabs].sort((a, b) => a.referralCount - b.referralCount)
        const getPercent = (count: number) => {
            const slab = sorted.find(s => s.referralCount === count) || sorted[sorted.length - 1]
            return slab?.yearFeeBenefitPercent || 0
        }

        let totalAmount = 0
        const breakdown: string[] = []
        let applicablePercent = 0
        let appBonusAmount = 0

        const isGroupAWaiver = simState.role === 'Parent' || (simState.role === 'Staff' && simState.hasChild)
        const eligibility = globalAppBonusEligibility.split(',')

        if (isGroupAWaiver) {
            applicablePercent = getPercent(Math.min(simState.count, 5))
            totalAmount = (simState.fee * applicablePercent) / 100
            breakdown.push(`⚡ WAIVER GROUP A: Directly discounting Tuition Fee`)
            breakdown.push(`📈 TIER YIELD [Ref: ${Math.min(simState.count, 5)}]: ${applicablePercent}% of ₹${simState.fee.toLocaleString()}`)
            breakdown.push(`💰 BASE WAIVER: ₹${totalAmount.toLocaleString()}`)

            const isEligible =
                (simState.role === 'Parent' && eligibility.includes('PARENT')) ||
                (simState.role === 'Staff' && eligibility.includes('STAFF_CHILD'))

            if (isEligible) {
                appBonusAmount = (simState.fee * globalAppBonus) / 100
                breakdown.push(`📱 APP BONUS: +${globalAppBonus.toFixed(1)}% extra (₹${appBonusAmount.toLocaleString()})`)
            } else {
                breakdown.push(`🚫 APP BONUS: 0% (Protocol Target: ${eligibility.includes('PARENT') ? 'Parent Only' : 'Restricted'})`)
            }
        } else {
            breakdown.push(`💧 PAYOUT GROUP B: Generating Liquidity Yield`)
            const getMarginalPercent = (n: number) => {
                const current = getPercent(n)
                const prev = n === 1 ? 0 : getPercent(n - 1)
                return Math.max(0, current - prev)
            }

            for (let i = 1; i <= Math.min(simState.count, 5); i++) {
                const slicePercent = getMarginalPercent(i)
                const sliceAmount = (simState.fee * slicePercent) / 100
                totalAmount += sliceAmount
                breakdown.push(`🔥 MARGINAL REF-${i}: ${slicePercent}% yield (₹${sliceAmount.toLocaleString()})`)
            }

            const isEligible =
                (simState.role === 'Staff' && eligibility.includes('STAFF_PAYOUT')) ||
                ((simState.role === 'Alumni' || simState.role === 'Others') && eligibility.includes('ALUMNI_OTHERS'))

            if (isEligible) {
                appBonusAmount = (simState.fee * globalAppBonus) / 100
                breakdown.push(`📱 APP BONUS: +${globalAppBonus.toFixed(1)}% extra (₹${appBonusAmount.toLocaleString()})`)
            } else {
                breakdown.push(`🚫 APP BONUS: 0% (Filtered by Governance)`)
            }
        }

        return {
            percent: applicablePercent,
            amount: totalAmount + appBonusAmount,
            breakdown,
            bonus: appBonusAmount
        }
    }, [simState, slabs, globalAppBonus])

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* STRATEGIC OVERRIDES */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-blue-50 p-10 rounded-[56px] border border-blue-100 shadow-xl relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-blue-100/50 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-blue-600 text-white rounded-[32px] shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            <Sparkles size={32} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-blue-900 uppercase tracking-tighter italic leading-none">Growth Injection</h3>
                            <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.3em] font-mono">Short-Term Strategic Override</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-8 items-center bg-white p-8 rounded-[40px] border border-blue-50 shadow-sm hover:shadow-xl transition-all duration-500">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Percent size={14} className="text-blue-500" />
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Global App Bonus</label>
                            </div>
                            <div className="flex items-center gap-3">
                                <input
                                    type="number"
                                    value={globalAppBonus}
                                    onChange={(e) => setGlobalAppBonus(parseFloat(e.target.value) || 0)}
                                    className="w-20 bg-blue-50 border-none rounded-xl p-3 font-black text-blue-600 text-2xl text-center outline-none focus:ring-4 focus:ring-blue-100 transition-all font-mono"
                                />
                                <span className="text-xl font-black text-slate-300 font-mono">%</span>
                            </div>
                        </div>

                        {/* GOVERNANCE FILTER */}
                        <div className="h-10 w-[1px] bg-slate-100 hidden lg:block" />

                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Target size={14} className="text-indigo-500" />
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Eligibility Governance</label>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {[
                                    { id: 'PARENT', label: 'Parents' },
                                    { id: 'STAFF_CHILD', label: 'Staff (Child)' },
                                    { id: 'STAFF_PAYOUT', label: 'Staff (Payout)' },
                                    { id: 'ALUMNI_OTHERS', label: 'Alumni/Others' }
                                ].map((role) => {
                                    const isActive = globalAppBonusEligibility.split(',').includes(role.id)
                                    return (
                                        <button
                                            key={role.id}
                                            onClick={() => {
                                                const current = globalAppBonusEligibility.split(',').filter(Boolean)
                                                const next = isActive
                                                    ? current.filter(c => c !== role.id)
                                                    : [...current, role.id]
                                                setGlobalAppBonusEligibility(next.join(','))
                                            }}
                                            className={`px-4 py-2 rounded-xl text-[9px] font-black uppercase transition-all duration-300 border ${isActive ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100' : 'bg-slate-50 text-slate-400 border-slate-100 hover:bg-slate-100'}`}
                                        >
                                            {role.label}
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <button
                            onClick={onSaveGlobal}
                            disabled={isSaving}
                            className="p-5 bg-blue-600 text-white rounded-[24px] hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-blue-200 disabled:opacity-50"
                        >
                            <Save size={24} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-8 space-y-10">
                    {/* MATRIX */}
                    <div className="bg-white rounded-[56px] border border-gray-100 shadow-2xl overflow-hidden relative border-t-4 border-t-blue-600">
                        <div className="p-10 border-b border-gray-100 bg-gray-50/30">
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic flex items-center gap-3">
                                <Layers className="text-blue-600" size={24} />
                                Growth Yield Matrix
                            </h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mt-1 italic">Standard Partner Slab Configuration</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            <div className="p-6 bg-gray-50/50 border-r border-gray-100 flex items-center justify-center">
                                <PolicyVisualizer slabs={slabs} activeTab="Standard" />
                            </div>
                            <div className="p-8">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-4 px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">
                                        <div className="col-span-1">Slot</div>
                                        <div className="col-span-1 text-center">Waiver %</div>
                                        <div className="col-span-1 text-center">Delta</div>
                                        <div className="col-span-1 text-right">Commit</div>
                                    </div>
                                    <div className="space-y-3">
                                        {slabs.map((slab, i) => {
                                            const val = slab.yearFeeBenefitPercent
                                            const prevVal = i === 0 ? 0 : slabs[i - 1].yearFeeBenefitPercent
                                            const delta = val - prevVal

                                            return (
                                                <div key={slab.slabId} className="group p-4 bg-white border border-gray-100 rounded-[28px] shadow-sm hover:shadow-xl hover:border-blue-100 transition-all duration-300 grid grid-cols-4 items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-black text-lg italic italic">
                                                        {slab.referralCount}{slab.referralCount === 5 ? '+' : ''}
                                                    </div>
                                                    <div className="flex justify-center">
                                                        <input
                                                            type="number"
                                                            value={val}
                                                            onChange={(e) => onUpdateSlab(slab.slabId, 'yearFeeBenefitPercent', parseFloat(e.target.value))}
                                                            className="w-16 p-2 bg-blue-50 border-none rounded-xl text-center font-black text-blue-600 text-lg outline-none font-mono"
                                                        />
                                                    </div>
                                                    <div className="flex justify-center">
                                                        <Badge variant="default" className="bg-blue-50 text-blue-600 font-mono text-[9px] px-2 py-0.5 font-black">
                                                            +{delta}%
                                                        </Badge>
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={() => onSaveSlab(slab)}
                                                            className="p-2 text-gray-300 hover:text-blue-600 transition-colors"
                                                        >
                                                            <Save size={16} />
                                                        </button>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* DYNAMIC CARDS (Standard Versions) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-[48px] border border-gray-100 shadow-xl border-b-8 border-b-blue-500 group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-blue-600 text-white rounded-[24px]">
                                    <User size={24} />
                                </div>
                                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Standard Waiver</h4>
                            </div>
                            <ul className="space-y-3 px-2">
                                <li className="flex items-center gap-3 text-[11px] font-black text-gray-500 uppercase tracking-tight">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    <span>Direct Fee Offset for Child</span>
                                </li>
                                <li className="flex items-center gap-3 text-[11px] font-black text-gray-500 uppercase tracking-tight">
                                    <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                                    <span>+{globalAppBonus}% App Bonus Applied</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white p-8 rounded-[48px] border border-gray-100 shadow-xl border-b-8 border-b-cyan-500 group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-cyan-600 text-white rounded-[24px]">
                                    <DollarSign size={24} />
                                </div>
                                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Standard Payout</h4>
                            </div>
                            <ul className="space-y-3 px-2">
                                <li className="flex items-center gap-3 text-[11px] font-black text-gray-500 uppercase tracking-tight">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                    <span>Marginal Cash Incentives</span>
                                </li>
                                <li className="flex items-center gap-3 text-[11px] font-black text-gray-500 uppercase tracking-tight">
                                    <div className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                    <span>Calculated on Grade 1 Base</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* ORACLE (Standard) */}
                <div className="xl:col-span-4">
                    <div className="bg-slate-900 rounded-[56px] p-8 text-white shadow-2xl border border-slate-800">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-blue-600 text-white rounded-2xl">
                                <Calculator size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter italic">Growth Oracle</h3>
                                <p className="text-[8px] font-black text-blue-400/60 uppercase tracking-[0.3em] font-mono">Standard Branch</p>
                            </div>
                        </div>

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-1 p-1 bg-white/5 rounded-2xl border border-white/10">
                                {['Parent', 'Staff', 'Alumni', 'Others'].map((role) => (
                                    <button
                                        key={role}
                                        onClick={() => setSimState({ ...simState, role })}
                                        className={`py-3 rounded-xl text-[9px] font-black uppercase transition-all ${simState.role === role ? 'bg-white text-slate-900' : 'text-white/40 hover:bg-white/5'}`}
                                    >
                                        {role}
                                    </button>
                                ))}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-white/30 uppercase tracking-widest font-mono">Referrals</label>
                                    <input
                                        type="number"
                                        value={simState.count}
                                        onChange={(e) => setSimState({ ...simState, count: parseInt(e.target.value) || 0 })}
                                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xl font-black text-center font-mono outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-white/30 uppercase tracking-widest font-mono">Fee Base</label>
                                    <input
                                        type="number"
                                        value={simState.fee}
                                        onChange={(e) => setSimState({ ...simState, fee: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-black text-center font-mono outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10 space-y-4">
                                <p className="text-[8px] font-black text-blue-400 uppercase tracking-widest font-mono">Calculation Trace</p>
                                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                    {simResult.breakdown.map((log, i) => (
                                        <div key={i} className="flex items-center gap-3 text-[9px] font-black text-white/40 font-mono italic">
                                            <div className="w-1 h-1 rounded-full bg-blue-500/50" />
                                            {log}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 p-6 rounded-[32px] bg-gradient-to-br from-blue-600 to-indigo-700 text-center">
                                    <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2">Total Yield</p>
                                    <h4 className="text-4xl font-black text-white font-mono italic tracking-tighter">
                                        ₹{Math.round(simResult.amount).toLocaleString()}
                                    </h4>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
