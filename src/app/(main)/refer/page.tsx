'use client'

import { useState } from 'react'
import { submitReferral, sendReferralOtp, verifyReferralOtp } from '@/app/referral-actions'
import { useRouter } from 'next/navigation'
import { ArrowLeft, CheckCircle, ChevronRight, Lock, Phone, User, School, GraduationCap, Users, Smartphone } from 'lucide-react'
import { toast } from 'sonner'

export default function ReferPage() {
    const router = useRouter()
    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [otpSent, setOtpSent] = useState(false)
    const [otp, setOtp] = useState('')

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

    const handleSendOtp = async () => {
        if (!formData.parentMobile || formData.parentMobile.length < 10) {
            toast.error('Please enter a valid mobile number')
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
            toast.error('Failed to send OTP')
        }
    }

    const handleVerifyOtp = async () => {
        if (!otp) return toast.error('Please enter OTP')
        setLoading(true)
        const res = await verifyReferralOtp(formData.parentMobile, otp)
        setLoading(false)

        if (res.success) {
            toast.success('Mobile verified!')
            setStep(3)
        } else {
            toast.error('Invalid OTP. Please try again.')
        }
    }

    const handleSubmit = async () => {
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
            toast.error(res.error || 'Failed to submit referral')
        }
    }

    return (
        <div className="animate-fade-in max-w-lg m-auto">
            <div className="bg-white rounded-2xl shadow-xl p-8 w-full border border-gray-100">
                <h1 className="text-3xl font-bold mb-2 text-[#111827]">Referral</h1>
                <p className="text-text-secondary text-sm mb-6">Step {step} of 3</p>

                {/* Progress Bar */}
                <div className="flex gap-2 mb-8">
                    <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-primary-gold' : 'bg-gray-200'}`}></div>
                    <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-primary-gold' : 'bg-gray-200'}`}></div>
                    <div className={`h-1 flex-1 rounded-full ${step >= 3 ? 'bg-primary-gold' : 'bg-gray-200'}`}></div>
                </div>

                <div className="space-y-6">

                    {/* STEP 1: Parent Mobile */}
                    {step === 1 && (
                        <div className="animate-fade-in space-y-4">
                            <div className="input-group">
                                <label className="label">Parent Mobile Number / மொபைல் எண்</label>
                                <div className="input-group-wrapper">
                                    <div className="flex items-center justify-center pl-6 pr-6 pointer-events-none">
                                        <Smartphone className="input-icon" size={24} strokeWidth={1.5} style={{ color: '#6B7280' }} />
                                    </div>
                                    <input
                                        type="tel"
                                        className="w-full h-full bg-transparent border-none outline-none text-base text-black placeholder-gray-400 focus:ring-0 focus:outline-none"
                                        style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}
                                        value={formData.parentMobile}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '').slice(0, 10);
                                            setFormData({ ...formData, parentMobile: value });
                                        }}
                                        placeholder="9876543210"
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <button
                                className="btn btn-primary w-full flex items-center justify-center gap-2"
                                onClick={handleSendOtp}
                                disabled={loading}
                            >
                                {loading ? 'Sending...' : 'Get OTP'} <ChevronRight size={18} />
                            </button>
                        </div>
                    )}

                    {/* STEP 2: OTP Verification */}
                    {step === 2 && (
                        <div className="animate-fade-in space-y-4">
                            <div className="bg-blue-50 text-blue-700 px-4 py-3 rounded-lg text-sm mb-4">
                                OTP sent to <b>{formData.parentMobile}</b>
                            </div>
                            <div className="input-group">
                                <label className="label">Enter OTP / ஓடிபி</label>
                                <div className="input-group-wrapper">
                                    <div className="flex items-center justify-center pl-6 pr-6 pointer-events-none">
                                        <Lock className="input-icon" size={24} strokeWidth={1.5} style={{ color: '#6B7280' }} />
                                    </div>
                                    <input
                                        type="text"
                                        className="w-full h-full bg-transparent border-none outline-none text-center tracking-[0.5em] font-bold text-xl text-black placeholder-gray-400 focus:ring-0 focus:outline-none"
                                        style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}
                                        value={otp}
                                        onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                        placeholder="123456"
                                        maxLength={6}
                                        autoFocus
                                    />
                                </div>
                            </div>
                            <button
                                className="btn btn-primary w-full"
                                onClick={handleVerifyOtp}
                                disabled={loading}
                            >
                                {loading ? 'Verifying...' : 'Verify & Proceed'}
                            </button>
                            <button
                                className="w-full text-center text-sm text-text-secondary hover:text-primary-gold mt-2 underline"
                                onClick={() => setStep(1)}
                            >
                                Change Mobile Number
                            </button>
                        </div>
                    )}

                    {/* STEP 3: Details */}
                    {step === 3 && (
                        <div className="animate-fade-in space-y-4">
                            <div className="input-group">
                                <label className="label">Parent Name / பெற்றோரின் பெயர்</label>
                                <div className="input-group-wrapper">
                                    <div className="flex items-center justify-center pl-6 pr-6 pointer-events-none">
                                        <User className="input-icon" size={24} strokeWidth={1.5} style={{ color: '#6B7280' }} />
                                    </div>
                                    <input
                                        className="w-full h-full bg-transparent border-none outline-none text-base text-black placeholder-gray-400 focus:ring-0 focus:outline-none"
                                        style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}
                                        value={formData.parentName}
                                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                                        placeholder="Enter parent name"
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="label">Student Name / மாணவர் பெயர்</label>
                                <div className="input-group-wrapper">
                                    <div className="flex items-center justify-center pl-6 pr-6 pointer-events-none">
                                        <Users className="input-icon" size={24} strokeWidth={1.5} style={{ color: '#6B7280' }} />
                                    </div>
                                    <input
                                        className="w-full h-full bg-transparent border-none outline-none text-base text-black placeholder-gray-400 focus:ring-0 focus:outline-none"
                                        style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}
                                        value={formData.studentName}
                                        onChange={(e) => setFormData({ ...formData, studentName: e.target.value })}
                                        placeholder="Enter student name"
                                    />
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="label">Campus</label>
                                <div className="input-group-wrapper">
                                    <div className="flex items-center justify-center pl-6 pr-6 pointer-events-none">
                                        <School className="input-icon" size={24} strokeWidth={1.5} style={{ color: '#6B7280' }} />
                                    </div>
                                    <select
                                        className="w-full h-full bg-transparent border-none outline-none text-base text-black appearance-none focus:ring-0 focus:outline-none"
                                        style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}
                                        value={formData.campus}
                                        onChange={(e) => setFormData({ ...formData, campus: e.target.value })}
                                    >
                                        {campuses.map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="input-group">
                                <label className="label">Grade Interested</label>
                                <div className="input-group-wrapper">
                                    <div className="flex items-center justify-center pl-6 pr-6 pointer-events-none">
                                        <GraduationCap className="input-icon" size={24} strokeWidth={1.5} style={{ color: '#6B7280' }} />
                                    </div>
                                    <select
                                        className="w-full h-full bg-transparent border-none outline-none text-base text-black appearance-none focus:ring-0 focus:outline-none"
                                        style={{ border: 'none', boxShadow: 'none', background: 'transparent' }}
                                        value={formData.gradeInterested}
                                        onChange={(e) => setFormData({ ...formData, gradeInterested: e.target.value })}
                                    >
                                        <option value="" disabled>Select Grade</option>
                                        {['Pre Mont', 'Mont-1', 'Mont-2', ...Array.from({ length: 9 }, (_, i) => `Grade-${i + 1}`), 'Grade-11'].map(g => (
                                            <option key={g} value={g}>{g}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            <button className="btn btn-primary w-full mt-4" onClick={handleSubmit} disabled={loading}>
                                {loading ? 'Submitting...' : 'Submit Referral'}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
