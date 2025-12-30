import { Users, UserPlus, CheckCircle, TrendingUp, Wallet, BookOpen, ArrowUpRight, ArrowDownRight, Target, DollarSign } from 'lucide-react'
import { PremiumStatCard } from '../premium/PremiumStatCard'

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
        prevAmbassadors?: number
        prevLeads?: number
        prevConfirmed?: number
        prevBenefits?: number
        avgLeadsPerAmbassador: number
        totalEstimatedRevenue: number
    }
}

export function StatsCards({ analytics }: StatsCardsProps) {
    const calculateChange = (current: number, previous?: number) => {
        if (previous === undefined || previous === 0) return null
        const change = ((current - previous) / previous) * 100
        return change
    }

    const stats = [
        {
            label: 'Total Ambassadors',
            value: analytics.totalAmbassadors,
            sub: `${analytics.staffCount} Staff | ${analytics.parentCount} Parent`,
            icon: Users,
            grad: 'bg-grad-crimson',
            change: calculateChange(analytics.totalAmbassadors, analytics.prevAmbassadors)
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
            icon: DollarSign,
            grad: 'bg-grad-amber'
        },
    ]

    return (
        <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
            gap: '24px',
            marginBottom: '40px'
        }}>
            {stats.map((stat, i) => (
                <PremiumStatCard
                    key={i}
                    title={stat.label}
                    value={stat.value}
                    icon={<stat.icon size={24} color="white" strokeWidth={2} />}
                    gradient={
                        stat.grad === 'bg-grad-crimson' ? 'linear-gradient(135deg, #DC2626 0%, #991B1B 100%)' :
                            stat.grad === 'bg-grad-sapphire' ? 'linear-gradient(135deg, #2563EB 0%, #1E40AF 100%)' :
                                stat.grad === 'bg-grad-emerald' ? 'linear-gradient(135deg, #059669 0%, #064E3B 100%)' :
                                    stat.grad === 'bg-grad-amber' ? 'linear-gradient(135deg, #D97706 0%, #92400E 100%)' :
                                        stat.grad === 'bg-grad-violet' ? 'linear-gradient(135deg, #7C3AED 0%, #5B21B6 100%)' :
                                            'linear-gradient(135deg, #DB2777 0%, #9D174D 100%)'
                    }
                    shadowColor="rgba(0,0,0,0.25)"
                    change={stat.change ? { value: Math.abs(stat.change).toFixed(1), isIncrease: stat.change >= 0 } : undefined}
                    subtext={stat.sub}
                />
            ))}
        </div>
    )
}
