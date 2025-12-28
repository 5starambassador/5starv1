'use client'

import React, { useEffect, useState } from 'react'
import { getFeeStructure } from '../actions'
import { Filter, Building2, GraduationCap, Edit, Plus } from 'lucide-react'

export default function FeeStructurePage() {
    const [fees, setFees] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadFees()
    }, [])

    const loadFees = async () => {
        const data = await getFeeStructure()
        setFees(data)
        setLoading(false)
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Fee Structure</h1>
                    <p className="text-gray-500 text-sm">Manage annual tuition fees per campus and grade.</p>
                </div>
                <div className="flex gap-3">
                    <button className="flex items-center gap-2 px-4 py-2 rounded-xl transition-all text-sm font-medium shadow-lg shadow-red-200"
                        style={{ border: 'none', backgroundColor: '#DC2626', color: '#FFFFFF', cursor: 'pointer' }}>
                        <Plus size={16} />
                        Add New Fee
                    </button>
                </div>
            </div>

            {/* Fees Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Current Fee Structure</h3>
                    <button className="flex items-center gap-2 text-xs font-bold text-gray-500 hover:text-gray-800 bg-gray-50 px-3 py-2 rounded-lg transition-all"
                        style={{ border: 'none', cursor: 'pointer' }}>
                        <Filter size={14} />
                        Filter
                    </button>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="p-4 font-bold border-b border-gray-100">Campus</th>
                                <th className="p-4 font-bold border-b border-gray-100">Grade</th>
                                <th className="p-4 font-bold border-b border-gray-100">Annual Fee</th>
                                <th className="p-4 font-bold border-b border-gray-100 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-gray-600">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-500">Loading fee data...</td>
                                </tr>
                            ) : fees.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="p-8 text-center text-gray-400 font-medium">
                                        No fee structures defined yet.
                                    </td>
                                </tr>
                            ) : (
                                fees.map((fee, i) => (
                                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="flex items-center gap-2 font-bold text-gray-800">
                                                <Building2 size={16} className="text-gray-400" />
                                                {fee.campus?.campusName || 'Unknown Campus'}
                                            </div>
                                            <div className="text-xs text-gray-400 pl-6">{fee.campus?.location}</div>
                                        </td>
                                        <td className="p-4">
                                            <div className="flex items-center gap-2">
                                                <GraduationCap size={16} className="text-gray-400" />
                                                <span className="font-medium bg-gray-100 px-2 py-1 rounded text-gray-600">{fee.grade}</span>
                                            </div>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-red-600 text-base">
                                            ₹ {fee.annualFee.toLocaleString()}
                                        </td>
                                        <td className="p-4 text-right">
                                            <button className="text-xs font-bold text-blue-600 hover:text-blue-800 flex items-center justify-end gap-1 w-full"
                                                style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                                <Edit size={14} />
                                                Edit
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
