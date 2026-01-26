import { Users, UserPlus, CheckCircle, TrendingUp, Wallet, BookOpen, ArrowUpRight, ArrowDownRight, Target, IndianRupee } from 'lucide-react'
import { CleanStatCard } from './CleanStatCard'
import { Area, AreaChart, ResponsiveContainer } from 'recharts'

interface StatsCardsProps {
    analytics: {
        totalAmbassadors: number
        totalLeads: number
        totalConfirmed: number
        globalConversionRate: number
        systemWideBenefits: number
        totalStudents: number
        staffCount: number
        parentCount: number
        alumniCount: number
        othersCount: number
        prevAmbassadors?: number
        prevLeads?: number
        prevConfirmed?: number
        prevBenefits?: number
        avgLeadsPerAmbassador: number
        totalEstimatedRevenue: number
    }
    growthTrend?: { date: string; users: number }[]
}

export function StatsCards({ analytics, growthTrend }: StatsCardsProps) {
    const calculateChange = (current: number, previous?: number) => {
        if (previous === undefined || previous === 0) return null
        const change = ((current - previous) / previous) * 100
        return change
    }

    const stats = [
        {
            label: 'Total Ambassadors',
            value: analytics.totalAmbassadors,
            sub: `${analytics.staffCount} Staff | ${analytics.parentCount} Parent | ${analytics.alumniCount} Alumni | ${analytics.othersCount} Other`,
            icon: Users,
            grad: 'bg-grad-crimson',
            change: calculateChange(analytics.totalAmbassadors, analytics.prevAmbassadors),
            chart: growthTrend ? (
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={growthTrend}>
                        <defs>
                            <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.5} />
                                <stop offset="95%" stopColor="#ffffff" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <Area type="monotone" dataKey="users" stroke="#ffffff" fillOpacity={1} fill="url(#colorUsers)" strokeWidth={2} />
                    </AreaChart>
                </ResponsiveContainer>
            ) : undefined
        },
        {
            label: 'Total Leads',
            value: analytics.totalLeads,
            sub: 'Generated so far',
            icon: UserPlus,
            grad: 'bg-grad-sapphire',
            change: calculateChange(analytics.totalLeads, analytics.prevLeads)
        },
        {
            label: 'Confirmed Admissions',
            value: analytics.totalConfirmed,
            sub: `${analytics.globalConversionRate}% Conversion`,
            icon: CheckCircle,
            grad: 'bg-grad-emerald',
            change: calculateChange(analytics.totalConfirmed, analytics.prevConfirmed)
        },
        {
            label: 'System Wide Benefits',
            value: `₹${(analytics.systemWideBenefits / 100000).toFixed(1)}L`,
            sub: 'Estimated Savings',
            icon: Wallet,
            grad: 'bg-grad-amber',
            change: calculateChange(analytics.systemWideBenefits, analytics.prevBenefits)
        },
        {
            label: 'Active Students',
            value: analytics.totalStudents,
            sub: 'In Achievement Portals',
            icon: BookOpen,
            grad: 'bg-grad-violet'
        },
        {
            label: 'Conversion Rate',
            value: `${analytics.globalConversionRate}%`,
            sub: 'Leads to Confirmed',
            icon: TrendingUp,
            grad: 'bg-grad-rose'
        },
        {
            label: 'Referral Velocity',
            value: analytics.avgLeadsPerAmbassador,
            sub: 'Leads per Ambassador',
            icon: Target,
            grad: 'bg-grad-violet'
        },
        {
            label: 'Fee Pipeline',
            value: `₹${(analytics.totalEstimatedRevenue / 100000).toFixed(1)}L`,
            sub: 'Estimated Potential',
            icon: IndianRupee,
            grad: 'bg-grad-amber'
        },
    ]

    const getIconColor = (grad: string) => {
        switch (grad) {
            case 'bg-grad-crimson': return 'bg-red-50 text-red-600'
            case 'bg-grad-sapphire': return 'bg-blue-50 text-blue-600'
            case 'bg-grad-emerald': return 'bg-green-50 text-green-600'
            case 'bg-grad-amber': return 'bg-amber-50 text-amber-600'
            case 'bg-grad-violet': return 'bg-violet-50 text-violet-600'
            case 'bg-grad-rose': return 'bg-pink-50 text-pink-600'
            default: return 'bg-gray-50 text-gray-600'
        }
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
            {stats.map((stat, i) => (
                <CleanStatCard
                    key={i}
                    title={stat.label}
                    value={stat.value}
                    icon={stat.icon}
                    iconColor={getIconColor(stat.grad)}
                    change={stat.change ? { value: Math.abs(stat.change), isIncrease: stat.change >= 0 } : undefined}
                    subtext={stat.sub}
                />
            ))}
        </div>
    )
}
