import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'
import { decrypt } from '@/lib/encryption'



export default async function ProfilePage() {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    // Serialize user data for client component
    const isUser = 'userId' in user

    // Decrypt sensitive data if present
    const bankDetails = isUser && (user as any).bankAccountDetails ? decrypt((user as any).bankAccountDetails) : undefined
    const aadhar = isUser && (user as any).aadharNo ? decrypt((user as any).aadharNo) : undefined

    // Fetch Referrals for Benefit Calculation
    let projectedValue = 0
    let confirmedCount = 0

    if (isUser) {
        const userId = (user as any).userId
        const { getUserRevenueStats } = await import('@/lib/revenue-service')

        const stats = await getUserRevenueStats(userId, user.role, {
            childInAchariya: (user as any).childInAchariya,
            studentFee: (user as any).studentFee || 60000,
            isFiveStarMember: (user as any).isFiveStarMember
        })

        projectedValue = stats.projectedValue
        confirmedCount = stats.confirmedCount
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
        bankAccountDetails: bankDetails, // Legacy
        bankName: isUser ? (user as any).bankName : undefined,
        accountNumber: isUser ? (user as any).accountNumber : undefined,
        ifscCode: isUser ? (user as any).ifscCode : undefined,

        childName: isUser ? (user as any).childName : undefined,
        grade: isUser ? (user as any).grade : undefined,
        childEprNo: isUser ? (user as any).childEprNo : undefined,
        childCampusId: isUser ? (user as any).childCampusId : undefined,
        empId: isUser ? (user as any).empId : undefined,
        childInAchariya: isUser ? (user as any).childInAchariya : false,
        aadharNo: aadhar,
        transactionId: isUser ? (user as any).transactionId : undefined,
        status: isUser ? (user as any).status : undefined,
        benefitStatus: isUser ? (user as any).benefitStatus : undefined
    }

    return <ProfileClient user={userData} />
}
