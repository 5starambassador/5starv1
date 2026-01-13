'use client'

import React from 'react'

interface SkeletonProps {
    className?: string
    variant?: 'text' | 'rect' | 'circle'
    width?: string | number
    height?: string | number
}

export function Skeleton({
    className = '',
    variant = 'rect',
    width,
    height
}: SkeletonProps) {
    const baseClass = "animate-pulse bg-white/10 rounded"
    const variantClass = variant === 'circle' ? 'rounded-full' : 'rounded-xl'

    const style: React.CSSProperties = {
        width: width || '100%',
        height: height || '100%',
    }

    return (
        <div
            className={`${baseClass} ${variantClass} ${className}`}
            style={style}
        />
    )
}

export function SkeletonText({ lines = 1, className = "" }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: lines }).map((_, i) => (
                <Skeleton
                    key={i}
                    variant="text"
                    height={16}
                    width={i === lines - 1 && lines > 1 ? '60%' : '100%'}
                />
            ))}
        </div>
    )
}
