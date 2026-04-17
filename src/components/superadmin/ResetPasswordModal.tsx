'use client'

import { useState, useEffect } from 'react'
import { toast } from 'sonner'
import { X } from 'lucide-react'
import { adminResetPassword } from '@/app/superadmin-actions'

interface ResetTarget {
    id: number
    name: string
    type: 'user' | 'admin'
}

interface ResetPasswordModalProps {
    isOpen: boolean
    onClose: () => void
    target: ResetTarget | null
}

export function ResetPasswordModal({ isOpen, onClose, target }: ResetPasswordModalProps) {
    const [newPassword, setNewPassword] = useState('')
    const [loading, setLoading] = useState(false)

    useEffect(() => {
        if (isOpen) setNewPassword('')
    }, [isOpen])

    const handleExecuteReset = async () => {
        if (!target || !newPassword) return
        if (newPassword.length < 6) {
            toast.error('Password must be at least 6 characters')
            return
        }

        setLoading(true)
        try {
            const res = await adminResetPassword(target.id, target.type, newPassword)
            if (res.success) {
                toast.success(`Password reset successfully for ${target.name}`)
                onClose()
            } else {
                toast.error(res.error || 'Failed to reset password')
            }
        } catch (e) {
            toast.error('An error occurred during password reset')
        } finally {
            setLoading(false)
        }
    }

    if (!isOpen || !target) return null

    return (
        <div className="fixed inset-0 bg-black/50 z-[60] flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 w-full max-w-[400px] shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center mb-5">
                    <h3 className="text-lg font-black italic text-slate-800 uppercase tracking-tight">Reset Password</h3>
                    <button 
                        onClick={onClose} 
                        className="p-2 hover:bg-slate-100 rounded-xl transition-all text-slate-400 hover:text-red-500"
                        aria-label="Close modal"
                    >
                        <X size={20} />
                    </button>
                </div>
                
                <p className="text-sm text-slate-500 mb-6 leading-relaxed">
                    Set a new password for <strong className="text-slate-900">{target.name}</strong> (<span className="uppercase text-[10px] font-black tracking-widest">{target.type}</span>).
                </p>
                
                <div className="space-y-6">
                    <div>
                        <label htmlFor="new-password" className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block ml-1">New Password *</label>
                        <input
                            id="new-password"
                            type="text"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            className="w-full bg-slate-50 border-none rounded-xl px-4 py-3 text-sm font-bold focus:ring-4 focus:ring-red-500/10 transition-all outline-none"
                            placeholder="Enter new password"
                        />
                        <p className="text-[10px] text-slate-400 font-bold mt-2 ml-1 uppercase tracking-widest leading-tight">Min 6 characters required.</p>
                    </div>
                    
                    <div className="flex gap-3 pt-2">
                        <button
                            onClick={onClose}
                            className="flex-1 py-3 px-4 bg-slate-100 text-slate-600 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-200 transition-all active:scale-95"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleExecuteReset}
                            disabled={loading}
                            className="flex-1 py-3 px-4 bg-red-600 text-white rounded-xl text-xs font-black uppercase tracking-widest hover:bg-red-700 shadow-lg shadow-red-100 transition-all active:scale-95 disabled:opacity-50"
                        >
                            {loading ? 'Resetting...' : 'Confirm Reset'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}
