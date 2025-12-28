'use client'

import React, { useEffect, useState } from 'react'
import { getBenefitPayouts, processSettlement } from '../actions'
import { Filter, Wallet, CheckCircle, XCircle, Clock, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'

export default function PayoutsPage() {
    const [payouts, setPayouts] = useState<any[]>([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        loadPayouts()
    }, [])

    const loadPayouts = async () => {
        const data = await getBenefitPayouts()
        setPayouts(data)
        setLoading(false)
    }

    const handleApprove = async (id: number) => {
        if (!confirm('Are you sure you want to approve this payout?')) return;

        // Optimistic update
        setPayouts(prev => prev.map(p => p.id === id ? { ...p, status: 'Processed' } : p))

        const res = await processSettlement(id, 'Processed')
        if (!res.success) {
            toast.error('Failed to process payout')
            loadPayouts() // Revert on failure
        }
    }

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Benefit Payouts</h1>
                    <p className="text-gray-500 text-sm">Review and process ambassador commission payouts.</p>
                </div>
                <div className="flex gap-3">
                    <div className="bg-green-50 px-4 py-2 rounded-xl border border-green-100 flex items-center gap-2 text-green-700 font-bold">
                        <Wallet size={18} />
                        <span>Wallet Balance: ₹ 12,45,000</span>
                    </div>
                </div>
            </div>

            {/* Payouts Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Payout Requests</h3>
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
                                <th className="p-4 font-bold border-b border-gray-100">User</th>
                                <th className="p-4 font-bold border-b border-gray-100">Date</th>
                                <th className="p-4 font-bold border-b border-gray-100">Method</th>
                                <th className="p-4 font-bold border-b border-gray-100">Amount</th>
                                <th className="p-4 font-bold border-b border-gray-100">Status</th>
                                <th className="p-4 font-bold border-b border-gray-100 text-right">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-gray-600">
                            {loading ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-500">Loading payouts...</td>
                                </tr>
                            ) : payouts.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="p-8 text-center text-gray-400 font-medium">
                                        No pending payouts found.
                                    </td>
                                </tr>
                            ) : (
                                payouts.map((payout, i) => (
                                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800">{payout.user}</div>
                                            <div className="text-xs text-gray-400">ID: {payout.userId}</div>
                                        </td>
                                        <td className="p-4 text-gray-500">{payout.date}</td>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded border border-gray-200 bg-gray-50 text-xs text-gray-600">
                                                {payout.method}
                                            </span>
                                        </td>
                                        <td className="p-4 font-mono font-bold text-gray-800 text-base">
                                            {payout.amount}
                                        </td>
                                        <td className="p-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide flex items-center w-fit gap-1 border ${payout.status === 'Processed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                payout.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-rose-50 text-rose-600 border-rose-100'
                                                }`}>
                                                {payout.status === 'Processed' && <CheckCircle size={10} />}
                                                {payout.status === 'Pending' && <Clock size={10} />}
                                                {payout.status === 'Rejected' && <XCircle size={10} />}
                                                {payout.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {payout.status === 'Pending' ? (
                                                <button
                                                    onClick={() => handleApprove(payout.id)}
                                                    className="bg-gray-900 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-gray-800 transition-all shadow-sm flex items-center gap-1 ml-auto"
                                                    style={{ border: 'none', backgroundColor: '#111827', color: '#ffffff', cursor: 'pointer' }}
                                                >
                                                    Process
                                                    <ArrowRight size={12} />
                                                </button>
                                            ) : (
                                                <span className="text-gray-400 text-xs font-medium">Attributes Locked</span>
                                            )}
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
