'use client'

import { useState, useEffect } from 'react'
import { Shield, Plus, Trash2, Globe, AlertTriangle, CheckCircle, Server, Lock } from 'lucide-react'
import { toast } from 'sonner'
import { getSecuritySettings, updateSecuritySettings } from '@/app/security-actions'

import { ConfirmDialog } from '@/components/ui/ConfirmDialog'

export function SecurityPanel() {
    const [settings, setSettings] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [ipInput, setIpInput] = useState('')
    const [isAddingIP, setIsAddingIP] = useState(false)

    // Confirmation States
    const [confirmState, setConfirmState] = useState<{
        isOpen: boolean
        type: 'remove_ip' | 'maintenance' | null
        data?: any
    }>({
        isOpen: false,
        type: null
    })

    const loadSettings = async () => {
        setLoading(true)
        const res = await getSecuritySettings() as any
        if (res.success && res.settings) {
            setSettings(res.settings)
        }
        setLoading(false)
    }

    useEffect(() => {
        loadSettings()
    }, [])

    const handleAddIP = async () => {
        if (!ipInput.trim()) {
            toast.error('Please enter an IP address')
            return
        }

        // Basic IP validation (IPv4)
        const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
        if (!ipv4Regex.test(ipInput.trim())) {
            toast.error('Invalid IP address format. Expected: xxx.xxx.xxx.xxx')
            return
        }

        setIsAddingIP(true)
        const currentIPs = settings?.ipwhitelist ? settings.ipWhitelist.split(',').map((ip: string) => ip.trim()).filter((ip: string) => ip) : []

        if (currentIPs.includes(ipInput.trim())) {
            toast.error('IP address already whitelisted')
            setIsAddingIP(false)
            return
        }

        const newWhitelist = [...currentIPs, ipInput.trim()].join(', ')
        const res = await updateSecuritySettings({ ipWhitelist: newWhitelist }) as any

        if (res.success) {
            toast.success('IP address added to whitelist')
            setSettings(res.settings)
            setIpInput('')
        } else {
            toast.error(res.error || 'Failed to add IP')
        }
        setIsAddingIP(false)
    }

    const handleRemoveIP = (ipToRemove: string) => {
        setConfirmState({ isOpen: true, type: 'remove_ip', data: ipToRemove })
    }

    const executeRemoveIP = async () => {
        const ipToRemove = confirmState.data
        if (!ipToRemove) return

        const currentIPs = settings.ipWhitelist ? settings.ipWhitelist.split(',').map((ip: string) => ip.trim()).filter((ip: string) => ip) : []
        const newWhitelist = currentIPs.filter((ip: string) => ip !== ipToRemove).join(', ')

        const res = await updateSecuritySettings({ ipWhitelist: newWhitelist }) as any
        if (res.success) {
            toast.success('IP address removed')
            setSettings(res.settings)
            setConfirmState({ isOpen: false, type: null })
        } else {
            toast.error(res.error || 'Failed to remove IP')
            setConfirmState({ isOpen: false, type: null })
        }
    }

    const handleToggleMaintenanceMode = async () => {
        const newMode = !settings.maintenanceMode

        if (newMode) {
            // Confirmation needed only when enabling
            setConfirmState({ isOpen: true, type: 'maintenance', data: newMode })
        } else {
            // Disable immediately without confirmation
            executeToggleMaintenance(false)
        }
    }

    const executeToggleMaintenance = async (mode?: boolean) => {
        const newMode = mode !== undefined ? mode : confirmState.data

        const res = await updateSecuritySettings({ maintenanceMode: newMode } as any) as any
        if (res.success) {
            toast.success(newMode ? 'Maintenance Mode ENABLED' : 'Maintenance Mode DISABLED')
            setSettings(res.settings)
            setConfirmState({ isOpen: false, type: null })
        } else {
            toast.error(res.error || 'Failed to update maintenance mode')
            setConfirmState({ isOpen: false, type: null })
        }
    }

    if (loading) {
        return (
            <div className="flex justify-center p-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
        )
    }

    const whitelistedIPs = settings?.ipWhitelist ? settings.ipWhitelist.split(',').map((ip: string) => ip.trim()).filter((ip: string) => ip) : []

    return (
        <div className="space-y-8">
            {/* Maintenance Mode */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-4">
                        <div className={`p-3 rounded-xl ${settings?.maintenanceMode ? 'bg-amber-100 text-amber-600' : 'bg-gray-100 text-gray-600'}`}>
                            <Lock size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl font-black text-gray-900">Maintenance Mode</h3>
                            <p className="text-sm text-gray-500 mt-1">Block non-admin access during system updates</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-4">
                        {settings?.maintenanceMode && (
                            <span className="px-4 py-2 bg-amber-100 text-amber-800 rounded-xl font-bold text-sm flex items-center gap-2">
                                <AlertTriangle size={16} /> ACTIVE
                            </span>
                        )}
                        <button
                            onClick={handleToggleMaintenanceMode}
                            className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${settings?.maintenanceMode ? 'bg-amber-600' : 'bg-gray-300'
                                }`}
                        >
                            <span
                                className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${settings?.maintenanceMode ? 'translate-x-7' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                    </div>
                </div>

                {settings?.maintenanceMode && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
                        <p className="text-sm font-bold text-amber-900">
                            ⚠️ System is currently in Maintenance Mode. Only Super Admins can access the platform.
                        </p>
                    </div>
                )}
            </div>

            {/* IP Whitelist Management */}
            <div className="bg-white rounded-3xl p-8 border border-gray-100 shadow-sm">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-xl">
                        <Globe size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-gray-900">IP Whitelist Management</h3>
                        <p className="text-sm text-gray-500 mt-1">Restrict administrative access to specific IPs</p>
                    </div>
                </div>

                {/* Current Server IP */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <div className="flex items-center gap-2 mb-1">
                        <Server size={14} className="text-blue-600" />
                        <p className="text-xs font-bold text-blue-600 uppercase tracking-wider">Current Connection</p>
                    </div>
                    <p className="text-sm font-mono font-bold text-blue-900">
                        Localhost (127.0.0.1) is always allowed
                    </p>
                </div>

                {/* Add IP Form */}
                <div className="bg-gray-50 rounded-xl p-4 mb-6">
                    <label className="block text-sm font-bold text-gray-700 mb-2">Add IP Address</label>
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={ipInput}
                            onChange={(e) => setIpInput(e.target.value)}
                            placeholder="e.g., 192.168.1.100"
                            className="flex-1 p-3 bg-white border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                            onKeyPress={(e) => e.key === 'Enter' && handleAddIP()}
                        />
                        <button
                            onClick={handleAddIP}
                            disabled={isAddingIP}
                            className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors disabled:opacity-50 flex items-center gap-2"
                        >
                            <Plus size={18} /> Add
                        </button>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">Format: IPv4 (xxx.xxx.xxx.xxx)</p>
                </div>

                {/* Whitelisted IPs List */}
                <div>
                    <p className="text-sm font-bold text-gray-700 mb-3">Whitelisted IP Addresses ({whitelistedIPs.length})</p>
                    {whitelistedIPs.length === 0 ? (
                        <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                            <Shield size={32} className="mx-auto text-gray-300 mb-2" />
                            <p className="text-sm text-gray-500">No IP restrictions. All IPs are allowed.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {whitelistedIPs.map((ip: string, index: number) => (
                                <div key={index} className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-100">
                                    <div className="flex items-center gap-3">
                                        <CheckCircle size={16} className="text-green-600" />
                                        <span className="font-mono font-bold text-gray-900">{ip}</span>
                                    </div>
                                    <button
                                        onClick={() => handleRemoveIP(ip)}
                                        className="p-2 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}</div>
                    )}
                </div>
            </div>
            {/* Premium Confirm Dialog */}
            <ConfirmDialog
                isOpen={confirmState.isOpen}
                title={confirmState.type === 'maintenance' ? 'Enable Maintenance Mode?' : 'Remove IP Address?'}
                description={
                    confirmState.type === 'maintenance' ? (
                        <p className="text-amber-600 font-medium">
                            WARNING: Enabling Maintenance Mode will block ALL non-Super Admin users from accessing the system.
                            <br />Are you sure you want to continue?
                        </p>
                    ) : (
                        <p>
                            Are you sure you want to remove <strong>{confirmState.data}</strong> from the whitelist?
                            <br />They may lose access if not covered by another rule.
                        </p>
                    )
                }
                confirmText={confirmState.type === 'maintenance' ? 'Yes, Enable Mode' : 'Yes, Remove IP'}
                variant={confirmState.type === 'maintenance' ? 'warning' : 'danger'}
                onConfirm={() => {
                    if (confirmState.type === 'maintenance') executeToggleMaintenance()
                    else executeRemoveIP()
                }}
                onCancel={() => setConfirmState({ isOpen: false, type: null })}
            />
        </div>
    )
}
