import React from 'react'

export default function TestIconsPage() {
    return (
        <div className="min-h-screen bg-slate-900 flex flex-col gap-10 items-center justify-center p-10">
            <h1 className="text-white text-2xl font-bold">Icon Visibility Test</h1>

            {/* Copy Button Test */}
            <div className="flex flex-col items-center gap-4 p-4 border border-white/10 rounded-xl">
                <span className="text-white">1. Copy Button (Dashboard)</span>
                <button
                    className="h-14 w-14 bg-amber-400 text-black border border-amber-300 rounded-[24px] flex items-center justify-center shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                >
                    {/* Raw Clipboard SVG */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <rect width="8" height="4" x="8" y="2" rx="1" ry="1" />
                        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
                    </svg>
                </button>
            </div>

            {/* Edit Button Test */}
            <div className="flex flex-col items-center gap-4 p-4 border border-white/10 rounded-xl">
                <span className="text-white">2. Edit Button (Profile)</span>
                <button
                    className="w-10 h-10 rounded-full bg-amber-400 border border-amber-300 flex items-center justify-center shadow-lg shadow-amber-500/20 active:scale-95"
                >
                    {/* Raw Edit2 SVG */}
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z" />
                    </svg>
                </button>
            </div>
        </div>
    )
}
