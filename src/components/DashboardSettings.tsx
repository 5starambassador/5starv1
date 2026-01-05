'use client'

import { useState, useEffect } from 'react'
import { Save, Share2, Smartphone, Loader2, CheckCircle2, AlertTriangle, LayoutDashboard, Calendar, Plus } from 'lucide-react'
import { updateSystemSettings, getAcademicYears, addAcademicYear, setCurrentAcademicYear } from '@/app/settings-actions'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'

interface DashboardSettingsProps {
    type: 'staff' | 'parent'
    initialSettings: {
        welcomeMessage?: string
        referralText?: string
        currentAcademicYear?: string
    }
}

export default function DashboardSettings({ type, initialSettings }: DashboardSettingsProps) {
    const router = useRouter()
    const [welcomeMessage, setWelcomeMessage] = useState(initialSettings.welcomeMessage || '')
    const [referralText, setReferralText] = useState(initialSettings.referralText || '')
    const [isSaving, setIsSaving] = useState(false)
    const [showSuccess, setShowSuccess] = useState(false)

    // Academic Year State
    const [years, setYears] = useState<any[]>([])
    const [showYearModal, setShowYearModal] = useState(false)
    const [newYearData, setNewYearData] = useState({ year: '', startDate: '', endDate: '' })
    const [yearLoading, setYearLoading] = useState(false)

    useEffect(() => {
        loadYears()
    }, [])

    const loadYears = async () => {
        const res = await getAcademicYears()
        if (res.success && res.data) setYears(res.data)
    }

    const handleAddYear = async () => {
        if (!newYearData.year || !newYearData.startDate || !newYearData.endDate) return toast.error('Fill all fields')
        setYearLoading(true)
        try {
            const res = await addAcademicYear({
                year: newYearData.year,
                startDate: new Date(newYearData.startDate),
                endDate: new Date(newYearData.endDate)
            })
            if (res.success) {
                toast.success('Year Added')
                setShowYearModal(false)
                loadYears()
                setNewYearData({ year: '', startDate: '', endDate: '' })
            } else {
                toast.error(res.error || 'Failed')
            }
        } finally {
            setYearLoading(false)
        }
    }

    const handleSetCurrent = async (year: string) => {
        const confirm = window.confirm(`Set ${year} as current? This affects all registrations.`)
        if (!confirm) return
        try {
            const res = await setCurrentAcademicYear(year)
            if (res.success) {
                toast.success(`Current Year updated to ${year}`)
                router.refresh()
                loadYears()
            } else {
                toast.error('Failed')
            }
        } catch (e) { toast.error('Error') }
    }

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
                        {/* Academic Year Management (Only show on Staff/Main settings or create a separate tab?) Actually user probably wants it in "Settings" generally. Assuming this component is "Generic" settings now. */}
                        {/* We'll render it at the top if type is 'staff' (assuming staff/superadmin view) or just generic */}
                        <div style={{ padding: '24px', background: '#F0F9FF', borderRadius: '12px', border: '1px solid #BAE6FD' }}>
                            <div className="flex justify-between items-center mb-4">
                                <div>
                                    <h3 className="font-bold text-sky-900 flex items-center gap-2">
                                        <Calendar size={18} /> Academic Year Management
                                    </h3>
                                    <p className="text-xs text-sky-700 mt-1">
                                        Current System Year: <strong>{initialSettings.currentAcademicYear || 'N/A'}</strong>
                                    </p>
                                </div>
                                <button
                                    onClick={() => setShowYearModal(true)}
                                    className="text-xs bg-sky-600 text-white px-3 py-2 rounded-lg font-bold hover:bg-sky-700 flex items-center gap-1"
                                >
                                    <Plus size={14} /> Add Year
                                </button>
                            </div>

                            <div className="space-y-2">
                                {years.length === 0 && <p className="text-xs text-gray-500 italic">No years configured. System uses default 2025-2026.</p>}
                                {years.map((y) => (
                                    <div key={y.id} className="flex justify-between items-center bg-white p-3 rounded-lg border border-sky-100 shadow-sm">
                                        <div>
                                            <span className="font-bold text-gray-800 text-sm">{y.year}</span>
                                            <div className="text-[10px] text-gray-500">
                                                {new Date(y.startDate).toLocaleDateString()} - {new Date(y.endDate).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {y.isCurrent || initialSettings.currentAcademicYear === y.year ? (
                                                <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold border border-green-200">
                                                    Current
                                                </span>
                                            ) : (
                                                <button
                                                    onClick={() => handleSetCurrent(y.year)}
                                                    className="text-[10px] text-sky-600 hover:underline font-medium"
                                                >
                                                    Set as Current
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Add Year Modal */}
                        {showYearModal && (
                            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                                <div className="bg-white rounded-xl p-6 w-full max-w-sm shadow-xl">
                                    <h3 className="font-bold text-lg mb-4">Add Academic Year</h3>
                                    <div className="space-y-3">
                                        <input
                                            placeholder="Year Name (e.g. 2026-2027)"
                                            className="w-full border p-2 rounded text-sm font-bold"
                                            value={newYearData.year}
                                            onChange={e => setNewYearData({ ...newYearData, year: e.target.value })}
                                        />
                                        <div className="grid grid-cols-2 gap-2">
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-bold uppercase">Start Date</label>
                                                <input
                                                    type="date"
                                                    className="w-full border p-2 rounded text-sm"
                                                    value={newYearData.startDate}
                                                    onChange={e => setNewYearData({ ...newYearData, startDate: e.target.value })}
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] text-gray-500 font-bold uppercase">End Date</label>
                                                <input
                                                    type="date"
                                                    className="w-full border p-2 rounded text-sm"
                                                    value={newYearData.endDate}
                                                    onChange={e => setNewYearData({ ...newYearData, endDate: e.target.value })}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex gap-2 mt-6">
                                        <button onClick={() => setShowYearModal(false)} className="flex-1 py-2 text-gray-500 text-sm font-bold border rounded-lg">Cancel</button>
                                        <button onClick={handleAddYear} disabled={yearLoading} className="flex-1 py-2 bg-sky-600 text-white text-sm font-bold rounded-lg hover:bg-sky-700">
                                            {yearLoading ? 'Adding...' : 'Add Year'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}

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
