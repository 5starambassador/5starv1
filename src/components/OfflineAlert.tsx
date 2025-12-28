'use client'

import { useState, useEffect } from 'react'
import { Network } from '@capacitor/network'
import { WifiOff } from 'lucide-react'

export function OfflineAlert() {
    const [connected, setConnected] = useState(true)

    useEffect(() => {
        const checkStatus = async () => {
            const status = await Network.getStatus()
            setConnected(status.connected)
        }

        const handler = Network.addListener('networkStatusChange', status => {
            setConnected(status.connected)
        })

        checkStatus()

        return () => {
            handler.then(h => h.remove())
        }
    }, [])

    if (connected) return null

    return (
        <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
            <div className="bg-white rounded-2xl p-8 text-center max-w-sm w-full shadow-2xl">
                <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
                    <WifiOff className="text-red-600 w-8 h-8" />
                </div>
                <h2 className="text-xl font-bold text-gray-900 mb-2">No Internet Connection</h2>
                <p className="text-gray-500 mb-6">Please check your network settings. The app will reconnect automatically.</p>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold active:scale-95 transition-transform"
                    >
                        Retry
                    </button>
                </div>
            </div>
        </div>
    )
}
