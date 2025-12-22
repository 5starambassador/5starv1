'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, Trash2, Eye, EyeOff, Save, X, Upload, FileText, Loader2 } from 'lucide-react'
import { createMarketingAsset, deleteMarketingAsset, toggleAssetVisibility } from '@/app/marketing-actions'

const MARKETING_CATEGORIES = ['Branding', 'WhatsApp Templates', 'Social Media', 'Videos', 'Flyers']

interface MarketingManagerProps {
    assets: any[]
}

export function MarketingManager({ assets }: MarketingManagerProps) {
    const router = useRouter()
    const [showForm, setShowForm] = useState(false)
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [deletingId, setDeletingId] = useState<number | null>(null)

    // Form state
    const [name, setName] = useState('')
    const [category, setCategory] = useState<string>(MARKETING_CATEGORIES[0])
    const [description, setDescription] = useState('')
    const [fileUrl, setFileUrl] = useState('')

    const handleSubmit = async () => {
        if (!name.trim() || !fileUrl.trim()) {
            alert('Please fill in name and file URL')
            return
        }

        setIsSubmitting(true)
        const result = await createMarketingAsset({
            name: name.trim(),
            category,
            description: description.trim() || undefined,
            fileUrl: fileUrl.trim()
        })
        setIsSubmitting(false)

        if (result.success) {
            setShowForm(false)
            setName('')
            setCategory(MARKETING_CATEGORIES[0])
            setDescription('')
            setFileUrl('')
            router.refresh()
        } else {
            alert(result.error || 'Failed to create asset')
        }
    }

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this asset?')) return

        setDeletingId(id)
        await deleteMarketingAsset(id)
        setDeletingId(null)
        router.refresh()
    }

    const handleToggle = async (id: number, currentState: boolean) => {
        await toggleAssetVisibility(id, !currentState)
        router.refresh()
    }

    const groupedAssets: Record<string, any[]> = {}
    for (const cat of MARKETING_CATEGORIES) {
        groupedAssets[cat] = assets.filter(a => a.category === cat)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                    <h2 style={{ fontSize: '18px', fontWeight: '700', color: '#111827', margin: 0 }}>Marketing Assets</h2>
                    <p style={{ fontSize: '13px', color: '#6B7280', marginTop: '4px' }}>Manage branding, templates, and marketing materials</p>
                </div>
                <button
                    onClick={() => setShowForm(true)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                        border: 'none',
                        borderRadius: '10px',
                        fontSize: '13px',
                        fontWeight: '700',
                        color: 'white',
                        cursor: 'pointer',
                        boxShadow: '0 4px 10px rgba(239, 68, 68, 0.3)'
                    }}
                >
                    <Plus size={16} /> Add Asset
                </button>
            </div>

            {/* Assets by Category */}
            {MARKETING_CATEGORIES.map(cat => {
                const catAssets = groupedAssets[cat] || []

                return (
                    <div key={cat} style={{
                        background: '#FAFAFA',
                        borderRadius: '12px',
                        padding: '16px',
                        border: '1px solid #E5E7EB'
                    }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                            <h3 style={{ fontSize: '14px', fontWeight: '700', color: '#374151', margin: 0 }}>{cat}</h3>
                            <span style={{ fontSize: '12px', color: '#6B7280' }}>{catAssets.length} items</span>
                        </div>

                        {catAssets.length === 0 ? (
                            <p style={{ fontSize: '12px', color: '#9CA3AF', fontStyle: 'italic', textAlign: 'center', padding: '16px' }}>
                                No assets in this category
                            </p>
                        ) : (
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {catAssets.map((asset: any) => (
                                    <div key={asset.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'space-between',
                                        padding: '12px 16px',
                                        background: 'white',
                                        borderRadius: '8px',
                                        border: '1px solid #E5E7EB'
                                    }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <FileText size={18} color={asset.isActive ? '#10B981' : '#9CA3AF'} />
                                            <div>
                                                <p style={{
                                                    fontSize: '14px',
                                                    fontWeight: '600',
                                                    color: asset.isActive ? '#111827' : '#9CA3AF',
                                                    margin: 0,
                                                    textDecoration: asset.isActive ? 'none' : 'line-through'
                                                }}>{asset.name}</p>
                                                {asset.description && (
                                                    <p style={{ fontSize: '11px', color: '#6B7280', margin: '2px 0 0' }}>{asset.description}</p>
                                                )}
                                            </div>
                                        </div>
                                        <div style={{ display: 'flex', gap: '8px' }}>
                                            <button
                                                onClick={() => handleToggle(asset.id, asset.isActive)}
                                                style={{
                                                    padding: '6px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #E5E7EB',
                                                    background: 'white',
                                                    cursor: 'pointer'
                                                }}
                                                title={asset.isActive ? 'Hide' : 'Show'}
                                            >
                                                {asset.isActive ? <EyeOff size={14} color="#6B7280" /> : <Eye size={14} color="#10B981" />}
                                            </button>
                                            <button
                                                onClick={() => handleDelete(asset.id)}
                                                disabled={deletingId === asset.id}
                                                style={{
                                                    padding: '6px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #FEE2E2',
                                                    background: '#FEF2F2',
                                                    cursor: 'pointer'
                                                }}
                                                title="Delete"
                                            >
                                                {deletingId === asset.id ? (
                                                    <Loader2 size={14} className="animate-spin" color="#EF4444" />
                                                ) : (
                                                    <Trash2 size={14} color="#EF4444" />
                                                )}
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )
            })}

            {/* Add Asset Modal */}
            {showForm && (
                <div style={{
                    position: 'fixed',
                    inset: 0,
                    zIndex: 9999,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '16px',
                    backgroundColor: 'rgba(0,0,0,0.6)'
                }}>
                    <div style={{
                        background: 'white',
                        borderRadius: '20px',
                        width: '100%',
                        maxWidth: '480px',
                        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
                        overflow: 'hidden'
                    }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                            padding: '20px 24px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <Upload size={22} color="white" />
                                <h2 style={{ fontSize: '18px', fontWeight: '700', color: 'white', margin: 0 }}>Add Marketing Asset</h2>
                            </div>
                            <button
                                onClick={() => setShowForm(false)}
                                style={{ background: 'rgba(255,255,255,0.2)', border: 'none', borderRadius: '8px', padding: '8px', cursor: 'pointer' }}
                            >
                                <X size={18} color="white" />
                            </button>
                        </div>
                        <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>Category</label>
                                <select
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '2px solid #E5E7EB', fontSize: '14px', background: 'white' }}
                                    value={category}
                                    onChange={(e) => setCategory(e.target.value)}
                                >
                                    {MARKETING_CATEGORIES.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>Name *</label>
                                <input
                                    type="text"
                                    placeholder="e.g. Official Logo Pack"
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '2px solid #E5E7EB', fontSize: '14px' }}
                                    value={name}
                                    onChange={(e) => setName(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>Description</label>
                                <input
                                    type="text"
                                    placeholder="Brief description (optional)"
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '2px solid #E5E7EB', fontSize: '14px' }}
                                    value={description}
                                    onChange={(e) => setDescription(e.target.value)}
                                />
                            </div>
                            <div>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#374151', marginBottom: '6px', textTransform: 'uppercase' }}>File URL *</label>
                                <input
                                    type="url"
                                    placeholder="https://drive.google.com/... or direct link"
                                    style={{ width: '100%', padding: '12px 14px', borderRadius: '10px', border: '2px solid #E5E7EB', fontSize: '14px' }}
                                    value={fileUrl}
                                    onChange={(e) => setFileUrl(e.target.value)}
                                />
                                <p style={{ fontSize: '11px', color: '#6B7280', marginTop: '6px' }}>
                                    💡 Tip: Use Google Drive, Dropbox, or any public file URL
                                </p>
                            </div>
                            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
                                <button
                                    onClick={() => setShowForm(false)}
                                    style={{
                                        flex: 1,
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: '2px solid #E5E7EB',
                                        background: 'white',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: '#374151',
                                        cursor: 'pointer'
                                    }}
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSubmit}
                                    disabled={isSubmitting}
                                    style={{
                                        flex: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        gap: '8px',
                                        padding: '12px',
                                        borderRadius: '10px',
                                        border: 'none',
                                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                                        fontSize: '14px',
                                        fontWeight: '700',
                                        color: 'white',
                                        cursor: 'pointer',
                                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                                    }}
                                >
                                    {isSubmitting ? (
                                        <><Loader2 size={16} className="animate-spin" /> Saving...</>
                                    ) : (
                                        <><Save size={16} /> Save Asset</>
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
