import { useState } from 'react'
import { Eye, EyeOff, ChevronLeft, Star } from 'lucide-react'

interface RegistrationBasicProps {
    formData: any
    setFormData: (data: any) => void
    onNext: () => void
    onBack: () => void
}

export const RegistrationBasic = ({ formData, setFormData, onNext, onBack }: RegistrationBasicProps) => {
    const [showRegisterPassword, setShowRegisterPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)
    const [isValidPassword, setIsValidPassword] = useState(false)

    // Password validation logic
    const validatePassword = (pwd: string) => {
        const minLength = pwd.length >= 8
        const hasUpper = /[A-Z]/.test(pwd)
        const hasNumber = /[0-9]/.test(pwd)
        const hasSpecial = /[!@#$%^&*]/.test(pwd)
        return minLength && hasUpper && hasNumber && hasSpecial
    }

    // Email validation logic
    const validateEmail = (email: string) => {
        return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
    }

    const isFormValid = () => {
        if (!formData.fullName || !validateEmail(formData.email) || !validatePassword(formData.password) || formData.password !== formData.confirmPassword) return false
        return true
    }

    return (
        <div className="space-y-6">
            <div className="text-center space-y-2 relative">
                <button
                    onClick={onBack}
                    className="absolute top-0 left-0 w-10 h-10 rounded-full flex items-center justify-center bg-white/15 border border-white/20 text-white hover:bg-white/25 transition-all z-50 group shadow-lg"
                >
                    <ChevronLeft className="w-5 h-5 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
                </button>
                <div className="flex flex-col items-center gap-2 mb-6 w-full">
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-600/20 backdrop-blur-xl border border-blue-400/20 text-[9px] font-black uppercase tracking-[0.15em] text-white shadow-lg">
                        <Star size={10} className="text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]" />
                        <span>Achariya Partnership Program (APP)</span>
                    </div>
                    <div className="inline-flex items-center px-4 py-1 rounded-full bg-slate-950/40 backdrop-blur-md border border-amber-500/30 text-[9px] font-black text-amber-500 uppercase tracking-[0.2em] shadow-[0_0_15px_rgba(245,158,11,0.1)]">
                        25<sup className="text-[0.6em] ml-0.5">th</sup> Year Celebration
                    </div>
                </div>
                <h2 className="text-3xl font-black text-white tracking-tighter drop-shadow-md">Create Account</h2>
                <p className="text-blue-200/60 text-[10px] font-bold uppercase tracking-[0.2em] mt-2">Step 1 of 2</p>
            </div>

            <div className="space-y-4">
                <div>
                    <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Full Name</label>
                    <input
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent shadow-lg transition-all text-sm font-medium"
                        value={formData.fullName}
                        placeholder="Your legal name"
                        onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                        autoFocus
                    />
                </div>

                <div>
                    <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Email Address</label>
                    <input
                        type="email"
                        className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent shadow-lg transition-all text-sm font-medium ${formData.email && !validateEmail(formData.email) ? 'ring-rose-500/50 border-rose-500/50' : ''}`}
                        placeholder="name@example.com"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                    {formData.email && !validateEmail(formData.email) && (
                        <p className="text-[10px] text-rose-400 mt-1 font-medium ml-1">Please enter a valid email address</p>
                    )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Create Password</label>
                        <div className="relative">
                            <input
                                type={showRegisterPassword ? "text" : "password"}
                                className={`w-full bg-white/5 border border-white/10 rounded-xl pl-4 pr-10 h-12 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent shadow-lg transition-all text-sm font-medium ${isValidPassword ? 'ring-emerald-500/50 focus:ring-emerald-500/50' : ''}`}
                                value={formData.password}
                                placeholder='Strong password'
                                onChange={(e) => {
                                    setFormData({ ...formData, password: e.target.value })
                                    setIsValidPassword(validatePassword(e.target.value))
                                }}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-amber-400 transition-colors"
                                onClick={() => setShowRegisterPassword(!showRegisterPassword)}
                            >
                                {showRegisterPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                            </button>
                        </div>
                        {/* Password Strength Indicators */}
                        <div className="flex gap-1 mt-2 px-1">
                            <div className={`h-1 flex-1 rounded-full transition-colors ${formData.password.length >= 8 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`}></div>
                            <div className={`h-1 flex-1 rounded-full transition-colors ${/[A-Z]/.test(formData.password) ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`}></div>
                            <div className={`h-1 flex-1 rounded-full transition-colors ${/[0-9]/.test(formData.password) ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`}></div>
                            <div className={`h-1 flex-1 rounded-full transition-colors ${/[!@#$%^&*]/.test(formData.password) ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-white/10'}`}></div>
                        </div>
                    </div>
                    <div>
                        <label className="text-blue-200/70 text-[10px] font-bold uppercase tracking-[0.2em] mb-2 block ml-1">Confirm</label>
                        <input
                            type={showConfirmPassword ? "text" : "password"}
                            className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 h-12 text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-amber-400/50 focus:border-transparent shadow-lg transition-all text-sm font-medium ${formData.confirmPassword && formData.password === formData.confirmPassword ? 'ring-emerald-500/50 focus:ring-emerald-500/50' : ''}`}
                            value={formData.confirmPassword}
                            placeholder='Retype password'
                            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                        />
                        {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                            <p className="text-[10px] text-rose-400 mt-1 font-bold ml-1 animate-in slide-in-from-top-1 fade-in">
                                Passwords do not match
                            </p>
                        )}
                    </div>
                </div>
            </div>

            <button
                className={`w-full h-12 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-500 hover:from-indigo-500 hover:to-blue-400 text-white font-bold tracking-[0.05em] text-sm shadow-lg shadow-blue-900/40 hover:shadow-blue-900/60 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 border border-white/10 ${!isFormValid() ? 'opacity-50 cursor-not-allowed grayscale' : ''}`}
                onClick={onNext}
                disabled={!isFormValid()}
            >
                Next Step
            </button>
        </div>
    )
}
