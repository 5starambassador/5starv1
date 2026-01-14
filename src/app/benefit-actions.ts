'use server'

import prisma from '@/lib/prisma'
import { revalidatePath } from 'next/cache'
import { getCurrentUser } from '@/lib/auth-service'

export interface BenefitSlabData {
    slabId: number
    referralCount: number
    yearFeeBenefitPercent: number
    longTermExtraPercent: number
    baseLongTermPercent: number
    tierName?: string | null
    description?: string | null
}

// Get All Slabs
export async function getBenefitSlabs() {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        const slabs = await prisma.benefitSlab.findMany({
            orderBy: { referralCount: 'asc' }
        })

        // If empty, seed defaults? Or let UI handle "No Data"?
        // Better to return what is there. UI can offer "Reset to Default" button.
        return { success: true, data: slabs }
    } catch (error) {
        console.error('Error fetching benefit slabs:', error)
        return { success: false, error: 'Failed to fetch slabs' }
    }
}

// Update a Slab
export async function updateBenefitSlab(id: number, data: Partial<BenefitSlabData>) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        await prisma.benefitSlab.update({
            where: { slabId: id },
            data: {
                referralCount: data.referralCount,
                yearFeeBenefitPercent: data.yearFeeBenefitPercent,
                tierName: data.tierName,
                description: data.description
            }
        })

        revalidatePath('/superadmin/benefits')
        return { success: true }
    } catch (error) {
        console.error('Error updating benefit slab:', error)
        return { success: false, error: 'Failed to update slab' }
    }
}

// Add a Slab
export async function addBenefitSlab(data: Partial<BenefitSlabData>) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        await prisma.benefitSlab.create({
            data: {
                referralCount: data.referralCount!,
                yearFeeBenefitPercent: data.yearFeeBenefitPercent!,
                tierName: data.tierName,
                description: data.description,
                longTermExtraPercent: 5,
                baseLongTermPercent: 15
            }
        })

        revalidatePath('/superadmin/benefits')
        return { success: true }
    } catch (error) {
        console.error('Error adding benefit slab:', error)
        return { success: false, error: 'Failed to add slab' }
    }
}

// Delete a Slab
export async function deleteBenefitSlab(id: number) {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        await prisma.benefitSlab.delete({
            where: { slabId: id }
        })

        revalidatePath('/superadmin/benefits')
        return { success: true }
    } catch (error) {
        console.error('Error deleting benefit slab:', error)
        return { success: false, error: 'Failed to delete slab' }
    }
}


// Reset to Default (Seed)
export async function resetDefaultSlabs() {
    try {
        const user = await getCurrentUser()
        if (!user || user.role !== 'Super Admin') return { success: false, error: 'Unauthorized' }

        // Default Tiers as per Policy
        const defaultTiers = [
            { count: 1, percent: 5, name: 'Tier 1' },
            { count: 2, percent: 10, name: 'Tier 2' },
            { count: 3, percent: 25, name: 'Tier 3' },
            { count: 4, percent: 30, name: 'Tier 4' },
            { count: 5, percent: 50, name: 'Tier 5 (Max)' },
        ]

        // Transaction: Delete All -> Create Defaults
        await prisma.$transaction(async (tx) => {
            await tx.benefitSlab.deleteMany({}) // Clear existing

            for (const t of defaultTiers) {
                await tx.benefitSlab.create({
                    data: {
                        referralCount: t.count,
                        yearFeeBenefitPercent: t.percent,
                        tierName: t.name,
                        longTermExtraPercent: 5, // Default logic
                        baseLongTermPercent: 15  // Default logic
                    }
                })
            }
        })

        revalidatePath('/superadmin/benefits')
        return { success: true }
    } catch (error) {
        console.error('Error resetting slabs:', error)
        return { success: false, error: 'Failed to reset slabs' }
    }
}
