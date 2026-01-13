'use client'

import { BrandSidebar } from './BrandSidebar'
import { motion, AnimatePresence } from 'framer-motion'

export const AuthLayout = ({ children, animationKey }: { children: React.ReactNode, animationKey?: string | number }) => {
    return (
        <main className="fixed inset-0 w-full h-full flex bg-[#0f172a] overflow-hidden z-40">
            {/* Unified Shared Background for Mobile/Desktop seamlessness */}
            <div className="absolute inset-0 bg-[url('/bg-pattern.png')] bg-cover opacity-10 z-0 pointer-events-none"></div>
            <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-blue-600/20 blur-[100px] rounded-full translate-x-1/2 -translate-y-1/2 z-0 pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-600/10 blur-[100px] rounded-full -translate-x-1/3 translate-y-1/3 z-0 pointer-events-none"></div>

            {/* Left Pane - Brand Experience (Desktop Only) */}
            <BrandSidebar />

            {/* Right Pane - Action Center */}
            <div className="w-full lg:w-1/2 flex flex-col items-center justify-center p-6 lg:p-12 relative h-full overflow-y-auto lg:overflow-hidden z-10">

                {/* Glass Container */}
                <div className="relative z-10 w-full max-w-md sm:max-w-lg flex flex-col justify-center my-auto">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={animationKey}
                            initial={{ opacity: 0, scale: 0.98, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: -10 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                            className="w-full bg-white/5 backdrop-blur-xl p-8 py-10 sm:py-12 rounded-3xl border border-white/10 shadow-2xl shadow-black/20 min-h-[450px] sm:min-h-[500px] flex flex-col justify-center relative overflow-hidden"
                        >
                            {/* Inner Shine Effect */}
                            <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-white/20 to-transparent"></div>
                            <div className="absolute bottom-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-black/20 to-transparent"></div>

                            {children}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="relative z-10 mt-auto pb-4">
                    <p className="text-[9px] font-black tracking-[0.3em] text-white/20 uppercase hover:text-white/40 transition-colors cursor-default">
                        © 2026 Achariya World Class Education
                    </p>
                </div>
            </div>
        </main>
    )
}
