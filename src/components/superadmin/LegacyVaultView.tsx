'use client'

import React, { useMemo } from 'react'
import type { BenefitSlabData } from '@/types/benefit'
import {
    ShieldCheck, History, DollarSign, Calculator,
    TrendingUp, Coins, Save, Percent, Award
} from 'lucide-react'
import { motion } from 'framer-motion'
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
        if (simState.count <= 0 || !slabs.length) return { percent: 0, amount: 0, breakdown: [], longTermBase: 0 }

        const sorted = [...slabs].sort((a, b) => a.referralCount - b.referralCount)
        const getPercent = (count: number) => {
            const slab = sorted.find(s => s.referralCount === count) || sorted[sorted.length - 1]
            return slab?.baseLongTermPercent || 0
        }

        let totalAmount = 0
        const breakdown: string[] = []
        let applicablePercent = 0
        const longTermBaseAmount = globalHistoricBase

        const isGroupAWaiver = simState.role === 'Parent' || (simState.role === 'Staff' && simState.hasChild)

        if (isGroupAWaiver) {
            applicablePercent = getPercent(Math.min(simState.count, 5))
            totalAmount = (simState.fee * applicablePercent) / 100
            breakdown.push(`🏛️ LEGACY GROUP A: Long-Term Benefit (Child Fees)`)
            breakdown.push(`💎 HISTORIC BASE: ₹${longTermBaseAmount.toLocaleString()} (Applied Global Floor)`)
            breakdown.push(`📈 TIER YIELD [Ref: ${Math.min(simState.count, 5)}]: ${applicablePercent}% of ₹${simState.fee.toLocaleString()}`)
            breakdown.push(`💰 CURRENT YIELD: ₹${totalAmount.toLocaleString()}`)
        } else {
            breakdown.push(`🏛️ LEGACY GROUP B: Long-Term Payout (Cash Yield)`)
            breakdown.push(`💎 HISTORIC BASE: ₹${longTermBaseAmount.toLocaleString()} (Applied Global Floor)`)

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
        }

        return {
            percent: applicablePercent,
            amount: totalAmount + longTermBaseAmount,
            breakdown,
            longTermBase: longTermBaseAmount
        }
    }, [simState, slabs, globalHistoricBase])

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            {/* HISTORIC OVERRIDE */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 p-10 rounded-[56px] border border-emerald-100 shadow-xl relative overflow-hidden group"
            >
                <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-100/50 rounded-full blur-3xl -mr-32 -mt-32" />
                <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-8">
                    <div className="flex items-center gap-6">
                        <div className="p-5 bg-emerald-600 text-white rounded-[32px] shadow-lg group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                            <History size={32} strokeWidth={2.5} />
                        </div>
                        <div className="space-y-1">
                            <h3 className="text-2xl font-black text-emerald-900 uppercase tracking-tighter italic leading-none">Legacy Shield</h3>
                            <p className="text-[9px] font-black text-emerald-400 uppercase tracking-[0.3em] font-mono">Institutional Sustainability Layer</p>
                        </div>
                    </div>

                    <div className="flex flex-wrap gap-8 items-center bg-white p-8 rounded-[40px] border border-emerald-50 shadow-sm hover:shadow-xl transition-all duration-500">
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Coins size={14} className="text-emerald-500" />
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono">Historic Base Floor</label>
                            </div>
                            <div className="flex items-center gap-3">
                                <span className="text-xl font-black text-slate-300 font-mono">₹</span>
                                <input
                                    type="number"
                                    value={globalHistoricBase}
                                    onChange={(e) => setGlobalHistoricBase(parseFloat(e.target.value) || 0)}
                                    className="w-32 bg-emerald-50 border-none rounded-xl p-3 font-black text-emerald-600 text-2xl text-center outline-none focus:ring-4 focus:ring-emerald-100 transition-all font-mono"
                                />
                            </div>
                        </div>

                        <div className="h-10 w-[1px] bg-slate-100 hidden lg:block" />

                        <div className="max-w-[300px]">
                            <p className="text-[9px] font-bold text-slate-400 leading-relaxed uppercase tracking-wider">
                                This sum is automatically added to all 5-Star ambassadors as a floor benefit, derived from their historic status.
                            </p>
                        </div>

                        <button
                            onClick={onSaveGlobal}
                            disabled={isSaving}
                            className="p-5 bg-emerald-600 text-white rounded-[24px] hover:scale-110 active:scale-95 transition-all shadow-lg hover:shadow-emerald-200 disabled:opacity-50"
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
                                <Award className="text-emerald-600" size={24} />
                                Institutional Yield Matrix
                            </h3>
                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-[0.15em] mt-1 italic">Long Term Partner Slab Configuration</p>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2">
                            <div className="p-6 bg-gray-50/50 border-r border-gray-100 flex items-center justify-center">
                                <PolicyVisualizer slabs={slabs} activeTab="Long Term" />
                            </div>
                            <div className="p-8">
                                <div className="space-y-6">
                                    <div className="grid grid-cols-4 px-4 py-2 text-[10px] font-black text-gray-400 uppercase tracking-widest font-mono">
                                        <div className="col-span-1">Slot</div>
                                        <div className="col-span-1 text-center">Stability %</div>
                                        <div className="col-span-1 text-center">Delta</div>
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
                                                            +{delta.toFixed(1)}%
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
                    </div>

                    {/* DYNAMIC CARDS (Legacy Versions) */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-white p-8 rounded-[48px] border border-gray-100 shadow-xl border-b-8 border-b-emerald-500 group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-emerald-600 text-white rounded-[24px]">
                                    <ShieldCheck size={24} />
                                </div>
                                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Vault Waiver</h4>
                            </div>
                            <ul className="space-y-3 px-2">
                                <li className="flex items-center gap-3 text-[11px] font-black text-gray-500 uppercase tracking-tight">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span>Locked-in Historic Base Floor</span>
                                </li>
                                <li className="flex items-center gap-3 text-[11px] font-black text-gray-500 uppercase tracking-tight">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                                    <span>Lower Volatility Yield Model</span>
                                </li>
                            </ul>
                        </div>

                        <div className="bg-white p-8 rounded-[48px] border border-gray-100 shadow-xl border-b-8 border-b-teal-500 group">
                            <div className="flex items-center gap-4 mb-6">
                                <div className="p-4 bg-teal-600 text-white rounded-[24px]">
                                    <TrendingUp size={24} />
                                </div>
                                <h4 className="text-xl font-black text-gray-900 uppercase tracking-tighter italic">Vault Payout</h4>
                            </div>
                            <ul className="space-y-3 px-2">
                                <li className="flex items-center gap-3 text-[11px] font-black text-gray-500 uppercase tracking-tight">
                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                                    <span>Guaranteed Historic Minimums</span>
                                </li>
                                <li className="flex items-center gap-3 text-[11px] font-black text-gray-500 uppercase tracking-tight">
                                    <div className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                                    <span>Compound Institutional Bonus</span>
                                </li>
                            </ul>
                        </div>
                    </div>
                </div>

                {/* ORACLE (Vault) */}
                <div className="xl:col-span-4">
                    <div className="bg-slate-900 rounded-[56px] p-8 text-white shadow-2xl border border-slate-800">
                        <div className="flex items-center gap-4 mb-8">
                            <div className="p-4 bg-emerald-600 text-white rounded-2xl">
                                <Calculator size={24} />
                            </div>
                            <div>
                                <h3 className="text-xl font-black uppercase tracking-tighter italic">Vault Oracle</h3>
                                <p className="text-[8px] font-black text-emerald-400/60 uppercase tracking-[0.3em] font-mono">Legacy Branch</p>
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
                                    <label className="text-[8px] font-black text-white/30 uppercase tracking-widest font-mono">Active Referrals</label>
                                    <input
                                        type="number"
                                        value={simState.count}
                                        onChange={(e) => setSimState({ ...simState, count: parseInt(e.target.value) || 0 })}
                                        className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-white text-xl font-black text-center font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[8px] font-black text-white/30 uppercase tracking-widest font-mono">Historic Base</label>
                                    <div className="w-full p-3 rounded-xl bg-white/5 border border-white/10 text-emerald-400 text-xl font-black text-center font-mono">
                                        ₹{globalHistoricBase.toLocaleString()}
                                    </div>
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

                                <div className="mt-6 p-6 rounded-[32px] bg-gradient-to-br from-emerald-600 to-teal-700 text-center">
                                    <p className="text-[9px] font-black text-white/50 uppercase tracking-widest mb-2">Compounded Yield</p>
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
