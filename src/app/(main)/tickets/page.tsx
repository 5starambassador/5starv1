import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getAdminTickets } from '@/app/ticket-actions'
import { TicketsClient } from './tickets-client'

export default async function TicketsPage() {
    const user = await getCurrentUser()

    // Access control based on permission service is now handled inside the action
    const result = await getAdminTickets()

    if (!result.success) {
        redirect('/dashboard')
    }

    return (
        <TicketsClient
            tickets={result.tickets}
            counts={result.counts}
            role={user!.role}
            adminId={(user as any).adminId || (user as any).userId}
        />
    )
}
