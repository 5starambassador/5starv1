import { ReactNode } from 'react'

interface CardProps {
    children: ReactNode
    title?: string
    subtitle?: string
    headerAction?: ReactNode
    className?: string
    contentClassName?: string
    noPadding?: boolean
}

export function Card({
    children,
    title,
    subtitle,
    headerAction,
    className = '',
    contentClassName = '',
    noPadding = false
}: CardProps) {
    return (
        <div className={`bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden ${className}`}>
            {(title || headerAction) && (
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        {title && <h3 className="text-lg font-bold text-gray-900">{title}</h3>}
                        {subtitle && <p className="text-sm text-gray-500 mt-1">{subtitle}</p>}
                    </div>
                    {headerAction && <div>{headerAction}</div>}
                </div>
            )}
            <div className={`${noPadding ? '' : 'p-6'} ${contentClassName}`}>
                {children}
            </div>
        </div>
    )
}
