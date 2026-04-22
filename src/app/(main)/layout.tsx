import { getCurrentUser } from '@/lib/auth-service'
import { AccountStatus } from '@prisma/client'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, List, BookOpen, Shield, LogOut, User, Building2, Users, Target, Settings, FileDown, IndianRupee, Database, GanttChartSquare, MessageSquare, ShieldCheck, Star, BarChart3, Trash2, Zap, Lock, UserCog, Share2, Megaphone, Globe, Gift, CheckCircle, ExternalLink, MousePointerClick, LayoutDashboard, GraduationCap, GitFork, Calculator, History, UserCheck, Trophy } from 'lucide-react'
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

        // Unified Campus Management
        if (permissions.campusPerformance.access && !isAmbassadorRole) {
            const campusHref = isSuperAdmin ? '/superadmin/campuses' : `${baseAdminPath}?view=campuses`
            const campusLabel = isSuperAdmin ? 'Campus Control' : 'Campus Management'
            navItems.push({ label: campusLabel, href: campusHref, icon: <Building2 /> })
        }

        // Unified User Management
        if (permissions.userManagement.access && !isAmbassadorRole) {
            const userHref = isSuperAdmin ? '/superadmin/users' : (isCampusLevel ? '/campus/users' : `${baseAdminPath}?view=users`)
            const userLabel = isSuperAdmin ? 'User Operations' : 'User Management'
            navItems.push({ label: userLabel, href: userHref, icon: <Users /> })
        }

        // Unified Student Management
        if (permissions.studentManagement.access && !isAmbassadorRole) {
            const studentHref = isSuperAdmin ? '/superadmin/students' : (isCampusLevel ? '/campus/students' : `${baseAdminPath}?view=students`)
            const studentLabel = isSuperAdmin ? 'Student Records' : 'Student Management'
            const studentIcon = isSuperAdmin ? <GraduationCap /> : <BookOpen />
            navItems.push({ label: studentLabel, href: studentHref, icon: studentIcon })
        }

        if (permissions.adminManagement.access) navItems.push({ label: 'Admin Management', href: `${baseAdminPath}?view=admins`, icon: <UserCog /> })
        if (permissions.reports.access) navItems.push({ label: 'Reports', href: `${baseAdminPath}?view=reports`, icon: <FileDown /> })
        
        // Dedicated Leaderboard War Room
        if (permissions.campusPerformance.access) navItems.push({ label: 'War Room', href: '/leaderboard', icon: <Trophy className="text-amber-500" /> })

        // Unified Referral Pipeline / Tracking Link

        if (permissions.referralTracking.access && !isAmbassadorRole) {
            const referralHref = isSuperAdmin ? '/superadmin/referrals' : (isCampusLevel ? '/campus/referrals' : `${baseAdminPath}?view=referrals`)
            const referralLabel = isCampusLevel ? 'Campus Leads' : 'Referral Pipeline'
            navItems.push({ label: referralLabel, href: referralHref, icon: <GitFork /> })
        }
        
        if (isSuperAdmin) navItems.push({ label: 'Fee Management', href: `/superadmin?view=fees`, icon: <IndianRupee /> })

        // Specific management of dashboard types based on permissions
        if (permissions.engagementCentre?.access) navItems.push({ label: 'Engagement Center', href: `${baseAdminPath}?view=engagement`, icon: <Zap /> })
        if (permissions.externalPrograms?.access) navItems.push({ label: 'External Programs', href: `${baseAdminPath}?view=programs`, icon: <ExternalLink /> })
        if (permissions.programLeads?.access && !isAmbassadorRole) navItems.push({ label: 'Program Leads', href: `${baseAdminPath}?view=program-leads`, icon: <MousePointerClick /> })

        // Advanced Management Modules (Dynamic visibility based on permissions)
        const canSeeAutomation = isSuperAdmin || (permissions as any).whatsappConfig?.access
        const canSeePermissions = isSuperAdmin || permissions.adminManagement.access
        const canSeeSettings = isSuperAdmin || permissions.settings.access

        if (!isAmbassadorRole) {
            if (isSuperAdmin || permissions.paymentApproval.access) navItems.push({ label: 'Beneficiary Verification', href: '/superadmin/verification', icon: <UserCheck /> })
            
            if (isSuperAdmin || (permissions as any).marketingManager?.access) navItems.push({ label: 'Marketing Management', href: '/superadmin?view=marketing', icon: <Megaphone /> })
            if (isSuperAdmin || permissions.settlements.access) navItems.push({ label: 'Revenue & Payouts', href: '/superadmin?view=settlements', icon: <IndianRupee /> })
            
            if ((canSeePermissions || canSeeAutomation) && user.role !== 'Admission Admin') navItems.push({ label: 'Access Control', href: '/superadmin?view=permissions', icon: <Shield /> })
            if (canSeeSettings) navItems.push({ label: 'Settings', href: '/superadmin?view=settings', icon: <Settings /> })
            
            if (isSuperAdmin || permissions.settlements.access) navItems.push({ label: 'Benefit Management', href: '/superadmin/benefits', icon: <Calculator /> })

            if (permissions.paymentApproval?.access) {
                navItems.push({ label: 'Payment Approvals', href: '/superadmin/approvals', icon: <CheckCircle /> })
                navItems.push({ label: 'Rejection History', href: '/superadmin/approvals/history', icon: <History className="text-red-400" /> })
            }
        }

        if (permissions.deletionHub?.access) {

        }
        // navItems.push({ label: 'Parent Dashboard Ctrl', href: '/superadmin?view=parent-dash', icon: <Star /> })


        // Ambassador Portal Links (Only for Staff, Parents, Alumni, Others)
        if (isAmbassadorRole) {
            if (permissions.referralTracking.access) navItems.push({ label: 'My Referrals', href: '/referrals', icon: <List /> })
            navItems.push({ label: 'My Earnings', href: '/earnings', icon: <IndianRupee /> })
            if (permissions.programLeads?.access) navItems.push({ label: 'Program Leads', href: '/program-leads', icon: <MousePointerClick /> })
            if (permissions.rulesAccess.access) navItems.push({ label: 'Rules', href: '/rules', icon: <BookOpen /> })
        }

        // Shared Tooling (Available to all who have permission, but hidden for Super Admin who has dedicated management views)
        if (permissions.marketingKit.access && !isSuperAdmin) navItems.push({ label: 'Promo Kit', href: '/marketing', icon: <Share2 /> })
        if (permissions.supportDesk.access && !isSuperAdmin && user.role !== 'Admission Admin') navItems.push({ label: 'Support Desk', href: '/support', icon: <MessageSquare /> })

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
            // Audit Trail
            if (permissions.auditLog.access) navItems.push({ label: 'Audit Trail', href: '/superadmin?view=audit', icon: <GanttChartSquare /> })
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

                <div className={`flex-1 w-full ${isAmbassadorRole ? 'max-w-[1400px]' : 'max-w-[1800px]'} flex flex-col pt-16 xl:pt-0 ${isAmbassadorRole ? 'md:pt-0' : ''}`}>
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

