import { PrismaClient } from '../generated_client'
import fs from 'fs'
import path from 'path'

const prisma = new PrismaClient()

const mapAdminRole = (role: string) => {
    const map: Record<string, string> = {
        'Super Admin': 'Super_Admin',
        'Finance Admin': 'Finance_Admin',
        'Campus Head': 'Campus_Head',
        'CampusHead': 'Campus_Head',
        'Admission Admin': 'Admission_Admin',
        'Campus Admin': 'Campus_Admin'
    }
    return map[role] || role
}

const mapLeadStatus = (status: string) => {
    if (status === 'Follow-up') return 'Follow_up'
    return status
}

const mapAccountStatus = (status: string) => {
    if (status === 'Deletion Requested') return 'Deletion_Requested'
    return status
}

async function restoreData() {
    console.log('🔄 Starting Data Restore...')
    const backupPath = path.join(process.cwd(), 'backup_data.json')

    if (!fs.existsSync(backupPath)) {
        console.error('❌ Backup file not found at:', backupPath)
        return
    }

    const data = JSON.parse(fs.readFileSync(backupPath, 'utf-8'))

    try {
        // 1. System Settings 
        if (data.systemSettings?.length) {
            console.log('📦 Restoring SystemSettings...')
            for (const item of data.systemSettings) {
                await prisma.systemSettings.create({ data: item }).catch(() => console.log(`   Skipping existing setting ${item.id}`))
            }
        }

        // 2. Campuses 
        if (data.campuses?.length) {
            console.log('📦 Restoring Campuses...')
            for (const item of data.campuses) {
                await prisma.campus.upsert({
                    where: { campusCode: item.campusCode },
                    update: {},
                    create: item
                })
            }
        }

        // 3. Admins
        if (data.admins?.length) {
            console.log(`📦 Restoring ${data.admins.length} Admins...`)
            for (const item of data.admins) {
                item.role = mapAdminRole(item.role)
                item.status = mapAccountStatus(item.status)
                // Ensure assignedCampus matches schema types (String)
                item.assignedCampus = item.assignedCampus === "" ? null : item.assignedCampus

                await prisma.admin.upsert({
                    where: { adminMobile: item.adminMobile },
                    update: {},
                    create: item
                }).catch(e => console.error(`Failed to restore admin ${item.adminName}: ${e.message}`))
            }
        }

        // 4. BenefitSlabs
        if (data.benefitSlabs?.length) {
            console.log(`📦 Restoring ${data.benefitSlabs.length} BenefitSlabs...`)
            for (const item of data.benefitSlabs) {
                await prisma.benefitSlab.upsert({
                    where: { referralCount: item.referralCount },
                    update: {},
                    create: item
                })
            }
        }

        // 5. Users (Parents/Staff)
        if (data.users?.length) {
            console.log(`📦 Restoring ${data.users.length} Users...`)
            for (const item of data.users) {
                item.status = mapAccountStatus(item.status)
                item.benefitStatus = mapAccountStatus(item.benefitStatus || 'Active')

                await prisma.user.upsert({
                    where: { mobileNumber: item.mobileNumber },
                    update: {},
                    create: item
                }).catch(e => console.error(`Failed to restore user ${item.fullName}: ${e.message}`))
            }
        }

        // 6. Referral Leads
        if (data.referralLeads?.length) {
            console.log(`📦 Restoring ${data.referralLeads.length} Leads...`)
            for (const item of data.referralLeads) {
                const userExists = await prisma.user.findUnique({ where: { userId: item.userId } })
                if (userExists) {
                    item.leadStatus = mapLeadStatus(item.leadStatus)
                    await prisma.referralLead.create({ data: item }).catch(e => console.log(`   Error restoring lead ${item.leadId}:`, e.message))
                }
            }
        }

        // 7. Students
        if (data.students?.length) {
            console.log(`📦 Restoring ${data.students.length} Students...`)
            for (const item of data.students) {
                await prisma.student.create({ data: item }).catch(e => console.log(`   Error restoring student ${item.studentId}:`, e.message))
            }
        }

        console.log('✅ Restore completed!')

    } catch (error) {
        console.error('❌ Restore failed:', error)
    } finally {
        await prisma.$disconnect()
    }
}

restoreData()
