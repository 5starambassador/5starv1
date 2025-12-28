
import { getCurrentUser } from '@/lib/auth-service'
import { getCampusStats } from '@/app/actions/campus-dashboard-actions'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Users, GraduationCap, TrendingUp, Search, Filter, MoreHorizontal, MapPin, CheckCircle2, XCircle, Clock, UserPlus, AlertCircle } from 'lucide-react'

export const dynamic = 'force-dynamic'

export default async function CampusDashboard() {
    const user = await getCurrentUser()
    if (!user || (!user.role.includes('Campus') && user.role !== 'Super Admin')) {
        return <div className="p-8 text-center text-red-500">Access Denied: Campus Admin Role Required</div>
    }

    const { success, stats, error } = await getCampusStats()

    if (error) {
        return <div className="p-8 text-center text-red-500">{error}</div>
    }

    return (
        <div className="space-y-8 animate-fade-in">
            {/* Header */}
            <div>
                <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-primary-maroon to-primary-gold">
                    Campus Dashboard
                </h1>
                <p className="text-gray-500 mt-1">Managing {user.assignedCampus || 'All Campuses'}</p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <StatCard
                    title="Total Students"
                    value={stats?.totalStudents || 0}
                    icon={<Users className="text-blue-500" />}
                    bg="bg-blue-50"
                />
                <StatCard
                    title="New Leads (This Month)"
                    value={stats?.newReferrals || 0}
                    icon={<UserPlus className="text-purple-500" />}
                    bg="bg-purple-50"
                />
                <StatCard
                    title="Pending Admissions"
                    value={stats?.pendingAdmissions || 0}
                    icon={<AlertCircle className="text-orange-500" />}
                    bg="bg-orange-50"
                />
            </div>

            {/* Quick Actions */}
            <div className="bg-white/80 backdrop-blur-md rounded-2xl p-6 shadow-sm border border-gray-100">
                <h2 className="text-xl font-bold mb-4">Quick Actions</h2>
                <div className="flex gap-4">
                    <Link href="/campus/referrals" className="btn btn-primary">
                        Process Admissions
                    </Link>
                    <Link href="/campus/students" className="btn btn-outline">
                        View Student Roster
                    </Link>
                </div>
            </div>
        </div>
    )
}

function StatCard({ title, value, icon, bg }: { title: string, value: number, icon: any, bg: string }) {
    return (
        <div className="bg-white/80 backdrop-blur-md p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
            <div>
                <p className="text-gray-500 text-sm font-medium">{title}</p>
                <h3 className="text-3xl font-bold mt-1 text-gray-900">{value}</h3>
            </div>
            <div className={`p - 4 rounded - xl ${bg} `}>
                {icon}
            </div>
        </div>
    )
}
