import { Star } from 'lucide-react'
import { ReactNode } from 'react'

interface CircularProgressProps {
    value: number
    max?: number
    size?: number
    strokeWidth?: number
    color?: string
    trackColor?: string
    className?: string
    children?: ReactNode
}

export function CircularProgress({
    value,
    max = 5,
    size = 80,
    strokeWidth = 8,
    color = "text-white",
    className = "",
    children
}: CircularProgressProps) {
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const progress = Math.min(value / max, 1)
    const dashoffset = circumference - progress * circumference

    return (
        <div className="relative flex items-center justify-center p-2">
            <svg width={size} height={size} className={`rotate-[-90deg] ${className}`}>
                {/* Background Circle */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    className="text-white/[0.03]"
                />
                {/* Progress Circle with Glow Effect */}
                <circle
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke="currentColor"
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashoffset}
                    strokeLinecap="round"
                    className={`${color} transition-all duration-1000 ease-out drop-shadow-[0_0_6px_rgba(251,191,36,0.5)]`}
                />
            </svg>
            {/* Center Content */}
            <div className="absolute inset-0 flex items-center justify-center">
                {children ? children : (
                    value >= max ? (
                        <Star size={size * 0.4} fill="currentColor" className="text-amber-300 animate-pulse-slow" />
                    ) : (
                        <span className="text-white font-black tracking-tight" style={{ fontSize: size * 0.25 }}>
                            {value}/{max}
                        </span>
                    )
                )}
            </div>
        </div>
    )
}
