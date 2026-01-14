'use client'

import React, { useState } from 'react'
import { BenefitSlabData, updateBenefitSlab, resetDefaultSlabs } from '@/app/benefit-actions'
import { toast } from 'sonner'
import { CheckCircle2, RefreshCw, Calculator, DollarSign, Save } from 'lucide-react'

interface Props {
    initialSlabs: BenefitSlabData[]
}

export function BenefitManagement({ initialSlabs }: Props) {
    const [slabs, setSlabs] = useState<BenefitSlabData[]>(initialSlabs)
    const [isSaving, setIsSaving] = useState(false)
    const [simCount, setSimCount] = useState<number>(0)
    const [simFee, setSimFee] = useState<number>(60000)

    // Simulator Logic
    const simulatePrice = () => {
        // Find tier
        // Logic: Exact match or max? Current logic is exact match for 1, 2, 3, 4. 5+ is max.
        // I need to replicate the EXACT logic from benefit-calculator.ts but using *this* data.

        if (simCount <= 0) return { percent: 0, amount: 0 }

        // Find applicable slab
        // Sort slabs desc to find ">= 5" logic? 
        // Logic in benefit-calculator:
        // const tier = SHORT_TERM_TIERS.find(t => t.count === referralCount)
        // if (!tier && referralCount >= 5) return 50 (max)

        let percent = 0
        const sorted = [...slabs].sort((a, b) => a.referralCount - b.referralCount)

        const exactMatch = sorted.find(s => s.referralCount === simCount)
        if (exactMatch) {
            percent = exactMatch.yearFeeBenefitPercent
        } else {
            // Check if above max
            const maxSlab = sorted[sorted.length - 1]
            if (maxSlab && simCount > maxSlab.referralCount) {
                percent = maxSlab.yearFeeBenefitPercent
            }
        }

        const amount = (simFee * percent) / 100
        return { percent, amount }
    }

    const { percent: simPercent, amount: simAmount } = simulatePrice()

    // Handlers
    const handleUpdate = async (id: number, field: string, value: any) => {
        // Optimistic UI update
        const newSlabs = slabs.map(s => s.slabId === id ? { ...s, [field]: value } : s)
        setSlabs(newSlabs)
    }

    const handleSaveRow = async (slab: BenefitSlabData) => {
        setIsSaving(true)
        const res = await updateBenefitSlab(slab.slabId, {
            referralCount: slab.referralCount,
            yearFeeBenefitPercent: slab.yearFeeBenefitPercent,
            tierName: slab.tierName
        })
        setIsSaving(false)
        if (res.success) {
            toast.success('Tier Updated')
        } else {
            toast.error('Failed to update')
        }
    }

    const handleReset = async () => {
        if (!confirm('Reset all tiers to system defaults (5, 10, 25, 30, 50%)?')) return
        setIsSaving(true)
        const res = await resetDefaultSlabs()
        if (res.success) {
            window.location.reload() // Reload to get fresh data
        } else {
            toast.error('Failed to reset')
        }
    }

    return (
        <div className="space-y-8" suppressHydrationWarning>
            {/* Header / Reset */}
            <div className="flex justify-end">
                <button onClick={handleReset} className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors">
                    <RefreshCw size={16} /> Reset Defaults
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Editor Panel */}
                <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-green-600" />
                        <h3 className="font-bold text-gray-900">Short Term Benefit Configuration</h3>
                    </div>
                    <div className="p-0">
                        <table className="w-full text-sm text-left">
                            <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                                <tr>
                                    <th className="px-6 py-3">Referral Count</th>
                                    <th className="px-6 py-3">Benefit %</th>
                                    <th className="px-6 py-3">Tier Name</th>
                                    <th className="px-6 py-3">Action</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {slabs.map((slab) => (
                                    <tr key={slab.slabId} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-3 font-medium text-gray-900">
                                            {slab.referralCount}
                                            {slab.referralCount === 5 && '+'}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="flex items-center gap-1">
                                                <input
                                                    type="number"
                                                    value={slab.yearFeeBenefitPercent}
                                                    onChange={(e) => handleUpdate(slab.slabId, 'yearFeeBenefitPercent', parseFloat(e.target.value))}
                                                    className="w-16 p-1 border rounded text-center font-bold text-blue-600 focus:ring-2 focus:ring-blue-500 outline-none"
                                                />
                                                <span className="text-gray-400">%</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-3">
                                            <input
                                                type="text"
                                                value={slab.tierName || ''}
                                                onChange={(e) => handleUpdate(slab.slabId, 'tierName', e.target.value)}
                                                className="w-full p-1 border-b border-transparent hover:border-gray-300 focus:border-blue-500 focus:ring-0 outline-none bg-transparent"
                                                placeholder="Tier Name"
                                            />
                                        </td>
                                        <td className="px-6 py-3 text-right">
                                            <button
                                                onClick={() => handleSaveRow(slab)}
                                                disabled={isSaving}
                                                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
                                                title="Save Changes"
                                            >
                                                <Save size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div className="p-4 bg-yellow-50 text-xs text-yellow-800 border-t border-yellow-100">
                        <strong>Note:</strong> Changes here apply immediately to all Ambassador Dashboards.
                    </div>
                </div>

                {/* Simulator Panel */}
                <div className="bg-gradient-to-br from-indigo-900 to-slate-900 rounded-xl p-6 text-white shadow-lg">
                    <div className="flex items-center gap-2 mb-6">
                        <Calculator size={20} className="text-indigo-300" />
                        <h3 className="font-bold text-lg">Payout Simulator</h3>
                    </div>

                    <div className="space-y-6">
                        <div>
                            <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">
                                Test Referral Count
                            </label>
                            <input
                                type="number"
                                value={simCount}
                                onChange={(e) => setSimCount(parseInt(e.target.value) || 0)}
                                className="w-full p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-indigo-400 outline-none transition-all text-xl font-bold font-mono"
                            />
                        </div>

                        <div>
                            <label className="block text-xs font-semibold text-indigo-200 uppercase tracking-wider mb-2">
                                Base Fee Amount (₹)
                            </label>
                            <div className="relative">
                                <DollarSign size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-indigo-300" />
                                <input
                                    type="number"
                                    value={simFee}
                                    onChange={(e) => setSimFee(parseFloat(e.target.value) || 0)}
                                    className="w-full pl-10 p-3 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:ring-2 focus:ring-indigo-400 outline-none transition-all"
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/10">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <p className="text-xs text-indigo-300 mb-1">Benefit %</p>
                                    <p className="text-2xl font-bold">{simPercent}%</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-xs text-indigo-300 mb-1">Payout Amount</p>
                                    <p className="text-2xl font-bold text-green-400">₹{simAmount.toLocaleString()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
