import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'
import { decrypt } from '@/lib/encryption'

import prisma from '@/lib/prisma'

export default async function ProfilePage() {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    // Serialize user data for client component
    const isUser = 'userId' in user

    // Decrypt sensitive data if present
    const bankDetails = isUser && (user as any).bankAccountDetails ? decrypt((user as any).bankAccountDetails) : undefined
    const aadhar = isUser && (user as any).aadharNo ? decrypt((user as any).aadharNo) : undefined

    // Fetch Referrals for Projected Growth Calculation
    let projectedValue = 0
    let confirmedCount = 0

    if (isUser) {
        // Fetch all referrals to calculate volume and potential tier (matching Dashboard logic)
        const referrals = await prisma.referralLead.findMany({
            where: {
                userId: (user as any).userId
            },
            select: {
                leadStatus: true,
                annualFee: true,
                student: {
                    select: {
                        baseFee: true
                    }
                }
            }
        })

        // 1. Calculate Real Confirmed Count for display
        confirmedCount = referrals.filter(r => r.leadStatus === 'Confirmed').length

        // 2. Calculate Potential Tier Percent (Based on Total Leads, same as Dashboard)
        const totalLeadsCount = referrals.length

        const getBenefitPercent = (count: number) => {
            if (count >= 5) return 50
            if (count === 4) return 30
            if (count === 3) return 25
            if (count === 2) return 10
            if (count === 1) return 5
            return 0
        }

        const potentialBenefitPercent = getBenefitPercent(totalLeadsCount)

        // 3. Calculate Total Volume (Pending + Confirmed, excluding Rejected)
        const totalVolume = referrals
            .filter(r => r.leadStatus !== 'Rejected')
            .reduce((sum, r) => {
                const fee = r.annualFee || (r.student?.baseFee) || 60000
                return sum + fee
            }, 0)

        // 4. Calculate Projected Value
        projectedValue = (totalVolume * potentialBenefitPercent) / 100
    }

    const userData = {
        userId: 'userId' in user ? user.userId : undefined,
        adminId: 'adminId' in user ? user.adminId : undefined,
        fullName: user.fullName,
        mobileNumber: 'mobileNumber' in user ? user.mobileNumber : undefined,
        adminMobile: 'adminMobile' in user ? (user as any).adminMobile : undefined,
        role: user.role,
        referralCode: 'referralCode' in user ? (user.referralCode ?? undefined) : undefined,
        assignedCampus: 'assignedCampus' in user ? (user.assignedCampus ?? undefined) : undefined,
        yearFeeBenefitPercent: 'yearFeeBenefitPercent' in user ? user.yearFeeBenefitPercent : undefined,
        longTermBenefitPercent: 'longTermBenefitPercent' in user ? user.longTermBenefitPercent : undefined,
        email: user.email ?? undefined,
        address: user.address ?? undefined,
        profileImage: user.profileImage ?? undefined,
        createdAt: user.createdAt.toISOString(),
        confirmedReferralCount: confirmedCount,
        studentFee: 'studentFee' in user ? (user as any).studentFee : undefined,
        projectedValue: projectedValue, // Passing calculated projected value
        // New Registration Fields
        bankAccountDetails: bankDetails,
        childName: isUser ? (user as any).childName : undefined,
        grade: isUser ? (user as any).grade : undefined,
        childEprNo: isUser ? (user as any).childEprNo : undefined,
        empId: isUser ? (user as any).empId : undefined,
        aadharNo: aadhar,
        transactionId: isUser ? (user as any).transactionId : undefined
    }

    return <ProfileClient user={userData} />
}
