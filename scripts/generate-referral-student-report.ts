
import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import { decrypt } from '../src/lib/encryption';
import { getSpecialBonusRate } from '../src/lib/reward-constants';

const prisma = new PrismaClient();

async function main() {
    console.log('🚀 Generating Referral Student Details Report...');

    // 1. Fetch all ReferralLeads with related User and Student data
    // We filter for Confirmed/Admitted leads as those are the ones in the report
    const referrals = await prisma.referralLead.findMany({
        where: {
            leadStatus: { in: ['Confirmed', 'Admitted'] }
        },
        include: {
            user: true,
            student: {
                include: {
                    campus: true
                }
            },
            settlements: true
        },
        orderBy: {
            createdAt: 'desc'
        }
    });

    console.log(`📊 Found ${referrals.length} confirmed/admitted referrals.`);

    // 2. Fetch Benefit Slabs for reward calculations
    const slabs = await prisma.benefitSlab.findMany({
        orderBy: { referralCount: 'asc' }
    });

    // 3. Prepare CSV Headers
    const headers = [
        'List',
        'Academic Year',
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
        'Partner ID (ERP)',
        'Ambassador Name',
        'Ambassador Mobile',
        'Role',
        'Partner Campus',
        'Bank Name',
        'Account Number',
        'IFSC Code',
        'Admission Share',
        'Donation Share',
        'State Reward',
        'Special Campus Share',
        'Total Payment'
    ];

    const rows = [headers.join(',')];

    // 4. Group referrals by User to calculate slab-based rewards
    const userReferralsMap = new Map<number, typeof referrals>();
    referrals.forEach(ref => {
        if (!userReferralsMap.has(ref.userId)) {
            userReferralsMap.set(ref.userId, []);
        }
        userReferralsMap.get(ref.userId)!.push(ref);
    });

    // 5. Process each user's referrals
    for (const [userId, userRefs] of userReferralsMap.entries()) {
        const user = userRefs[0].user;
        
        // Sort by creation date for FIFO slab calculation
        const sortedRefs = [...userRefs].sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

        sortedRefs.forEach((ref, index) => {
            const student = ref.student;
            const campusName = ref.campus || student?.campus?.campusName || 'N/A';
            
            // Financial Calculations
            const admFeeTotal = Number(ref.admissionFeeCollected) || 0;
            const donFeeTotal = Number(ref.donationFeeCollected) || 0;
            
            // Admission Share (80% by default)
            const specialBonusRate = getSpecialBonusRate(campusName);
            const hasSpecialBonus = specialBonusRate > 0;
            
            const admShare = hasSpecialBonus ? 0 : Math.round(admFeeTotal * 0.8);
            const donShare = hasSpecialBonus ? 0 : Math.round(donFeeTotal * 0.5);
            const specialCampusShare = hasSpecialBonus ? specialBonusRate : 0;
            
            // Slab calculation (simplified for report)
            // Note: In the image, "State Reward" seems to be used for slab-based or other rewards
            // For now, we'll map Special Campus Share specifically.
            
            // Bank Details Decryption
            let bankName = user.bankName || '';
            let accNo = user.accountNumber || '';
            let ifsc = user.ifscCode || '';

            if (!bankName && user.bankAccountDetails) {
                const decrypted = decrypt(user.bankAccountDetails);
                if (decrypted) {
                    // Try to parse "Bank - AccNo"
                    const parts = decrypted.split(' - ');
                    if (parts.length >= 2) {
                        bankName = parts[0];
                        accNo = parts[1];
                    }
                }
            }

            const totalPayment = admShare + donShare + specialCampusShare;

            const row = [
                user.role === 'Staff' ? 'List B' : 'List C', // Heuristic based on image
                ref.academicYear || '2026-2027',
                ref.studentName,
                ref.admissionNumber || '',
                ref.gradeInterested || '',
                campusName,
                admFeeTotal,
                admFeeTotal, // Assuming collected = paid for this report
                donFeeTotal,
                donFeeTotal,
                '', // School Fee Total (often blank in image)
                '', // School Fee Paid
                user.childEprNo || user.empId || '',
                user.fullName,
                user.mobileNumber,
                user.role,
                user.assignedCampus || 'N/A',
                bankName,
                `'${accNo}`, // Add single quote to prevent Excel from scientific notation
                ifsc,
                admShare,
                donShare,
                0, // State Reward (Placeholder)
                specialCampusShare,
                totalPayment
            ];

            rows.push(row.map(val => `"${val}"`).join(','));
        });
    }

    // 6. Write to file
    const fileName = 'Referral_Student_Details_Report.csv';
    fs.writeFileSync(fileName, rows.join('\n'));
    console.log(`✅ Report generated successfully: ${fileName}`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
