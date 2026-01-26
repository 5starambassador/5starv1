'use client'

import React, { useMemo } from 'react'
import { BenefitSlabData } from '@/app/benefit-actions'
import {
    ShieldCheck, History, AlertCircle, Coins,
    ChevronRight, Save, History as HistoryIcon,
    Cpu, Activity, Calculator, Target, Info
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Badge } from '@/components/ui/Badge'
import { PolicyVisualizer } from './PolicyVisualizer'

interface Props {
    slabs: BenefitSlabData[]
    globalHistoricBase: number
    setGlobalHistoricBase: (val: number) => void
    onSaveGlobal: () => void
    onUpdateSlab: (id: number, field: string, value: any) => void
    onSaveSlab: (slab: BenefitSlabData) => void
    isSaving: boolean
    simState: {
        count: number
        fee: number
        role: 'Parent' | 'Staff' | 'Alumni' | 'Others'
        hasChild: boolean
        prevFee: number
    }
    setSimState: (state: any) => void
}

export function LegacyVaultView({
    slabs,
    globalHistoricBase,
    setGlobalHistoricBase,
    onSaveGlobal,
    onUpdateSlab,
    onSaveSlab,
    isSaving,
    simState,
    setSimState
}: Props) {

    const simResult = useMemo(() => {
        // Enforce "1 Referral Activation" requirement
        if (simState.count <= 0 || !slabs.length) return { percent: 0, amount: 0, breakdown: [], longTermBase: 0 }

        const sorted = [...slabs].sort((a, b) => a.referralCount - b.referralCount)
        const getPercent = (count: number) => {
            // Long Term Linear Slab: 5% per referral (1=5, 2=10, 3=15, 4=20, 5=25)
            // We use the count directly * 5
            return Math.min(count, 5) * 5
        }

        let totalAmount = 0
        const breakdown: string[] = []

        // 1. Fixed Historic Base (Sum of 3%s from previous year)
        const longTermBaseAmount = globalHistoricBase
        breakdown.push(`🏛️ HISTORIC BASE: ₹${longTermBaseAmount.toLocaleString()} (Sum of 3% of Top 5 Prev. Year Fees)`)

        const isGroupAWaiver = simState.role === 'Parent' || (simState.role === 'Staff' && simState.hasChild)

        if (isGroupAWaiver) {
            // Category A: Fee Discount
            const slabPercent = getPercent(simState.count)
            totalAmount = (simState.fee * slabPercent) / 100
            breakdown.push(`⚡ WAIVER GROUP A: Discounting Tuition Fee`)
            breakdown.push(`📈 TIER YIELD [Ref: ${Math.min(simState.count, 5)}]: ${slabPercent}% of Child Fee ₹${simState.fee.toLocaleString()}`)
            breakdown.push(`💰 BASE WAIVER: ₹${totalAmount.toLocaleString()}`)
            breakdown.push(`📱 APP BONUS: 0% (Protocol: Long Term Excluded)`)
        } else {
            // Category B: Cash Payout
            breakdown.push(`💧 PAYOUT GROUP B: Current Year Liquidity Yield`)

            // For Payout, each referral contributes 5% of its Grade-1 fee.
            // In the simulator, we assume simState.fee is the representative Grade-1 Fee.
            for (let i = 1; i <= Math.min(simState.count, 5); i++) {
                const slicePercent = 5 // Exactly 5% per referral for Long Term
                const sliceAmount = (simState.fee * slicePercent) / 100
                totalAmount += sliceAmount
                breakdown.push(`🔥 REF-${i} YIELD: 5% of ₹${simState.fee.toLocaleString()} (₹${sliceAmount.toLocaleString()})`)
            }
            breakdown.push(`📱 APP BONUS: 0% (Protocol: Long Term Excluded)`)
        }

        return {
            percent: isGroupAWaiver ? getPercent(simState.count) : (simState.count * 5),
            amount: totalAmount + longTermBaseAmount,
            breakdown,
            longTermBase: longTermBaseAmount
        }
    }, [simState, slabs, globalHistoricBase])

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* COMPLIANCE CARD */}
            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-red-50 p-10 rounded-[56px] border border-red-100 shadow-xl relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-red-100/50 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-red-600 text-white rounded-[32px] shadow-lg group-hover:scale-110 group-hover:-rotate-3 transition-all duration-500">
                            <AlertCircle size={32} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-red-900 uppercase tracking-tighter italic leading-none">Activity Protocol</h3>
                            <p className="text-[9px] font-black text-red-400 uppercase tracking-[0.3em] font-mono">Mandatory Compliance Rule</p>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[40px] border border-red-100 shadow-sm flex flex-col items-center text-center max-w-sm">
                        <p className="text-[14px] font-bold text-slate-800 leading-snug">
                            "Long term benefits activate <span className="text-red-600 font-black">from next year onward</span> for 5-Star Partners who have completed 5 referrals. Secure at least one new referral every Academic Year to retain eligibility."
                        </p>
                    </div>
                </div>
            </motion.div>

            {/* STRATEGIC OVERRIDES */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 p-10 rounded-[56px] border border-emerald-100 shadow-xl relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-slate-900 text-white rounded-[32px] shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            <ShieldCheck size={32} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">Vault Parameters</h3>
                            <p className="text-[9px] font-black text-emerald-600 uppercase tracking-[0.3em] font-mono">Long-Term Fixed Yields</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-8 items-center bg-white p-8 rounded-[40px] border border-emerald-50 shadow-sm hover:shadow-xl transition-all duration-500">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Coins size={14} className="text-emerald-500" />
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Historic Base (SUM of 3%)</label>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-black text-slate-300 font-mono">₹</span>
                                <input
                                    type="number"
                                    value={globalHistoricBase}
                                    onChange={(e) => setGlobalHistoricBase(parseFloat(e.target.value) || 0)}
                                    className="w-32 bg-emerald-50 border-none rounded-xl p-3 font-black text-emerald-600 text-2xl text-center outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-mono"
                                    placeholder="6,940"
                                />
                            </div>
                        </div>

                        <button
                            onClick={onSaveGlobal}
                            disabled={isSaving}
                            className="p-5 bg-slate-900 text-white rounded-[24px] hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-slate-200 disabled:opacity-50"
                        >
                            <Save size={24} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>
            </motion.div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
                <div className="xl:col-span-8 space-y-10">
                    {/* MATRIX */}
                    <div className="bg-white rounded-[56px] border border-gray-100 shadow-2xl overflow-hidden relative border-t-4 border-t-emerald-600">
                        <div className="p-10 border-b border-gray-100 bg-gray-50/30">
                            <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter italic flex items-center gap-3">
                                <Coins className="text-emerald-600" size={24} />
                                Legacy Yield Matrix
                            </h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mt-1 italic">5-Star Elite Partner Slab Configuration</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            <div className="p-6 bg-gray-50/50 border-r border-gray-100 flex items-center justify-center">
                                <PolicyVisualizer slabs={slabs} activeTab="Long Term" />
                            </div>
                            <div className="p-8">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-4 px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">
                                        <div className="col-span-1">Slot</div>
                                        <div className="col-span-1 text-center">Elite %</div>
                                        <div className="col-span-1 text-center">Incr.</div>
                                        <div className="col-span-1 text-right">Commit</div>
                                    </div>
                                    <div className="space-y-3">
                                        {slabs.map((slab, i) => {
                                            const val = slab.baseLongTermPercent
                                            const prevVal = i === 0 ? 0 : slabs[i - 1].baseLongTermPercent
                                            const delta = val - prevVal

                                            return (
                                                <div key={slab.slabId} className="group p-4 bg-white border border-gray-100 rounded-[28px] shadow-sm hover:shadow-xl hover:border-emerald-100 transition-all duration-300 grid grid-cols-4 items-center gap-4">
                                                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black text-lg italic">
                                                        {slab.referralCount}{slab.referralCount === 5 ? '+' : ''}
                                                    </div>
                                                    <div className="flex justify-center">
                                                        <input
                                                            type="number"
                                                            value={val}
                                                            onChange={(e) => onUpdateSlab(slab.slabId, 'baseLongTermPercent', parseFloat(e.target.value))}
                                                            className="w-16 p-2 bg-emerald-50 border-none rounded-xl text-center font-black text-emerald-600 text-lg outline-none font-mono"
                                                        />
                                                    </div>
                                                    <div className="flex justify-center">
                                                        <Badge variant="default" className="bg-emerald-50 text-emerald-600 font-mono text-[9px] px-2 py-0.5 font-black">
                                                            +{delta}%
                                                        </Badge>
                                                    </div>
                                                    <div className="flex justify-end">
                                                        <button
                                                            onClick={() => onSaveSlab(slab)}
                                                            className="p-2 text-gray-300 hover:text-emerald-600 transition-colors"
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

                        <div className="p-6 bg-slate-900 border-t border-slate-800 flex items-center gap-4">
                            <Info size={16} className="text-emerald-400" />
                            <p className="text-[10px] font-bold text-white/50 uppercase tracking-tight">
                                Total Yield = (Current Yield % * Fee Base) + Historic Base Sum (₹{globalHistoricBase.toLocaleString()})
                            </p>
                        </div>
                    </div>
                </div>

                {/* ORACLE (Legacy) */}
                <div className="xl:col-span-4">
                    <div className="bg-slate-900 rounded-[56px] p-8 text-white shadow-2xl border border-slate-800">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-emerald-600 text-white rounded-2xl">
                                <Cpu size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter italic">Vault Oracle</h3>
                                <p className="text-[8px] font-black text-emerald-400/60 uppercase tracking-[0.3em] font-mono">5-Star Branch</p>
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
                                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xl font-black text-center font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-white/30 uppercase tracking-widest font-mono">Fee Base</label>
                                    <input
                                        type="number"
                                        value={simState.fee}
                                        onChange={(e) => setSimState({ ...simState, fee: parseFloat(e.target.value) || 0 })}
                                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xs font-black text-center font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/10 space-y-4">
                                <p className="text-[8px] font-black text-emerald-400 uppercase tracking-widest font-mono">Calculation Trace</p>
                                <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                                    {simResult.breakdown.map((log, i) => (
                                        <div key={i} className="flex items-center gap-3 text-[9px] font-black text-white/40 font-mono italic">
                                            <div className="w-1 h-1 rounded-full bg-emerald-500/50" />
                                            {log}
                                        </div>
                                    ))}
                                </div>

                                <div className="mt-6 p-6 rounded-[32px] bg-gradient-to-br from-slate-800 to-slate-950 border border-white/5 text-center">
                                    <p className="text-[9px] font-black text-emerald-400/50 uppercase tracking-widest mb-2">Validated Yield</p>
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
