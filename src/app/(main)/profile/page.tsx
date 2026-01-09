import { getCurrentUser } from '@/lib/auth-service'
import { redirect } from 'next/navigation'
import ProfileClient from './profile-client'

export default async function ProfilePage() {
    const user = await getCurrentUser()
    if (!user) redirect('/')

    // Serialize user data for client component
    const userData = {
        userId: 'userId' in user ? user.userId : undefined,
        adminId: 'adminId' in user ? user.adminId : undefined,
        fullName: user.fullName,
        mobileNumber: 'mobileNumber' in user ? user.mobileNumber : undefined,
        adminMobile: 'adminMobile' in user ? (user as any).adminMobile : undefined,
        role: user.role,
        referralCode: 'referralCode' in user ? user.referralCode : undefined,
        assignedCampus: 'assignedCampus' in user ? (user.assignedCampus ?? undefined) : undefined,
        yearFeeBenefitPercent: 'yearFeeBenefitPercent' in user ? user.yearFeeBenefitPercent : undefined,
        longTermBenefitPercent: 'longTermBenefitPercent' in user ? user.longTermBenefitPercent : undefined,
        email: user.email ?? undefined,
        address: user.address ?? undefined,
        profileImage: user.profileImage ?? undefined,
        createdAt: user.createdAt.toISOString()
    }

    return <ProfileClient user={userData} />
}
