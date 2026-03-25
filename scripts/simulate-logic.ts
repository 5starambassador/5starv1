import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function simulateBusinessLogic() {
    console.log('--- SIMULATING BUSINESS LOGIC: USER 19 ---');
    const academicYear = '2026-2027';
    
    // 1. Fetch exactly as the action does
    const u = await prisma.user.findUnique({
        where: { userId: 19 },
        include: {
            settlements: true,
            students: {
                where: { status: { in: ['Active'] } as any },
            },
            referrals: {
                where: {
                    leadStatus: { in: ['Confirmed', 'Admitted'] }
                },
                include: {
                    student: true
                }
            }
        }
    });

    if (!u) { console.log('User 19 not found'); return; }

    console.log(`User: ${u.fullName}, Role: ${u.role}, ChildInAchariya: ${u.childInAchariya}`);

    // Self-referral logic simulation
    const ownStudentIds = (u.students || []).map((s: any) => s.studentId);
    const normalizedOwnChild = String(u.childName || '').trim().toUpperCase();

    const currentReferrals = u.referrals.filter((r: any) => {
        const refDate = r.createdAt ? new Date(r.createdAt) : new Date(0);
        const refYear = r.academicYear || r.admittedYear;
        const isEarly26 = refDate.getFullYear() === 2026 && refDate.getMonth() <= 4;
        const attributedYear = refYear || (isEarly26 ? '2026-2027' : '2025-2026');
        
        if ((academicYear as string) !== 'All' && attributedYear !== academicYear) {
            console.log(`  Filtered by YEAR: ${r.leadId} (Attributed: ${attributedYear})`);
            return false;
        }

        if (r.parentMobile === u.mobileNumber) {
            console.log(`  Filtered by MOBILE: ${r.leadId}`);
            return false;
        }
        if (r.student?.studentId && ownStudentIds.includes(r.student.studentId)) {
            console.log(`  Filtered by STUDENT_ID: ${r.leadId}`);
            return false;
        }
        const refName = (r.studentName || '').trim().toUpperCase();
        if (normalizedOwnChild && refName && refName === normalizedOwnChild) {
            console.log(`  Filtered by NAME: ${r.leadId}`);
            return false;
        }
        return true;
    });

    console.log(`Final Referral Count: ${currentReferrals.length}`);
    if (currentReferrals.length > 0) {
        console.log('Referral Details:', currentReferrals.map((r: any) => ({ id: r.leadId, campus: r.campus, student: r.studentName })));
    }

    await prisma.$disconnect();
}

simulateBusinessLogic();
