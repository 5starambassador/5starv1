'use client'

import { X } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

interface ModalProps {
    isOpen: boolean
    onClose: () => void
    title: string
    subtitle?: string
    icon?: React.ReactNode
    children: React.ReactNode
    footer?: React.ReactNode
    maxWidth?: string
    variant?: 'default' | 'blue' | 'indigo' | 'danger'
}

export function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    icon,
    children,
    footer,
    maxWidth = 'max-w-2xl',
    variant = 'default'
}: ModalProps) {
    const [mounted, setMounted] = useState(false)

    useEffect(() => {
        setMounted(true)
        if (isOpen) {
            document.body.style.overflow = 'hidden'
        } else {
            document.body.style.overflow = 'unset'
        }
        return () => {
            document.body.style.overflow = 'unset'
        }
    }, [isOpen])

    if (!mounted) return null

    const variantStyles = {
        default: 'bg-gray-900',
        blue: 'bg-blue-600',
        indigo: 'bg-indigo-600',
        danger: 'bg-red-600'
    }

    const modalContent = (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-gray-900/40 backdrop-blur-sm"
                    />

                    {/* Modal Container */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className={`bg-white/95 backdrop-blur-xl border border-white/20 rounded-[40px] w-full ${maxWidth} shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]`}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header */}
                        <div className={`${variantStyles[variant]} p-6 text-white relative`}>
                            <div className={`absolute top-0 right-0 w-48 h-48 ${variant === 'blue' ? 'bg-blue-500/20' : 'bg-white/10'} rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl`} />

                            <div className="flex justify-between items-center relative z-10">
                                <div className="flex items-center gap-3">
                                    {icon && (
                                        <div className="w-10 h-10 bg-white/10 rounded-2xl flex items-center justify-center border border-white/20 backdrop-blur-md">
                                            {icon}
                                        </div>
                                    )}
                                    <div>
                                        <h2 className="text-lg font-black uppercase tracking-tight italic">{title}</h2>
                                        {subtitle && <p className="text-[9px] font-black text-white/40 uppercase tracking-[0.2em] font-mono">{subtitle}</p>}
                                    </div>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="w-8 h-8 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-white hover:bg-white/20 transition-all"
                                >
                                    <img
                                        src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23ffffff' stroke-width='3' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M18 6 6 18'/%3E%3Cpath d='m6 6 18 12'/%3E%3C/svg%3E"
                                        alt="Close"
                                        width={18}
                                        height={18}
                                        className="block"
                                    />
                                </button>
                            </div>
                        </div>

                        {/* Body */}
                        <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
                            {children}
                        </div>

                        {/* Footer */}
                        {footer && (
                            <div className="p-6 pt-0">
                                {footer}
                            </div>
                        )}
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )

    return createPortal(modalContent, document.body)
}
