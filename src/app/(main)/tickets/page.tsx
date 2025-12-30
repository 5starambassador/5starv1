import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getAdminTickets } from '@/app/ticket-actions'
import { TicketsClient } from './tickets-client'

export default async function TicketsPage() {
    const user = await getCurrentUser()

    // Only admins can access this page
    if (!user || !['Super Admin', 'Admission Admin', 'Campus Head', 'Finance Admin', 'Campus Admin'].includes(user.role)) {
        redirect('/dashboard')
    }

    const result = await getAdminTickets(user.role, user.assignedCampus || undefined)

    return (
        <TicketsClient
            tickets={result.tickets}
            counts={result.counts}
            role={user.role}
            adminId={(user as any).adminId}
        />
    )
}
