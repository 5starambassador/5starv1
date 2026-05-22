import { PrismaClient } from '@prisma/client'

// Strip surrounding quotes from DATABASE_URL if they exist
if (process.env.DATABASE_URL) {
    let cleanUrl = process.env.DATABASE_URL.trim();
    if (cleanUrl.startsWith('"') && cleanUrl.endsWith('"')) {
        cleanUrl = cleanUrl.slice(1, -1);
    }
    if (cleanUrl.startsWith("'") && cleanUrl.endsWith("'")) {
        cleanUrl = cleanUrl.slice(1, -1);
    }
    process.env.DATABASE_URL = cleanUrl.trim();
}

const prismaClientSingleton = () => {
    return new PrismaClient()
}

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClientSingleton | undefined
}

const prisma = globalForPrisma.prisma ?? prismaClientSingleton()

export default prisma

// Force TS Refresh - Manual Poke (Triggering re-analysis for new schema models)

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

/**
 * Utility to retry database operations with backoff to handle Neon cold-starts.
 */
export async function withRetry<T>(fn: () => Promise<T>, retries = 3, delay = 300): Promise<T> {
    try {
        return await fn()
    } catch (error: any) {
        // Only retry on genuine connection failures - NOT slow queries
        // P1001 = Can't reach server, P2024 = Connection pool timeout
        const isTransient =
            error.message?.includes('Can\'t reach database server') ||
            error.message?.includes('Timed out fetching a new connection') ||
            error.code === 'P1001' ||
            error.code === 'P2024';

        if (retries > 0 && isTransient) {
            console.warn(`[PRISMA_RETRY] Transient DB error (${error.code || 'NO_CODE'}). Retrying in ${delay}ms... (${retries} left)`)
            await new Promise(resolve => setTimeout(resolve, delay))
            return withRetry(fn, retries - 1, delay * 2)
        }
        throw error
    }
}
