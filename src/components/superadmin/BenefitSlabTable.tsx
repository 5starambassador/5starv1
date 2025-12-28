import { Trash, Plus, Disc, Save, Edit } from 'lucide-react'

interface BenefitSlab {
    id: number
    minReferrals: number
    maxReferrals: number
    benefitPercentage: number
}

interface BenefitSlabTableProps {
    slabs: BenefitSlab[]
    onAddSlab: () => void
    onEditSlab: (slab: any) => void
    onDeleteSlab: (id: number) => void
}

export function BenefitSlabTable({ slabs, onAddSlab, onEditSlab, onDeleteSlab }: BenefitSlabTableProps) {
    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-xl shadow-gray-200/50 overflow-hidden premium-border animate-fade-in">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center background: 'linear-gradient(to right, #ffffff, #f9fafb)'">
                <div>
                    <h3 className="text-xl font-black text-gray-900 tracking-tight">Benefit Slabs</h3>
                    <p className="text-sm font-medium text-gray-400 mt-1">Configure how referral counts map to fee discount percentages.</p>
                </div>
                <button
                    onClick={onAddSlab}
                    className="px-4 py-2 bg-gradient-to-r from-[#CC0000] to-[#EF4444] text-white rounded-xl font-bold text-sm shadow-lg hover:shadow-xl hover:scale-105 transition-all flex items-center gap-2"
                >
                    <Plus size={18} /> Add Tier
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full">
                    <thead>
                        <tr className="bg-gray-50/50 text-left">
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Slab ID</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Min Referrals</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Max Referrals</th>
                            <th className="px-8 py-5 text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Benefit %</th>
                            <th className="px-8 py-5 text-right text-[10px] font-black text-gray-400 uppercase tracking-[0.1em]">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                        {slabs.map((slab) => (
                            <tr key={slab.id} className="hover:bg-gray-50/50 transition-colors">
                                <td className="px-8 py-5">
                                    <span className="text-sm font-extrabold text-[#CC0000]/30 tracking-tighter">#SLB-{slab.id}</span>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.5)]"></div>
                                        <span className="text-sm font-black text-gray-700">{slab.minReferrals}</span>
                                    </div>
                                </td>
                                <td className="px-8 py-5">
                                    <span className="text-sm font-black text-gray-700">{slab.maxReferrals}</span>
                                </td>
                                <td className="px-8 py-5">
                                    <div className="inline-flex items-center px-4 py-1.5 rounded-xl text-[11px] font-black bg-emerald-50 text-emerald-700 border border-emerald-100 shadow-sm uppercase tracking-wider">
                                        {slab.benefitPercentage}% Discount
                                    </div>
                                </td>
                                <td className="px-8 py-5 text-right">
                                    <div className="flex justify-end gap-2">
                                        <button
                                            onClick={() => onEditSlab(slab)}
                                            className="p-3 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all"
                                        >
                                            <Edit size={18} />
                                        </button>
                                        <button
                                            onClick={() => onDeleteSlab(slab.id)}
                                            className="p-3 text-red-400 hover:text-white hover:bg-[#CC0000] rounded-xl transition-all shadow-sm hover:shadow-red-200"
                                        >
                                            <Trash size={18} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
