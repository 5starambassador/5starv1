import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getCampusAnalytics, getCampusReferrals, confirmCampusReferral } from '@/app/campus-actions'
import { CampusClient } from './campus-client'

// Helper function to serialize dates
function serializeData<T>(data: T): T {
    if (data === null || data === undefined) return data
    if (data instanceof Date) return data.toISOString() as unknown as T
    if (Array.isArray(data)) return data.map(item => serializeData(item)) as unknown as T
    if (typeof data === 'object') {
        const serialized: any = {}
        for (const key in data) {
            serialized[key] = serializeData((data as any)[key])
        }
        return serialized as T
    }
    return data
}

export default async function CampusPage() {
    const user = await getCurrentUser()

    // Only Campus Heads and Super Admin can access this page
    if (!user || (!user.role.includes('Campus Head') && user.role !== 'Super Admin')) {
        redirect('/dashboard')
    }

    // For now, we'll use a campus from the user's referrals
    // In production, you'd have an assignedCampus field in the database
    const assignedCampus = 'ADYAR' // TODO: Get from user.assignedCampus once database is updated

    const analytics = await getCampusAnalytics(assignedCampus)
    const referrals = await getCampusReferrals(assignedCampus)

    if (!analytics) {
        return <div>Error loading campus analytics</div>
    }

    return <CampusClient
        campus={assignedCampus}
        analytics={analytics}
        referrals={serializeData(referrals)}
        confirmReferral={confirmCampusReferral}
    />
}
