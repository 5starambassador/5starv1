import { Users, UserPlus, CheckCircle, TrendingUp, Wallet, BookOpen, Building2 } from 'lucide-react'

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
    }
}

export function StatsCards({ analytics }: StatsCardsProps) {
    const stats = [
        { label: 'Total Ambassadors', value: analytics.totalAmbassadors, sub: `${analytics.staffCount} Staff | ${analytics.parentCount} Parent`, icon: Users, grad: 'bg-grad-crimson' },
        { label: 'Total Leads', value: analytics.totalLeads, sub: 'Generated so far', icon: UserPlus, grad: 'bg-grad-sapphire' },
        { label: 'Confirmed Admissions', value: analytics.totalConfirmed, sub: `${analytics.globalConversionRate}% Conversion`, icon: CheckCircle, grad: 'bg-grad-emerald' },
        { label: 'System Wide Benefits', value: `₹${(analytics.systemWideBenefits / 100000).toFixed(1)}L`, sub: 'Estimated Savings', icon: Wallet, grad: 'bg-grad-amber' },
        { label: 'Active Students', value: analytics.totalStudents, sub: 'In Achievement Portals', icon: BookOpen, grad: 'bg-grad-violet' },
        { label: 'Conversion Rate', value: `${analytics.globalConversionRate}%`, sub: 'Leads to Confirmed', icon: TrendingUp, grad: 'bg-grad-rose' },
    ]

    return (
        <div style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '16px',
            marginBottom: '40px'
        }}>
            {stats.map((stat, i) => (
                <div
                    key={i}
                    style={{
                        flex: '1 1 280px',
                        padding: '28px',
                        borderRadius: '24px',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden',
                        background: stat.grad === 'bg-grad-crimson' ? 'linear-gradient(135deg, #FF1E1E 0%, #A30000 100%)' :
                            stat.grad === 'bg-grad-sapphire' ? 'linear-gradient(135deg, #3B82F6 0%, #172554 100%)' :
                                stat.grad === 'bg-grad-emerald' ? 'linear-gradient(135deg, #10B981 0%, #064E3B 100%)' :
                                    stat.grad === 'bg-grad-amber' ? 'linear-gradient(135deg, #F59E0B 0%, #78350F 100%)' :
                                        stat.grad === 'bg-grad-violet' ? 'linear-gradient(135deg, #8B5CF6 0%, #4C1D95 100%)' :
                                            'linear-gradient(135deg, #EC4899 0%, #831843 100%)',
                        boxShadow: '0 15px 30px -10px rgba(0,0,0,0.3)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-5px)'}
                    onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                >
                    {/* Decorative Glass Overlay */}
                    <div style={{ position: 'absolute', top: 0, right: 0, width: '120px', height: '120px', background: 'rgba(255,255,255,0.15)', borderRadius: '60px', transform: 'translate(40%, -40%)' }} />

                    <div style={{ position: 'relative', zIndex: 1 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                            <div style={{ padding: '12px', background: 'rgba(255,255,255,0.25)', backdropFilter: 'blur(10px)', borderRadius: '14px' }}>
                                <stat.icon size={22} color="white" />
                            </div>
                        </div>
                        <div>
                            <p style={{ fontSize: '11px', fontWeight: '800', color: 'rgba(255,255,255,0.85)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{stat.label}</p>
                            <h3 style={{ fontSize: '32px', fontWeight: '950', color: '#FFFFFF', margin: '4px 0', letterSpacing: '-0.02em' }}>{stat.value}</h3>
                            <p style={{ fontSize: '12px', color: 'rgba(255,255,255,0.75)', fontWeight: '700' }}>{stat.sub}</p>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    )
}
