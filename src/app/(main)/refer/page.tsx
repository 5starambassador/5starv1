'use client'

import { useState } from 'react'
import { submitReferral, sendReferralOtp, verifyReferralOtp } from '@/app/referral-actions'
import { useRouter } from 'next/navigation'
import { ChevronRight, Lock, User, School, GraduationCap, Users, Smartphone, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export default function ReferPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [otpSent, setOtpSent] = useState(false)
    const [otp, setOtp] = useState('')
    const [error, setError] = useState<string | null>(null)

    const [formData, setFormData] = useState({
        parentName: '',
        parentMobile: '',
        studentName: '',
        campus: 'ASM-VILLIANUR(9-12)',
        gradeInterested: ''
    })

    // Official Campus List (Top 10)
    const campuses = [
        "ASM-VILLIANUR(9-12)", "ASM-VILLIANUR(MONT-8)", "ASM-VILLUPURAM", "ASM-ALAPAKKAM",
        "ADYAR", "AKLAVYA-RP", "KKNAGAR", "VALASARAVAKKAM", "ASM-MP", "ASM-TKM"
    ]

    const updateFormData = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }))
        if (error) setError(null)
    }

    const handleSendOtp = async () => {
        setError(null)
        if (!formData.parentMobile || formData.parentMobile.length < 10) {
            setError('Please enter a valid 10-digit mobile number')
            return
        }
        setLoading(true)
        const res = await sendReferralOtp(formData.parentMobile)
        setLoading(false)
        if (res.success) {
            toast.success('OTP sent successfully!')
            setOtpSent(true)
            setStep(2)
        } else {
            setError(res.error || 'Failed to send OTP')
        }
    }

    const handleVerifyOtp = async () => {
        setError(null)
        if (!otp) {
            setError('Please enter the OTP sent to your mobile')
            return
        }
        setLoading(true)
        const res = await verifyReferralOtp(formData.parentMobile, otp)
        setLoading(false)

        if (res.success) {
            toast.success('Mobile verified!')
            setStep(3)
        } else {
            setError(res.error || 'Invalid OTP. Please try again.')
        }
    }

    const handleSubmit = async () => {
        setError(null)
        if (!formData.parentName || !formData.studentName || !formData.gradeInterested) {
            toast.error('Please fill in all details')
            return
        }

        setLoading(true)
        const res = await submitReferral(formData)
        setLoading(false)

        if (res.success) {
            toast.success('Referral submitted successfully', {
                description: 'Benefits apply after admission confirmation. / பரிந்துரை பதிவு செய்யப்பட்டது.'
            })
            router.push('/dashboard')
        } else {
            setError(res.error || 'Failed to submit referral')
        }
    }

    const inputClasses = "w-full bg-white/50 border border-gray-100 rounded-xl px-4 py-3 pl-11 text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-primary-maroon/20 focus:border-primary-maroon/50 transition-all duration-300 font-medium"
    const labelClasses = "block text-xs font-bold text-gray-400 uppercase tracking-widest mb-1.5 ml-1"

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">

            {/* Background Orbs */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-gold/10 rounded-full blur-[100px] -z-10 animate-pulse-slow"></div>
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary-maroon/10 rounded-full blur-[100px] -z-10 animate-pulse-slow delay-700"></div>

            <div className="w-full max-w-lg">
                <div className="bg-white/80 backdrop-blur-2xl rounded-[32px] shadow-[0_8px_40px_rgb(0,0,0,0.06)] border border-white p-8 relative overflow-hidden">

                    {/* Decorative Header Line */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary-maroon via-primary-gold to-primary-maroon opacity-80"></div>

                    {/* Header */}
                    <div className="text-center mb-8 relative">
                        <div className="inline-flex items-center justify-center p-3 bg-gradient-to-br from-primary-maroon/5 to-primary-gold/10 rounded-2xl mb-4 text-primary-maroon shadow-sm border border-white">
                            <Sparkles size={24} className="animate-pulse" />
                        </div>
                        <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-gray-900 to-gray-600 mb-2">
                            Refer a Champion
                        </h1>
                        <p className="text-gray-500 font-medium text-sm">Unlock rewards by bringing new stars to Achariya</p>
                    </div>

                    {/* Progress Steps */}
                    <div className="flex justify-between items-center mb-10 px-8 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-8 right-8 top-1/2 h-0.5 bg-gray-100 -z-10"></div>

                        {[1, 2, 3].map((s) => (
                            <div key={s} className={`relative flex flex-col items-center gap-2 transition-all duration-500 ${step >= s ? 'text-primary-maroon' : 'text-gray-300'}`}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-500 bg-white
                                    ${step >= s
                                        ? 'border-primary-maroon shadow-lg shadow-primary-maroon/20 scale-110'
                                        : 'border-gray-200'}`}>
                                    {step > s ? <CheckCircle2 size={16} /> : s}
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Error Message Display (Premium Style) */}
                    <AnimatePresence>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                animate={{ opacity: 1, y: 0, scale: 1 }}
                                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                className="mb-6 p-4 bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl flex items-start gap-3 shadow-lg shadow-red-100/50"
                            >
                                <div className="p-2 bg-red-100 rounded-full text-red-600 shrink-0">
                                    <AlertCircle size={18} />
                                </div>
                                <div>
                                    <h3 className="text-red-900 font-bold text-sm">Action Required</h3>
                                    <p className="text-red-600 text-sm font-medium mt-0.5 leading-relaxed">{error}</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Form Container */}
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={step}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.3 }}
                            className="space-y-6"
                        >
                            {step === 1 && (
                                <div className="space-y-6">
                                    <div>
                                        <label className={labelClasses}>Parent Mobile Number / மொபைல் எண்</label>
                                        <div className="relative group">
                                            <Smartphone className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-400' : 'text-gray-400 group-focus-within:text-primary-maroon'}`} size={20} />
                                            <input
                                                type="tel"
                                                className={`${inputClasses} ${error ? 'border-red-300 ring-2 ring-red-100 bg-red-50/20' : ''}`}
                                                value={formData.parentMobile}
                                                onChange={(e) => {
                                                    const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                    updateFormData('parentMobile', value);
                                                }}
                                                placeholder="98765 43210"
                                                autoFocus
                                            />
                                        </div>
                                    </div>
                                    <button
                                        onClick={handleSendOtp}
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-primary-maroon to-[#991b1b] text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary-maroon/20 hover:shadow-2xl hover:shadow-primary-maroon/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 flex items-center justify-center gap-2"
                                    >
                                        {loading ? (
                                            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <>Get OTP <ChevronRight size={20} strokeWidth={2.5} /></>
                                        )}
                                    </button>
                                </div>
                            )}

                            {step === 2 && (
                                <div className="space-y-8">
                                    <div className="text-center bg-blue-50/50 border border-blue-100 rounded-2xl p-4">
                                        <p className="text-sm text-gray-500 font-medium">OTP sent to</p>
                                        <p className="text-2xl font-black text-gray-900 tracking-tight mt-1">{formData.parentMobile}</p>
                                    </div>

                                    <div>
                                        <label className={labelClasses}>Enter Verification Code</label>
                                        <div className="relative group">
                                            <Lock className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors ${error ? 'text-red-400' : 'text-gray-400 group-focus-within:text-primary-maroon'}`} size={20} />
                                            <input
                                                type="text"
                                                className={`${inputClasses} text-center tracking-[1em] font-bold text-xl ${error ? 'border-red-300 ring-2 ring-red-100 bg-red-50/20' : ''}`}
                                                value={otp}
                                                onChange={(e) => {
                                                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))
                                                    if (error) setError(null)
                                                }}
                                                placeholder="••••••"
                                                maxLength={6}
                                                autoFocus
                                            />
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleVerifyOtp}
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-primary-maroon to-[#991b1b] text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary-maroon/20 hover:shadow-2xl hover:shadow-primary-maroon/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                                    >
                                        {loading ? 'Verifying...' : 'Verify & Proceed'}
                                    </button>

                                    <button
                                        onClick={() => setStep(1)}
                                        className="w-full py-2 text-sm font-bold text-gray-400 hover:text-gray-600 transition-colors"
                                    >
                                        Use a different number
                                    </button>
                                </div>
                            )}

                            {step === 3 && (
                                <div className="space-y-5">
                                    <div>
                                        <label className={labelClasses}>Parent Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-maroon transition-colors" size={20} />
                                            <input
                                                className={inputClasses}
                                                value={formData.parentName}
                                                onChange={(e) => updateFormData('parentName', e.target.value)}
                                                placeholder="Enter full name"
                                            />
                                        </div>
                                    </div>

                                    <div>
                                        <label className={labelClasses}>Student Name</label>
                                        <div className="relative group">
                                            <Users className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-maroon transition-colors" size={20} />
                                            <input
                                                className={inputClasses}
                                                value={formData.studentName}
                                                onChange={(e) => updateFormData('studentName', e.target.value)}
                                                placeholder="Enter student's name"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="col-span-2 sm:col-span-1">
                                            <label className={labelClasses}>Campus</label>
                                            <div className="relative group">
                                                <School className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-maroon transition-colors" size={20} />
                                                <select
                                                    className={`${inputClasses} appearance-none cursor-pointer`}
                                                    value={formData.campus}
                                                    onChange={(e) => updateFormData('campus', e.target.value)}
                                                >
                                                    {campuses.map(c => <option key={c}>{c}</option>)}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <ChevronRight className="rotate-90 text-gray-400" size={16} />
                                                </div>
                                            </div>
                                        </div>

                                        <div className="col-span-2 sm:col-span-1">
                                            <label className={labelClasses}>Grade</label>
                                            <div className="relative group">
                                                <GraduationCap className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-primary-maroon transition-colors" size={20} />
                                                <select
                                                    className={`${inputClasses} appearance-none cursor-pointer`}
                                                    value={formData.gradeInterested}
                                                    onChange={(e) => updateFormData('gradeInterested', e.target.value)}
                                                >
                                                    <option value="" disabled>Select</option>
                                                    {['Pre Mont', 'Mont-1', 'Mont-2', ...Array.from({ length: 9 }, (_, i) => `Grade-${i + 1}`), 'Grade-11'].map(g => (
                                                        <option key={g} value={g}>{g}</option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none">
                                                    <ChevronRight className="rotate-90 text-gray-400" size={16} />
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="w-full bg-gradient-to-r from-primary-maroon to-[#991b1b] text-white py-4 rounded-xl font-bold text-lg shadow-xl shadow-primary-maroon/20 hover:shadow-2xl hover:shadow-primary-maroon/30 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 mt-4"
                                    >
                                        {loading ? (
                                            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                                        ) : 'Submit Referral'}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div>
        </div>
    )
}
