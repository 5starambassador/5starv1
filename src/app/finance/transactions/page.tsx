'use client'

import React, { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { getAllTransactions, updateTransactionStatus } from '../actions'

// ... (existing imports)

import { Search, Filter, CheckCircle, XCircle, Clock, MoreHorizontal } from 'lucide-react'

export default function TransactionsPage() {
    const [transactions, setTransactions] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [filter, setFilter] = useState('All')
    const [search, setSearch] = useState('')

    useEffect(() => {
        loadTransactions()
    }, [])

    const loadTransactions = async () => {
        setLoading(true)
        const data = await getAllTransactions()
        setTransactions(data)
        setLoading(false)
    }

    const handleStatusUpdate = async (userId: number, status: string) => {
        // Optimistic update
        setTransactions(prev => prev.map(t =>
            t.userId === userId ? { ...t, status: status } : t
        ))

        const result = await updateTransactionStatus(userId, status)
        if (!result.success) {
            // Revert on failure
            loadTransactions()
            toast.error('Failed to update status')
        }
    }

    const filteredTransactions = transactions.filter(t => {
        const matchesFilter = filter === 'All' || t.status === filter
        const matchesSearch = t.user.toLowerCase().includes(search.toLowerCase()) ||
            t.id.toLowerCase().includes(search.toLowerCase())
        return matchesFilter && matchesSearch
    })

    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800">Transaction Hub</h1>
                    <p className="text-gray-500 text-sm">Verify and approve manual payment requests.</p>
                </div>
                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
                        <input
                            type="text"
                            placeholder="Search user or ID..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full bg-gray-50 border border-gray-200 rounded-xl pl-10 pr-4 py-2 text-gray-800 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-100 transition-all text-sm"
                        />
                    </div>
                    <button className="flex items-center gap-2 bg-gray-50 border border-gray-200 px-4 py-2 rounded-xl text-gray-600 hover:bg-gray-100 transition-all text-sm font-medium">
                        <Filter size={16} />
                        Filter
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 border-b border-gray-200 overflow-x-auto pb-1">
                {['All', 'Pending', 'Completed', 'Failed'].map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors whitespace-nowrap ${filter === f
                            ? 'text-red-600 border-b-2 border-red-600 bg-red-50'
                            : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="p-4 font-bold border-b border-gray-100">Transaction ID</th>
                                <th className="p-4 font-bold border-b border-gray-100">User</th>
                                <th className="p-4 font-bold border-b border-gray-100">Role</th>
                                <th className="p-4 font-bold border-b border-gray-100">Amount</th>
                                <th className="p-4 font-bold border-b border-gray-100">Date</th>
                                <th className="p-4 font-bold border-b border-gray-100">Status</th>
                                <th className="p-4 font-bold border-b border-gray-100 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-gray-600">
                            {loading ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">Loading transactions...</td>
                                </tr>
                            ) : filteredTransactions.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="p-8 text-center text-gray-500">No transactions found.</td>
                                </tr>
                            ) : (
                                filteredTransactions.map((txn) => (
                                    <tr key={txn.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                        <td className="p-4 font-mono text-emerald-600 font-bold">{txn.id}</td>
                                        <td className="p-4">
                                            <div className="font-bold text-gray-800">{txn.user}</div>
                                        </td>
                                        <td className="p-4">
                                            <span className="bg-gray-100 px-2 py-1 rounded border border-gray-200 text-xs font-medium text-gray-600">{txn.role}</span>
                                        </td>
                                        <td className="p-4 font-bold text-gray-800">{txn.amount}</td>
                                        <td className="p-4 text-gray-500 text-xs">{txn.date}</td>
                                        <td className="p-4">
                                            <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide flex w-fit items-center gap-1 border ${txn.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                                txn.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                    'bg-rose-50 text-rose-600 border-rose-100'
                                                }`}>
                                                {txn.status === 'Completed' && <CheckCircle size={10} />}
                                                {txn.status === 'Pending' && <Clock size={10} />}
                                                {txn.status === 'Failed' && <XCircle size={10} />}
                                                {txn.status}
                                            </span>
                                        </td>
                                        <td className="p-4 text-right">
                                            {txn.status === 'Pending' ? (
                                                <div className="flex justify-end gap-2">
                                                    <button
                                                        onClick={() => handleStatusUpdate(txn.userId, 'Completed')}
                                                        className="px-3 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded-lg text-xs font-bold transition-all border border-emerald-200"
                                                    >
                                                        Approve
                                                    </button>
                                                    <button
                                                        onClick={() => handleStatusUpdate(txn.userId, 'Failed')}
                                                        className="px-3 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded-lg text-xs font-bold transition-all border border-rose-200"
                                                    >
                                                        Reject
                                                    </button>
                                                </div>
                                            ) : (
                                                <button className="text-gray-400 cursor-not-allowed">
                                                    <MoreHorizontal size={16} />
                                                </button>
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
