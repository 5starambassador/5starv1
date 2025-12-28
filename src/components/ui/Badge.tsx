import { ReactNode } from 'react'

interface BadgeProps {
    children: ReactNode
    variant?: 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline'
    className?: string
}

export function Badge({ children, variant = 'default', className = '' }: BadgeProps) {
    const styles = {
        default: { backgroundColor: '#F3F4F6', color: '#374151' },
        success: { backgroundColor: '#ECFDF5', color: '#059669', border: '1px solid #D1FAE5' },
        warning: { backgroundColor: '#FFFBEB', color: '#D97706', border: '1px solid #FEF3C7' },
        error: { backgroundColor: '#FEF2F2', color: '#DC2626', border: '1px solid #FEE2E2' },
        info: { backgroundColor: '#EFF6FF', color: '#2563EB', border: '1px solid #DBEAFE' },
        outline: { backgroundColor: 'transparent', color: '#6B7280', border: '1px solid #E5E7EB' }
    }

    return (
        <span
            className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${className}`}
            style={styles[variant]}
        >
            {children}
        </span>
    )
}
