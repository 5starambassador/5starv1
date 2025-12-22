import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import { getSystemAnalytics, getCampusComparison, getAllUsers, getAllAdmins, getAllStudents } from '@/app/superadmin-actions'
import { getAdminMarketingAssets } from '@/app/marketing-actions'
import { getSystemSettings } from '@/app/settings-actions'
import SuperadminClient from './superadmin-client'

interface PageProps {
    searchParams: Promise<{ view?: string }>
}

// Helper function to serialize dates in objects
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

export default async function SuperadminPage({ searchParams }: PageProps) {
    const user = await getCurrentUser()
    const params = await searchParams

    if (!user) {
        redirect('/')
    }

    // Check if user is Super Admin (strict check)
    if (user.role !== 'Super Admin') {
        redirect('/dashboard')
    }

    // Get view from URL params (default to 'analytics')
    const initialView = params.view || 'analytics'

    // Fetch all data
    const analytics = await getSystemAnalytics()
    const campusComparison = await getCampusComparison()
    const users = await getAllUsers()
    const admins = await getAllAdmins()
    const students = await getAllStudents()
    const marketingAssets = await getAdminMarketingAssets()
    const systemSettings = await getSystemSettings()

    return (
        <SuperadminClient
            analytics={analytics}
            campusComparison={campusComparison}
            users={serializeData(users) as any}
            admins={serializeData(admins) as any}
            students={serializeData(students) as any}
            currentUser={serializeData(user) as any}
            initialView={initialView}
            marketingAssets={serializeData(marketingAssets.assets) as any}
            systemSettings={serializeData(systemSettings) as any}
        />
    )
}


