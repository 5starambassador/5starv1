'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'

// Helper to check if user is admin
async function checkAdmin() {
    const user = await getCurrentUser()
    if (!user || user.role === 'Parent' || user.role === 'Staff' || user.role === 'Alumni' || user.role === 'Others') {
        throw new Error('Unauthorized: Admin access required')
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
        await checkAdmin()
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
        await checkAdmin()

        // Get max sort order for category
        const maxSort = await prisma.marketingAsset.aggregate({
            where: { category: data.category },
            _max: { sortOrder: true }
        })
        const sortOrder = (maxSort._max.sortOrder || 0) + 1

        const asset = await prisma.marketingAsset.create({
            data: {
                ...data,
                sortOrder
            }
        })

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
        await checkAdmin()
        const asset = await prisma.marketingAsset.update({
            where: { id },
            data
        })

        return { success: true, asset }
    } catch (error: any) {
        console.error('Error updating marketing asset:', error)
        return { success: false, error: error.message }
    }
}

// Delete a marketing asset
export async function deleteMarketingAsset(id: number) {
    try {
        await checkAdmin()
        await prisma.marketingAsset.delete({
            where: { id }
        })

        return { success: true }
    } catch (error: any) {
        console.error('Error deleting marketing asset:', error)
        return { success: false, error: error.message }
    }
}

// Toggle asset visibility
export async function toggleAssetVisibility(id: number, isActive: boolean) {
    try {
        await checkAdmin()
        const asset = await prisma.marketingAsset.update({
            where: { id },
            data: { isActive }
        })

        return { success: true, asset }
    } catch (error: any) {
        console.error('Error toggling asset visibility:', error)
        return { success: false, error: error.message }
    }
}
