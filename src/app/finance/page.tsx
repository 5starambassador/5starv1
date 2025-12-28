import { getFinanceStats, getRecentTransactions } from './actions'
import { ArrowUpRight, DollarSign, Users, CreditCard, Filter, FileText } from 'lucide-react'

export default async function FinanceDashboard() {
    const statsData = await getFinanceStats()
    const transactionsData = await getRecentTransactions()

    // Format currency with "₹"
    const formatCurrency = (amount: number) => {
        return new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            maximumFractionDigits: 0
        }).format(amount)
    }

    const stats = [
        {
            label: 'Total Collections',
            value: formatCurrency(statsData.totalCollections),
            change: '+12.5% vs last month',
            icon: DollarSign,
            bg: 'linear-gradient(135deg, #10B981 0%, #059669 100%)', // Green
            shadow: '0 10px 20px -5px rgba(16, 185, 129, 0.4)'
        },
        {
            label: 'Pending Dues',
            value: formatCurrency(statsData.pendingDues),
            change: '+5.2% vs last month',
            icon: Users,
            bg: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)', // Orange/Amber
            shadow: '0 10px 20px -5px rgba(245, 158, 11, 0.4)'
        },
        {
            label: 'Registration Fees',
            value: formatCurrency(statsData.regFeesOnly),
            change: '+8.1% vs last month',
            icon: CreditCard,
            bg: 'linear-gradient(135deg, #EF4444 0%, #DC2626 100%)', // Red
            shadow: '0 10px 20px -5px rgba(239, 68, 68, 0.4)'
        },
        {
            label: 'Ambassador Payouts',
            value: formatCurrency(statsData.ambassadorPayouts),
            change: 'Processing',
            icon: ArrowUpRight,
            bg: 'linear-gradient(135deg, #8B5CF6 0%, #7C3AED 100%)', // Purple
            shadow: '0 10px 20px -5px rgba(139, 92, 246, 0.4)'
        },
    ]

    const transactions = transactionsData

    return (
        <div className="page-container" style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '100%', overflow: 'hidden' }}>
            {/* Header */}
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap justify-between items-center gap-4">
                <div>
                    <h1 className="text-xl font-bold text-gray-800">Finance Overview</h1>
                    <p className="text-gray-500 text-sm mt-1">System-wide financial metrics</p>
                </div>
                <div className="flex gap-2">
                    <a href="/finance/reports" className="px-4 py-2 bg-primary-gold text-white rounded-lg text-sm font-bold hover:bg-yellow-500 transition-colors flex items-center gap-2" style={{ textDecoration: 'none' }}>
                        <FileText size={16} /> Reports
                    </a>
                    <button className="px-4 py-2 bg-gray-50 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors"
                        style={{ border: 'none', cursor: 'pointer' }}>
                        Refresh
                    </button>
                </div>
            </div>

            {/* KPI Grid - Mobile Stacked */}
            <div className="mobile-stack" style={{ display: 'grid', gap: '20px', maxWidth: '100%' }}>
                {stats.map((stat, idx) => (
                    <div key={idx} className="stat-card p-6 rounded-2xl text-white transition-transform hover:-translate-y-1 shadow-lg"
                        style={{
                            background: stat.bg,
                            boxShadow: stat.shadow,
                        }}>
                        <div className="flex flex-col h-full justify-between">
                            <div className="mb-4">
                                <div className="flex items-center gap-3 mb-3">
                                    <stat.icon size={24} className="text-white/90" />
                                    <span className="text-base font-semibold text-white/95">{stat.label}</span>
                                </div>
                                <h3 className="text-3xl font-bold text-white tracking-tight">{stat.value}</h3>
                            </div>
                            <div className="flex items-center">
                                <span className="text-sm font-medium bg-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm">
                                    {stat.change}
                                </span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Transactions - Desktop Table, Mobile Cards */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <div className="p-5 border-b border-gray-100 flex justify-between items-center">
                    <h3 className="text-lg font-bold text-gray-800">Recent Transactions</h3>
                    <button className="flex items-center gap-2 text-sm font-bold text-gray-500 hover:text-gray-800 bg-gray-50 px-4 py-2 rounded-lg transition-all"
                        style={{ border: 'none', cursor: 'pointer' }}>
                        <Filter size={16} />
                        Filter
                    </button>
                </div>

                {/* Desktop Table */}
                <div className="overflow-x-auto desktop-only">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wider">
                                <th className="p-4 font-bold border-b border-gray-100">Transaction ID</th>
                                <th className="p-4 font-bold border-b border-gray-100">User</th>
                                <th className="p-4 font-bold border-b border-gray-100">Type</th>
                                <th className="p-4 font-bold border-b border-gray-100">Amount</th>
                                <th className="p-4 font-bold border-b border-gray-100">Date</th>
                                <th className="p-4 font-bold border-b border-gray-100">Status</th>
                                <th className="p-4 font-bold border-b border-gray-100">Action</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm text-gray-600">
                            {transactions.map((txn, i) => (
                                <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                                    <td className="p-4 font-mono text-emerald-600 font-bold">{txn.id}</td>
                                    <td className="p-4 font-bold text-gray-800">{txn.user}</td>
                                    <td className="p-4 text-xs">
                                        <span className="px-2 py-1 rounded border border-gray-200 bg-gray-50 text-gray-600">{txn.type}</span>
                                    </td>
                                    <td className="p-4 font-bold text-gray-800">{txn.amount}</td>
                                    <td className="p-4 text-gray-500">{txn.date}</td>
                                    <td className="p-4">
                                        <span className={`text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wide border ${txn.status === 'Completed' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                                            txn.status === 'Pending' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                                                'bg-rose-50 text-rose-600 border-rose-100'
                                            }`}>
                                            {txn.status}
                                        </span>
                                    </td>
                                    <td className="p-4">
                                        <button className="text-xs font-bold text-blue-600 hover:text-blue-800"
                                            style={{ border: 'none', background: 'transparent', cursor: 'pointer' }}>
                                            Details
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Mobile Card List */}
                <div className="mobile-only p-4 mobile-card-list">
                    {transactions.map((txn, i) => (
                        <div key={i} className="mobile-card-item">
                            <div className="flex justify-between items-start mb-3">
                                <div>
                                    <p className="font-bold text-gray-800 text-base">{txn.user}</p>
                                    <p className="text-sm text-gray-500">{txn.date}</p>
                                </div>
                                <span className={`text-xs font-bold px-3 py-1.5 rounded-full uppercase ${txn.status === 'Completed' ? 'bg-emerald-50 text-emerald-600' :
                                    txn.status === 'Pending' ? 'bg-amber-50 text-amber-600' :
                                        'bg-rose-50 text-rose-600'
                                    }`}>
                                    {txn.status}
                                </span>
                            </div>
                            <div className="flex justify-between items-center">
                                <div>
                                    <p className="text-2xl font-bold text-gray-900">{txn.amount}</p>
                                    <p className="text-sm text-gray-500 mt-1">{txn.type}</p>
                                </div>
                                <button className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-bold"
                                    style={{ border: 'none', cursor: 'pointer' }}>
                                    View
                                </button>
                            </div>
                            <p className="text-xs text-gray-400 mt-3 font-mono">ID: {txn.id}</p>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
