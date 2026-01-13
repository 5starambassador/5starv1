import prisma from '@/lib/prisma'
import { headers } from 'next/headers'
import { getCurrentUser } from '@/lib/auth-service'

export async function logAction(
    action: string,
    module: string,
    description: string,
    targetId?: string | null,
    actorId?: string | number | null | undefined, // support legacy calls passing null
    metadata?: any
) {
    try {
        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for') || 'unknown'
        const userAgent = headersList.get('user-agent') || 'unknown'

        let adminId: number | undefined = undefined
        let userId: number | undefined = undefined

        // 1. Try to use explicit actorId if provided (handling number/string conversion)
        if (actorId) {
            // Heuristic or Metadata-driven distinction could be used, 
            // but for now, we can check a new 'actorType' in metadata or just try to default.
            // However, to be safe and simple:
            if (metadata?.isUser) userId = Number(actorId)
            else if (metadata?.isAdmin) adminId = Number(actorId)
            // Fallback: If we can't tell, we might miss saving it to the right FK, 
            // so we rely on getCurrentUser if actorId is missing metadata context.
        }

        // 2. Auto-detect if not explicitly set
        if (!adminId && !userId) {
            const currentUser = await getCurrentUser()
            if (currentUser) {
                if ('adminId' in currentUser) {
                    adminId = (currentUser as any).adminId
                } else if ('userId' in currentUser) {
                    userId = (currentUser as any).userId
                }
            }
        }

        await (prisma.activityLog as any).create({
            data: {
                action,
                module,
                description,
                targetId: targetId || undefined,
                adminId,
                userId,
                metadata: metadata || undefined,
                ipAddress: ip,
                userAgent: userAgent
            }
        })
    } catch (error) {
        console.error('Failed to log activity:', error)
    }
}

// Alias for future use if we prefer this naming
export const logActivity = async (params: {
    action: string
    module: string
    description: string
    metadata?: any
    targetId?: string
}) => {
    return logAction(
        params.action,
        params.module,
        params.description,
        params.targetId,
        null,
        params.metadata
    )
}
