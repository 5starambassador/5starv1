'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCcw } from 'lucide-react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error('Application Error:', error)
    }, [error])

    return (
        <div className="min-h-[400px] flex flex-col items-center justify-center p-6 text-center">
            <div className="bg-red-50 p-4 rounded-full mb-4">
                <AlertTriangle size={48} className="text-[#CC0000]" />
            </div>
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong!</h2>
            <p className="text-gray-600 mb-6 max-w-md">
                We apologize for the inconvenience. An unexpected error has occurred.
                Our team has been notified.
            </p>
            <div className="flex gap-4">
                <button
                    onClick={reset}
                    className="flex items-center gap-2 px-6 py-2.5 bg-[#CC0000] text-white rounded-xl hover:bg-[#990000] transition-colors font-medium"
                >
                    <RefreshCcw size={18} />
                    Try again
                </button>
                <button
                    onClick={() => window.location.href = '/'}
                    className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                >
                    Go Home
                </button>
            </div>
            {process.env.NODE_ENV === 'development' && (
                <div className="mt-8 p-4 bg-gray-100 rounded-lg text-left max-w-2xl w-full overflow-auto">
                    <p className="font-mono text-xs text-red-600 mb-2 font-bold">{error.name}: {error.message}</p>
                    <pre className="font-mono text-xs text-gray-600 whitespace-pre-wrap">{error.stack}</pre>
                </div>
            )}
        </div>
    )
}
