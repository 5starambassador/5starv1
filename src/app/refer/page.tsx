'use client'

import { useState, useEffect, Suspense } from 'react'
import { submitReferral, sendReferralOtp, verifyReferralOtp, getAmbassadorName } from '@/app/referral-actions'
import { useRouter, useSearchParams } from 'next/navigation'
import { ChevronRight, Lock, User, School, GraduationCap, Users, Smartphone, AlertCircle, CheckCircle2, Star } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

export default function ReferPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading Referral Form...</div>}>
            <ReferralFormContent />
        </Suspense>
    )
}

function ReferralFormContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const refCode = searchParams.get('ref')

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [otpSent, setOtpSent] = useState(false)
    const [otp, setOtp] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [ambassadorName, setAmbassadorName] = useState<string | null>(null)
    const [otpDestination, setOtpDestination] = useState<{ isAmbassador: boolean, name: string } | null>(null)

    useEffect(() => {
        if (refCode) {
            getAmbassadorName(refCode).then(name => {
                if (name) setAmbassadorName(name)
            })
        }
    }, [refCode])

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

        console.log('Sending OTP with refCode:', refCode); // Debug log

        setLoading(true)
        const res = await sendReferralOtp(formData.parentMobile, refCode || undefined)
        setLoading(false)

        if (res.success) {
            const data = res as any
            toast.success('Verification code sent!')
            setOtpDestination({
                isAmbassador: data.isAmbassadorVerified || false,
                name: data.ambassadorName || ''
            })
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
        const res = await submitReferral(formData, refCode || undefined)
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

    const inputWrapperClass = `
        input-group-wrapper 
        transition-all duration-300 ease-out
        focus-within:shadow-[0_4px_20px_-4px_rgba(234,179,8,0.15)] 
        focus-within:border-primary-gold 
        focus-within:ring-4 focus-within:ring-primary-gold/5
    `

    return (
        <div className="min-h-[80vh] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="bg-white rounded-[32px] shadow-[0_24px_60px_-12px_rgba(0,0,0,0.08)] p-8 sm:p-12 w-full max-w-xl border border-gray-100 relative overflow-hidden"
            >
                {/* Subtle top decoration */}
                <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-primary-maroon via-primary-gold to-primary-maroon opacity-90"></div>

                {ambassadorName && (
                    <div className="mb-6 -mt-2 p-4 bg-amber-50 rounded-2xl border border-amber-100 flex items-center gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                        <div className="p-2 bg-amber-200 rounded-full text-amber-600">
                            <Star size={18} fill="currentColor" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-amber-600 uppercase tracking-widest">You are referred by</p>
                            <h4 className="text-sm font-bold text-gray-900">{ambassadorName}</h4>
                        </div>
                    </div>
                )}

                <div className="mb-8">
                    <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-4">Referral</h1>
                    <div className="flex items-center justify-between">
                        <span className="bg-gray-50 border border-gray-100 text-gray-500 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider shadow-sm">
                            Step <span className="text-primary-maroon text-sm mx-1">{step}</span> / 3
                        </span>
                        <div className="flex gap-2">
                            {[1, 2, 3].map(s => (
                                <div key={s} className={`h-1.5 w-8 rounded-full transition-all duration-500 ${step >= s ? 'bg-primary-gold' : 'bg-gray-100'}`} />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Premium Error Alert */}
                <AnimatePresence mode="wait">
                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                            exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                            className="bg-red-50 border border-red-100 rounded-2xl overflow-hidden"
                        >
                            <div className="p-4 flex items-start gap-3">
                                <div className="p-2 bg-red-100 rounded-full text-red-600 shrink-0">
                                    <AlertCircle size={18} />
                                </div>
                                <div>
                                    <h3 className="text-red-900 font-bold text-sm">Check details</h3>
                                    <p className="text-red-600 text-sm font-medium mt-0.5 leading-relaxed">{error}</p>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>

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
                                <div className="input-group">
                                    <label className="label">Parent Mobile Number / மொபைல் எண்</label>
                                    <div className={`${inputWrapperClass} ${error ? 'border-red-300 ring-4 ring-red-50 bg-red-50/10' : ''}`}>
                                        <div className="flex items-center justify-center pl-6 pr-6 pointer-events-none">
                                            <Smartphone
                                                className={`input-icon transition-colors duration-300 ${error ? 'text-red-400' : ''}`}
                                                size={24} strokeWidth={1.5}
                                                style={{ color: error ? '#dc2626' : undefined }}
                                            />
                                        </div>
                                        <input
                                            type="tel"
                                            className="w-full h-full bg-transparent border-none outline-none text-lg font-medium text-gray-900 placeholder-gray-400 focus:ring-0"
                                            style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}
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
                                    className="btn btn-primary w-full flex items-center justify-center gap-2 py-4 text-lg shadow-xl shadow-primary-maroon/20 hover:shadow-2xl hover:shadow-primary-maroon/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300"
                                    onClick={handleSendOtp}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>Get OTP <ChevronRight size={20} strokeWidth={2.5} /></>
                                    )}
                                </button>
                            </div>
                        )}

                        {step === 2 && (
                            <div className="space-y-6">
                                <div className="text-center bg-blue-50/50 border border-blue-100 rounded-[24px] p-6">
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="p-3 bg-blue-100 rounded-full text-blue-600 mb-2">
                                            <Smartphone size={24} />
                                        </div>
                                        {otpDestination?.isAmbassador ? (
                                            <>
                                                <p className="text-sm text-gray-700 font-bold mb-1 uppercase tracking-wider">Verification Required</p>
                                                <p className="text-xs text-gray-500 font-medium px-4">
                                                    For security, we've sent the code to your Ambassador:
                                                </p>
                                                <div className="flex items-center justify-center gap-2 px-6 py-2 bg-white rounded-full border border-blue-100 shadow-sm mt-1">
                                                    <Star size={14} className="text-amber-500 fill-amber-500" />
                                                    <span className="text-lg font-black text-gray-900 tracking-tight">{otpDestination.name}</span>
                                                </div>
                                                <p className="text-[11px] text-blue-600 font-bold mt-2 leading-relaxed">
                                                    Please contact them to get the 6 digit code.
                                                </p>
                                            </>
                                        ) : (
                                            <>
                                                <p className="text-sm text-gray-500 font-medium mb-1">OTP sent to your mobile</p>
                                                <div className="flex items-center justify-center gap-2">
                                                    <span className="text-2xl font-black text-gray-900 tracking-tight">{formData.parentMobile}</span>
                                                    <CheckCircle2 size={20} className="text-green-500" />
                                                </div>
                                            </>
                                        )}
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="label">Enter OTP / ஓடிபி</label>
                                    <div className={`${inputWrapperClass} ${error ? 'border-red-300 ring-4 ring-red-50 bg-red-50/10' : ''}`}>
                                        <div className="flex items-center justify-center pl-6 pr-6 pointer-events-none">
                                            <Lock className={`input-icon transition-colors duration-300 ${error ? 'text-red-400' : ''}`} size={24} strokeWidth={1.5} />
                                        </div>
                                        <input
                                            type="text"
                                            className="w-full h-full bg-transparent border-none outline-none text-center tracking-[0.5em] font-bold text-2xl text-gray-900 placeholder-gray-300 focus:ring-0"
                                            style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}
                                            value={otp}
                                            onChange={(e) => {
                                                setOtp(e.target.value.replace(/\D/g, '').slice(0, 6));
                                                if (error) setError(null);
                                            }}
                                            placeholder="••••••"
                                            maxLength={6}
                                            autoFocus
                                        />
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <button
                                        className="btn btn-primary w-full py-4 text-lg shadow-xl shadow-primary-maroon/20 hover:shadow-2xl hover:shadow-primary-maroon/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300"
                                        onClick={handleVerifyOtp}
                                        disabled={loading}
                                    >
                                        {loading ? 'Verifying...' : 'Verify & Proceed'}
                                    </button>
                                    <button
                                        className="w-full text-center text-sm font-bold text-gray-400 hover:text-primary-maroon transition-colors py-2"
                                        onClick={() => setStep(1)}
                                    >
                                        Change Mobile Number
                                    </button>
                                </div>
                            </div>
                        )}

                        {step === 3 && (
                            <div className="space-y-5">
                                <div className="input-group">
                                    <label className="label">Parent Name / பெற்றோரின் பெயர்</label>
                                    <div className={inputWrapperClass}>
                                        <div className="flex items-center justify-center pl-6 pr-6 pointer-events-none">
                                            <User className="input-icon" size={24} strokeWidth={1.5} />
                                        </div>
                                        <input
                                            className="w-full h-full bg-transparent border-none outline-none text-base text-gray-900 placeholder-gray-400 focus:ring-0"
                                            style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}
                                            value={formData.parentName}
                                            onChange={(e) => updateFormData('parentName', e.target.value)}
                                            placeholder="Enter parent name"
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="label">Student Name / மாணவர் பெயர்</label>
                                    <div className={inputWrapperClass}>
                                        <div className="flex items-center justify-center pl-6 pr-6 pointer-events-none">
                                            <Users className="input-icon" size={24} strokeWidth={1.5} />
                                        </div>
                                        <input
                                            className="w-full h-full bg-transparent border-none outline-none text-base text-gray-900 placeholder-gray-400 focus:ring-0"
                                            style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}
                                            value={formData.studentName}
                                            onChange={(e) => updateFormData('studentName', e.target.value)}
                                            placeholder="Enter student name"
                                        />
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="label">Campus</label>
                                    <div className={inputWrapperClass}>
                                        <div className="flex items-center justify-center pl-6 pr-6 pointer-events-none">
                                            <School className="input-icon" size={24} strokeWidth={1.5} />
                                        </div>
                                        <select
                                            className="w-full h-full bg-transparent border-none outline-none text-base text-gray-900 appearance-none focus:ring-0 cursor-pointer"
                                            style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}
                                            value={formData.campus}
                                            onChange={(e) => updateFormData('campus', e.target.value)}
                                        >
                                            {campuses.map(c => <option key={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>

                                <div className="input-group">
                                    <label className="label">Grade Interested</label>
                                    <div className={inputWrapperClass}>
                                        <div className="flex items-center justify-center pl-6 pr-6 pointer-events-none">
                                            <GraduationCap className="input-icon" size={24} strokeWidth={1.5} />
                                        </div>
                                        <select
                                            className="w-full h-full bg-transparent border-none outline-none text-base text-gray-900 appearance-none focus:ring-0 cursor-pointer"
                                            style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}
                                            value={formData.gradeInterested}
                                            onChange={(e) => updateFormData('gradeInterested', e.target.value)}
                                        >
                                            <option value="" disabled>Select Grade</option>
                                            {['Pre Mont', 'Mont-1', 'Mont-2', ...Array.from({ length: 9 }, (_, i) => `Grade-${i + 1}`), 'Grade-11'].map(g => (
                                                <option key={g} value={g}>{g}</option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button
                                    className="btn btn-primary w-full py-4 text-lg shadow-xl shadow-primary-maroon/20 hover:shadow-2xl hover:shadow-primary-maroon/30 hover:-translate-y-0.5 active:translate-y-0 active:scale-[0.98] transition-all duration-300 mt-4"
                                    onClick={handleSubmit}
                                    disabled={loading}
                                >
                                    {loading ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto" />
                                    ) : 'Submit Referral'}
                                </button>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </div>
    )
}
