'use client'

import React, { Component, ErrorInfo, ReactNode } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

interface Props {
    children: ReactNode
    fallback?: ReactNode
}

interface State {
    hasError: boolean
    error?: Error
}

/**
 * Standard Error Boundary for the administrative dashboard.
 * Catches runtime crashes and provides a graceful fallback UI.
 */
export class ErrorBoundary extends Component<Props, State> {
    public state: State = {
        hasError: false
    }

    public static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error }
    }

    public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
        console.error('Uncaught error:', error, errorInfo)
    }

    public render() {
        if (this.state.hasError) {
            return this.props.fallback || (
                <div className="flex flex-col items-center justify-center min-h-[400px] p-8 text-center bg-white rounded-xl border border-red-100 shadow-sm">
                    <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4">
                        <AlertTriangle className="text-red-500 w-8 h-8" />
                    </div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Something went wrong</h2>
                    <p className="text-gray-600 mb-6 max-w-md">
                        The application encountered an unexpected error. This might be due to a temporary connection issue or a configuration problem.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="inline-flex items-center px-6 py-3 bg-red-600 hover:bg-red-700 text-white font-medium rounded-lg transition-colors shadow-sm"
                    >
                        <RefreshCw className="mr-2 w-4 h-4" />
                        Reload Dashboard
                    </button>
                    {process.env.NODE_ENV === 'development' && (
                        <div className="mt-8 p-4 bg-gray-50 rounded-md text-left w-full overflow-auto max-h-40">
                            <pre className="text-xs text-red-800">{this.state.error?.stack}</pre>
                        </div>
                    )}
                </div>
            )
        }

        return this.props.children
    }
}
