'use client'

import { motion } from 'framer-motion'
import { ArrowRight, Star, Award, Users } from 'lucide-react'


interface MobileWelcomeProps {
    onGetStarted: () => void
}

export function MobileWelcome({ onGetStarted }: MobileWelcomeProps) {
    return (
        <div className="flex flex-col h-full relative overflow-hidden">
            {/* Background Effects - Matches BrandSidebar but simplified for mobile */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-[80px] translate-y-1/2 -translate-x-1/2" />

            <div className="flex-1 flex flex-col px-6 pt-12 pb-6 z-10 items-center text-center">
                {/* Logo & Badge Area */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6 }}
                    className="flex flex-col items-center space-y-6 mb-8 w-full"
                >
                    <img
                        src="/achariya_25_logo.jpg"
                        alt="Achariya 25th Year"
                        className="w-32 h-auto rounded-xl shadow-2xl border border-white/10"
                    />

                    <div className="flex flex-col items-center">
                        <h2 className="text-white text-xl font-black tracking-tight drop-shadow-lg uppercase leading-tight text-center">
                            Achariya
                        </h2>
                        <p className="text-[11px] text-blue-100/70 font-bold uppercase tracking-widest text-center">
                            Partnership Program
                        </p>
                        <p className="text-amber-400 text-[10px] font-black uppercase tracking-[0.2em] mt-1.5 drop-shadow-md text-center">
                            25<sup className="text-[0.6em]">th</sup> Year Celebration
                        </p>
                    </div>
                </motion.div>

                {/* Main Typography */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="mb-8"
                >
                    <h1 className="text-6xl font-black tracking-tighter leading-[0.9]">
                        <span className="text-pink-500">25</span> <span className="text-amber-400">Years of</span>
                        <br />
                        <span className="text-white drop-shadow-2xl">Excellence</span>
                    </h1>

                    <p className="mt-6 text-blue-100/70 text-sm font-medium leading-relaxed max-w-[90%] mx-auto">
                        Join the elite community of ambassadors shaping the next generation of education. Secure, fast, and prestigious.
                    </p>
                </motion.div>

                {/* Stats Grid */}
                {/* Stats Grid Removed */}

                {/* Main Action */}
                <motion.div
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.4, delay: 0.6 }}
                >
                    <button
                        onClick={onGetStarted}
                        className="w-full bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-bold text-lg h-14 rounded-xl shadow-xl shadow-amber-500/20 border-t border-white/20 flex items-center justify-center transition-transform active:scale-95"
                    >
                        Get Started <ArrowRight className="ml-2 w-5 h-5" />
                    </button>
                </motion.div>
            </div>
        </div>
    )
}
