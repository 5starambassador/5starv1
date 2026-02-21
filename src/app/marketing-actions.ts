'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { hasPermission } from '@/lib/permission-service'
import { logAction } from '@/lib/audit-logger'
import { revalidatePath } from 'next/cache'

// Detect file type from URL extension
function detectFileType(url: string): string {
    const lower = url.toLowerCase()
    if (lower.match(/\.(jpg|jpeg|png|gif|webp|svg|avif)($|\?)/)) return 'IMAGE'
    if (lower.match(/\.(mp4|mov|avi|webm|mkv)($|\?)/)) return 'VIDEO'
    if (lower.match(/\.pdf($|\?)/)) return 'PDF'
    return 'LINK'
}

// Helper to check marketing manager access via the permission matrix
async function checkMarketingAccess() {
    const user = await getCurrentUser()
    if (!user || !(await hasPermission('marketingManager'))) {
        throw new Error('Unauthorized: Marketing Manager access required')
    }
    return user
}

// Categories for marketing assets - exposed as async function for 'use server' compatibility
export async function getMarketingCategories(): Promise<string[]> {
    return [
        'Branding',
        'WhatsApp Templates',
        'Social Media',
        'Videos',
        'Flyers'
    ]
}

// Get all active marketing assets grouped by category
export async function getMarketingAssets() {
    try {
        const categories = ['Branding', 'WhatsApp Templates', 'Social Media', 'Videos', 'Flyers']

        const assets = await prisma.marketingAsset.findMany({
            where: { isActive: true },
            orderBy: [
                { category: 'asc' },
                { sortOrder: 'asc' },
                { name: 'asc' }
            ]
        })

        // Group by category and map to UI Asset type
        const grouped: Record<string, any[]> = {}
        for (const category of categories) {
            grouped[category] = assets
                .filter((a) => a.category === category)
                .map(a => ({
                    id: a.id,
                    title: a.name,
                    description: a.description || '',
                    type: a.fileType as any || 'IMAGE',
                    url: a.fileUrl,
                    category: a.category
                }))
        }

        return { success: true, assets, grouped }
    } catch (error: any) {
        console.error('Error fetching marketing assets:', error)
        return { success: false, assets: [], grouped: {} }
    }
}

// Get all assets for admin (including inactive)
export async function getAdminMarketingAssets() {
    try {
        await checkMarketingAccess()
        const assets = await prisma.marketingAsset.findMany({
            orderBy: [
                { category: 'asc' },
                { sortOrder: 'asc' },
                { createdAt: 'desc' }
            ]
        })

        return { success: true, assets }
    } catch (error: any) {
        console.error('Error fetching admin marketing assets:', error)
        return { success: false, assets: [] }
    }
}

// Create a new marketing asset
export async function createMarketingAsset(data: {
    name: string
    category: string
    description?: string
    fileUrl: string
    fileType?: string
    fileSize?: number
    uploadedById?: number
}) {
    try {
        await checkMarketingAccess()

        // Get max sort order for category
        const maxSort = await prisma.marketingAsset.aggregate({
            where: { category: data.category },
            _max: { sortOrder: true }
        })
        const sortOrder = (maxSort._max.sortOrder || 0) + 1

        const asset = await prisma.marketingAsset.create({
            data: {
                ...data,
                sortOrder,
                fileType: data.fileType || detectFileType(data.fileUrl)
            }
        })

        await logAction('CREATE', 'marketing', `Created marketing asset: ${data.name}`, asset.id.toString())
        revalidatePath('/marketing')
        revalidatePath('/superadmin')

        return { success: true, asset }
    } catch (error: any) {
        console.error('Error creating marketing asset:', error)
        return { success: false, error: error.message }
    }
}

// Update a marketing asset
export async function updateMarketingAsset(id: number, data: {
    name?: string
    category?: string
    description?: string
    fileUrl?: string
    isActive?: boolean
    sortOrder?: number
}) {
    try {
        await checkMarketingAccess()
        const asset = await prisma.marketingAsset.update({
            where: { id },
            data
        })

        await logAction('UPDATE', 'marketing', `Updated marketing asset: ${asset.name}`, id.toString(), null, { changes: data })
        revalidatePath('/marketing')
        revalidatePath('/superadmin')

        return { success: true, asset }
    } catch (error: any) {
        console.error('Error updating marketing asset:', error)
        return { success: false, error: error.message }
    }
}

// Delete a marketing asset
export async function deleteMarketingAsset(id: number) {
    try {
        await checkMarketingAccess()
        const deleted = await prisma.marketingAsset.delete({
            where: { id }
        })

        await logAction('DELETE', 'marketing', `Deleted marketing asset: ${deleted.name}`, id.toString())
        revalidatePath('/marketing')
        revalidatePath('/superadmin')

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting marketing asset:', error)
        return { success: false, error: error.message }
    }
}

// Toggle asset visibility
export async function toggleAssetVisibility(id: number, isActive: boolean) {
    try {
        await checkMarketingAccess()
        const asset = await prisma.marketingAsset.update({
            where: { id },
            data: { isActive }
        })

        await logAction('UPDATE', 'marketing', `${isActive ? 'Enabled' : 'Disabled'} marketing asset: ${asset.name}`, id.toString())
        revalidatePath('/marketing')
        revalidatePath('/superadmin')

        return { success: true, asset }
    } catch (error: any) {
        console.error('Error toggling asset visibility:', error)
        return { success: false, error: error.message }
    }
}
