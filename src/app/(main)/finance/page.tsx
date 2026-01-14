import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'

import { getSettlements, getFinanceStats, getRegistrationTransactions } from '@/app/finance-actions'
import { Wallet, CheckCircle, Clock, CreditCard } from 'lucide-react'
import { FinanceClientTabs } from '@/components/finance/FinanceClientTabs'
import { FinanceOverviewChart } from '@/components/finance/FinanceOverviewChart'

export default async function FinancePage() {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    // RBAC: Only Finance Admin, Super Admin, Campus Head
    const allowedRoles = ['Super Admin', 'Finance Admin', 'Campus Head']
    // Campus Admin might be allowed? Let's stick to stricter list for now.
    if (!allowedRoles.some(r => user.role.includes(r)) && user.role !== 'Finance Admin') {
        redirect('/dashboard') // or 403
    }

    // Fetch Data
    const [settlementsRes, statsRes, registrationsRes] = await Promise.all([
        getSettlements('All'),
        getFinanceStats(),
        getRegistrationTransactions('All')
    ])

    const settlements = (settlementsRes.success && settlementsRes.data) ? settlementsRes.data : []
    const registrations = (registrationsRes.success && registrationsRes.data) ? registrationsRes.data : []
    const stats: any = statsRes.success ? statsRes.stats : { pending: 0, processed: 0, totalCount: 0, totalRevenue: 0 }

    return (
        <div className="space-y-8 animate-fade-in pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-emerald-50 text-emerald-700 rounded-xl shadow-sm border border-emerald-100">
                        <Wallet size={24} strokeWidth={2.5} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-black text-gray-900 tracking-tight">Finance & Settlements</h1>
                        <p className="text-sm text-gray-500 font-bold tracking-wide">Manage ambassador commissions and payouts</p>
                    </div>
                </div>
            </div>

            {/* Stats Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Revenue Card */}
                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider">Total Revenue</h3>
                        <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600">
                            <CreditCard size={24} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-black text-gray-900">₹{(stats.totalRevenue || 0).toLocaleString()}</h2>
                    </div>
                    <p className="text-xs text-emerald-600 font-bold mt-2 uppercase tracking-wide">Incoming Fees</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider">Pending Payouts</h3>
                        <div className="p-2 rounded-lg bg-amber-50 text-amber-600">
                            <Clock size={24} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-black text-gray-900">₹{stats?.pending?.toLocaleString() ?? 0}</h2>
                    </div>
                    <p className="text-xs text-amber-600 font-bold mt-2 uppercase tracking-wide">Requires Action</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider">Processed (Total)</h3>
                        <div className="p-2 rounded-lg bg-blue-50 text-blue-600">
                            <CheckCircle size={24} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-black text-gray-900">₹{stats?.processed?.toLocaleString() ?? 0}</h2>
                    </div>
                    <p className="text-xs text-blue-600 font-bold mt-2 uppercase tracking-wide">Lifetime Disbursed</p>
                </div>

                <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="text-gray-500 font-bold text-sm uppercase tracking-wider">Transactions</h3>
                        <div className="p-2 rounded-lg bg-purple-50 text-purple-600">
                            <Wallet size={24} />
                        </div>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <h2 className="text-3xl font-black text-gray-900">{stats?.totalCount ?? 0}</h2>
                    </div>
                    <p className="text-xs text-purple-600 font-bold mt-2 uppercase tracking-wide">Total Volume</p>
                </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <FinanceOverviewChart />
            </div>

            {/* Main Content with Tabs */}
            {/* Using a simple custom tab implementation since I cannot be sure ui/tabs exists in this project structure logic */}
            {/* Actually, let's stick to a client component wrapper or just use searchParams? */}
            {/* For simplicity and speed, I will use a simple Client Component wrapper for the tabs part if needed, 
                BUT since this is a Server Component page, I'll pass the data to a client-side 'FinanceTabs' component
                OR just inline the tabs logic using searchParams if I want server rendering for tabs. 
                
                BETTER: Let's make a 'FinanceTabs' client component that holds the state.
            */}

            <FinanceClientTabs
                settlements={settlements}
                registrations={registrations}
            />
        </div>
    )
}
