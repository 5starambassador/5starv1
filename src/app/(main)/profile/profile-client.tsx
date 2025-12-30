'use client'

import { useState } from 'react'
import { Star, Phone, Award, Calendar, Shield, Edit2, Check, X, Upload, Mail, MapPin, Trash2, ArrowRight } from 'lucide-react'
import { toast } from 'sonner'
import { PrivacyModal } from '@/components/PrivacyModal'
import { requestAccountDeletion } from '@/app/deletion-actions'

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
        <div className="animate-fade-in max-w-4xl mx-auto space-y-8 pb-12">
            {/* Elegant Header Section */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-end',
                paddingBottom: '20px',
                borderBottom: '1px solid var(--border-color)',
                flexWrap: 'wrap',
                gap: '16px'
            }}>
                <div className="flex-1 min-w-[200px]">
                    <h1 style={{ fontSize: '28px', fontWeight: '800', letterSpacing: '-0.5px', marginBottom: '4px' }}>My Profile</h1>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px', lineHeight: '1.4' }}>Essential account information and membership perks</p>
                </div>
                {!isEditing ? (
                    <button
                        onClick={() => setIsEditing(true)}
                        className="btn btn-primary"
                        style={{ width: 'auto', padding: '10px 24px', borderRadius: '12px' }}
                    >
                        <Edit2 size={16} style={{ marginRight: '8px' }} />
                        Edit Profile
                    </button>
                ) : (
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="btn btn-primary"
                            style={{
                                width: 'auto',
                                padding: '10px 24px',
                                background: 'linear-gradient(135deg, #059669 0%, #10B981 100%)',
                                boxShadow: '0 4px 15px rgba(5, 150, 105, 0.3)',
                                borderRadius: '12px'
                            }}
                        >
                            <Check size={16} style={{ marginRight: '8px' }} />
                            {saving ? 'Saving...' : 'Save Changes'}
                        </button>
                        <button
                            onClick={handleCancel}
                            disabled={saving}
                            className="btn btn-outline"
                            style={{ width: 'auto', padding: '10px 24px', borderRadius: '12px' }}
                        >
                            <X size={16} style={{ marginRight: '8px' }} />
                            Cancel
                        </button>
                    </div>
                )}
            </div>

            {/* Profile Hero Card */}
            <div className="card" style={{ padding: '40px', borderRadius: '24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    right: '-50px',
                    width: '300px',
                    height: '300px',
                    background: 'radial-gradient(circle, rgba(204,0,0,0.03) 0%, transparent 70%)',
                    zIndex: 0
                }} />

                <div className="flex flex-col md:flex-row items-center md:items-start gap-10 relative z-10">
                    {/* Avatar Section */}
                    <div style={{ position: 'relative', width: '120px', height: '120px', flexShrink: 0 }} className="group">
                        <div style={{
                            width: '120px',
                            height: '120px',
                            borderRadius: '32px',
                            overflow: 'hidden',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: '800',
                            fontSize: '48px',
                            color: 'white',
                            boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)',
                            border: '4px solid white',
                            background: 'linear-gradient(135deg, #CC0000 0%, #FF6347 100%)'
                        }}>
                            {profileImage ? (
                                <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                fullName ? fullName[0] : 'U'
                            )}
                        </div>

                        <label
                            style={{
                                position: 'absolute',
                                inset: 0,
                                backgroundColor: 'rgba(0,0,0,0.5)',
                                backdropFilter: 'blur(4px)',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                justifyContent: 'center',
                                opacity: 0,
                                cursor: 'pointer',
                                borderRadius: '32px',
                                color: 'white',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                gap: '6px',
                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                            }}
                            className="group-hover:opacity-100"
                        >
                            <Upload size={20} />
                            <span>{uploading ? '...' : 'Update'}</span>
                            <input
                                type="file"
                                style={{ display: 'none' }}
                                accept="image/*"
                                onChange={handlePhotoUpload}
                                disabled={uploading}
                            />
                        </label>

                        {uploading && (
                            <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
                            </div>
                        )}
                    </div>

                    {/* User Info & Main Body */}
                    <div className="flex-1 text-center md:text-left">
                        <div style={{ marginBottom: '28px' }}>
                            {isEditing ? (
                                <div style={{ maxWidth: '400px', margin: '0 auto md:0' }}>
                                    <label style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '1px', display: 'block', marginBottom: '6px' }}>Full Name</label>
                                    <input
                                        type="text"
                                        value={fullName}
                                        onChange={(e) => setFullName(e.target.value)}
                                        className="input"
                                        style={{ fontSize: '18px', fontWeight: '700', padding: '12px 16px' }}
                                    />
                                </div>
                            ) : (
                                <h2 style={{ fontSize: '32px', fontWeight: '800', color: 'var(--text-primary)', marginBottom: '4px' }}>{fullName}</h2>
                            )}

                            <div className="flex items-center justify-center md:justify-start gap-4 mt-2">
                                <span style={{
                                    padding: '6px 14px',
                                    background: 'rgba(204,0,0,0.08)',
                                    color: 'var(--primary-red)',
                                    borderRadius: '10px',
                                    fontSize: '13px',
                                    fontWeight: '700',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '6px'
                                }}>
                                    <Shield size={14} />
                                    {user.role}
                                </span>
                            </div>
                        </div>

                        {/* Info Grid */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                            <div className="flex items-center gap-4">
                                <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                    <Phone size={18} className="text-primary-red" />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Mobile</p>
                                    <p style={{ fontWeight: '700', fontSize: '15px' }}>{user.mobileNumber || user.adminMobile || 'N/A'}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                    <Mail size={18} className="text-primary-red" />
                                </div>
                                <div style={{ textAlign: 'left', flex: 1 }}>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Email ID</p>
                                    {isEditing ? (
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="Not set"
                                            className="input"
                                            style={{ padding: '8px 12px', fontSize: '14px', marginTop: '4px' }}
                                        />
                                    ) : (
                                        <p style={{ fontWeight: '700', fontSize: '15px' }}>{email || 'Not provided'}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-start gap-4">
                                <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                    <MapPin size={18} className="text-primary-red" />
                                </div>
                                <div style={{ textAlign: 'left', flex: 1 }}>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Full Address</p>
                                    {isEditing ? (
                                        <textarea
                                            value={address}
                                            onChange={(e) => setAddress(e.target.value)}
                                            placeholder="Street, City, Zip"
                                            className="input"
                                            style={{ padding: '8px 12px', fontSize: '14px', marginTop: '4px', minHeight: '60px', resize: 'vertical' }}
                                        />
                                    ) : (
                                        <p style={{ fontWeight: '700', fontSize: '14px', color: address ? 'inherit' : 'var(--text-secondary)', lineHeight: '1.4' }}>{address || 'No address set'}</p>
                                    )}
                                </div>
                            </div>

                            <div className="flex items-center gap-4">
                                <div style={{ padding: '10px', background: 'var(--bg-secondary)', borderRadius: '12px' }}>
                                    <Calendar size={18} className="text-primary-red" />
                                </div>
                                <div style={{ textAlign: 'left' }}>
                                    <p style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '600', textTransform: 'uppercase' }}>Member Since</p>
                                    <p style={{ fontWeight: '700', fontSize: '15px' }}>{new Date(user.createdAt).getFullYear()}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Benefits Landscape */}
            {!user.role.includes('Admin') && user.yearFeeBenefitPercent !== undefined && (
                <div style={{ marginTop: '48px' }}>
                    <div className="flex items-center gap-3 mb-6">
                        <div style={{ width: '4px', height: '24px', background: 'var(--primary-red)', borderRadius: '2px' }} />
                        <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Exclusive Membership Benefits</h2>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="card" style={{
                            padding: '30px',
                            borderRadius: '24px',
                            background: 'linear-gradient(135deg, #FFFFFF 0%, #FFF9F9 100%)',
                            border: '1px solid rgba(204,0,0,0.1)'
                        }}>
                            <div className="flex justify-between items-start mb-4">
                                <div style={{ padding: '12px', background: 'rgba(204,0,0,0.05)', borderRadius: '16px' }}>
                                    <Star className="text-primary-red" size={24} />
                                </div>
                                <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', background: 'white', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', textTransform: 'uppercase' }}>Active Reward</span>
                            </div>
                            <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Annual Fee Benefit</h3>
                            <div className="flex items-baseline gap-2 mb-2">
                                <span className="text-4xl font-extrabold text-primary-red">{user.yearFeeBenefitPercent}%</span>
                                <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Credit</span>
                            </div>
                        </div>

                        {user.longTermBenefitPercent !== undefined && (
                            <div className="card" style={{
                                padding: '30px',
                                borderRadius: '24px',
                                background: 'linear-gradient(135deg, #FFFFFF 0%, #F9FFF9 100%)',
                                border: '1px solid rgba(0,184,148,0.1)'
                            }}>
                                <div className="flex justify-between items-start mb-4">
                                    <div style={{ padding: '12px', background: 'rgba(0,184,148,0.05)', borderRadius: '16px' }}>
                                        <Award style={{ color: '#00B894' }} size={24} />
                                    </div>
                                    <span style={{ fontSize: '11px', color: 'var(--text-secondary)', fontWeight: '800', background: 'white', padding: '4px 12px', borderRadius: '20px', border: '1px solid var(--border-color)', textTransform: 'uppercase' }}>Lifetime Status</span>
                                </div>
                                <h3 style={{ fontSize: '18px', fontWeight: '700', marginBottom: '8px' }}>Legacy Multiplier</h3>
                                <div className="flex items-baseline gap-2 mb-2">
                                    <span className="text-4xl font-extrabold" style={{ color: '#00B894' }}>{user.longTermBenefitPercent}%</span>
                                    <span style={{ fontSize: '14px', fontWeight: '600', color: 'var(--text-secondary)' }}>Permanent</span>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Account Management (Google Compliance) */}
            <div style={{ marginTop: '64px', paddingTop: '32px', borderTop: '1px solid var(--border-color)' }}>
                <div className="flex items-center gap-3 mb-6">
                    <div style={{ width: '4px', height: '24px', background: '#EF4444', borderRadius: '2px' }} />
                    <h2 style={{ fontSize: '20px', fontWeight: '800', color: '#EF4444' }}>Danger Zone</h2>
                </div>

                <div className="flex flex-col gap-4">
                    <button
                        onClick={() => {
                            if (confirm('Are you absolutely sure you want to request account deletion?')) {
                                handleDeleteRequest();
                            }
                        }}
                        className="px-6 py-4 bg-red-50 text-red-600 border border-red-100 rounded-2xl font-bold text-sm shadow-sm hover:bg-red-100 transition-all flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-3">
                            <Trash2 size={20} className="group-hover:scale-110 transition-transform" />
                            <span>Request Account Deletion</span>
                        </div>
                        <ArrowRight size={16} />
                    </button>

                    <button
                        onClick={() => setShowPrivacyModal(true)}
                        className="px-6 py-4 bg-gray-50 text-gray-600 border border-gray-100 rounded-2xl font-bold text-sm shadow-sm hover:bg-gray-100 transition-all flex items-center justify-between group"
                    >
                        <div className="flex items-center gap-3">
                            <Shield size={20} className="text-emerald-600" />
                            <span>Privacy & Data Policy</span>
                        </div>
                        <ArrowRight size={16} />
                    </button>
                </div>
            </div>

            {/* Integrity / System Data */}
            <div style={{ marginTop: '48px' }}>
                <div className="flex items-center gap-3 mb-6">
                    <div style={{ width: '4px', height: '24px', background: 'var(--primary-red)', borderRadius: '2px' }} />
                    <h2 style={{ fontSize: '22px', fontWeight: '800' }}>Account Details</h2>
                </div>

                <div className="card" style={{ padding: '0', borderRadius: '24px', overflow: 'hidden' }}>
                    <div style={{ padding: '24px 32px', borderBottom: '1px solid var(--border-color)', background: 'var(--bg-secondary)' }}>
                        <h3 style={{ fontSize: '16px', fontWeight: '700' }}>System Verified Information</h3>
                    </div>
                    <div style={{ padding: '8px 32px' }}>
                        {[
                            { label: 'Role Type', value: user.role, color: 'var(--primary-red)' },
                            { label: 'Network Code', value: user.referralCode || 'N/A', mono: true },
                            { label: 'Campus Association', value: user.assignedCampus || 'Network Wide' },
                            { label: 'Profile Verified', value: 'Yes', check: true }
                        ].map((item, idx) => (
                            <div key={idx} style={{
                                display: 'flex',
                                justifyComtent: 'space-between',
                                padding: '20px 0',
                                borderBottom: idx === 3 ? 'none' : '1px solid var(--border-color)'
                            }}>
                                <span style={{ fontSize: '14px', color: 'var(--text-secondary)', fontWeight: '500' }}>{item.label}</span>
                                <span style={{
                                    fontSize: '15px',
                                    fontWeight: '700',
                                    color: item.color || 'var(--text-primary)',
                                    fontFamily: item.mono ? 'monospace' : 'inherit'
                                }}>{item.value}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
            <PrivacyModal isOpen={showPrivacyModal} onClose={() => setShowPrivacyModal(false)} />
        </div>
    )
}
