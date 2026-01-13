import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, UserPlus, List, BookOpen, Shield, LogOut, User, Building2, Users, Target, Settings, FileDown, IndianRupee, Database, GanttChartSquare, MessageSquare, ShieldCheck, Star, BarChart3, Trash2, Zap, Lock, UserCog, Share2, Megaphone, Globe } from 'lucide-react'
import { MobileMenu } from '@/components/MobileMenu'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import MobileSidebarWrapper from '@/components/MobileSidebarWrapper'
import { BottomNav } from '@/components/BottomNav'
import { InstallPrompt } from '@/components/InstallPrompt'
import { MobileConfig } from '@/components/MobileConfig'
import { OfflineAlert } from '@/components/OfflineAlert'
import { getMyPermissions } from '@/lib/permission-service'
import { RolePermissions } from '@/lib/permissions'
import { deleteSession } from '@/lib/session'
import { CommandPalette } from '@/components/superadmin/CommandPalette'

async function logout() {
    'use server'
    await deleteSession()
    redirect('/')
}

export const dynamic = 'force-dynamic'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
    const user = await getCurrentUser()
    if (!user) {
        redirect('/')
    }

    // IMPORTANT: Check roles in specific order to avoid confusion
    // "Super Admin" contains "Admin", so check it FIRST
    const isSuperAdmin = user.role === 'Super Admin'
    const isCampusHead = user.role === 'Campus Head'
    const isCampusAdmin = user.role === 'Campus Admin'
    const isCampusLevel = isCampusHead || isCampusAdmin
    const isRegularAdmin = (user.role.includes('Admin') || user.role === 'Admission Admin') && !isSuperAdmin && !isCampusAdmin
    const isAmbassadorRole = user.role === 'Staff' || user.role === 'Parent' || user.role === 'Alumni'

    const navItems = []
    const permissions = await getMyPermissions()

    if (permissions) {
        const isFinanceAdmin = user.role === 'Finance Admin'
        // Dashboard Link (Role-specific destination)
        const dashboardHref = isSuperAdmin ? '/superadmin' : (isCampusLevel ? '/campus' : (isFinanceAdmin ? '/finance' : (isRegularAdmin ? '/admin' : '/dashboard')))
        navItems.push({ label: 'Home', href: dashboardHref, icon: <Home /> })

        // Admin Modules
        const baseAdminPath = isSuperAdmin ? '/superadmin' : (isCampusLevel ? '/campus' : '/admin')

        if (permissions.analytics.access && !isAmbassadorRole) navItems.push({ label: 'Analytics', href: `${baseAdminPath}?view=analytics`, icon: <Shield /> })
        if (permissions.campusPerformance.access) navItems.push({ label: 'Campus Management', href: `${baseAdminPath}?view=campuses`, icon: <Building2 /> })

        // These modules might not be ready in AdminClient yet, but if permissions allow, we link them.
        // We might need to implement these views in AdminClient or condition these links further.
        if (permissions.userManagement.access) navItems.push({ label: 'User Management', href: isCampusLevel ? '/campus/users' : `${baseAdminPath}?view=users`, icon: <Users /> })
        if (permissions.studentManagement.access) navItems.push({ label: 'Student Management', href: isCampusLevel ? '/campus/students' : `${baseAdminPath}?view=students`, icon: <BookOpen /> })
        if (permissions.adminManagement.access) navItems.push({ label: 'Admin Management', href: `${baseAdminPath}?view=admins`, icon: <UserCog /> })
        if (permissions.reports.access) navItems.push({ label: 'Reports', href: `${baseAdminPath}?view=reports`, icon: <FileDown /> })
        if (permissions.referralTracking.access && isSuperAdmin) navItems.push({ label: 'Global Referral Module', href: `/superadmin?view=referrals`, icon: <Globe /> })
        if (isSuperAdmin) navItems.push({ label: 'Fee Management', href: `/superadmin?view=fees`, icon: <IndianRupee /> })

        // Management of specific dashboard types
        if (isSuperAdmin) {
            navItems.push({ label: 'Engagement Center', href: '/superadmin?view=engagement', icon: <Zap /> })
            navItems.push({ label: 'Promo Management', href: '/superadmin?view=marketing', icon: <Megaphone /> })
            navItems.push({ label: 'Permissions', href: '/superadmin?view=permissions', icon: <Lock /> })
        }

        if (permissions.deletionHub?.access) {

        }
        // navItems.push({ label: 'Parent Dashboard Ctrl', href: '/superadmin?view=parent-dash', icon: <Star /> })

        if (isCampusLevel) {
            permissions.referralTracking.access && navItems.push({ label: 'Campus Leads', href: '/campus/referrals', icon: <List /> })
        }

        // Ambassador Portal Links (Only for Staff & Parents)
        if (isAmbassadorRole) {
            if (permissions.referralSubmission.access) navItems.push({ label: 'Refer Now', href: '/refer', icon: <UserPlus /> })
            if (permissions.referralTracking.access) navItems.push({ label: 'My Referrals', href: '/referrals', icon: <List /> })
            // Analytics merged into Dashboard:  if (permissions.analytics.access) navItems.push({ label: 'Analytics', href: '/analytics', icon: <BarChart3 /> })
            if (permissions.rulesAccess.access) navItems.push({ label: 'Rules', href: '/rules', icon: <BookOpen /> })
        }

        // Shared Tooling (Available to all who have permission, but hidden for Super Admin who has dedicated management views)
        if (permissions.marketingKit.access) navItems.push({ label: 'Promo Kit', href: '/marketing', icon: <Share2 className="text-amber-400" /> })
        if (permissions.supportDesk.access && !isSuperAdmin) navItems.push({ label: 'Support Desk', href: '/support', icon: <MessageSquare className="text-amber-400" /> })

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
            if (permissions.settings.access) navItems.push({ label: 'Settings', href: '/superadmin?view=settings', icon: <Settings /> })
        }
    }

    // Always accessible
    navItems.push({ label: 'Profile', href: '/profile', icon: <User className="text-amber-400" /> })

    return (
        <div className="flex min-h-screen text-text-primary relative bg-[url('/bg-pattern.png')] bg-cover bg-fixed bg-center">
            <div className="absolute inset-0 bg-white/85 z-0 backdrop-blur-[2px]"></div>

            {/* Desktop Sidebar (Permanent) */}
            <aside className="desktop-sidebar hidden xl:flex flex-col w-[280px] shrink-0 border-r border-white/5 p-4 fixed top-0 left-0 bottom-0 z-20 bg-gradient-to-br from-[#0f172a] to-[#1e1b4b] shadow-2xl shadow-black/50">
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-amber-500/50 to-transparent" />

                <div className="flex flex-col items-center pt-6 pb-6 px-2">
                    <div className="relative group cursor-pointer hover:scale-105 transition-transform duration-500 mb-5">
                        <div className="absolute -inset-1 bg-gradient-to-r from-indigo-500 via-amber-500 to-red-500 rounded-2xl blur opacity-25 group-hover:opacity-60 transition duration-1000 group-hover:duration-200"></div>
                        <img
                            src="/achariya_25_logo.jpg"
                            alt="Achariya 25th Year"
                            className="relative object-contain shadow-2xl h-[90px] w-auto max-w-[200px]"
                        />
                    </div>

                    <div className="text-center">
                        <h2 className="text-white text-base font-black tracking-tight drop-shadow-lg uppercase leading-tight">
                            Achariya
                        </h2>
                        <p className="text-[11px] text-indigo-200/70 font-bold uppercase tracking-widest mb-1.5">
                            Partnership Program
                        </p>
                        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-amber-500 drop-shadow-md">
                            25<sup className="text-[0.6em]">th</sup> Year Celebration
                        </p>
                    </div>
                </div>

                {/* Premium Divider */}
                <div className="px-6 mb-8">
                    <div className="h-px w-full bg-gradient-to-r from-transparent via-white/10 to-transparent relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-500/20 to-transparent blur-sm"></div>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto overflow-x-hidden custom-scrollbar -mr-2 pr-2">
                    <MobileMenu navItems={navItems} user={{ fullName: user.fullName, role: user.role }} logoutAction={logout} />
                </div>
            </aside>

            {/* Main Content Wrapper for fixed sidebar offset */}
            <div className="flex-1 flex flex-col min-h-screen xl:ml-[280px]">

                {/* Mobile Topbar */}
                <div className="mobile-topbar xl:hidden fixed top-0 left-0 right-0 h-16 border-b border-white/10 z-50 flex items-center justify-between px-4 bg-[#0f172a]/80 backdrop-blur-xl shadow-lg">
                    <div className="flex items-center gap-3">
                        {/* Hamburger Menu Trigger */}
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


                </div>

                <main
                    className="flex-1 min-w-0 p-4 pt-20 xl:p-8 xl:pt-8 pb-20 xl:pb-8 w-full max-w-[1600px] mx-auto relative z-10"
                >
                    {/* Desktop Notification Header */}
                    <header className="hidden xl:flex justify-end mb-4 absolute top-4 right-8 z-20">
                        <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-white/50">
                            <NotificationDropdown />
                        </div>
                    </header>
                    {children}
                </main>

                {/* Mobile Bottom Navigation */}
                <BottomNav role={user.role} />
                <InstallPrompt />
                <MobileConfig />
                <OfflineAlert />
                <CommandPalette />
            </div>
        </div>
    )
}

