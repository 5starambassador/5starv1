import { motion } from 'framer-motion'

interface GlassCardProps {
    children: React.ReactNode
    className?: string
    onClick?: () => void
}

export function GlassCard({ children, className = '', onClick }: GlassCardProps) {
    return (
        <motion.div
            onClick={onClick}
            whileHover={{ scale: 1.01, translateY: -2 }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className={`group relative bg-white/[0.03] backdrop-blur-2xl border border-white/10 p-4 rounded-[32px] text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] hover:shadow-[0_12px_48px_rgba(0,0,0,0.4)] transition-all overflow-hidden ${className}`}
        >
            {/* Metallic Inner Edge */}
            <div className="absolute inset-0 rounded-[32px] border border-white/10 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1)] pointer-events-none" />

            {/* Top Gloss */}
            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent opacity-30" />

            {/* Content Wrapper */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>

            {/* Hover Flare */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.02] via-transparent to-white/[0.05] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        </motion.div>
    )
}
