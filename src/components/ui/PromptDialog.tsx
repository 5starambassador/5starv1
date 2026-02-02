import { motion, AnimatePresence } from 'framer-motion'
import { MessageSquare, X, Edit3, ShieldAlert, AlertCircle, Info } from 'lucide-react'
import { useState, useEffect } from 'react'

interface PromptDialogProps {
    isOpen: boolean
    title: string
    description: string
    placeholder?: string
    confirmText?: string
    cancelText?: string
    variant?: 'danger' | 'warning' | 'info' | 'success'
    onConfirm: (value: string) => void
    onCancel: () => void
    isLoading?: boolean
    initialValue?: string
}

export function PromptDialog({
    isOpen,
    title,
    description,
    placeholder = 'Enter reason...',
    confirmText = 'Submit',
    cancelText = 'Cancel',
    variant = 'info',
    onConfirm,
    onCancel,
    isLoading = false,
    initialValue = ''
}: PromptDialogProps) {
    const [value, setValue] = useState(initialValue)

    useEffect(() => {
        if (isOpen) setValue(initialValue)
    }, [isOpen, initialValue])

    const variantConfig = {
        danger: {
            icon: <ShieldAlert size={28} />,
            bg: 'from-rose-500 to-red-600',
            lightBg: 'bg-rose-50',
            textColor: 'text-rose-600',
            buttonShadow: 'shadow-rose-200',
            ring: 'focus:ring-rose-50 focus:border-rose-200'
        },
        warning: {
            icon: <AlertCircle size={28} />,
            bg: 'from-amber-500 to-orange-500',
            lightBg: 'bg-amber-50',
            textColor: 'text-amber-600',
            buttonShadow: 'shadow-amber-200',
            ring: 'focus:ring-amber-50 focus:border-amber-200'
        },
        info: {
            icon: <Edit3 size={28} />,
            bg: 'from-indigo-500 to-blue-600',
            lightBg: 'bg-indigo-50',
            textColor: 'text-indigo-600',
            buttonShadow: 'shadow-indigo-200',
            ring: 'focus:ring-indigo-50 focus:border-indigo-200'
        },
        success: {
            icon: <AlertCircle size={28} />,
            bg: 'from-emerald-500 to-teal-600',
            lightBg: 'bg-emerald-50',
            textColor: 'text-emerald-600',
            buttonShadow: 'shadow-emerald-200',
            ring: 'focus:ring-emerald-50 focus:border-emerald-200'
        }
    }

    const config = variantConfig[variant]

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onCancel}
                        className="absolute inset-0 bg-gray-900/60 backdrop-blur-md"
                    />

                    {/* Dialog Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="bg-white w-full max-w-sm rounded-[42px] shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] overflow-hidden relative border border-gray-100/50"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {/* Top Decoration */}
                        <div className={`h-2 w-full bg-gradient-to-r ${config.bg}`} />

                        <div className="p-10">
                            {/* Icon & Title */}
                            <div className="flex flex-col items-center text-center space-y-4">
                                <div className={`w-16 h-16 rounded-[24px] ${config.lightBg} ${config.textColor} flex items-center justify-center shadow-inner`}>
                                    {config.icon}
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-gray-900 uppercase tracking-tight">
                                        {title}
                                    </h3>
                                    <p className="text-sm font-bold text-gray-400 leading-relaxed px-2">
                                        {description}
                                    </p>
                                </div>
                            </div>

                            {/* Input Field */}
                            <div className="mt-8">
                                <textarea
                                    autoFocus
                                    value={value}
                                    onChange={(e) => setValue(e.target.value)}
                                    placeholder={placeholder}
                                    className={`w-full h-32 p-5 bg-gray-50 border border-gray-100 rounded-[24px] text-sm font-bold text-gray-900 placeholder:text-gray-300 outline-none transition-all resize-none custom-scrollbar-dark ${config.ring}`}
                                />
                            </div>

                            {/* Actions */}
                            <div className="mt-8 flex flex-col gap-3">
                                <button
                                    onClick={() => onConfirm(value)}
                                    disabled={isLoading || !value.trim()}
                                    className={`w-full py-5 bg-gradient-to-br ${config.bg} text-white rounded-[24px] font-black text-xs uppercase tracking-[0.2em] shadow-xl ${config.buttonShadow} hover:-translate-y-1 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2`}
                                >
                                    {isLoading && <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />}
                                    {isLoading ? 'Processing...' : confirmText}
                                </button>

                                <button
                                    onClick={onCancel}
                                    disabled={isLoading}
                                    className="w-full py-4 bg-gray-50 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-[20px] font-black text-[10px] uppercase tracking-[0.2em] transition-all disabled:opacity-50"
                                >
                                    {cancelText}
                                </button>
                            </div>
                        </div>

                        {/* Close button icon */}
                        <button
                            onClick={onCancel}
                            className="absolute top-6 right-6 p-2 rounded-xl text-gray-300 hover:text-gray-500 transition-all"
                        >
                            <X size={18} />
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
