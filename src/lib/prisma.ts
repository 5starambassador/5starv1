import { PrismaClient } from '@prisma/client'

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
export async function withRetry<T>(fn: () => Promise<T>, retries = 2, delay = 1000): Promise<T> {
    try {
        return await fn()
    } catch (error: any) {
        // Handle both connection-reach error and pooling timeout
        const isTransient =
            error.message?.includes('Can\'t reach database server') ||
            error.message?.includes('Timed out fetching a new connection') ||
            error.code === 'P1001' ||
            error.code === 'P2024';

        if (retries > 0 && isTransient) {
            console.warn(`Database transient error, retrying in ${delay}ms... (${retries} attempts left)`)
            await new Promise(resolve => setTimeout(resolve, delay))
            return withRetry(fn, retries - 1, delay * 1.5)
        }
        throw error
    }
}
