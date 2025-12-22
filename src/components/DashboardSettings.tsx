'use client'

import { useState } from 'react'
import { Save, Share2, Smartphone, Loader2, CheckCircle2, AlertTriangle, LayoutDashboard } from 'lucide-react'
import { updateSystemSettings } from '@/app/settings-actions'
import { useRouter } from 'next/navigation'

interface DashboardSettingsProps {
    type: 'staff' | 'parent'
    initialSettings: {
        welcomeMessage?: string
        referralText?: string
    }
}

export default function DashboardSettings({ type, initialSettings }: DashboardSettingsProps) {
    const router = useRouter()
    const [welcomeMessage, setWelcomeMessage] = useState(initialSettings.welcomeMessage || '')
    const [referralText, setReferralText] = useState(initialSettings.referralText || '')
    const [isSaving, setIsSaving] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    const handleSave = async () => {
        setIsSaving(true)
        try {
            const data = type === 'staff'
                ? { staffWelcomeMessage: welcomeMessage, staffReferralText: referralText }
                : { parentWelcomeMessage: welcomeMessage, parentReferralText: referralText }

            const result = await updateSystemSettings(data)

            if (result.success) {
                setShowSuccess(true)
                setTimeout(() => setShowSuccess(false), 3000)
                router.refresh()
            } else {
                alert('Failed to save settings')
            }
        } catch (error) {
            console.error('Error saving settings:', error)
            alert('An error occurred while saving')
        } finally {
            setIsSaving(false)
        }
    }

    const sectionTitle = type === 'staff' ? 'Staff Experience Control' : 'Parent Experience Control'
    const sectionDesc = type === 'staff' ? 'Customize what staff members see on their 5-Star Ambassador dashboard.' : 'Customize what parents see on their 5-Star Ambassador dashboard.'

    // Preview values
    const demoReferrals = 42
    const demoSavings = '12k'

    return (
        <div className="space-y-6">
            {/* Main Content */}
            <div style={{
                background: 'white',
                padding: '24px',
                borderRadius: '16px',
                border: '1px solid #E5E7EB',
                boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <div>
                        <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>{sectionTitle}</h2>
                        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>{sectionDesc}</p>
                    </div>
                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '10px 20px',
                            background: isSaving ? '#9CA3AF' : '#DC2626',
                            color: 'white',
                            borderRadius: '8px',
                            fontWeight: '600',
                            fontSize: '14px',
                            border: 'none',
                            cursor: isSaving ? 'not-allowed' : 'pointer',
                            boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.2)',
                            transition: 'all 0.2s'
                        }}
                    >
                        {isSaving ? (
                            <Loader2 size={18} className="animate-spin" />
                        ) : showSuccess ? (
                            <CheckCircle2 size={18} />
                        ) : (
                            <Save size={18} />
                        )}
                        {isSaving ? 'Saving...' : showSuccess ? 'Saved!' : 'Save All Changes'}
                    </button>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '32px' }}>
                    {/* Form Side */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Dashboard Welcome Title
                            </label>
                            <input
                                type="text"
                                value={welcomeMessage}
                                onChange={(e) => setWelcomeMessage(e.target.value)}
                                placeholder={`e.g. Welcome to the ${type === 'staff' ? 'Staff' : 'Parent'} Ambassador Dashboard`}
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #E5E7EB',
                                    outline: 'none',
                                    fontSize: '14px',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                            />
                            <p style={{ fontSize: '12px', fontWeight: '600', color: '#6B7280', marginTop: '6px' }}>
                                NOTE: The user's name will be automatically appended (e.g., "Welcome, John")
                            </p>
                        </div>

                        <div>
                            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', marginBottom: '8px' }}>
                                Social Share (WhatsApp) Text
                            </label>
                            <textarea
                                value={referralText}
                                onChange={(e) => setReferralText(e.target.value)}
                                rows={6}
                                placeholder="The message that will be pre-filled when they click Share..."
                                style={{
                                    width: '100%',
                                    padding: '12px',
                                    borderRadius: '8px',
                                    border: '1px solid #E5E7EB',
                                    outline: 'none',
                                    fontSize: '14px',
                                    lineHeight: '1.6',
                                    resize: 'none',
                                    fontFamily: 'inherit',
                                    transition: 'border-color 0.2s'
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#DC2626'}
                                onBlur={(e) => e.target.style.borderColor = '#E5E7EB'}
                            />
                            <p style={{ fontSize: '12px', color: '#9CA3AF', marginTop: '8px' }}>
                                Use <span style={{ fontFamily: 'monospace', background: '#F3F4F6', padding: '2px 4px', borderRadius: '4px', color: '#DC2626' }}>{`{referralLink}`}</span> as a placeholder for the user's specific link.
                            </p>
                        </div>

                        <div style={{
                            background: '#FEF2F2',
                            border: '1px solid #FEE2E2',
                            borderRadius: '12px',
                            padding: '16px',
                            display: 'flex',
                            gap: '12px'
                        }}>
                            <div style={{ padding: '8px', background: 'white', borderRadius: '8px', height: 'fit-content', color: '#DC2626' }}>
                                <AlertTriangle size={20} />
                            </div>
                            <div>
                                <h4 style={{ fontSize: '14px', fontWeight: '700', color: '#DC2626', margin: '0 0 4px' }}>Real-time Sync</h4>
                                <p style={{ fontSize: '12px', color: '#B91C1C', margin: 0 }}>
                                    Changes saved here will immediately reflect for all {type} members.
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Preview Side */}
                    <div style={{
                        border: '1px solid #f0f0f0',
                        borderRadius: '16px',
                        background: '#F9FAFB',
                        padding: '16px'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', padding: '0 8px' }}>
                            <div style={{ display: 'flex', gap: '6px' }}>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#F87171' }}></div>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#FBBF24' }}></div>
                                <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#34D399' }}></div>
                            </div>
                            <span style={{ fontSize: '12px', fontWeight: '500', color: '#9CA3AF' }}>Preview Mode</span>
                        </div>

                        <div style={{
                            background: 'white',
                            borderRadius: '12px',
                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
                            overflow: 'hidden',
                            display: 'flex',
                            flexDirection: 'column',
                            height: '100%'
                        }}>
                            {/* Dashboard Preview Header */}
                            <div style={{
                                padding: '24px',
                                background: 'linear-gradient(135deg, #111827, #1F2937)',
                                color: 'white'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                                    <div>
                                        <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', marginBottom: '4px', fontWeight: '500' }}>Dashboard</p>
                                        <h3 style={{ fontSize: '20px', fontWeight: '700', margin: 0 }}>{welcomeMessage || `Welcome to ${type === 'staff' ? 'Staff' : 'Parent'} Dashboard`}</h3>
                                        <p style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginTop: '4px' }}>John Doe • {type === 'staff' ? 'Staff' : 'Parent'} Member</p>
                                    </div>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        borderRadius: '50%',
                                        background: 'rgba(255,255,255,0.1)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        backdropFilter: 'blur(4px)'
                                    }}>
                                        <LayoutDashboard size={20} color="white" />
                                    </div>
                                </div>
                            </div>

                            {/* Quick Actions Preview */}
                            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                                <div style={{
                                    background: 'white',
                                    borderRadius: '12px',
                                    border: '1px solid #f0f0f0',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
                                    padding: '20px'
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                                        <div style={{ padding: '6px', background: '#FEF2F2', color: '#DC2626', borderRadius: '8px' }}>
                                            <Smartphone size={16} />
                                        </div>
                                        <span style={{ fontSize: '14px', fontWeight: '700', color: '#111827' }}>Quick Actions</span>
                                    </div>

                                    <button style={{
                                        width: '100%',
                                        background: '#DC2626',
                                        color: 'white',
                                        padding: '12px',
                                        borderRadius: '12px',
                                        fontWeight: '700',
                                        fontSize: '14px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        border: 'none',
                                        boxShadow: '0 4px 12px rgba(220, 38, 38, 0.2)'
                                    }}>
                                        <Share2 size={18} />
                                        Share on WhatsApp
                                    </button>

                                    <div style={{
                                        marginTop: '16px',
                                        padding: '12px',
                                        background: '#F9FAFB',
                                        borderRadius: '8px',
                                        border: '1px solid #F3F4F6'
                                    }}>
                                        <p style={{ fontSize: '10px', color: '#9CA3AF', textTransform: 'uppercase', fontWeight: '700', marginBottom: '4px' }}>Preview of message:</p>
                                        <p style={{ fontSize: '12px', color: '#4B5563', fontStyle: 'italic', lineHeight: '1.5' }}>
                                            "{referralText.replace('${referralLink}', 'https://achariya.in/ref/ACH25-1234') || '...'}"
                                        </p>
                                    </div>
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                                        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>{demoReferrals}</h3>
                                        <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500', margin: 0 }}>Confirmed Referrals</p>
                                    </div>
                                    <div style={{ background: 'white', padding: '16px', borderRadius: '12px', border: '1px solid #f0f0f0' }}>
                                        <h3 style={{ fontSize: '24px', fontWeight: '700', color: '#111827', margin: '0 0 4px' }}>₹{demoSavings}</h3>
                                        <p style={{ fontSize: '12px', color: '#6B7280', fontWeight: '500', margin: 0 }}>{type === 'staff' ? 'Est. Earnings' : 'Est. Savings'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
