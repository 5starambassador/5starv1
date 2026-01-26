export interface ClientUser {
    fullName: string
    role: string
    referralCode?: string
    encryptedCode?: string

    // Status & Membership
    isFiveStarMember?: boolean
    benefitStatus?: string
    status?: string // 'Active', 'Pending' etc.
    childInAchariya?: boolean

    // Fees & Campus
    studentFee?: number
    assignedCampus?: string
    empId?: string

    // Referral Data
    confirmedReferralCount?: number
    currentYearCount?: number // If we need to distinguish
    yearFeeBenefitPercent?: number
    projectedValue?: number

    // Personal / Bank Info (Optional/Privacy)
    mobileNumber?: string
    email?: string
    profileImage?: string
    address?: string

    bankName?: string
    accountNumber?: string
    ifscCode?: string
    bankAccountDetails?: string // Legacy

    childName?: string
    grade?: string
    childEprNo?: string
    childCampusId?: number

    createdAt?: string // ISO String
}

export interface ClientReferral {
    id: number
    leadId?: number // Some views use leadId
    parentName: string
    childName?: string
    mobileNumber?: string
    status: string // LeadStatus
    referralStatus?: string

    campusId?: number
    gradeInterested?: string

    createdAt: string
    confirmedDate?: string | null

    // Student Data (Flattened or Nested)
    student?: {
        annualFee?: number
        baseFee?: number
        createdAt?: string
        selectedFeeType?: string
    } | null
    grade?: string
    section?: string
    rollNumber?: string
}
