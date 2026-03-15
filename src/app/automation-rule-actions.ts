'use server'

import prisma from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth-service'
import { logAction } from '@/lib/audit-logger'
import { revalidatePath } from 'next/cache'

// Helper to confirm Super Admin status
async function checkSuperAdmin() {
    const user = await getCurrentUser()
    if (!user || user.role !== 'Super Admin') {
        throw new Error('Unauthorized: Super Admin access required')
    }
    return user
}

export type AutomationRuleData = {
    id: number
    name: string
    description: string | null
    triggerType: string
    triggerEvent: string | null
    conditions: any
    actionType: string
    actionTarget: string | null
    isActive: boolean
    createdAt: Date
    updatedAt: Date
}

export async function getAutomationRules() {
    try {
        const rules = await prisma.automationRule.findMany({
            orderBy: { createdAt: 'desc' }
        })
        return { success: true, data: rules }
    } catch (error) {
        console.error("Failed to fetch automation rules:", error)
        return { success: false, error: 'Failed to fetch rules', data: [] }
    }
}

export async function createAutomationRule(data: Partial<AutomationRuleData>) {
    try {
        await checkSuperAdmin()

        if (!data.name || !data.triggerType || !data.actionType) {
            return { success: false, error: 'Name, Trigger Type, and Action Type are required' }
        }

        const newRule = await prisma.automationRule.create({
            data: {
                name: data.name,
                description: data.description,
                triggerType: data.triggerType,
                triggerEvent: data.triggerEvent,
                conditions: data.conditions || {},
                actionType: data.actionType,
                actionTarget: data.actionTarget,
                isActive: data.isActive ?? true
            }
        })

        await logAction('Create Automation Rule', 'automation', `Created rule: ${data.name}`)
        revalidatePath('/superadmin/whatsapp')
        
        return { success: true, data: newRule }
    } catch (error: any) {
        console.error("Failed to create rule:", error)
        return { success: false, error: error.message || 'Failed to create rule' }
    }
}

export async function updateAutomationRule(id: number, data: Partial<AutomationRuleData>) {
    try {
        await checkSuperAdmin()

        const updatedRule = await prisma.automationRule.update({
            where: { id },
            data: {
                name: data.name,
                description: data.description,
                triggerType: data.triggerType,
                triggerEvent: data.triggerEvent,
                conditions: data.conditions !== undefined ? data.conditions : undefined,
                actionType: data.actionType,
                actionTarget: data.actionTarget,
                isActive: data.isActive
            }
        })

        await logAction('Update Automation Rule', 'automation', `Updated rule ID: ${id}`)
        revalidatePath('/superadmin/whatsapp')

        return { success: true, data: updatedRule }
    } catch (error: any) {
        console.error("Failed to update rule:", error)
        return { success: false, error: error.message || 'Failed to update rule' }
    }
}

export async function deleteAutomationRule(id: number) {
    try {
        await checkSuperAdmin()

        await prisma.automationRule.delete({
            where: { id }
        })

        await logAction('Delete Automation Rule', 'automation', `Deleted rule ID: ${id}`)
        revalidatePath('/superadmin/whatsapp')

        return { success: true }
    } catch (error: any) {
        console.error("Failed to delete rule:", error)
        return { success: false, error: error.message || 'Failed to delete rule' }
    }
}

export async function testAutomationRule(id: number, testMobile: string) {
    try {
        await checkSuperAdmin()

        if (!testMobile || testMobile.length < 10) {
            return { success: false, error: 'Valid 10-digit mobile number required' }
        }

        const { automationEngine } = await import('@/lib/automation-engine')
        const result = await automationEngine.testRule(id, testMobile)

        await logAction('Test Automation Rule', 'automation', `Sent test signal for rule ID: ${id} to ${testMobile}`)
        
        return result
    } catch (error: any) {
        console.error("Failed to test rule:", error)
        return { success: false, error: error.message || 'Failed to send test message' }
    }
}
