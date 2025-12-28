import prisma from './prisma'
import { getSession } from './session'
import { headers } from 'next/headers'

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'PERMISSION_CHANGE' | 'EXPORT'

export async function logAction(
    action: AuditAction,
    module: string,
    description: string,
    targetId?: string,
    metadata?: any
) {
    try {
        const session = await getSession()
        const headersList = await headers()
        const ip = headersList.get('x-forwarded-for')?.split(',')[0] || headersList.get('x-real-ip') || 'unknown'
        const userAgent = headersList.get('user-agent') || 'unknown'

        await prisma.activityLog.create({
            data: {
                adminId: session?.userType === 'admin' ? Number(session.userId) : null,
                userId: session?.userType === 'user' ? Number(session.userId) : null,
                action,
                module,
                targetId: targetId || null,
                description,
                ipAddress: ip,
                userAgent,
                // We'll store metadata in description or a different field if we want to expand.
                // For now, let's just use what's in the schema.
            }
        })
    } catch (error) {
        console.error('Audit logging failed:', error)
    }
}
