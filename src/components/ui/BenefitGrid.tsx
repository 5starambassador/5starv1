
import { CheckCircle } from 'lucide-react'

interface BenefitGridProps {
    currentCount: number
}

const tiers = [
    { count: 1, percent: 5 },
    { count: 2, percent: 10 },
    { count: 3, percent: 20 },
    { count: 4, percent: 30 },
    { count: 5, percent: 50 }
]

export function BenefitGrid({ currentCount }: BenefitGridProps) {
    return (
        <div className="grid grid-cols-5 gap-2 md:gap-4">
            {tiers.map((tier) => {
                const isCurrentTier = currentCount === tier.count
                const isAchieved = currentCount >= tier.count

                return (
                    <div key={tier.count} className={`
                        relative py-3 md:py-4 px-1 rounded-xl text-center border transition-all duration-300
                        ${isCurrentTier
                            ? 'bg-gradient-to-br from-red-500 to-red-600 border-red-500 shadow-lg scale-105 z-10'
                            : isAchieved
                                ? 'bg-amber-50 border-amber-200 opacity-60'
                                : 'bg-gray-50 border-gray-100'}
                    `}>
                        <div className={`text-[10px] font-bold uppercase mb-1 ${isCurrentTier ? 'text-red-100' : 'text-gray-400'}`}>
                            {tier.count} Ref{tier.count > 1 ? 's' : ''}
                        </div>
                        <div className={`text-lg md:text-xl font-black ${isCurrentTier ? 'text-white' : isAchieved ? 'text-amber-700' : 'text-gray-800'}`}>
                            {tier.percent}%
                        </div>
                        {isAchieved && !isCurrentTier && (
                            <div className="absolute inset-0 flex items-center justify-center bg-amber-100/10 rounded-xl">
                                <CheckCircle size={16} className="text-amber-500 opacity-20" />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}
