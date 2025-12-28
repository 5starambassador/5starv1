import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Home, UserPlus, List, BookOpen, Shield, LogOut, User, Building2, Users, Target, Settings, FileDown, DollarSign, Database, GanttChartSquare, MessageSquare, ShieldCheck, Star } from 'lucide-react'
import { MobileMenu } from '@/components/MobileMenu'
import { NotificationDropdown } from '@/components/NotificationDropdown'
import MobileSidebarWrapper from '@/components/MobileSidebarWrapper'
import { getMyPermissions } from '@/lib/permission-service'
import { RolePermissions } from '@/lib/permissions'
import { deleteSession } from '@/lib/session'

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
    const isCampusHead = user.role.includes('Campus')
    const isRegularAdmin = user.role.includes('Admin') && !isSuperAdmin

    const navItems = []
    const permissions = await getMyPermissions()

    if (permissions) {
        // Dashboard Link (Role-specific destination)
        const dashboardHref = isSuperAdmin ? '/superadmin' : (isCampusHead ? '/campus' : (isRegularAdmin ? '/admin' : '/dashboard'))
        navItems.push({ label: 'Home', href: dashboardHref, icon: <Home /> })

        // Admin Modules
        const baseAdminPath = isSuperAdmin ? '/superadmin' : '/admin'

        if (permissions.analytics.access) navItems.push({ label: 'Analytics', href: baseAdminPath, icon: <Shield /> })
        if (permissions.campusPerformance.access) navItems.push({ label: 'Campus Performance', href: `${baseAdminPath}?view=campuses`, icon: <Building2 /> })

        // These modules might not be ready in AdminClient yet, but if permissions allow, we link them.
        // We might need to implement these views in AdminClient or condition these links further.
        if (permissions.userManagement.access) navItems.push({ label: 'User Management', href: `${baseAdminPath}?view=users`, icon: <Users /> })
        if (permissions.studentManagement.access) navItems.push({ label: 'Student Management', href: `${baseAdminPath}?view=students`, icon: <BookOpen /> })
        if (permissions.adminManagement.access) navItems.push({ label: 'Admin Management', href: `${baseAdminPath}?view=admins`, icon: <Target /> })
        if (permissions.reports.access) navItems.push({ label: 'Reports', href: `${baseAdminPath}?view=reports`, icon: <FileDown /> })

        // Management of specific dashboard types
        if (isSuperAdmin) {
            navItems.push({ label: 'Promo Management', href: '/superadmin?view=marketing', icon: <Database /> })
            navItems.push({ label: 'Permissions', href: '/superadmin?view=permissions', icon: <Shield /> })
            // navItems.push({ label: 'Staff Dashboard Ctrl', href: '/superadmin?view=staff-dash', icon: <ShieldCheck /> })
            // navItems.push({ label: 'Parent Dashboard Ctrl', href: '/superadmin?view=parent-dash', icon: <Star /> })
        }

        if (isCampusHead) {
            permissions.studentManagement.access && navItems.push({ label: 'My Students', href: '/campus/students', icon: <BookOpen /> })
            permissions.referralTracking.access && navItems.push({ label: 'Campus Leads', href: '/campus/referrals', icon: <List /> })
        }

        // Ambassador Portal Links (Only for Staff & Parents)
        const isAmbassadorRole = user.role === 'Staff' || user.role === 'Parent'

        if (isAmbassadorRole) {
            if (permissions.referralSubmission.access) navItems.push({ label: 'Refer Now', href: '/refer', icon: <UserPlus /> })
            if (permissions.referralTracking.access) navItems.push({ label: 'My Referrals', href: '/referrals', icon: <List /> })
            if (permissions.rulesAccess.access) navItems.push({ label: 'Rules', href: '/rules', icon: <BookOpen /> })
        }

        // Shared Tooling (Available to all who have permission, but hidden for Super Admin who has dedicated management views)
        if (permissions.marketingKit.access) navItems.push({ label: 'Promo Kit', href: '/marketing', icon: <Database /> })
        if (permissions.supportDesk.access && !isSuperAdmin) navItems.push({ label: 'Support Desk', href: '/support', icon: <MessageSquare /> })

        // Admin-specific shared modules (Hide from Ambassadors)
        if (!isAmbassadorRole) {
            navItems.push({ label: 'Support Tickets', href: '/tickets', icon: <MessageSquare /> })
            if (permissions.settlements.access) navItems.push({ label: 'Finance', href: '/finance', icon: <DollarSign /> })
            if (permissions.auditLog.access) navItems.push({ label: 'Audit Trail', href: '/superadmin?view=audit', icon: <GanttChartSquare /> })
            if (permissions.settings.access) navItems.push({ label: 'Settings', href: '/superadmin?view=settings', icon: <Settings /> })
        }
    }

    // Always accessible
    navItems.push({ label: 'Profile', href: '/profile', icon: <User /> })



    return (
        <div className="flex min-h-screen text-text-primary relative" style={{
            backgroundImage: "url('/bg-pattern.png')",
            backgroundSize: 'cover',
            backgroundAttachment: 'fixed',
            backgroundPosition: 'center'
        }}>
            <div className="absolute inset-0" style={{
                backgroundColor: 'rgba(255,255,255,0.85)',
                zIndex: 0,
                backdropFilter: 'blur(2px)',
                WebkitBackdropFilter: 'blur(2px)'
            }}></div>

            {/* Desktop Sidebar (Permanent) */}
            <aside className="desktop-sidebar hidden xl:flex flex-col border-r border-white/5 p-4 sticky top-0 h-screen relative z-10" style={{
                width: '280px',
                background: 'linear-gradient(195deg, #1A0000 0%, #3D0000 100%)',
                boxShadow: '10px 0 50px rgba(0,0,0,0.5)',
                borderRight: '1px solid rgba(255,255,255,0.05)',
                flexShrink: 0
            }}>
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-red-500/50 to-transparent" />

                <div className="flex flex-col items-center border-b border-white/5 pb-8 pt-4 mb-8">
                    <div className="relative group">
                        <div className="absolute -inset-1 bg-gradient-to-r from-red-600 to-amber-500 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
                        <img
                            src="/achariya_25_logo.jpg"
                            alt="Achariya 25th Year"
                            className="relative object-contain rounded-2xl shadow-2xl bg-white p-1 border border-white/10"
                            style={{ height: '100px', width: 'auto', maxWidth: '220px' }}
                        />
                    </div>
                    <div className="mt-4 text-center">
                        <p className="text-[10px] uppercase tracking-[0.3em] font-black text-red-500/80 mb-1">Achariya Group</p>
                        <h2 className="text-white text-lg font-black tracking-tight">5-Star Ambassador</h2>
                    </div>
                </div>
                <div className="flex-1 overflow-hidden custom-scrollbar">
                    <MobileMenu navItems={navItems} user={{ fullName: user.fullName, role: user.role }} logoutAction={logout} />
                </div>
            </aside>

            {/* Mobile Topbar */}
            <div className="mobile-topbar xl:hidden fixed top-0 left-0 right-0 h-16 border-b border-white/20 z-50 flex items-center justify-between px-4" style={{
                background: 'rgba(255, 255, 255, 0.85)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                boxShadow: '0 4px 20px rgba(0,0,0,0.03)'
            }}>
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
                        className="rounded-lg shadow-sm bg-white p-1"
                        style={{ height: '40px', width: 'auto' }}
                    />
                </div>

                {/* Mobile Notification Bell */}
                <div className="flex items-center">
                    <NotificationDropdown />
                </div>
            </div>

            <main
                className="flex-1 p-4 pt-20 xl:p-8 xl:pt-8 pb-4 xl:pb-8 w-full max-w-[1600px] m-auto relative z-10"
            >
                {/* Desktop Notification Header */}
                <header className="hidden xl:flex justify-end mb-4 absolute top-4 right-8 z-20">
                    <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full shadow-sm border border-white/50">
                        <NotificationDropdown />
                    </div>
                </header>
                {children}
            </main>
        </div>
    )
}
