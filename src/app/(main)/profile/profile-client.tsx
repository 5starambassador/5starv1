'use client'

import { useState } from 'react'
import { Star, Phone, Award, Calendar, Shield, Edit2, Check, X, Upload, Mail, MapPin, Trash2, ArrowRight, User, Camera, Settings, LogOut, ChevronRight, HelpCircle, CreditCard, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { PrivacyModal } from '@/components/PrivacyModal'
import { requestAccountDeletion } from '@/app/deletion-actions'
import { ConfirmDialog } from '@/components/ui/ConfirmDialog'
import { motion, AnimatePresence } from 'framer-motion'
import { PageAnimate, PageItem } from '@/components/PageAnimate'
import { ScrollLock } from '@/components/ui/ScrollLock'

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
        confirmedReferralCount?: number // Optional if generic user type doesn't strictly enforce it yet
        studentFee?: number
    }
}

export default function ProfileClient({ user }: ProfileClientProps) {
    const [isEditing, setIsEditing] = useState(false)
    const [fullName, setFullName] = useState(user.fullName)
    const [email, setEmail] = useState(user.email || '')
    const [address, setAddress] = useState(user.address || '')
    const [profileImage, setProfileImage] = useState(user.profileImage)
    const [saving, setSaving] = useState(false)
    const [uploading, setUploading] = useState(false)
    const [showPrivacyModal, setShowPrivacyModal] = useState(false)
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

    // Derived or safe default stats
    const referralCount = (user as any).confirmedReferralCount || 0
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
            const response = await fetch('/api/profile/update', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ fullName, email, address })
            })
            if (response.ok) {
                setIsEditing(false)
                toast.success('Profile updated successfully')
                window.location.reload()
            } else {
                toast.error('Failed to update profile')
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
        setIsEditing(false)
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

                    {!isEditing && (
                        <button
                            onClick={() => setIsEditing(true)}
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

                {/* Edit Form or Menu List */}
                <div className="space-y-4">
                    {isEditing ? (
                        <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-4">
                                <h3 className="text-sm font-bold text-white/60 uppercase tracking-wide mb-2">Edit Details</h3>

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
                                    <textarea
                                        value={address}
                                        onChange={(e) => setAddress(e.target.value)}
                                        placeholder="Add your address"
                                        rows={3}
                                        className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-amber-500/50 focus:outline-none transition-colors resize-none"
                                    />
                                </div>

                                {/* Staff Child Details - Only if "Child in Achariya" is true (from DB, not editable here for simplicity, or we can make it editable) */}
                                {/* Assuming we want to allow them to fill it if it's missing but they marked it as Yes, or if they want to update it */}
                                {/* Checking user.role to be safe */}
                                {user.role === 'Staff' && (
                                    <div className="pt-4 border-t border-white/10 space-y-4">
                                        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wide">Child Details (Achariya)</h3>

                                        <div className="space-y-1.5">
                                            <label className="text-xs font-bold text-white/40 ml-1">Child ERP No</label>
                                            <input
                                                type="text"
                                                value={(user as any).childEprNo || ''}
                                                // We need distinct state for these, adding them to component state next...
                                                disabled={true}
                                                placeholder="Please contact admin to update"
                                                className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-3 text-white/50 cursor-not-allowed"
                                            />
                                            <p className="text-[9px] text-white/30 ml-1">To update child details, please contact your Campus Head.</p>
                                        </div>
                                    </div>
                                )}

                                <button
                                    onClick={handleSave}
                                    disabled={saving}
                                    className="w-full py-4 rounded-xl bg-gradient-to-r from-emerald-500 to-emerald-700 text-white font-bold uppercase tracking-widest shadow-lg shadow-emerald-500/20 flex items-center justify-center gap-2 mt-4"
                                >
                                    {saving ? 'Saving...' : 'Save Changes'}
                                    {!saving && <Check size={18} />}
                                </button>
                            </div>
                        </div>
                    ) : (
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

                                <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-4 hover:bg-white/10 transition-colors group">
                                    <div className="w-10 h-10 rounded-full bg-teal-500/10 text-teal-400 flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Calendar size={18} />
                                    </div>
                                    <div className="flex-1">
                                        <p className="text-[10px] text-white/40 font-black uppercase tracking-widest mb-0.5">Member Since</p>
                                        <p className="text-sm font-bold text-white tracking-tight">{new Date(user.createdAt).getFullYear()}</p>
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

                {/* Sign Out (Visual Only - Logic handled by sidebar usually, but good to have) */}
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

            </PageAnimate>

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
