import { useState } from 'react'
import { BarChart3, Users, BookOpen, ShieldCheck, Building2, Download, IndianRupee, Database, GanttChartSquare, MessageSquare, Settings, UserPlus, Edit, Trash, List, Wallet, ChevronDown, ChevronRight, CheckCircle2, Eye, Key } from 'lucide-react'

import { RolePermissions } from '@/types'

interface PermissionsMatrixProps {
    rolePermissionsMatrix: Record<string, RolePermissions>
    onChange: (newMatrix: Record<string, RolePermissions>) => void
    isLoading: boolean
    onSave: () => void
}

const ROLES = ['Super Admin', 'Campus Head', 'Finance Admin', 'Admission Admin', 'Campus Admin', 'Staff', 'Parent', 'Alumni', 'Others']

const SECTIONS = [
    {
        id: 'admin_modules',
        title: 'Admin Dashboard Modules',
        modules: [
            { key: 'analytics', label: 'Analytics Overview', icon: BarChart3 },
            { key: 'userManagement', label: 'User Management', icon: Users },
            { key: 'userManagement.canCreate', label: 'Create Users', icon: UserPlus, isSub: true },
            { key: 'userManagement.canEdit', label: 'Edit Users', icon: Edit, isSub: true },
            { key: 'userManagement.canDelete', label: 'Delete Users', icon: Trash, isSub: true },
            { key: 'studentManagement', label: 'Student Management', icon: BookOpen },
            { key: 'studentManagement.canCreate', label: 'Add Student', icon: UserPlus, isSub: true },
            { key: 'studentManagement.canEdit', label: 'Edit Student', icon: Edit, isSub: true },
            { key: 'studentManagement.canDelete', label: 'Delete Student', icon: Trash, isSub: true },
            { key: 'adminManagement', label: 'Admin Management', icon: ShieldCheck },
            { key: 'adminManagement.canCreate', label: 'Create Admins', icon: UserPlus, isSub: true },
            { key: 'adminManagement.canEdit', label: 'Edit Admins', icon: Edit, isSub: true },
            { key: 'adminManagement.canDelete', label: 'Delete Admins', icon: Trash, isSub: true },
            { key: 'campusPerformance', label: 'Campus Management', icon: Building2 },
            { key: 'reports', label: 'Reports & Exports', icon: Download },
            { key: 'settlements', label: 'Finance & Settlements', icon: IndianRupee },
            { key: 'marketingKit', label: 'Marketing Kit', icon: Database },
            { key: 'auditLog', label: 'Audit Trail', icon: GanttChartSquare },
            { key: 'supportDesk', label: 'Support Desk', icon: MessageSquare },
            { key: 'passwordReset', label: 'Admin Password Reset', icon: Key },
            { key: 'settings', label: 'System Settings', icon: Settings },
            { key: 'deletionHub', label: 'Account Deletion Hub', icon: Trash },
            { key: 'referralTracking', label: 'Global Referral Module', icon: List },
            { key: 'feeManagement', label: 'Fee Management', icon: Wallet },
            { key: 'engagementCentre', label: 'Engagement Centre', icon: Users },
        ]
    },
    {
        id: 'ambassador_modules',
        title: 'Ambassador Portal Modules',
        modules: [
            { key: 'referralSubmission', label: 'Referral Submission', icon: UserPlus },
            { key: 'referralTracking', label: 'Referral Tracking', icon: List },
            { key: 'savingsCalculator', label: 'Savings Calculator', icon: Wallet },
            { key: 'rulesAccess', label: 'Rules & Guidelines', icon: BookOpen },
        ]
    }
]

export function PermissionsMatrix({
    rolePermissionsMatrix,
    onChange,
    isLoading,
    onSave
}: PermissionsMatrixProps) {
    const [hoveredRole, setHoveredRole] = useState<string | null>(null)
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})

    const toggleSection = (sectionId: string) => {
        setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
    }

    const handleToggle = (role: string, moduleKey: string) => {
        const isSubKey = moduleKey.includes('.')
        const newMatrix = { ...rolePermissionsMatrix }

        // Safety check for role existence
        if (!newMatrix[role]) return

        if (isSubKey) {
            const [parentKey, subKey] = moduleKey.split('.')
            if (newMatrix[role][parentKey] && typeof newMatrix[role][parentKey] === 'object') {
                newMatrix[role][parentKey][subKey] = !newMatrix[role][parentKey][subKey]
            }
        } else {
            if (newMatrix[role][moduleKey]) {
                newMatrix[role][moduleKey].access = !newMatrix[role][moduleKey].access
            }
        }

        onChange(newMatrix)
    }

    const handleScopeCycle = (role: string, moduleKey: string, currentScope: string) => {
        const newMatrix = { ...rolePermissionsMatrix }
        if (!newMatrix[role]?.[moduleKey]) return

        const scopes = ['all', 'campus', 'campus-view', 'self', 'view-only']

        const currentIndex = scopes.indexOf(currentScope)
        const nextIndex = (currentIndex + 1) % scopes.length
        const nextScope = scopes[nextIndex]

        newMatrix[role][moduleKey].scope = nextScope
        onChange(newMatrix)
    }

    return (
        <div className="space-y-6 animate-fade-in pb-20 w-full xl:max-w-[calc(100vw-340px)] mx-auto">
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #f0f0f0', overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,0.05)' }}>
                {/* Header Actions */}
                <div style={{ padding: '24px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(to right, #ffffff, #f9fafb)' }}>
                    <div>
                        <h3 style={{ fontSize: '20px', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
                            Access Control Matrix
                            <span style={{ fontSize: '10px', padding: '2px 8px', background: '#F3F4F6', color: '#6B7280', borderRadius: '12px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Beta</span>
                        </h3>
                        <p style={{ fontSize: '14px', color: '#6B7280', marginTop: '4px' }}>Manage granular permissions and data visibility scopes across all system roles.</p>
                    </div>
                    <button
                        onClick={onSave}
                        disabled={isLoading}
                        style={{
                            padding: '12px 24px',
                            background: isLoading ? '#E5E7EB' : 'linear-gradient(135deg, #CC0000, #EF4444)',
                            color: isLoading ? '#9CA3AF' : 'white',
                            border: 'none', borderRadius: '12px',
                            fontSize: '14px', fontWeight: '700',
                            cursor: isLoading ? 'not-allowed' : 'pointer',
                            boxShadow: isLoading ? 'none' : '0 4px 12px rgba(220, 38, 38, 0.3)',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            transition: 'all 0.2s',
                            flexShrink: 0
                        }}
                    >
                        {isLoading ? (
                            <div className="animate-spin w-4 h-4 border-2 border-current border-t-transparent rounded-full" />
                        ) : (
                            <CheckCircle2 size={16} />
                        )}
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* Matrix Table */}
                <div style={{ overflowX: 'auto', maxHeight: '75vh', overflowY: 'auto', maxWidth: '100%' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0 }}>
                        <thead style={{ position: 'sticky', top: 0, zIndex: 20 }}>
                            <tr>
                                <th style={{
                                    padding: '16px', textAlign: 'left',
                                    background: 'rgba(255, 255, 255, 0.95)',
                                    backdropFilter: 'blur(8px)',
                                    borderBottom: '1px solid #E5E7EB',
                                    minWidth: '240px',
                                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                }}>
                                    <span style={{ fontSize: '11px', fontWeight: '700', color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Module / Capability</span>
                                </th>
                                {ROLES.map(role => (
                                    <th
                                        key={role}
                                        onMouseEnter={() => setHoveredRole(role)}
                                        onMouseLeave={() => setHoveredRole(null)}
                                        style={{
                                            padding: '16px 8px', textAlign: 'center',
                                            background: hoveredRole === role ? '#FEF2F2' : 'rgba(255, 255, 255, 0.95)', // Subtle rde tint on hover
                                            backdropFilter: 'blur(8px)',
                                            borderBottom: '1px solid #E5E7EB',
                                            minWidth: '130px',
                                            transition: 'background-color 0.2s',
                                            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)'
                                        }}
                                    >
                                        <div style={{ fontSize: '13px', fontWeight: '800', color: '#111827' }}>{role}</div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {SECTIONS.map((section, sectionIdx) => (
                                <TableSection
                                    key={section.id}
                                    section={section}
                                    rolePermissionsMatrix={rolePermissionsMatrix}
                                    hoveredRole={hoveredRole}
                                    isCollapsed={collapsedSections[section.id]}
                                    onToggleCollapse={() => toggleSection(section.id)}
                                    onTogglePermission={handleToggle}
                                    onCycleScope={handleScopeCycle}
                                    setHoveredRole={setHoveredRole}
                                />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}

// Sub-component for performance and organization
function TableSection({
    section,
    rolePermissionsMatrix,
    hoveredRole,
    isCollapsed,
    onToggleCollapse,
    onTogglePermission,
    onCycleScope,
    setHoveredRole
}: any) {
    return (
        <>
            {/* Section Header */}
            <tr
                onClick={onToggleCollapse}
                style={{ cursor: 'pointer', background: '#F9FAFB' }}
            >
                <td colSpan={ROLES.length + 1} style={{ padding: '12px 24px', borderBottom: '1px solid #E5E7EB' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isCollapsed ? <ChevronRight size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
                        <span style={{ fontSize: '12px', fontWeight: '800', color: '#4B5563', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{section.title}</span>
                        <div style={{ flex: 1, height: '1px', background: '#E5E7EB', marginLeft: '12px' }}></div>
                    </div>
                </td>
            </tr>

            {/* Section Rows */}
            {!isCollapsed && section.modules.map((module: any, idx: number) => (
                <tr key={module.key} style={{
                    background: 'white',
                    borderBottom: '1px dashed #F3F4F6',
                    transition: 'background-color 0.1s'
                }}>
                    {/* Module Name Column */}
                    <td style={{ padding: '12px 16px', borderRight: '1px solid #F9FAFB' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: module.isSub ? '32px' : '8px' }}>
                            <div style={{
                                padding: '6px',
                                background: module.isSub ? 'transparent' : '#F3F4F6',
                                borderRadius: '8px',
                                color: module.isSub ? '#9CA3AF' : '#4B5563'
                            }}>
                                <module.icon size={16} strokeWidth={module.isSub ? 2 : 2.5} />
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ fontWeight: module.isSub ? '500' : '600', fontSize: '13px', color: module.isSub ? '#374151' : '#374151' }}>
                                    {module.label}
                                </span>
                                {module.isSub && <span style={{ fontSize: '10px', color: '#9CA3AF' }}>Sub-permission</span>}
                            </div>
                        </div>
                    </td>

                    {/* Role Columns */}
                    {ROLES.map((role: string) => {
                        const isSubKey = module.key.includes('.')
                        let perm: any
                        let accessValue: boolean = false
                        let scopeValue: string = 'view-only'

                        // Safe access to nested permission objects
                        if (isSubKey) {
                            const [parentKey, subKey] = module.key.split('.')
                            if (rolePermissionsMatrix[role] && rolePermissionsMatrix[role][parentKey]) {
                                accessValue = rolePermissionsMatrix[role][parentKey][subKey]
                            }
                        } else {
                            if (rolePermissionsMatrix[role] && rolePermissionsMatrix[role][module.key]) {
                                const moduleKey = module.key as keyof RolePermissions
                                const permission = rolePermissionsMatrix[role]?.[moduleKey]
                                accessValue = permission.access
                                scopeValue = permission.scope
                            }
                        }

                        // Determine if cell is disabled (no data)
                        const noData = !rolePermissionsMatrix[role]

                        return (
                            <td
                                key={role}
                                onMouseEnter={() => setHoveredRole(role)}
                                onMouseLeave={() => setHoveredRole(null)}
                                style={{
                                    padding: '12px 4px',
                                    background: hoveredRole === role ? '#FEF2F2' : 'transparent', // Highlight column
                                    borderRight: '1px solid #F9FAFB',
                                    transition: 'background-color 0.2s',
                                    textAlign: 'center'
                                }}
                            >
                                {noData ? (
                                    <span className="text-gray-300">-</span>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                                        {/* Toggle Switch */}
                                        <div
                                            onClick={() => onTogglePermission(role, module.key)}
                                            style={{
                                                width: '40px', height: '22px',
                                                background: accessValue ? '#10B981' : '#E5E7EB',
                                                borderRadius: '20px',
                                                position: 'relative',
                                                cursor: 'pointer',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: accessValue ? '0 2px 4px rgba(16, 185, 129, 0.3)' : 'inset 0 1px 2px rgba(0,0,0,0.1)'
                                            }}
                                        >
                                            <div style={{
                                                width: '18px', height: '18px',
                                                background: 'white',
                                                borderRadius: '50%',
                                                position: 'absolute',
                                                left: accessValue ? '20px' : '2px',
                                                top: '2px',
                                                transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                                boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
                                            }}></div>
                                        </div>

                                        {/* Scope Selector (Only for non-sub permissions and when access is true) */}
                                        {!isSubKey && (
                                            <div style={{ opacity: accessValue ? 1 : 0.3, pointerEvents: accessValue ? 'auto' : 'none', transition: 'opacity 0.2s' }}>
                                                <ScopePill
                                                    scope={scopeValue}
                                                    onClick={() => onCycleScope(role, module.key, scopeValue)}
                                                />
                                            </div>
                                        )}
                                    </div>
                                )}
                            </td>
                        )
                    })}
                </tr>
            ))}
        </>
    )
}

const ScopePill = ({ scope, onClick, disabled }: { scope: string, onClick: () => void, disabled?: boolean }) => {
    let bg = '#F3F4F6'
    let color = '#374151'
    let label = 'View'
    let icon = <Eye size={10} />

    switch (scope) {
        case 'all':
            bg = '#DBEAFE' // blue-100
            color = '#1E40AF' // blue-800
            label = 'All'
            icon = <Building2 size={10} />
            break
        case 'campus':
            bg = '#FFEDD5' // orange-100
            color = '#9A3412' // orange-800
            label = 'Campus'
            icon = <Building2 size={10} />
            break
        case 'self':
            bg = '#F3E8FF' // purple-100
            color = '#6B21A8' // purple-800
            label = 'Self'
            icon = <Users size={10} />
            break
        case 'view-only':
            bg = '#F3F4F6'
            color = '#4B5563'
            label = 'View'
            icon = <Eye size={10} />
            break
        case 'campus-view':
            bg = '#E0F2FE' // light sky blue
            color = '#0369A1' // sky blue 800
            label = 'Campus View'
            icon = <Eye size={10} />
            break
    }

    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                padding: '4px 8px', borderRadius: '12px',
                background: bg, color: color,
                fontSize: '10px', fontWeight: '700',
                border: 'none', cursor: disabled ? 'default' : 'pointer',
                textTransform: 'uppercase', letterSpacing: '0.05em',
                transition: 'all 0.2s',
                opacity: disabled ? 0.5 : 1
            }}
            title={`Scope: ${label} (Click to cycle)`}
        >
            {icon}
            <span>{label}</span>
        </button>
    )
}
