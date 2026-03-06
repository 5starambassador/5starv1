import { getCurrentUser } from '@/lib/auth-service'
import { AccountStatus } from '@prisma/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, List, BookOpen, Shield, LogOut, User, Building2, Users, Target, Settings, FileDown, IndianRupee, Database, GanttChartSquare, MessageSquare, ShieldCheck, Star, BarChart3, Trash2, Zap, Lock, UserCog, Share2, Megaphone, Globe, Gift, CheckCircle, ExternalLink, MousePointerClick, LayoutDashboard, GraduationCap, GitFork, Calculator, History, UserCheck } from 'lucide-react'
import { MobileMenu } from '@/components/MobileMenu'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import { NotificationTicker } from '@/components/NotificationTicker'
import MobileSidebarWrapper from '@/components/MobileSidebarWrapper'
import { BottomNav } from '@/components/BottomNav'
import { getMyPermissions } from '@/lib/permission-service'
import { RolePermissions } from '@/lib/permissions'
import { deleteSession } from '@/lib/session'
import { LayoutOverlays } from '@/components/LayoutOverlays'
import { CollapsibleSidebar } from '@/components/CollapsibleSidebar'

async function logout() {
    'use server'
    await deleteSession()
}

export const dynamic = 'force-dynamic'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser()

    if (!user) {
        redirect('/')
    }

    // Check Payment Status (Skip for Admins and Active legacy users)
    const isSpecialRole = user.role === 'Super Admin' || user.role === 'Finance Admin' || user.role.includes('Admin') || user.role.includes('Campus')

    if (!isSpecialRole && (user as any).status !== 'Active') {
        redirect('/complete-payment')
    }


    // IMPORTANT: Check roles in specific order to avoid confusion
    // "Super Admin" contains "Admin", so check it FIRST
    const isSuperAdmin = user.role === 'Super Admin'
    const isCampusHead = user.role === 'Campus Head'
    const isCampusAdmin = user.role === 'Campus Admin'
    const isCampusLevel = isCampusHead || isCampusAdmin
    const isRegularAdmin = (user.role.includes('Admin') || user.role === 'Admission Admin') && !isSuperAdmin && !isCampusAdmin
    const isAmbassadorRole = user.role === 'Staff' || user.role === 'Parent' || user.role === 'Alumni' || user.role === 'Others'

    const navItems = []
    const permissions = await getMyPermissions()

    if (permissions) {
        const isFinanceAdmin = user.role === 'Finance Admin'
        // Dashboard Link (Role-specific destination)
        const dashboardHref = isSuperAdmin ? '/superadmin' : (isCampusLevel ? '/campus' : (isFinanceAdmin ? '/finance' : (isRegularAdmin ? '/admin' : '/dashboard')))
        navItems.push({ label: 'Home', href: dashboardHref, icon: <Home /> })

        // Admin Modules
        const baseAdminPath = isSuperAdmin ? '/superadmin' : (isCampusLevel ? '/campus' : '/admin')

        if (permissions.analytics.access && !isAmbassadorRole && !isSuperAdmin) navItems.push({ label: 'Analytics', href: `${baseAdminPath}?view=analytics`, icon: <Shield /> })
        if (permissions.campusPerformance.access && !isSuperAdmin) navItems.push({ label: 'Campus Management', href: `${baseAdminPath}?view=campuses`, icon: <Building2 /> })

        // These modules might not be ready in AdminClient yet, but if permissions allow, we link them.
        // We might need to implement these views in AdminClient or condition these links further.
        if (permissions.userManagement.access && !isSuperAdmin) navItems.push({ label: 'User Management', href: isCampusLevel ? '/campus/users' : `${baseAdminPath}?view=users`, icon: <Users /> })
        if (permissions.studentManagement.access && !isSuperAdmin) navItems.push({ label: 'Student Management', href: isCampusLevel ? '/campus/students' : `${baseAdminPath}?view=students`, icon: <BookOpen /> })
        if (permissions.adminManagement.access) navItems.push({ label: 'Admin Management', href: `${baseAdminPath}?view=admins`, icon: <UserCog /> })
        if (permissions.reports.access) navItems.push({ label: 'Reports', href: `${baseAdminPath}?view=reports`, icon: <FileDown /> })
        // Global Referral Module removed (Duplicate for Super Admin)
        if (isSuperAdmin) navItems.push({ label: 'Fee Management', href: `/superadmin?view=fees`, icon: <IndianRupee /> })

        // Specific management of dashboard types based on permissions
        if (permissions.engagementCentre?.access) navItems.push({ label: 'Engagement Center', href: `${baseAdminPath}?view=engagement`, icon: <Zap /> })
        if (isSuperAdmin) {
            navItems.push({ label: 'System Overview', href: '/superadmin?view=analytics', icon: <LayoutDashboard /> })
            navItems.push({ label: 'Campus Control', href: '/superadmin/campuses', icon: <Building2 /> })
            navItems.push({ label: 'User Operations', href: '/superadmin/users', icon: <Users /> })
            navItems.push({ label: 'Student Records', href: '/superadmin/students', icon: <GraduationCap /> })
            navItems.push({ label: 'Beneficiary Verification', href: '/superadmin/verification', icon: <UserCheck /> })
            navItems.push({ label: 'Referral Pipeline', href: '/superadmin/referrals', icon: <GitFork /> })
            navItems.push({ label: 'External Programs', href: '/superadmin?view=programs', icon: <ExternalLink /> })
            navItems.push({ label: 'Program Leads', href: '/superadmin?view=program-leads', icon: <MousePointerClick /> }) // New Link
            navItems.push({ label: 'Marketing Management', href: '/superadmin?view=marketing', icon: <Megaphone /> })
            navItems.push({ label: 'Revenue & Payouts', href: '/superadmin?view=settlements', icon: <IndianRupee /> })
            navItems.push({ label: 'Access Matrix', href: '/superadmin?view=permissions', icon: <Shield /> })
            navItems.push({ label: 'App Settings', href: '/superadmin?view=settings', icon: <Settings /> })
            navItems.push({ label: 'Automation Settings', href: '/superadmin?view=automation', icon: <Zap /> })
            navItems.push({ label: 'Benefit Management', href: '/superadmin/benefits', icon: <Calculator /> })
        }

        if (permissions.paymentApproval?.access) {
            navItems.push({ label: 'Payment Approvals', href: '/superadmin/approvals', icon: <CheckCircle /> })
            navItems.push({ label: 'Rejection History', href: '/superadmin/approvals/history', icon: <History className="text-red-400" /> })
        }

        if (permissions.deletionHub?.access) {

        }
        // navItems.push({ label: 'Parent Dashboard Ctrl', href: '/superadmin?view=parent-dash', icon: <Star /> })

        if (isCampusLevel) {
            permissions.referralTracking.access && navItems.push({ label: 'Campus Leads', href: '/campus/referrals', icon: <List /> })
        }

        // Ambassador Portal Links (Only for Staff, Parents, Alumni, Others)
        if (isAmbassadorRole) {
            if (permissions.referralTracking.access) navItems.push({ label: 'My Referrals', href: '/referrals', icon: <List /> })
            navItems.push({ label: 'My Earnings', href: '/earnings', icon: <IndianRupee /> })
            if (permissions.programLeads?.access) navItems.push({ label: 'Program Leads', href: '/program-leads', icon: <MousePointerClick /> })
            if (permissions.rulesAccess.access) navItems.push({ label: 'Rules', href: '/rules', icon: <BookOpen /> })
        }

        // Shared Tooling (Available to all who have permission, but hidden for Super Admin who has dedicated management views)
        if (permissions.marketingKit.access && !isSuperAdmin) navItems.push({ label: 'Promo Kit', href: '/marketing', icon: <Share2 /> })
        if (permissions.supportDesk.access && !isSuperAdmin) navItems.push({ label: 'Support Desk', href: '/support', icon: <MessageSquare /> })

        // Admin-specific shared modules (Hide from Ambassadors)
        if (!isAmbassadorRole) {
            if (permissions.supportDesk.access) navItems.push({ label: 'Support Tickets', href: '/tickets', icon: <MessageSquare /> })
            if (permissions.settlements.access) {
                // Campus Head goes to campus-specific finance view
                // Finance Admin already has this as 'Home', so we skip adding it again to avoid redundancy
                if (user.role !== 'Finance Admin') {
                    const financeHref = isCampusLevel ? '/campus?view=finance' : '/finance'
                    navItems.push({ label: 'Finance', href: financeHref, icon: <IndianRupee /> })
                }
            }
            if (permissions.auditLog.access) navItems.push({ label: 'Audit Trail', href: '/superadmin?view=audit', icon: <GanttChartSquare /> })
            if (permissions.settings.access && !isSuperAdmin) navItems.push({ label: 'Settings', href: '/superadmin?view=settings', icon: <Settings /> })
        }
    }

    // Always accessible
    navItems.push({ label: 'Profile', href: '/profile', icon: <User /> })

    // Theme Selection
    const isDarkTheme = isAmbassadorRole
    const themeBgClass = isDarkTheme
        ? "bg-[#0f172a]"
        : "bg-slate-50"
    const themeGlassClass = isDarkTheme
        ? "bg-[#0f172a]/95 backdrop-blur-[20px]"
        : "bg-white/85 backdrop-blur-[20px]"

    return (
        <div className={`flex min-h-screen text-text-primary relative ${isDarkTheme ? 'dark bg-[#0f172a]' : 'bg-slate-50'}`}>
            {/* Architectural Background Stack */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                <div className={`absolute inset-0 bg-[url('/bg-pattern.webp')] bg-cover bg-fixed bg-center opacity-[0.4] ${isDarkTheme ? 'invert opacity-[0.05]' : ''}`}></div>
                <div className={`absolute inset-0 ${themeGlassClass}`}></div>
            </div>

            {/* Desktop Collapsible Sidebar (client component — handles expand/collapse) */}
            <CollapsibleSidebar navItems={navItems} user={{ fullName: user.fullName, role: user.role }} logoutAction={logout} />

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col w-full min-w-0 items-center relative">

                {/* Mobile Topbar */}
                <div className={`mobile-topbar xl:hidden fixed top-0 left-0 right-0 h-16 border-b z-[120] flex items-center justify-between px-4 backdrop-blur-xl shadow-lg ${isDarkTheme ? 'bg-[#0f172a]/80 border-white/10 text-white' : 'bg-white/80 border-gray-100 text-gray-900'}`}>
                    <div className="flex items-center gap-3">
                        <MobileSidebarWrapper>
                            <MobileMenu
                                navItems={navItems}
                                user={{ fullName: user.fullName, role: user.role }}
                                logoutAction={logout}
                                viewMode="mobile-grid"
                                hideLogo={true}
                            />
                        </MobileSidebarWrapper>

                        <img
                            src="/achariya_25_logo.jpg"
                            alt="Achariya 25th Year"
                            className="shadow-sm h-9 w-auto"
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        <NotificationDropdown userName={user.fullName} referralCode={(user as any).referralCode || ''} />
                    </div>
                </div>

                <div className={`flex-1 w-full ${isAmbassadorRole ? 'max-w-[1400px]' : 'max-w-full'} flex flex-col pt-16 xl:pt-0 ${isAmbassadorRole ? 'md:pt-0' : ''}`}>
                    {isAmbassadorRole && (
                        <NotificationTicker userName={user.fullName} referralCode={(user as any).referralCode || ''} />
                    )}

                    <main className={`flex-1 w-full px-4 py-4 ${isAmbassadorRole ? 'xl:px-8 xl:py-8' : 'xl:px-4 xl:py-5'} ${isAmbassadorRole ? 'pt-16' : 'pt-4'} xl:pt-5 pb-20 xl:pb-6 relative z-10`}>
                        <header className="hidden xl:flex justify-end mb-4 absolute top-4 right-8 z-20">
                            <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-white/50">
                                <NotificationDropdown userName={user.fullName} referralCode={(user as any).referralCode || ''} />
                            </div>
                        </header>

                        {children}
                    </main>
                </div>

                <BottomNav role={user.role} />
                <LayoutOverlays />
            </div>
        </div>
    )
}

