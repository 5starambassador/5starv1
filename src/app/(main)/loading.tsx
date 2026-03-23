'use client'

export default function Loading() {
    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-white/20 backdrop-blur-[2px]">
            <div className="flex flex-col items-center">
                <div className="w-10 h-10 border-4 border-amber-600/20 border-t-amber-600 rounded-full animate-spin" />
                <p className="mt-4 text-[10px] font-bold text-amber-900 tracking-[0.2em] uppercase opacity-60">
                    Loading
                </p>
            </div>
        </div>
    )
}
