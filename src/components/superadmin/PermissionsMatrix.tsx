import { BarChart3, Users, BookOpen, ShieldCheck, Building2, Download, DollarSign, Database, GanttChartSquare, MessageSquare, Settings, UserPlus, Edit, Trash, List, Wallet, Star, Shield } from 'lucide-react'
import { RolePermissions } from '@/types'

interface PermissionsMatrixProps {
    rolePermissionsMatrix: Record<string, any>
    onChange: (newMatrix: Record<string, any>) => void
    isLoading: boolean
    onSave: () => void
}

const ROLES = ['Super Admin', 'Campus Head', 'Finance Admin', 'Admission Admin', 'Campus Admin', 'Staff', 'Parent']

const MODULES = [
    { key: 'analytics', label: 'Analytics Overview', icon: BarChart3 },
    { key: 'userManagement', label: 'User Management', icon: Users },
    { key: 'studentManagement', label: 'Student Management', icon: BookOpen },
    { key: 'studentManagement.canCreate', label: ' - Add Student', icon: UserPlus, isSub: true },
    { key: 'studentManagement.canEdit', label: ' - Edit Student', icon: Edit, isSub: true },
    { key: 'studentManagement.canDelete', label: ' - Delete Student', icon: Trash, isSub: true },
    { key: 'adminManagement', label: 'Admin Management', icon: ShieldCheck },
    { key: 'campusPerformance', label: 'Campus Performance', icon: Building2 },
    { key: 'reports', label: 'Reports & Exports', icon: Download },
    { key: 'settlements', label: 'Revenue & Settlements', icon: DollarSign },
    { key: 'marketingKit', label: 'Marketing Kit', icon: Database },
    { key: 'auditLog', label: 'Audit Trail', icon: GanttChartSquare },
    { key: 'supportDesk', label: 'Support Desk', icon: MessageSquare },
    { key: 'settings', label: 'System Settings', icon: Settings },
]

const AMBASSADOR_MODULES = [
    { key: 'referralSubmission', label: 'Referral Submission', icon: UserPlus },
    { key: 'referralTracking', label: 'Referral Tracking', icon: List },
    { key: 'savingsCalculator', label: 'Savings Calculator', icon: Wallet },
    { key: 'rulesAccess', label: 'Rules & Guidelines', icon: BookOpen },
]

export function PermissionsMatrix({
    rolePermissionsMatrix,
    onChange,
    isLoading,
    onSave
}: PermissionsMatrixProps) {
    const handleToggle = (role: string, moduleKey: string) => {
        const isSubKey = moduleKey.includes('.')
        const newMatrix = { ...rolePermissionsMatrix }

        if (isSubKey) {
            const [parentKey, subKey] = moduleKey.split('.')
            newMatrix[role][parentKey][subKey] = !newMatrix[role][parentKey][subKey]
        } else {
            newMatrix[role][moduleKey].access = !newMatrix[role][moduleKey].access
        }

        onChange(newMatrix)
    }

    const handleScopeChange = (role: string, moduleKey: string, scope: string) => {
        const newMatrix = { ...rolePermissionsMatrix }
        newMatrix[role][moduleKey].scope = scope
        onChange(newMatrix)
    }

    return (
        <div className="space-y-6 animate-fade-in">
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 4px 25px rgba(0,0,0,0.05)' }}>
                <div style={{ padding: '24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f9fafb)' }}>
                    <div>
                        <h3 style={{ fontSize: '18px', fontWeight: '800', color: '#111827' }}>Access Control Matrix</h3>
                        <p style={{ fontSize: '13px', color: '#6B7280' }}>Manage granular permissions and data visibility scopes across all system roles.</p>
                    </div>
                    <button
                        onClick={onSave}
                        disabled={isLoading}
                        style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #CC0000, #EF4444)', color: 'white', border: 'none', borderRadius: '10px', fontSize: '14px', fontWeight: '700', cursor: 'pointer', boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)' }}
                    >
                        {isLoading ? 'Saving...' : 'Save All Changes'}
                    </button>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                            <tr style={{ borderBottom: '1px solid #f0f0f0' }}>
                                <th style={{ padding: '16px', textAlign: 'left', background: 'white', width: '220px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#9CA3AF', textTransform: 'uppercase' }}>Module / Capability</span>
                                </th>
                                {ROLES.map(role => (
                                    <th key={role} style={{ padding: '16px 8px', textAlign: 'center', background: 'white' }}>
                                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#111827' }}>{role}</span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            <tr style={{ background: '#F9FAFB' }}>
                                <td colSpan={ROLES.length + 1} style={{ padding: '12px 24px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>Admin Dashboard Modules</span>
                                </td>
                            </tr>
                            {MODULES.map((module, idx) => (
                                <tr key={module.key} style={{ background: idx % 2 === 0 ? 'white' : '#F9FAFB', borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginLeft: module.isSub ? '24px' : '0' }}>
                                            <div style={{ padding: '6px', background: 'white', borderRadius: '8px', border: '1px solid #f0f0f0', color: module.isSub ? '#9CA3AF' : '#6B7280' }}>
                                                <module.icon size={16} />
                                            </div>
                                            <span style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>{module.label}</span>
                                        </div>
                                    </td>
                                    {ROLES.map(role => {
                                        const isSubKey = module.key.includes('.')
                                        let perm: any
                                        let value: boolean
                                        let parentKey: string, subKey: string

                                        if (isSubKey) {
                                            [parentKey, subKey] = module.key.split('.')
                                            perm = rolePermissionsMatrix[role]?.[parentKey]
                                            value = perm?.[subKey]
                                        } else {
                                            perm = rolePermissionsMatrix[role]?.[module.key]
                                            value = perm?.access
                                        }

                                        if (!perm) return <td key={role} style={{ textAlign: 'center' }}>-</td>

                                        return (
                                            <td key={role} style={{ padding: '12px 4px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                    <div
                                                        onClick={() => handleToggle(role, module.key)}
                                                        style={{ width: '44px', height: '24px', background: value ? '#10B981' : '#D1D5DB', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    >
                                                        <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', left: value ? '22px' : '2px', top: '2px', transition: 'all 0.2s' }}></div>
                                                    </div>

                                                    {!isSubKey && value && (
                                                        <select
                                                            value={perm.scope}
                                                            onChange={(e) => handleScopeChange(role, module.key, e.target.value)}
                                                            style={{ padding: '2px 6px', fontSize: '10px', fontWeight: '800', borderRadius: '6px', border: '1px solid #D1D5DB', background: 'white', textTransform: 'uppercase' }}
                                                            title="Global = All Campuses | Campus = Only Assigned Campus | Self = Own Data | View = Read-Only"
                                                        >
                                                            <option value="all">🌐 All Campuses</option>
                                                            <option value="campus">🏫 Own Campus</option>
                                                            {(role === 'Staff' || role === 'Parent') && <option value="self">👤 Self Only</option>}
                                                            <option value="view-only">👁️ View Only</option>
                                                        </select>
                                                    )}
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}

                            <tr style={{ background: '#F9FAFB' }}>
                                <td colSpan={ROLES.length + 1} style={{ padding: '12px 24px' }}>
                                    <span style={{ fontSize: '11px', fontWeight: '800', color: '#6B7280', textTransform: 'uppercase' }}>Ambassador Portal Modules</span>
                                </td>
                            </tr>
                            {AMBASSADOR_MODULES.map((module, idx) => (
                                <tr key={module.key} style={{ background: idx % 2 === 0 ? 'white' : '#F9FAFB', borderBottom: '1px solid #f0f0f0' }}>
                                    <td style={{ padding: '12px 16px' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <div style={{ padding: '6px', background: 'white', borderRadius: '8px', border: '1px solid #f0f0f0', color: '#6B7280' }}>
                                                <module.icon size={16} />
                                            </div>
                                            <span style={{ fontWeight: '600', fontSize: '14px', color: '#374151' }}>{module.label}</span>
                                        </div>
                                    </td>
                                    {ROLES.map(role => {
                                        const perm = rolePermissionsMatrix[role]?.[module.key]
                                        if (!perm) return <td key={role} style={{ textAlign: 'center' }}>-</td>

                                        return (
                                            <td key={role} style={{ padding: '12px 4px' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                                    <div
                                                        onClick={() => {
                                                            const newMatrix = { ...rolePermissionsMatrix }
                                                            newMatrix[role][module.key].access = !perm.access
                                                            onChange(newMatrix)
                                                        }}
                                                        style={{ width: '44px', height: '24px', background: perm.access ? '#10B981' : '#D1D5DB', borderRadius: '12px', position: 'relative', cursor: 'pointer', transition: 'all 0.2s' }}
                                                    >
                                                        <div style={{ width: '20px', height: '20px', background: 'white', borderRadius: '50%', position: 'absolute', left: perm.access ? '22px' : '2px', top: '2px', transition: 'all 0.2s' }}></div>
                                                    </div>

                                                    {perm.access && (
                                                        <select
                                                            value={perm.scope}
                                                            onChange={(e) => handleScopeChange(role, module.key, e.target.value)}
                                                            style={{ padding: '2px 6px', fontSize: '10px', fontWeight: '800', borderRadius: '6px', border: '1px solid #D1D5DB', background: 'white', textTransform: 'uppercase' }}
                                                            title="All Campuses = System-wide | Own Campus = Assigned Campus | Self Only = Own Data | View Only = Read-Only"
                                                        >
                                                            <option value="all">🌐 All Campuses</option>
                                                            <option value="campus">🏫 Own Campus</option>
                                                            <option value="self">👤 Self Only</option>
                                                            <option value="view-only">👁️ View Only</option>
                                                        </select>
                                                    )}
                                                </div>
                                            </td>
                                        )
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
