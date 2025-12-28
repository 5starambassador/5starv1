'use client'

import { AlertTriangle } from 'lucide-react'

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    return (
        <html>
            <body>
                <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center bg-gray-50">
                    <div className="bg-red-100 p-6 rounded-full mb-6">
                        <AlertTriangle size={64} className="text-[#CC0000]" />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900 mb-4">Critical System Error</h1>
                    <p className="text-gray-600 mb-8 max-w-lg">
                        The application encountered a critical error and cannot recover automatically.
                        Please try refreshing the page.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-8 py-3 bg-[#CC0000] text-white rounded-xl hover:bg-[#990000] transition-colors font-bold shadow-lg"
                    >
                        Refresh Page
                    </button>
                </div>
            </body>
        </html>
    )
}
