import { PrismaClient } from '@prisma/client'
import { DEFAULT_ROLE_PERMISSIONS } from '../lib/permissions'

const prisma = new PrismaClient()

async function main() {
    console.log('🔄 Syncing Permission Matrix from Code to Database...')

    const roles = Object.keys(DEFAULT_ROLE_PERMISSIONS)

    for (const role of roles) {
        const perms = DEFAULT_ROLE_PERMISSIONS[role]

        console.log(`Processing Role: ${role}...`)

        // Construct the update payload based on schema columns
        const updateData = {
            analyticsAccess: perms.analytics.access,
            analyticsScope: perms.analytics.scope,

            userMgmtAccess: perms.userManagement.access,
            userMgmtScope: perms.userManagement.scope,
            userMgmtCreate: perms.userManagement.canCreate || false,
            userMgmtEdit: perms.userManagement.canEdit || false,
            userMgmtDelete: perms.userManagement.canDelete || false,

            studentMgmtAccess: perms.studentManagement.access,
            studentMgmtScope: perms.studentManagement.scope,
            studentMgmtCreate: perms.studentManagement.canCreate || false,
            studentMgmtEdit: perms.studentManagement.canEdit || false,
            studentMgmtDelete: perms.studentManagement.canDelete || false,

            adminMgmtAccess: perms.adminManagement.access,
            adminMgmtScope: perms.adminManagement.scope,
            adminMgmtCreate: perms.adminManagement.canCreate || false,
            adminMgmtEdit: perms.adminManagement.canEdit || false,
            adminMgmtDelete: perms.adminManagement.canDelete || false,

            campusPerfAccess: perms.campusPerformance.access,
            campusPerfScope: perms.campusPerformance.scope,

            reportsAccess: perms.reports.access,
            reportsScope: perms.reports.scope,

            settlementsAccess: perms.settlements.access,
            settlementsScope: perms.settlements.scope,

            marketingKitAccess: perms.marketingKit.access,
            marketingKitScope: perms.marketingKit.scope,

            auditLogAccess: perms.auditLog.access,
            auditLogScope: perms.auditLog.scope,

            supportDeskAccess: perms.supportDesk.access,
            supportDeskScope: perms.supportDesk.scope,

            settingsAccess: perms.settings.access,
            settingsScope: perms.settings.scope,

            deletionHubAccess: perms.deletionHub.access,
            deletionHubScope: perms.deletionHub.scope,

            passwordResetAccess: perms.passwordReset.access,
            passwordResetScope: perms.passwordReset.scope,

            referralSubmissionAccess: perms.referralSubmission.access,
            referralSubmissionScope: perms.referralSubmission.scope,

            referralTrackingAccess: perms.referralTracking.access,
            referralTrackingScope: perms.referralTracking.scope,

            savingsCalculatorAccess: perms.savingsCalculator.access,
            savingsCalculatorScope: perms.savingsCalculator.scope,

            rulesAccessAccess: perms.rulesAccess.access,
            rulesAccessScope: perms.rulesAccess.scope,

            feeManagementAccess: perms.feeManagement.access,
            feeManagementScope: perms.feeManagement.scope,

            engagementCentreAccess: perms.engagementCentre.access,
            engagementCentreScope: perms.engagementCentre.scope,

            paymentApprovalAccess: perms.paymentApproval.access,
            paymentApprovalScope: perms.paymentApproval.scope,

            programLeadsAccess: perms.programLeads.access,
            programLeadsScope: perms.programLeads.scope,

            externalProgramsAccess: perms.externalPrograms.access,
            externalProgramsScope: perms.externalPrograms.scope,

            academicCyclesAccess: perms.academicCycles.access,
            academicCyclesScope: perms.academicCycles.scope,

            disasterRecoveryAccess: perms.disasterRecovery.access,
            disasterRecoveryScope: perms.disasterRecovery.scope
        }

        try {
            await prisma.rolePermissions.upsert({
                where: { role: role },
                update: updateData,
                create: {
                    role: role,
                    ...updateData
                }
            })
            console.log(`✅ Synced: ${role}`)
        } catch (error) {
            console.error(`❌ Failed to sync ${role}:`, error)
        }
    }
}

main()
    .catch(e => {
        console.error(e)
        process.exit(1)
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
