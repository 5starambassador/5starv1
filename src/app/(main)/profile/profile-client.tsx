'use client'

import { useState, useEffect } from 'react'
import { Star, Phone, Award, Calendar, Shield, Edit2, Check, X, Upload, Mail, MapPin, Trash2, ArrowRight, User, Camera, Settings, LogOut, ChevronRight, HelpCircle, CreditCard, Lock, Smartphone, Download, GraduationCap } from 'lucide-react'
import { toast } from 'sonner'
import { PrivacyModal } from '@/components/PrivacyModal'
import { requestAccountDeletion } from '@/app/deletion-actions'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import { PageAnimate, PageItem } from '@/components/PageAnimate'
import { ScrollLock } from '@/components/ui/ScrollLock'
import { GRADES } from '@/lib/constants'
import { getCampuses } from '@/app/campus-actions'
import { ifscSchema, accountNumberSchema } from '@/lib/validators'

interface ProfileClientProps {
    user: {
        userId?: number
        adminId?: number
        fullName: string
        mobileNumber?: string
        adminMobile?: string
        role: string
        referralCode?: string
        assignedCampus?: string
        yearFeeBenefitPercent?: number
        longTermBenefitPercent?: number
        profileImage?: string
        email?: string
        address?: string
        createdAt: string
        confirmedReferralCount?: number
        studentFee?: number
        // New fields
        childName?: string
        grade?: string
        childEprNo?: string
        childCampusId?: number
        empId?: string
        transactionId?: string
        status?: string
        benefitStatus?: string
        bankName?: string
        accountNumber?: string
        ifscCode?: string
    }
}

import { useRouter } from 'next/navigation'

export default function ProfileClient({ user }: ProfileClientProps) {
    const router = useRouter()
    const [isEditingProfile, setIsEditingProfile] = useState(false)
    const [isEditingBank, setIsEditingBank] = useState(false)
    const [fullName, setFullName] = useState(user.fullName)
    const [email, setEmail] = useState(user.email || '')
    const [address, setAddress] = useState(user.address || '')
    const [bankName, setBankName] = useState(user.bankName || '')
    const [accountNumber, setAccountNumber] = useState(user.accountNumber || '')
    const [ifscCode, setIfscCode] = useState(user.ifscCode || '')

    const [childEprNo, setChildEprNo] = useState(user.childEprNo || '')
    const [grade, setGrade] = useState(user.grade || '')
    const [profileImage, setProfileImage] = useState(user.profileImage)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [showPrivacyModal, setShowPrivacyModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [campuses, setCampuses] = useState<any[]>([])
    const [childCampusId, setChildCampusId] = useState<string>(
        user.childCampusId ? user.childCampusId.toString() : ''
    )

    useEffect(() => {
        const fetchCampuses = async () => {
            const res = await getCampuses()
            if (res.success && res.campuses) {
                setCampuses(res.campuses)
            }
        }
        if (user.role === 'Staff') fetchCampuses()
    }, [user.role])

    // Derived or safe default stats
    const referralCount = user.confirmedReferralCount || 0
    // Use projectedValue passed from server side calculations (Matches Dashboard Projected Growth)
    const totalEarned = (user as any).projectedValue !== undefined ? (user as any).projectedValue : 0

    const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file) return

        const reader = new FileReader()
        reader.onloadend = async () => {
            const base64String = reader.result as string
            setUploading(true)
            try {
                const response = await fetch('/api/profile/upload', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ image: base64String })
                })
                if (response.ok) {
                    setProfileImage(base64String)
                    toast.success('Photo updated successfully')
                } else {
                    toast.error('Failed to upload photo')
                }
            } catch (error) {
                toast.error('Error uploading photo')
            } finally {
                setUploading(false)
            }
        }
        reader.readAsDataURL(file)
    }

    const handleSave = async () => {
        setSaving(true)
        try {
            const body = {
                fullName,
                email,
                address,
                ...(isEditingProfile && user.role === 'Staff' && {
                    childEprNo,
                    grade,
                    childCampusId: childCampusId ? parseInt(childCampusId) : undefined
                }),
                ...(isEditingBank && {
                    bankName,
                    accountNumber,
                    ifscCode,
                })
            }

            if (isEditingBank) {
                if (ifscCode) {
                    const result = ifscSchema.safeParse(ifscCode)
                    if (!result.success) {
                        toast.error(result.error.issues[0].message)
                        setSaving(false)
                        return
                    }
                }
                if (accountNumber) {
                    const result = accountNumberSchema.safeParse(accountNumber)
                    if (!result.success) {
                        toast.error(result.error.issues[0].message)
                        setSaving(false)
                        return
                    }
                }
            }

            const response = await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })
            if (response.ok) {
                toast.success('Profile updated successfully')
                setIsEditingProfile(false)
                setIsEditingBank(false)
                router.refresh()
            } else {
                const data = await response.json()
                // Show specific functionality error if available
                toast.error(data.details || data.error || 'Failed to update profile')
                console.error('Update failed:', data)
            }
        } catch {
            toast.error('Error updating profile')
        } finally {
            setSaving(false)
        }
    }

    const handleCancel = () => {
        setFullName(user.fullName)
        setEmail(user.email || '')
        setAddress(user.address || '')
        setBankName((user as any).bankName || '')
        setAccountNumber((user as any).accountNumber || '')
        setIfscCode((user as any).ifscCode || '')
        setChildEprNo((user as any).childEprNo || '')
        setGrade((user as any).grade || '')
        setIsEditingProfile(false)
        setIsEditingBank(false)
    }

    const handleDeleteRequest = async () => {
        const res = await requestAccountDeletion();
        if (res.success) {
            toast.success('Deletion request submitted to Super Admin.');
        } else {
            toast.error(res.error || 'Failed to submit request');
        }
    }

    return (
        <div className="fixed inset-0 w-full h-full overflow-y-auto bg-[#0f172a] z-[100] font-[family-name:var(--font-outfit)] overscroll-y-contain">
            <ScrollLock />
            {/* Force Dark Background Overlay to override global layout */}
            {/* Force Dark Background Overlay to override global layout */}
            <div className="absolute inset-0 bg-slate-900 z-0">
                {/* Brightness Booster Layer */}
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-slate-900/50 to-slate-900 z-0 opacity-100" />
            </div>

            {/* Ambient Background Effects */}
            <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden">
                <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-500/20 rounded-full blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[400px] h-[400px] bg-purple-500/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[600px] h-[600px] bg-indigo-500/10 rounded-full blur-[120px]" />
            </div>

            {/* Main Content Container - Aggressively Centered for Visible Gaps */}
            <PageAnimate className="relative z-10 w-[90%] max-w-sm mx-auto flex flex-col pb-24 top-0">
                {/* SAFE SPACER - Forces content down below fixed headers */}
                <div className="w-full h-14 shrink-0" />

                <header className="py-6 flex items-center justify-between pl-2 relative">
                    <h1 className="text-xl font-black text-white tracking-tight uppercase">My Profile</h1>

                    {!isEditingProfile && !isEditingBank && (
                        <button
                            onClick={() => setIsEditingProfile(true)}
                            className="absolute top-6 right-0 w-10 h-10 rounded-full bg-white/20 border border-white/50 flex items-center justify-center z-[9999] shadow-md active:scale-95"
                            aria-label="Edit Profile"
                        >
                            <svg
                                width="20"
                                height="20"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="#ffffff"
                                strokeWidth="2.5"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="drop-shadow-sm"
                            >
                                <path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path>
                            </svg>
                        </button>
                    )}
                </header>

                {/* Hero Section */}
                <div className="flex flex-col items-center py-6">
                    {/* Avatar with Gold Ring */}
                    <div className="relative mb-6 group">
                        <div className="absolute -inset-1 bg-gradient-to-tr from-amber-300 to-amber-600 rounded-full blur opacity-70 animate-pulse"></div>
                        <div className="relative w-28 h-28 rounded-full border-4 border-[#0f172a] bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center overflow-hidden shadow-2xl">
                            {profileImage ? (
                                <img src={profileImage} alt="Profile" className="w-full h-full object-cover" />
                            ) : (
                                <span className="text-3xl font-bold text-white">{fullName ? fullName.charAt(0) : <User />}</span>
                            )}
                        </div>

                        {/* Upload Button */}
                        <label className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-amber-500 text-black flex items-center justify-center border-4 border-[#0f172a] shadow-lg cursor-pointer hover:bg-amber-400 transition-colors">
                            <Camera size={14} />
                            <input
                                type="file"
                                className="hidden"
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                disabled={uploading}
                            />
                        </label>
                        {uploading && (
                            <div className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full">
                                <div className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            </div>
                        )}
                    </div>

                    <h2 className="text-2xl font-black text-white mb-1 text-center tracking-tight">{fullName}</h2>

                    {user.yearFeeBenefitPercent !== undefined && (
                        <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
                            <Star size={12} className="text-amber-400 fill-amber-400" />
                            <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                                {referralCount >= 5 ? 'Prestigious Partner' : 'Ambassador'}
                            </span>
                        </div>
                    )}

                    {/* Stats Row */}
                    <div className="w-full grid grid-cols-2 gap-4 mb-8">
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center backdrop-blur-sm">
                            <span className="text-2xl font-bold text-white mb-0.5">{referralCount}</span>
                            <span className="text-[10px] text-white/50 uppercase tracking-wider font-medium">Total Referrals</span>
                        </div>
                        <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex flex-col items-center text-center backdrop-blur-sm relative overflow-hidden">
                            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 to-transparent pointer-events-none" />
                            <span className="text-2xl font-bold text-amber-400 mb-0.5">₹{totalEarned.toLocaleString('en-IN')}</span>
                            <span className="text-[10px] text-amber-200/50 uppercase tracking-wider font-medium">Est. Value</span>
                        </div>
                    </div>
                </div>

                {/* Student Details Card (For Parents & Staff with Linked Children) */}
                {((user as any).childName || (user as any).childEprNo) && (
                    <div className="w-full mb-6">
                        <div className="bg-gradient-to-br from-indigo-900/40 to-slate-900/40 border border-indigo-500/20 rounded-2xl p-5 relative overflow-hidden group">
                            {/* Decorative Glow */}
                            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 rounded-full blur-3xl group-hover:bg-indigo-500/20 transition-colors" />

                            <div className="flex items-start justify-between mb-4 relative z-10">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-full bg-indigo-500/20 flex items-center justify-center text-indigo-300 font-bold text-lg border border-indigo-500/30">
                                        <GraduationCap size={20} />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-white uppercase tracking-wide">Student Details</h3>
                                        <div className="flex items-center gap-1.5 mt-0.5">
                                            <div className={`w-1.5 h-1.5 rounded-full ${(user as any).benefitStatus === 'Active' ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
                                            <span className={`text-[10px] font-bold uppercase tracking-wider ${(user as any).benefitStatus === 'Active' ? 'text-emerald-400' : 'text-amber-400'}`}>
                                                {(user as any).benefitStatus === 'Active' ? 'Verified Benefit' : 'Pending Verification'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-y-3 gap-x-2 relative z-10">
                                <div>
                                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Student Name</p>
                                    <p className="text-sm font-bold text-white tracking-tight truncate">{(user as any).childName || 'Pending...'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Grade</p>
                                    <p className="text-sm font-bold text-white tracking-tight">{(user as any).grade || 'N/A'}</p>
                                </div>
                                <div>
                                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-0.5">ERP Number</p>
                                    <p className="text-xs font-mono text-indigo-300 font-bold tracking-wider">{(user as any).childEprNo || 'N/A'}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[9px] text-white/40 font-bold uppercase tracking-widest mb-0.5">Campus</p>
                                    {/* Assuming assignedCampus or we might need mapped campus name if we saved it differently? Usually assignedCampus is good enough for display */}
                                    <p className="text-xs font-bold text-white tracking-tight truncate">{(user as any).assignedCampus || 'Achariya'}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {/* Staff: Prompt to Link Child if Missing */}
                {user.role === 'Staff' && !(user as any).childName && !(user as any).childEprNo && (
                    <button
                        onClick={() => setIsEditingProfile(true)}
                        className="w-full mb-6 group relative overflow-hidden rounded-2xl p-[1px] focus:outline-none"
                    >
                        <span className="absolute inset-0 bg-gradient-to-r from-amber-400/50 via-amber-200/50 to-amber-400/50 opacity-100 group-hover:opacity-100 animate-gradient-xy transition-opacity" />
                        <div className="relative bg-slate-900 rounded-2xl p-5 flex items-center gap-4 transition-transform group-active:scale-[0.98]">
                            <div className="w-12 h-12 rounded-full bg-amber-400/10 text-amber-400 flex items-center justify-center shrink-0 border border-amber-400/20 group-hover:bg-amber-400 group-hover:text-black transition-colors">
                                <Shield size={24} strokeWidth={2.5} />
                            </div>
                            <div className="flex-1 text-left">
                                <h3 className="text-sm font-black text-amber-400 uppercase tracking-wide group-hover:text-white transition-colors">Link Child Details</h3>
                                <p className="text-[10px] text-white/50 font-medium leading-tight mt-0.5">
                                    Claim your <strong>School Fee Discount</strong> by linking your child's ERP details.
                                </p>
                            </div>
                            < ChevronRight size={18} className="text-amber-400/50 group-hover:text-white transition-colors" />
                        </div>
                    </button>
                )}

                {/* Edit Form or Menu List */}
                <div className="space-y-4">
                    {/* PROFILE EDIT MODE */}
                    {isEditingProfile ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-white/60 uppercase tracking-wide">Edit Personal Details</h3>
                                    <button onClick={handleCancel} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                                        <X size={14} className="text-white/60" />
                                    </button>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 ml-1">Full Name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none transition-colors"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 ml-1">Email</label>
                                    <input
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Add email address"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none transition-colors"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 ml-1">Address</label>
                                    <textarea
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Add your address"
                                        rows={3}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none transition-colors resize-none"
                                    />
                                </div>

                                {/* Child Details Section for Staff */}
                                {user.role === 'Staff' && (
                                    <div className="pt-4 border-t border-white/10 space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide">Child Details (Achariya)</h3>
                                            {(user as any).benefitStatus === 'Active' && (
                                                <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                                                    <Lock size={10} className="text-emerald-400" />
                                                    <span className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Verified & Locked</span>
                                                </div>
                                            )}
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-white/40 ml-1">Child ERP No</label>
                                            <input
                                                type="text"
                                                value={childEprNo}
                                                onChange={(e) => setChildEprNo(e.target.value)}
                                                placeholder="Enter ERP Number"
                                                disabled={(user as any).benefitStatus === 'Active'}
                                                className={`w-full bg-black/20 border rounded-xl px-4 py-3 text-white transition-colors focus:outline-none ${(user as any).benefitStatus === 'Active' ? 'border-transparent opacity-50 cursor-not-allowed' : 'border-white/10 focus:border-amber-500/50'}`}
                                            />
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-white/40 ml-1">Campus</label>
                                            <select
                                                value={childCampusId}
                                                onChange={(e) => {
                                                    setChildCampusId(e.target.value)
                                                    setGrade('') // Reset grade on campus change
                                                }}
                                                disabled={(user as any).benefitStatus === 'Active'}
                                                className={`w-full bg-black/20 border rounded-xl px-4 py-3 text-white transition-colors appearance-none ${(user as any).benefitStatus === 'Active' ? 'border-transparent opacity-50 cursor-not-allowed' : 'border-white/10 focus:border-amber-500/50 cursor-pointer'}`}
                                            >
                                                <option value="" className="bg-slate-900 text-white/50">Select Campus</option>
                                                {campuses.map(c => (
                                                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">{c.campusName}</option>
                                                ))}
                                            </select>
                                        </div>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-white/40 ml-1">Grade</label>
                                            <select
                                                value={grade}
                                                onChange={(e) => setGrade(e.target.value)}
                                                disabled={(user as any).benefitStatus === 'Active' || !childCampusId}
                                                className={`w-full bg-black/20 border rounded-xl px-4 py-3 text-white transition-colors appearance-none ${(user as any).benefitStatus === 'Active' || !childCampusId ? 'border-transparent opacity-50 cursor-not-allowed' : 'border-white/10 focus:border-amber-500/50 cursor-pointer'}`}
                                            >
                                                {/* Copied from previous logic, simplified for brevity here, reused same logic */}
                                                <option value="" className="bg-slate-900 text-white/50">
                                                    {!childCampusId ? 'Select Campus First' : 'Select Grade'}
                                                </option>
                                                {(() => {
                                                    const selectedCampus = campuses.find(c => c.id.toString() === childCampusId)

                                                    // If no campus found or no grades defined, show all GRADES (Fail Open)
                                                    if (!selectedCampus || !selectedCampus.grades) {
                                                        return GRADES.map(g => (
                                                            <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                                                        ))
                                                    }

                                                    // Normalize helper: Standardize to lowercase alphanumeric only (Grade-1 == Grade 1 == grade1)
                                                    const normalize = (s: string) => s.replace(/[^a-zA-Z0-9]/g, '').toLowerCase()

                                                    const campusGradesRaw = selectedCampus.grades.split(',').map((g: string) => normalize(g))

                                                    // Filter GRADES constant
                                                    const filtered = GRADES.filter(g => campusGradesRaw.includes(normalize(g)))

                                                    // Fallback: If strict matching returns nothing, show all GRADES to avoid blocking user
                                                    // This handles huge data mismatches
                                                    if (filtered.length === 0) {
                                                        return GRADES.map(g => (
                                                            <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                                                        ))
                                                    }

                                                    return filtered.map(g => (
                                                        <option key={g} value={g} className="bg-slate-900 text-white">{g}</option>
                                                    ))
                                                })()}
                                            </select>
                                        </div>

                                        {(user as any).benefitStatus !== 'Active' ? (
                                            <p className="text-[9px] text-amber-200/60 ml-1 flex items-center gap-1.5 bg-amber-500/5 p-2 rounded-lg border border-amber-500/10">
                                                <Shield size={10} />
                                                Updating these details will reset your benefit status to <strong>Pending Verification</strong> until approved by Admin.
                                            </p>
                                        ) : (
                                            <p className="text-[9px] text-emerald-200/60 ml-1 flex items-center gap-1.5 bg-emerald-500/5 p-2 rounded-lg border border-emerald-500/10">
                                                <Shield size={10} />
                                                These details are verified. Contact Admin to request changes.
                                            </p>
                                        )}
                                    </div>
                                )}

                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-4"
                                >
                                    {saving ? 'Saving...' : 'Save Profile Only'}
                                    {!saving && <Check size={18} />}
                                </button>
                            </div>
                        </div>
                    ) : isEditingBank ? (
                        /* BANK EDIT MODE */
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                <div className="flex items-center justify-between">
                                    <h3 className="text-sm font-bold text-emerald-400 uppercase tracking-wide">Edit Bank Details</h3>
                                    <button onClick={handleCancel} className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors">
                                        <X size={14} className="text-white/60" />
                                    </button>
                                </div>

                                <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl flex items-start gap-3">
                                    <Shield size={16} className="text-emerald-400 mt-0.5 shrink-0" />
                                    <p className="text-[10px] text-emerald-200/80 leading-relaxed">
                                        These details are Encrypted & Secure. They will be used for your payout processing.
                                    </p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 ml-1">Bank Name</label>
                                    <input
                                        type="text"
                                        value={bankName}
                                        onChange={(e) => setBankName(e.target.value)}
                                        placeholder="e.g. HDFC Bank"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none transition-colors"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 ml-1">Account Number</label>
                                    <input
                                        type="text"
                                        value={accountNumber}
                                        onChange={(e) => setAccountNumber(e.target.value)}
                                        placeholder="Enter Account No."
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none transition-colors"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-white/40 ml-1">IFSC Code</label>
                                    <input
                                        type="text"
                                        value={ifscCode}
                                        onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                                        placeholder="e.g. HDFC0001234"
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none transition-colors uppercase"
                                    />
                                </div>

                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-4"
                                >
                                    {saving ? 'Saving...' : 'Update Bank Details'}
                                    {!saving && <Check size={18} />}
                                </button>
                            </div>
                        </div>
                    ) : (
                        /* READ ONLY MODE */
                        <>
                            {/* Read-Only Menu Links - Separated Cards for Premium Feel */}
                            <div className="flex flex-col gap-4">
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors group">
                                    <div className="w-10 h-10 rounded-full bg-blue-500/10 text-blue-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Phone size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-0.5">Mobile</p>
                                        <p className="text-sm font-bold text-white tracking-tight">{user.mobileNumber || user.adminMobile || 'N/A'}</p>
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors group">
                                    <div className="w-10 h-10 rounded-full bg-purple-500/10 text-purple-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Mail size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-0.5">Email</p>
                                        <p className="text-sm font-bold text-white tracking-tight">{email || 'Not provided'}</p>
                                    </div>
                                </div>

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors group">
                                    <div className="w-10 h-10 rounded-full bg-pink-500/10 text-pink-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <MapPin size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-0.5">Location</p>
                                        <p className="text-sm font-bold text-white tracking-tight truncate max-w-[200px]">{address || 'No address set'}</p>
                                    </div>
                                </div>

                                {/* Bank Details Read-Only Card */}
                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors group relative">
                                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <CreditCard size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center justify-between">
                                            <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-0.5">Bank Details</p>
                                            <button
                                                onClick={() => setIsEditingBank(true)}
                                                className="p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/40 hover:text-emerald-400 transition-colors"
                                                title="Edit Bank Details"
                                            >
                                                <Edit2 size={12} />
                                            </button>
                                        </div>
                                        {bankName || accountNumber ? (
                                            <div className="text-xs text-white/80 font-mono tracking-tight">
                                                <p>{bankName}</p>
                                                <p>{accountNumber}</p>
                                                <p className="text-white/40 text-[10px]">{ifscCode}</p>
                                            </div>
                                        ) : (
                                            <div className="flex items-center justify-between">
                                                <p className="text-sm font-bold text-white/50 tracking-tight">Not Provided</p>
                                                <button
                                                    onClick={() => setIsEditingBank(true)}
                                                    className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider hover:underline"
                                                >
                                                    Add Now
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Danger Zone Links */}
                            <div className="space-y-4 pt-2">
                                <button
                                    onClick={() => setShowPrivacyModal(true)}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-amber-500/10 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Shield size={18} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-white text-sm">Privacy & Security</h3>
                                            <p className="text-[10px] text-white/40 uppercase tracking-widest">Manage data & policies</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-white/20 group-hover:text-white/50 transition-colors" />
                                </button>
                                <button
                                    onClick={() => setShowDeleteConfirm(true)}
                                    className="w-full flex items-center justify-between p-4 rounded-2xl bg-red-500/5 border border-red-500/10 hover:bg-red-500/10 hover:border-red-500/20 transition-all group active:scale-[0.98]"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-red-500/10 text-red-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                            <Trash2 size={18} />
                                        </div>
                                        <div className="text-left">
                                            <h3 className="font-bold text-red-400 text-sm">Delete Account</h3>
                                            <p className="text-[10px] text-red-400/50 uppercase tracking-widest">Permanent action</p>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} className="text-red-400/20 group-hover:text-red-400/50 transition-colors" />
                                </button>
                            </div>
                        </>
                    )}
                </div>

                {/* App Download / PWA Section */}
                <div className="pt-8 space-y-4">
                    <div className="bg-gradient-to-br from-blue-600/20 to-indigo-600/20 backdrop-blur-xl border border-blue-500/20 rounded-3xl p-6 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/10 rounded-full blur-3xl pointer-events-none group-hover:bg-blue-500/20 transition-colors" />

                        <div className="flex items-start gap-4 mb-6">
                            <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                <Smartphone size={24} />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-sm font-black text-white uppercase tracking-tight mb-1">Achariya Mobile App</h3>
                                <p className="text-[10px] text-white/50 leading-relaxed font-medium">
                                    Install our official app for a faster experience, offline access, and instant notifications.
                                </p>
                            </div>
                        </div>

                        <button
                            onClick={() => {
                                // Dispatch custom event to trigger global install prompt if available
                                window.dispatchEvent(new CustomEvent('trigger-PWA-install'));
                                toast.info('Click "Install" in the browser prompt or add to Home Screen', {
                                    description: 'iOS users: Tap Share (□↑) and "Add to Home Screen"'
                                });
                            }}
                            className="w-full bg-blue-600 hover:bg-blue-500 text-white h-12 rounded-xl font-bold text-xs uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 active:scale-95 transition-all"
                        >
                            <Download size={16} />
                            Download App
                        </button>
                    </div>
                </div>

                {/* Sign Out */}
                <div className="pt-8 pb-4">
                    <form action="/auth/signout" method="post">
                        <button className="w-full h-14 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center gap-2 font-bold transition-all active:scale-95 text-xs uppercase tracking-widest">
                            <LogOut size={16} />
                            Sign Out
                        </button>
                    </form>
                    <p className="text-center text-[10px] text-white/20 mt-6 uppercase tracking-widest">
                        Achariya Partnership Program • v2.5.0
                    </p>
                </div>

            </PageAnimate >

            <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />

            <ConfirmDialog
                isOpen={showDeleteConfirm}
                title="Delete Account?"
                description={
                    <div className="space-y-2">
                        <p className="font-medium text-white/80">Are you absolutely sure?</p>
                        <p className="text-sm text-white/60">This will permanently remove your account and all associated data. This action cannot be undone.</p>
                    </div>
                }
                confirmText="Delete My Account"
                variant="danger"
                onConfirm={() => {
                    setShowDeleteConfirm(false);
                    handleDeleteRequest();
                }}
                onCancel={() => setShowDeleteConfirm(false)}
            />
        </div >
    )
}
