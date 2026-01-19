'use client'

import { useState, useEffect, Suspense, useMemo } from 'react'
import { submitReferral, sendReferralOtp, verifyReferralOtp, getAmbassadorName } from '@/app/referral-actions'
import { saveOfflineLead, getUnsyncedLeads, markLeadSynced } from '@/lib/offline-storage'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, Check, ChevronRight, Lock, User, School, GraduationCap, Users, Smartphone, AlertCircle, CheckCircle2, Star, ShieldCheck, ChevronLeft } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { decryptReferralCode } from '@/lib/crypto'
import Link from 'next/link'
import { PageAnimate } from '@/components/PageAnimate'

import { getRegistrationCampuses } from '@/app/actions'
import { useWebOTP } from '@/hooks/useWebOTP'

export default function ReferPage() {
    return (
        <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-[#0f172a] text-white">Loading Referral Form...</div>}>
            <ReferralFormContent />
        </Suspense>
    )
}

function ReferralFormContent() {
    const router = useRouter()
    const searchParams = useSearchParams()
    const encryptedRefCode = searchParams.get('ref')

    // Decrypt the referral code
    const refCode = encryptedRefCode ? decryptReferralCode(encryptedRefCode) : null

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [otpSent, setOtpSent] = useState(false)
    const [otp, setOtp] = useState('')
    const [error, setError] = useState<string | null>(null)
    const [ambassadorName, setAmbassadorName] = useState<string | null>(null)
    const [otpDestination, setOtpDestination] = useState<{ isAmbassador: boolean, name: string } | null>(null)
    const [isOffline, setIsOffline] = useState(false)

    useWebOTP(setOtp)

    useEffect(() => {
        setIsOffline(!navigator.onLine)
        const handleOnline = () => setIsOffline(false)
        const handleOffline = () => setIsOffline(true)
        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)
        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

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
        campus: '',
        gradeInterested: ''
    })

    // Official Campus List (from DB)
    const [campuses, setCampuses] = useState<{ id: number; campusName: string; grades: string }[]>([])

    useEffect(() => {
        getRegistrationCampuses().then(res => {
            if (res.success && res.campuses) {
                setCampuses(res.campuses as any)
            }
        })
    }, [])

    const updateFormData = (key: string, value: string) => {
        setFormData(prev => ({ ...prev, [key]: value }))
        if (error) setError(null)
    }

    // Helper to parse complex grade string
    const parseGrades = (gradeString: string) => {
        if (!gradeString) return []
        const rawItems = gradeString.split(',').map(s => s.trim())
        const finalGrades: string[] = []

        rawItems.forEach(item => {
            if (/^\d+$/.test(item)) {
                finalGrades.push(`Grade - ${item}`)
            } else if (item.toLowerCase().startsWith('grade -')) {
                finalGrades.push(item)
            } else {
                if (item === 'Pre-KG') finalGrades.push('Pre-Mont')
                else if (item === 'LKG') finalGrades.push('Mont-1')
                else if (item === 'UKG') finalGrades.push('Mont-2')
                else finalGrades.push(item)
            }
        })
        return finalGrades
    }

    const currentCampusGrades = useMemo(() => {
        const selected = campuses.find(c => c.campusName === formData.campus)
        if (!selected || !selected.grades) return []
        return parseGrades(selected.grades)
    }, [formData.campus, campuses])

    const handleSendOtp = async () => {
        setError(null)
        if (!formData.parentMobile || formData.parentMobile.length < 10) {
            setError('Please enter a valid 10-digit mobile number')
            return
        }

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

        if (isOffline) {
            try {
                await saveOfflineLead({ ...formData, referralCode: refCode || undefined })
                toast.success('Lead saved offline!', {
                    description: 'It will sync once you are back online. / இணையம் வந்தவுடன் தானாக பதிவாகும்.'
                })
                setLoading(false)
                router.push('/dashboard')
                return
            } catch (err) {
                setError('Failed to save lead locally')
                setLoading(false)
                return
            }
        }

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

    return (
        <div className="fixed inset-0 w-full h-full overflow-y-auto bg-[#0f172a] text-white font-[family-name:var(--font-outfit)] flex flex-col z-40">
            {/* Ambient Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px]" />
                <div className="absolute top-[40%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/10 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-pink-600/5 rounded-full blur-[120px]" />
            </div>

            {/* Header */}
            <header className="px-6 pt-12 pb-6 flex items-center justify-between sticky top-0 z-20">
                <button
                    onClick={() => step > 1 ? setStep(prev => prev - 1) : router.push('/dashboard')}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white/15 border border-white/20 text-white hover:bg-white/25 transition-all z-50 group shadow-lg"
                >
                    <ChevronLeft className="w-5 h-5 flex-shrink-0 group-hover:-translate-x-0.5 transition-transform" strokeWidth={2.5} />
                </button>
                <div className="flex flex-col items-center">
                    <span className="text-[10px] font-black text-amber-400 uppercase tracking-[0.2em] mb-1">
                        {ambassadorName ? 'Public Referral Link' : 'Internal Action'}
                    </span>
                    <h1 className="text-lg font-bold tracking-tight">Make a Referral</h1>
                </div>
                <div className="w-10" />
            </header>


            {/* Main Content */}
            <div className="flex-1 flex flex-col items-center p-6 pt-4 relative z-10 w-full max-w-lg mx-auto">

                <PageAnimate className="w-full">

                    {/* Ambassador Banner - Shows only if we have an ambassador name (Link Flow) */}
                    <AnimatePresence>
                        {ambassadorName && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-amber-500/10 to-amber-600/10 border border-amber-500/30 p-4 text-center shadow-[0_0_30px_-10px_rgba(245,158,11,0.2)]"
                            >
                                {/* Glow Effect */}
                                <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/20 rounded-full blur-[40px] pointer-events-none"></div>
                                <div className="absolute bottom-0 left-0 w-20 h-20 bg-amber-500/10 rounded-full blur-[40px] pointer-events-none"></div>

                                <div className="relative z-10">
                                    <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/20 mb-2">
                                        <Star size={10} className="text-amber-400 fill-amber-400" />
                                        <span className="text-[10px] font-black text-amber-300 uppercase tracking-widest">You are referred by</span>
                                    </div>
                                    <h3 className="text-xl font-black text-white tracking-tight drop-shadow-sm">{ambassadorName}</h3>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Error Alert */}
                    <AnimatePresence mode="wait">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, height: 0, marginBottom: 0 }}
                                animate={{ opacity: 1, height: 'auto', marginBottom: 24 }}
                                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                                className="bg-rose-500/10 border border-rose-500/20 rounded-2xl overflow-hidden mb-6"
                            >
                                <div className="p-4 flex items-start gap-3">
                                    <div className="p-2 bg-rose-500/10 rounded-full text-rose-500 shrink-0">
                                        <AlertCircle size={18} />
                                    </div>
                                    <div>
                                        <h3 className="text-rose-400 font-bold text-sm uppercase tracking-tight">System Message</h3>
                                        <p className="text-rose-200 text-sm font-medium mt-0.5 leading-relaxed">{error}</p>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Glass Card */}
                    <div className="relative bg-white/5 backdrop-blur-xl border border-white/20 rounded-[32px] p-8 overflow-hidden shadow-2xl">

                        {/* Gold Glow Top */}
                        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-1/2 h-1 bg-gradient-to-r from-transparent via-amber-400 to-transparent opacity-50 shadow-[0_0_20px_rgba(251,191,36,0.5)]"></div>

                        {/* Steps Indicator */}
                        <div className="flex flex-col items-center mb-10">
                            <h2 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-b from-amber-200 to-amber-500 mb-4 drop-shadow-sm">
                                {step}<span className="text-lg text-white/20 font-medium">/3</span>
                            </h2>
                            <div className="flex gap-2">
                                <div className={`h-1.5 w-8 rounded-full transition-all ${step >= 1 ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'bg-white/10'}`} />
                                <div className={`h-1.5 w-8 rounded-full transition-all ${step >= 2 ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'bg-white/10'}`} />
                                <div className={`h-1.5 w-8 rounded-full transition-all ${step >= 3 ? 'bg-amber-400 shadow-[0_0_10px_rgba(251,191,36,0.3)]' : 'bg-white/10'}`} />
                            </div>
                        </div>

                        {/* Step Content */}
                        <AnimatePresence mode="wait">
                            {step === 1 && (
                                <motion.div
                                    key="step1"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-white/60 uppercase tracking-widest pl-1">Parent Mobile Number</label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-pink-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                                            <div className={`relative flex items-center bg-black/20 border rounded-2xl h-16 px-4 transition-all group-focus-within:bg-black/40 ${error ? 'border-rose-500/50' : 'border-white/10 group-focus-within:border-pink-500/50'}`}>
                                                <Smartphone className="text-white/40 group-focus-within:text-pink-400 transition-colors mr-3" />
                                                <input
                                                    type="tel"
                                                    value={formData.parentMobile}
                                                    onChange={(e) => {
                                                        const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                                        updateFormData('parentMobile', value);
                                                    }}
                                                    placeholder="98765 43210"
                                                    className="w-full h-full bg-transparent border-none outline-none text-xl font-bold text-white placeholder-white/20"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={isOffline ? () => setStep(3) : handleSendOtp}
                                        disabled={loading}
                                        className="w-full h-16 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {loading ? (
                                            <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                {isOffline ? 'Offline Collection' : 'Get OTP'}
                                                <ChevronRight size={18} strokeWidth={3} />
                                            </>
                                        )}
                                    </button>

                                    {isOffline && (
                                        <p className="text-center text-[10px] uppercase tracking-widest opacity-50">Offline mode enabled</p>
                                    )}
                                </motion.div>
                            )}

                            {step === 2 && (
                                <motion.div
                                    key="step2"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-6"
                                >
                                    <div className="text-center mb-2">
                                        <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/5 border border-white/10 mb-4">
                                            <Lock size={20} className="text-amber-400" />
                                        </div>

                                        {otpDestination?.isAmbassador ? (
                                            <>
                                                {/* LINK FLOW MESSAGE (Security Check) */}
                                                <p className="text-sm text-amber-200/80 font-medium mb-1 uppercase tracking-wide">Security Check</p>
                                                <p className="text-sm text-white/60 px-4 leading-relaxed">
                                                    For verification, the code has been sent to the referrer:
                                                </p>
                                                <div className="my-3 px-4 py-2 bg-white/5 rounded-xl border border-white/10 inline-block">
                                                    <span className="font-bold text-white">{otpDestination.name}</span>
                                                </div>
                                                <p className="text-xs text-white/40">Please contact them to get the code.</p>
                                            </>
                                        ) : (
                                            <>
                                                {/* DIRECT FLOW MESSAGE */}
                                                <p className="text-sm text-white/60">Enter the 4-digit code sent to</p>
                                                <p className="text-lg font-bold text-white mt-1">+91 {formData.parentMobile}</p>
                                            </>
                                        )}
                                    </div>

                                    <div className="flex justify-center">
                                        <div className="relative group w-full max-w-[200px]">
                                            <div className="absolute inset-0 bg-pink-500/20 rounded-2xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                                            <input
                                                type="text"
                                                value={otp}
                                                onChange={(e) => {
                                                    setOtp(e.target.value.replace(/\D/g, '').slice(0, 4));
                                                    if (error) setError(null);
                                                }}
                                                placeholder="••••"
                                                maxLength={4}
                                                autoComplete="one-time-code"
                                                inputMode="numeric"
                                                pattern="[0-9]*"
                                                className="relative w-full h-16 bg-black/20 border border-white/10 rounded-2xl text-center text-3xl font-bold tracking-[0.5em] text-white outline-none focus:border-pink-500/50 focus:bg-black/40 transition-all placeholder-white/10"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        <button
                                            onClick={handleVerifyOtp}
                                            disabled={loading}
                                            className="w-full h-16 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-600 text-black font-black text-sm uppercase tracking-widest shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
                                        >
                                            {loading ? (
                                                <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                            ) : (
                                                <>
                                                    Verify & Proceed
                                                    <ChevronRight size={18} strokeWidth={3} />
                                                </>
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setStep(1)}
                                            className="w-full text-xs font-bold text-white/40 hover:text-white uppercase tracking-widest transition-colors py-2"
                                        >
                                            Change Number
                                        </button>
                                    </div>
                                </motion.div>
                            )}

                            {step === 3 && (
                                <motion.div
                                    key="step3"
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="space-y-4"
                                >
                                    <InputGroup
                                        icon={<User />}
                                        label="Parent Name"
                                        placeholder="Dr. John Doe"
                                        value={formData.parentName}
                                        onChange={(e) => updateFormData('parentName', e.target.value)}
                                    />
                                    <InputGroup
                                        icon={<Users />}
                                        label="Student Name"
                                        placeholder="Master Alex"
                                        value={formData.studentName}
                                        onChange={(e) => updateFormData('studentName', e.target.value)}
                                    />

                                    {/* Campus Select */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Campus</label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-pink-500/10 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                                            <div className="relative flex items-center bg-black/20 border border-white/10 rounded-xl h-12 px-4 transition-all group-focus-within:border-pink-500/50 group-focus-within:bg-black/40">
                                                <div className="text-white/40 group-focus-within:text-pink-400 transition-colors mr-3">
                                                    <School size={20} />
                                                </div>
                                                <select
                                                    className="w-full h-full bg-transparent border-none outline-none text-sm font-medium text-white appearance-none cursor-pointer [&>option]:text-black"
                                                    value={formData.campus}
                                                    onChange={(e) => updateFormData('campus', e.target.value)}
                                                >
                                                    <option value="" disabled>Select Campus</option>
                                                    {campuses.map(c => <option key={c.id} value={c.campusName}>{c.campusName}</option>)}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Grade Select */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">Grade</label>
                                        <div className="relative group">
                                            <div className="absolute inset-0 bg-pink-500/10 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                                            <div className="relative flex items-center bg-black/20 border border-white/10 rounded-xl h-12 px-4 transition-all group-focus-within:border-pink-500/50 group-focus-within:bg-black/40">
                                                <div className="text-white/40 group-focus-within:text-pink-400 transition-colors mr-3">
                                                    <GraduationCap size={20} />
                                                </div>
                                                <select
                                                    className="w-full h-full bg-transparent border-none outline-none text-sm font-medium text-white appearance-none cursor-pointer [&>option]:text-black"
                                                    value={formData.gradeInterested}
                                                    onChange={(e) => updateFormData('gradeInterested', e.target.value)}
                                                >
                                                    <option value="" disabled>Select Grade</option>
                                                    {currentCampusGrades.length > 0 ? (
                                                        currentCampusGrades.map(g => (
                                                            <option key={g} value={g}>{g}</option>
                                                        ))
                                                    ) : (
                                                        <option disabled>Select a Campus first</option>
                                                    )}
                                                </select>
                                            </div>
                                        </div>
                                    </div>

                                    <button
                                        onClick={handleSubmit}
                                        disabled={loading}
                                        className="w-full h-16 rounded-2xl bg-gradient-to-r from-emerald-400 to-emerald-600 text-black font-black text-sm uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all mt-2"
                                    >
                                        {loading ? (
                                            <div className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                Submit Referral
                                                <ShieldCheck size={18} strokeWidth={2.5} />
                                            </>
                                        )}
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>

                    {/* Trust Footer */}
                    <div className="mt-8 flex flex-col items-center gap-3 opacity-50">
                        <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest">
                            <ShieldCheck size={14} />
                            <span>100% Secure & Encrypted</span>
                        </div>
                        <p className="text-[10px] text-center max-w-xs leading-relaxed">
                            Your referral data is processed securely. Beneifts are credited upon successful admission.
                        </p>
                    </div>
                </PageAnimate>
            </div>
        </div>
    )
}

function InputGroup({ icon, label, placeholder, value, onChange }: { icon: any, label: string, placeholder: string, value: string, onChange: (e: any) => void }) {
    return (
        <div className="space-y-1.5">
            <label className="text-[10px] font-bold text-white/40 uppercase tracking-widest pl-1">{label}</label>
            <div className="relative group">
                <div className="absolute inset-0 bg-pink-500/10 rounded-xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500"></div>
                <div className="relative flex items-center bg-black/20 border border-white/10 rounded-xl h-12 px-4 transition-all group-focus-within:border-pink-500/50 group-focus-within:bg-black/40">
                    <div className="text-white/40 group-focus-within:text-pink-400 transition-colors mr-3 [&>svg]:w-5 [&>svg]:h-5">
                        {icon}
                    </div>
                    <input
                        className="w-full h-full bg-transparent border-none outline-none text-sm font-medium text-white placeholder-white/20"
                        placeholder={placeholder}
                        value={value}
                        onChange={onChange}
                    />
                </div>
            </div>
        </div>
    )
}
