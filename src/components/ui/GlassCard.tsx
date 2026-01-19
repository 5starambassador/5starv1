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
            className={`group relative bg-white/[0.03] dark:bg-white/[0.04] backdrop-blur-3xl border border-white/10 p-4 rounded-[32px] text-slate-900 dark:text-white shadow-[0_8px_32px_rgba(0,0,0,0.3)] dark:shadow-[0_12px_64px_rgba(0,0,0,0.5)] hover:shadow-[0_20px_80px_rgba(0,0,0,0.6)] transition-all duration-500 overflow-hidden ${className}`}
        >
            {/* High-Fidelity Border Layering (Rim Light Effect) */}
            <div className="absolute inset-0 rounded-[32px] border border-white/20 shadow-[inset_0_1px_2px_rgba(255,255,255,0.2)] pointer-events-none" />
            <div className="absolute inset-[1px] rounded-[31px] border border-black/20 pointer-events-none" />

            {/* Subtle Metallic Edge Overlay */}
            <div className="absolute inset-0 rounded-[32px] bg-gradient-to-br from-white/10 to-transparent opacity-20 pointer-events-none" />

            {/* Top Gloss Line - Sharpened */}
            <div className="absolute top-0 left-0 w-full h-[1.5px] bg-gradient-to-r from-transparent via-white/40 to-transparent opacity-40" />

            {/* Content Wrapper */}
            <div className="relative z-10 w-full h-full">
                {children}
            </div>

            {/* Premium Hover Flare - Light-Sweep Effect */}
            <div className="absolute inset-0 bg-gradient-to-tr from-white/[0.01] via-white/[0.08] to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/[0.03] to-purple-500/[0.03] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
        </motion.div>
    )
}
