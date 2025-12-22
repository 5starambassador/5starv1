'use client'

import { Download, Share2, FileText, Database, Megaphone, Image, Video, FileImage, ExternalLink } from 'lucide-react'

interface MarketingClientProps {
    grouped: Record<string, any[]>
    categories: readonly string[]
}

const getCategoryIcon = (category: string) => {
    switch (category) {
        case 'Branding': return Database
        case 'WhatsApp Templates': return Megaphone
        case 'Social Media': return Image
        case 'Videos': return Video
        case 'Flyers': return FileImage
        default: return FileText
    }
}

const getCategoryGradient = (category: string) => {
    switch (category) {
        case 'Branding': return 'linear-gradient(135deg, #EF4444, #DC2626)'
        case 'WhatsApp Templates': return 'linear-gradient(135deg, #22C55E, #16A34A)'
        case 'Social Media': return 'linear-gradient(135deg, #3B82F6, #1D4ED8)'
        case 'Videos': return 'linear-gradient(135deg, #F59E0B, #D97706)'
        case 'Flyers': return 'linear-gradient(135deg, #8B5CF6, #7C3AED)'
        default: return 'linear-gradient(135deg, #6B7280, #4B5563)'
    }
}

export function MarketingClient({ grouped, categories }: MarketingClientProps) {
    const handleDownload = (url: string, name: string) => {
        const link = document.createElement('a')
        link.href = url
        link.download = name
        link.target = '_blank'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    const handleShare = async (url: string, name: string) => {
        if (navigator.share) {
            try {
                await navigator.share({
                    title: name,
                    text: `Check out ${name} from Achariya Ambassador Program`,
                    url
                })
            } catch (err) {
                console.error('Share failed:', err)
            }
        } else {
            navigator.clipboard.writeText(url)
            alert('Link copied to clipboard!')
        }
    }

    const hasAssets = Object.values(grouped).some(arr => arr && arr.length > 0)

    return (
        <div className="max-w-5xl mx-auto animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
            {/* Premium Header */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'white',
                padding: '20px 28px',
                borderRadius: '20px',
                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05), 0 4px 6px -2px rgba(0,0,0,0.03)',
                border: '1px solid rgba(229, 231, 235, 0.5)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        padding: '12px',
                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                        borderRadius: '14px',
                        boxShadow: '0 4px 12px rgba(239, 68, 68, 0.3)'
                    }}>
                        <Database size={24} color="white" />
                    </div>
                    <div>
                        <h1 style={{ fontSize: '24px', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.02em' }}>
                            Marketing Kit
                        </h1>
                        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px', fontWeight: '500' }}>
                            Resources to help you share Achariya with your network
                        </p>
                    </div>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '24px' }}>
                {categories.map(category => {
                    const assets = grouped[category] || []

                    const Icon = getCategoryIcon(category)
                    const gradient = getCategoryGradient(category)

                    return (
                        <div
                            key={category}
                            style={{
                                background: 'white',
                                borderRadius: '20px',
                                overflow: 'hidden',
                                boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)',
                                border: '1px solid rgba(229, 231, 235, 0.5)'
                            }}
                        >
                            {/* Category Header */}
                            <div style={{
                                background: gradient,
                                padding: '16px 20px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '12px'
                            }}>
                                <Icon size={22} color="white" />
                                <h2 style={{ fontSize: '16px', fontWeight: '700', color: 'white', margin: 0 }}>{category}</h2>
                                <span style={{
                                    marginLeft: 'auto',
                                    background: 'rgba(255,255,255,0.2)',
                                    padding: '4px 10px',
                                    borderRadius: '50px',
                                    fontSize: '12px',
                                    fontWeight: '600',
                                    color: 'white'
                                }}>
                                    {assets.length} items
                                </span>
                            </div>

                            {/* Assets List or Empty State */}
                            {assets.length === 0 ? (
                                <div style={{ padding: '40px 20px', textAlign: 'center' }}>
                                    <div style={{
                                        width: '40px',
                                        height: '40px',
                                        background: '#F3F4F6',
                                        borderRadius: '50%',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        margin: '0 auto 12px'
                                    }}>
                                        <Icon size={20} color="#9CA3AF" />
                                    </div>
                                    <p style={{ fontSize: '13px', color: '#6B7280', margin: 0 }}>Coming Soon</p>
                                </div>
                            ) : (
                                <div style={{ padding: '12px' }}>
                                    {assets.map((asset: any) => (
                                        <div
                                            key={asset.id}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'space-between',
                                                padding: '12px 16px',
                                                borderRadius: '12px',
                                                transition: 'background 0.2s',
                                                cursor: 'pointer'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = '#F9FAFB'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                                <FileText size={18} color="#6B7280" />
                                                <div>
                                                    <p style={{ fontSize: '14px', fontWeight: '600', color: '#111827', margin: 0 }}>{asset.name}</p>
                                                    {asset.description && (
                                                        <p style={{ fontSize: '12px', color: '#6B7280', margin: '2px 0 0' }}>{asset.description}</p>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <button
                                                    onClick={() => handleShare(asset.fileUrl, asset.name)}
                                                    style={{
                                                        padding: '8px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: '#F3F4F6',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s'
                                                    }}
                                                    title="Share"
                                                >
                                                    <Share2 size={16} color="#6B7280" />
                                                </button>
                                                <button
                                                    onClick={() => handleDownload(asset.fileUrl, asset.name)}
                                                    style={{
                                                        padding: '8px',
                                                        borderRadius: '8px',
                                                        border: 'none',
                                                        background: 'linear-gradient(135deg, #EF4444, #DC2626)',
                                                        cursor: 'pointer',
                                                        boxShadow: '0 2px 6px rgba(239, 68, 68, 0.3)'
                                                    }}
                                                    title="Download"
                                                >
                                                    <Download size={16} color="white" />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>

            {/* Request Custom Resources */}
            <div style={{
                background: 'linear-gradient(135deg, #FEF3C7, #FEF9C3)',
                borderRadius: '20px',
                padding: '32px',
                textAlign: 'center',
                border: '2px dashed #F59E0B'
            }}>
                <Megaphone size={36} color="#D97706" style={{ marginBottom: '12px' }} />
                <h3 style={{ fontSize: '18px', fontWeight: '700', color: '#92400E', margin: '0 0 8px' }}>
                    Need Custom Resources?
                </h3>
                <p style={{ fontSize: '14px', color: '#B45309' }}>
                    If you need specific posters or templates, raise a support ticket and our team will help!
                </p>
            </div>
        </div>
    )
}
