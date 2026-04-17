import { useState } from 'react'
import { BarChart3, Users, BookOpen, ShieldCheck, Building2, Download, IndianRupee, Database, GanttChartSquare, MessageSquare, Settings, UserPlus, Edit, Trash, List, Wallet, ChevronDown, ChevronRight, CheckCircle2, Eye, Key, RotateCcw, ExternalLink, Globe, CreditCard, Percent, Calendar, RefreshCw, FileText, ShieldAlert, Search, Copy, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

import { RolePermissions } from '@/types'

interface PermissionsMatrixProps {
    rolePermissionsMatrix: Record<string, RolePermissions>
    onChange: (newMatrix: Record<string, RolePermissions>) => void
    isLoading: boolean
    onSave: () => void
    onReset: (role: string) => Promise<void>
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
            { key: 'supportDesk', label: 'Support Desk', icon: MessageSquare },
            { key: 'passwordReset', label: 'Admin Password Reset', icon: Key },
            { key: 'referralTracking', label: 'Global Referral Module', icon: List },
            { key: 'engagementCentre', label: 'Engagement Centre', icon: Users },
            { key: 'programLeads', label: 'Program Leads Manager', icon: List },
            { key: 'externalPrograms', label: 'External Programs', icon: Globe, isSub: true, canCreate: true, canEdit: true, canDelete: true },
        ]
    },
    {
        id: 'finance',
        title: 'Financials & Revenue',
        modules: [
            { key: 'settlements', label: 'Settlements & Payouts', icon: CreditCard },
            { key: 'paymentApproval', label: 'Payment Verification', icon: CheckCircle2 },
            { key: 'feeManagement', label: 'Fee Slab Management', icon: Percent, canCreate: true, canEdit: true },
        ]
    },
    {
        id: 'system',
        title: 'System & Governance',
        modules: [
            { key: 'settings', label: 'Global Configurations', icon: Settings },
            { key: 'academicCycles', label: 'Academic Cycles', icon: Calendar, isSub: true },
            { key: 'disasterRecovery', label: 'Disaster Recovery', icon: RefreshCw, isSub: true },
            { key: 'auditLog', label: 'Audit Trail', icon: FileText },
            { key: 'deletionHub', label: 'Privacy & Deletion', icon: ShieldAlert },
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
    onSave,
    onReset
}: PermissionsMatrixProps) {
    const [hoveredRole, setHoveredRole] = useState<string | null>(null)
    const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({})
    const [searchQuery, setSearchQuery] = useState('')

    const filteredSections = SECTIONS.map(section => ({
        ...section,
        modules: section.modules.filter(m => m.label.toLowerCase().includes(searchQuery.toLowerCase()))
    })).filter(section => section.modules.length > 0)

    const toggleSection = (sectionId: string) => {
        setCollapsedSections(prev => ({ ...prev, [sectionId]: !prev[sectionId] }))
    }

    const handleToggle = (role: string, moduleKey: string) => {
        const newMatrix = { ...rolePermissionsMatrix }
        if (!newMatrix[role]) return

        // Deep clone the role permissions to avoid direct mutation
        newMatrix[role] = { ...newMatrix[role] }

        const isSubKey = moduleKey.includes('.')
        if (isSubKey) {
            const [parentKey, subKey] = moduleKey.split('.')
            const parent = newMatrix[role][parentKey as keyof RolePermissions]
            if (parent && typeof parent === 'object') {
                (newMatrix[role] as any)[parentKey] = {
                    ...parent,
                    [subKey]: !(parent as any)[subKey]
                }
            }
        } else {
            const mk = moduleKey as keyof RolePermissions
            if (newMatrix[role][mk]) {
                newMatrix[role][mk] = {
                    ...newMatrix[role][mk],
                    access: !newMatrix[role][mk].access
                }
            }
        }
        onChange(newMatrix)
    }

    const handleScopeCycle = (role: string, moduleKey: string, currentScope: string) => {
        const newMatrix = { ...rolePermissionsMatrix }
        const mk = moduleKey as keyof RolePermissions
        if (!newMatrix[role]?.[mk]) return

        const scopes = ['all', 'campus', 'campus-view', 'self', 'view-only']
        const currentIndex = scopes.indexOf(currentScope)
        const nextIndex = (currentIndex + 1) % scopes.length
        const nextScope = scopes[nextIndex]

        newMatrix[role] = {
            ...newMatrix[role],
            [mk]: {
                ...newMatrix[role][mk],
                scope: nextScope as any
            }
        }

        onChange(newMatrix)
    }

    return (
        <div className="space-y-6 animate-fade-in pb-10 w-full">
            <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-2xl shadow-gray-200/50">
                {/* Header Actions */}
                <div className="p-6 border-b border-gray-100 flex flex-col md:flex-row justify-between items-start md:items-center bg-gradient-to-r from-white to-gray-50/50 gap-4">
                    <div>
                        <h3 className="text-xl font-black text-gray-900 flex items-center gap-2">
                            Access Control Matrix
                            <span className="text-[10px] px-2 py-0.5 bg-gray-100 text-gray-500 rounded-full uppercase tracking-widest font-bold">Beta</span>
                        </h3>
                        <p className="text-sm text-gray-500 mt-1 font-medium">Manage granular permissions and data visibility scopes across all system roles.</p>
                    </div>

                    <div className="flex-1 w-full md:max-w-md md:mx-6 relative">
                        <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                            <Search size={16} />
                        </div>
                        <input
                            type="text"
                            placeholder="Search permissions..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-gray-100 border border-gray-200 rounded-xl text-sm font-bold text-gray-700 outline-none transition-all focus:bg-white focus:border-red-500 focus:ring-4 focus:ring-red-50"
                        />
                    </div>

                    <button
                        onClick={onSave}
                        disabled={isLoading}
                        className={`
                            px-6 py-3 rounded-xl text-sm font-black flex items-center gap-2 transition-all flex-shrink-0
                            ${isLoading 
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                                : 'bg-gradient-to-br from-red-600 to-red-500 text-white shadow-lg shadow-red-200 hover:shadow-red-300 active:scale-95'}
                        `}
                    >
                        {isLoading ? (
                            <Loader2 size={16} className="animate-spin" />
                        ) : (
                            <CheckCircle2 size={16} />
                        )}
                        {isLoading ? 'Saving...' : 'Save Changes'}
                    </button>
                </div>

                {/* Matrix Table */}
                <div className="overflow-x-auto maxWidth-full">
                    <table className="w-full border-collapse separate border-spacing-0">
                        <thead className="sticky top-0 z-20">
                            <tr>
                                <th className="p-4 text-left bg-white sticky left-0 z-30 border-b border-gray-200 border-r border-gray-50 min-w-[320px] shadow-[4px_0_8px_-4px_rgba(0,0,0,0.1)]">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[11px] font-black text-gray-400 uppercase tracking-widest">Module / Capability</span>
                                        {searchQuery && <span className="text-[10px] bg-red-50 text-red-800 px-1.5 py-0.5 rounded font-bold uppercase">Filtered</span>}
                                    </div>
                                </th>
                                {ROLES.map(role => {
                                    // Calculate active permissions count
                                    const rolePerms = rolePermissionsMatrix[role] || {}
                                    const activeCount = Object.values(rolePerms).filter((p: any) => p && typeof p === 'object' && p.access === true).length
                                    const totalCount = SECTIONS.reduce((acc, s) => acc + s.modules.filter((m: any) => !m.isSub).length, 0)

                                    return (
                                        <th
                                            key={role}
                                            onMouseEnter={() => setHoveredRole(role)}
                                            onMouseLeave={() => setHoveredRole(null)}
                                            className={`
                                                px-2 py-4 text-center border-b border-gray-200 min-w-[180px] transition-colors backdrop-blur-md sticky top-0
                                                ${hoveredRole === role ? 'bg-red-50/50' : 'bg-white/95'}
                                            `}
                                        >
                                            <div className="flex flex-col items-center gap-1">
                                                <div className="text-sm font-black text-gray-900 italic uppercase tracking-tighter">{role}</div>
                                                <div className={`
                                                    text-[9px] font-black px-2 py-0.5 rounded-lg border uppercase tracking-widest
                                                    ${activeCount > 0 ? 'bg-emerald-50 text-emerald-700 border-emerald-100 shadow-sm shadow-emerald-700/5' : 'bg-gray-50 text-gray-500 border-gray-100'}
                                                `}>
                                                    {activeCount} / {totalCount} ACTIVE
                                                </div>
                                                <div className="flex gap-1">
                                                    <button
                                                        onClick={() => {
                                                            const sourceRole = window.prompt(`Copy permissions TO ${role} FROM which role? (${ROLES.filter(r => r !== role).join(', ')})`)
                                                            if (sourceRole && ROLES.includes(sourceRole)) {
                                                                const newMatrix = { ...rolePermissionsMatrix }
                                                                newMatrix[role] = JSON.parse(JSON.stringify(rolePermissionsMatrix[sourceRole]))
                                                                onChange(newMatrix)
                                                                toast.success(`Copied permissions from ${sourceRole} to ${role}`)
                                                            } else if (sourceRole) {
                                                                toast.error('Invalid role name')
                                                            }
                                                        }}
                                                        title={`Copy from another role to ${role}`}
                                                        className={`p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all ${hoveredRole === role ? 'opacity-100' : 'opacity-0'}`}
                                                    >
                                                        <Copy size={12} />
                                                    </button>
                                                    <button
                                                        onClick={() => onReset(role)}
                                                        title={`Reset ${role} to defaults`}
                                                        className={`p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all ${hoveredRole === role ? 'opacity-100' : 'opacity-0'}`}
                                                    >
                                                        <RotateCcw size={12} />
                                                    </button>
                                                </div>
                                            </div>
                                        </th>
                                    )
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredSections.map((section, sectionIdx) => (
                                <TableSection
                                    key={section.id}
                                    section={section}
                                    rolePermissionsMatrix={rolePermissionsMatrix}
                                    hoveredRole={hoveredRole}
                                    isCollapsed={collapsedSections[section.id] || (searchQuery !== '' && !section.modules.some(m => m.label.toLowerCase().includes(searchQuery.toLowerCase())))}
                                    onToggleCollapse={() => toggleSection(section.id)}
                                    onTogglePermission={handleToggle}
                                    onCycleScope={handleScopeCycle}
                                    setHoveredRole={setHoveredRole}
                                    onDuplicateRole={(source: string, target: string) => {
                                        const newMatrix = { ...rolePermissionsMatrix }
                                        newMatrix[target] = JSON.parse(JSON.stringify(rolePermissionsMatrix[source]))
                                        onChange(newMatrix)
                                        toast.success(`Permissions copied from ${source} to ${target}`)
                                    }}
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
                className="cursor-pointer bg-gray-50/80 hover:bg-gray-100 transition-colors"
            >
                <td colSpan={ROLES.length + 1} className="px-6 py-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                        {isCollapsed ? <ChevronRight size={18} className="text-gray-400" /> : <ChevronDown size={18} className="text-gray-400" />}
                        <span className="text-[11px] font-black text-gray-600 uppercase tracking-widest">{section.title}</span>
                        <div className="flex-1 h-px bg-gray-200 ml-4"></div>
                    </div>
                </td>
            </tr>

            {/* Section Rows */}
            {!isCollapsed && section.modules.map((module: any, idx: number) => (
                <tr key={`${section.id}-${module.key}`} className="bg-white border-b border-gray-50/50 hover:bg-gray-50/30 transition-colors">
                    <td className="p-4 border-r border-gray-50 bg-white sticky left-0 z-10 shadow-[4px_0_8px_-4px_rgba(0,0,0,0.05)]">
                        <div className={`flex items-center gap-3 ${module.isSub ? 'ml-8' : 'ml-2'}`}>
                            <div className={`
                                p-1.5 rounded-lg transition-colors
                                ${module.isSub ? 'bg-transparent text-gray-400' : 'bg-gray-100 text-gray-600'}
                            `}>
                                <module.icon size={16} strokeWidth={module.isSub ? 2 : 2.5} />
                            </div>
                            <div className="flex flex-col">
                                <span className={`text-[13px] tracking-tight ${module.isSub ? 'font-medium text-gray-500' : 'font-black text-gray-800'}`}>
                                    {module.label}
                                </span>
                                {module.isSub && <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sub-permission</span>}
                            </div>
                        </div>
                    </td>

                    {/* Role Columns */}
                    {ROLES.map((role: string) => {
                        // DECISION LOGIC: Decoupling UI for Referrals without affecting DB
                        // We hide the redundant one based on role type
                        const isAmbassadorRole = ['Staff', 'Parent', 'Alumni', 'Others'].includes(role)
                        const isReferralTrackingKey = module.key === 'referralTracking'
                        
                        // Logic to show "Referral Tracking" toggle ONLY for Ambassadors 
                        // and "Global Referral Module" toggle ONLY for Admin roles.
                        const isAmbassadorTrackerRow = isReferralTrackingKey && section.id === 'ambassador_modules'
                        const isGlobalModuleRow = isReferralTrackingKey && section.id === 'admin_modules'

                        const shouldHideThisRowForThisRole = 
                            (isAmbassadorRole && isGlobalModuleRow) || 
                            (!isAmbassadorRole && isAmbassadorTrackerRow)

                        const isSubKey = module.key.includes('.')
                        let accessValue: boolean = false
                        let scopeValue: string = 'view-only'

                        if (isSubKey) {
                            const [parentKey, subKey] = module.key.split('.')
                            if (rolePermissionsMatrix[role] && rolePermissionsMatrix[role][parentKey]) {
                                accessValue = rolePermissionsMatrix[role][parentKey][subKey]
                            }
                        } else {
                            if (rolePermissionsMatrix[role] && rolePermissionsMatrix[role][module.key]) {
                                const moduleKey = module.key as keyof RolePermissions
                                accessValue = rolePermissionsMatrix[role][moduleKey].access
                                scopeValue = rolePermissionsMatrix[role][moduleKey].scope
                            }
                        }

                        const noData = !rolePermissionsMatrix[role]

                        return (
                            <td
                                key={role}
                                onMouseEnter={() => setHoveredRole(role)}
                                onMouseLeave={() => setHoveredRole(null)}
                                className={`
                                    px-1 py-4 text-center border-r border-gray-50 transition-colors
                                    ${hoveredRole === role ? 'bg-red-50/30' : 'bg-transparent'}
                                `}
                            >
                                {noData ? (
                                    <span className="text-gray-200">-</span>
                                ) : shouldHideThisRowForThisRole ? (
                                    <div className="text-[10px] text-gray-300 font-bold uppercase italic tracking-widest leading-tight">N/A</div>
                                ) : (
                                    <div className="flex flex-col items-center gap-2">
                                        {accessValue ? (
                                            <div
                                                onClick={() => onTogglePermission(role, module.key)}
                                                className={`
                                                    w-10 h-5 rounded-full relative cursor-pointer transition-all shadow-sm
                                                    bg-emerald-500 shadow-emerald-500/20
                                                `}
                                                role="switch"
                                                aria-checked="true"
                                                aria-label={`${module.label} for ${role}`}
                                            >
                                                <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm left-[22px]"></div>
                                            </div>
                                        ) : (
                                            <div
                                                onClick={() => onTogglePermission(role, module.key)}
                                                className={`
                                                    w-10 h-5 rounded-full relative cursor-pointer transition-all shadow-sm
                                                    bg-gray-200
                                                `}
                                                role="switch"
                                                aria-checked="false"
                                                aria-label={`${module.label} for ${role}`}
                                            >
                                                <div className="w-4 h-4 bg-white rounded-full absolute top-0.5 transition-all shadow-sm left-0.5"></div>
                                            </div>
                                        )}

                                        {!isSubKey && (
                                            <div className={`transition-opacity duration-200 ${accessValue ? 'opacity-100' : 'opacity-20 pointer-events-none'}`}>
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
    let classes = 'bg-gray-100 text-gray-700'
    let label = 'View'
    let icon = <Eye size={10} />

    switch (scope) {
        case 'all':
            classes = 'bg-blue-100 text-blue-800'
            label = 'All'
            icon = <Building2 size={10} />
            break
        case 'campus':
            classes = 'bg-orange-100 text-orange-800'
            label = 'Campus'
            icon = <Building2 size={10} />
            break
        case 'self':
            classes = 'bg-purple-100 text-purple-800'
            label = 'Self'
            icon = <Users size={10} />
            break
        case 'view-only':
            classes = 'bg-gray-100 text-gray-600'
            label = 'View'
            icon = <Eye size={10} />
            break
        case 'campus-view':
            classes = 'bg-sky-100 text-sky-800'
            label = 'Campus View'
            icon = <Eye size={10} />
            break
    }

    return (
        <button
            onClick={disabled ? undefined : onClick}
            disabled={disabled}
            className={`
                flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-transparent transition-all
                ${classes}
                ${disabled ? 'opacity-50 cursor-default' : 'hover:border-current cursor-pointer active:scale-95 shadow-sm'}
            `}
            title={`Scope: ${label} (Click to cycle)`}
        >
            {icon}
            <span>{label}</span>
        </button>
    )
}
