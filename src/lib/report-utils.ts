import { decrypt } from './encryption';
import { getSpecialBonusRate } from './reward-constants';

export const REFERRAL_STUDENT_DETAILS_HEADERS = [
    'List',
    'Academic Year',
    'Referral ID',
    'Parent Name',
    'Parent Mobile No.',
    'Student Name',
    'ERP Number',
    'Grade',
    'Campus',
    'Admission Fee Total',
    'Admission Fee Paid',
    'Donation Fee Total',
    'Donation Fee Paid',
    'School Fee Total',
    'School Fee Paid',
    'Ambassador Code',
    'Ambassador Name',
    'Ambassador Mobile',
    'Role',
    'Partner Campus',
    'Admission Share',
    'Donation Share',
    'Slab Reward',
    'Special Campus Share',
    'Total Payment',
    'Created At',
    'Confirmed/Admitted At',
    'Bank Name',
    'Account Number',
    'IFSC Code'
];

export function generateReferralStudentDetailsCSV(referrals: any[]) {
    const rows: string[] = [REFERRAL_STUDENT_DETAILS_HEADERS.join(',')];

    referrals.forEach((ref: any) => {
        const user = ref.user;
        const student = ref.student;
        const campusName = ref.campus || student?.campus?.campusName || 'N/A';
        
        const admFeeTotal = Number(ref.admissionFeeCollected) || 0;
        const donFeeTotal = Number(ref.donationFeeCollected) || 0;
        
        const specialBonusRate = getSpecialBonusRate(campusName);
        const hasSpecialBonus = specialBonusRate > 0;
        
        let bankName = user.bankName || '';
        let accNo = user.accountNumber || '';
        let ifsc = user.ifscCode || '';

        if (!bankName && user.bankAccountDetails) {
            const decrypted = decrypt(user.bankAccountDetails);
            if (decrypted) {
                const parts = decrypted.split(' - ');
                if (parts.length >= 2) {
                    bankName = parts[0];
                    accNo = parts[1];
                }
            }
        }

        const schoolFeeTotal = Number(ref.annualFee) || Number(student?.annualFee) || Number(student?.baseFee) || 0;
        
        // Slab Reward Calculation: Prioritize pre-calculated values from finance-actions (Liability Ledger)
        // Note: For staff/payout groups, this is usually calculated per referral slab.
        const slabReward = ref.referralSlabValue !== undefined ? ref.referralSlabValue : Math.round((schoolFeeTotal * (user.yearFeeBenefitPercent || 0)) / 100);

        // Prioritize pre-calculated shares if available (Audit/Parity)
        const admShare = ref.admShareValue !== undefined ? ref.admShareValue : (hasSpecialBonus ? 0 : Math.round(admFeeTotal * 0.8));
        const donShare = ref.donShareValue !== undefined ? ref.donShareValue : (hasSpecialBonus ? 0 : Math.round(donFeeTotal * 0.5));
        const specialCampusShare = ref.specialBonusValue !== undefined ? ref.specialBonusValue : (hasSpecialBonus ? specialBonusRate : 0);

        const totalPayment = admShare + donShare + specialCampusShare + slabReward;

        const row = [
            user.role === 'Staff' ? 'List B' : 'List C',
            ref.academicYear || '2026-2027',
            ref.leadId || 'N/A',
            ref.parentName || 'N/A',
            ref.parentMobile ? `="${ref.parentMobile}"` : '',
            ref.studentName || 'N/A',
            ref.admissionNumber || '',
            ref.gradeInterested || '',
            campusName,
            admFeeTotal,
            admFeeTotal,
            donFeeTotal,
            donFeeTotal,
            schoolFeeTotal, // School Fee Total
            schoolFeeTotal, // School Fee Paid (Assuming full for confirmed)
            user.referralCode || '',
            user.fullName,
            user.mobileNumber,
            user.role,
            user.assignedCampus || 'N/A',
            admShare,
            donShare,
            slabReward, // Slab Reward
            specialCampusShare,
            totalPayment,
            ref.createdAt ? new Date(ref.createdAt).toLocaleDateString() : 'N/A',
            ref.confirmedDate ? new Date(ref.confirmedDate).toLocaleDateString() : (ref.leadStatus === 'Admitted' ? 'Admitted' : 'Pending'),
            bankName,
            `'${accNo}`,
            ifsc
        ];

        rows.push(row.map(val => {
            if (typeof val === 'string' && val.startsWith('=')) return val;
            return `"${val}"`;
        }).join(','));
    });

    return rows.join('\n');
}
