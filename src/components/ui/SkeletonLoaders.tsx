import React from 'react';

/**
 * Skeleton loader for table rows
 * Used while data is loading to prevent layout shift
 */
export function TableSkeleton({ rows = 5, columns = 6 }: { rows?: number; columns?: number }) {
    return (
        <div className="animate-pulse">
            {/* Table Header */}
            <div className="bg-slate-50 border-b border-slate-100 p-4">
                <div className="flex gap-4">
                    {Array.from({ length: columns }).map((_, i) => (
                        <div key={i} className="h-3 bg-slate-200 rounded flex-1"></div>
                    ))}
                </div>
            </div>

            {/* Table Rows */}
            <div className="divide-y divide-slate-100">
                {Array.from({ length: rows }).map((_, rowIndex) => (
                    <div key={rowIndex} className="p-4 bg-white">
                        <div className="flex gap-4">
                            {Array.from({ length: columns }).map((_, colIndex) => (
                                <div
                                    key={colIndex}
                                    className="h-4 bg-slate-100 rounded flex-1"
                                    style={{
                                        width: colIndex === 0 ? '60%' : '100%',
                                        opacity: 1 - (rowIndex * 0.1)
                                    }}
                                ></div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Skeleton loader for stat cards
 */
export function CardSkeleton() {
    return (
        <div className="animate-pulse bg-white rounded-2xl p-6 border border-slate-100">
            <div className="h-4 bg-slate-200 rounded w-1/2 mb-4"></div>
            <div className="h-8 bg-slate-300 rounded w-3/4 mb-2"></div>
            <div className="h-3 bg-slate-100 rounded w-1/3"></div>
        </div>
    );
}

/**
 * Skeleton loader for dashboard grid
 */
export function DashboardSkeleton() {
    return (
        <div className="space-y-6">
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <CardSkeleton key={i} />
                ))}
            </div>

            {/* Main Content */}
            <div className="bg-white rounded-3xl border border-slate-100 shadow-xl p-6">
                <div className="animate-pulse">
                    <div className="h-6 bg-slate-200 rounded w-1/4 mb-6"></div>
                    <TableSkeleton rows={8} columns={5} />
                </div>
            </div>
        </div>
    );
}

/**
 * Generic loading spinner
 */
export function LoadingSpinner({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
    const sizeClasses = {
        sm: 'w-4 h-4 border-2',
        md: 'w-8 h-8 border-3',
        lg: 'w-12 h-12 border-4'
    };

    return (
        <div className="flex items-center justify-center p-4">
            <div
                className={`${sizeClasses[size]} border-blue-600 border-t-transparent rounded-full animate-spin`}
            ></div>
        </div>
    );
}

/**
 * Full page loading state
 */
export function PageLoader() {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50">
            <div className="text-center">
                <LoadingSpinner size="lg" />
                <p className="mt-4 text-slate-600 font-medium">Loading...</p>
            </div>
        </div>
    );
}
