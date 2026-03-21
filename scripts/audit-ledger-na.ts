import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function auditNAValues() {
    console.log('--- STARTING N/A AUDIT ---');
    
    // 1. Get all active ambassadors who would appear in the ledger
    const users = await prisma.user.findMany({
        where: {
            status: 'Active',
            role: { in: ['Staff', 'Parent', 'Alumni', 'Others'] }
        },
        include: {
            students: { 
                where: { status: { in: ['Active', 'ACTIVE'] } as any },
                select: { studentId: true, fullName: true, grade: true, campus: { select: { campusName: true } } }
            },
            referrals: { where: { leadStatus: { in: ['Confirmed', 'Admitted'] } } },
            settlements: true
        }
    });

    console.log(`Total active candidates: ${users.length}`);

    const groupAIssues = [];
    const parentsInGroupB = [];
    let groupBCount = 0;

    // Fetch all campuses to simulate the campusMap
    const allCampuses = await prisma.campus.findMany({ select: { id: true, campusName: true } });
    const campusMap = new Map(allCampuses.map(c => [c.id, c.campusName]));

    for (const u of users) {
        const hasLinkedStudent = u.students && u.students.length > 0;
        const studentName = hasLinkedStudent ? u.students[0].fullName : 'N/A';
        const userCampus = u.assignedCampus || 'N/A'; 
        const mobileNo = u.mobileNumber || 'N/A';
        
        // Group A logic from finance-actions.ts
        const isGroupAEligible = (u.role === 'Staff' || u.role === 'Parent') && u.childInAchariya === true;
        
        // Data check (Fallbacks)
        const linkedStudent = hasLinkedStudent ? u.students[0] : null;
        const childName = (linkedStudent as any)?.fullName || u.childName || 'N/A';
        const childGrade = (linkedStudent as any)?.grade || u.grade || 'N/A';
        
        const cId = (u as any).childCampusId || (u as any).campusId;
        const childCampus = (linkedStudent as any)?.campus?.campusName || (cId ? campusMap.get(cId) : 'N/A');

        const issue = {
            userId: u.userId,
            fullName: u.fullName,
            role: u.role,
            childName,
            childGrade,
            childCampus,
            reason: ''
        };

        if (isGroupAEligible) {
            if (childName === 'N/A' || childGrade === 'N/A' || childCampus === 'N/A') {
                issue.reason = `Missing: ${[childName === 'N/A' ? 'Name' : null, childGrade === 'N/A' ? 'Grade' : null, childCampus === 'N/A' ? 'Campus' : null].filter(Boolean).join(', ')}`;
                groupAIssues.push(issue);
            }
        } else {
            groupBCount++;
            if (hasLinkedStudent) {
                parentsInGroupB.push({
                    userId: u.userId,
                    fullName: u.fullName,
                    role: u.role,
                    mobileNo,
                    userCampus,
                    childInAchariya: u.childInAchariya,
                    hasLinkedStudent: true,
                    studentName: studentName
                });
            }
        }
    }

    console.log(`\n--- GROUP A (Staff/Parents) MISSING DATA ---`);
    console.log(`Found ${groupAIssues.length} issues in Group A.`);
    if (groupAIssues.length > 0) {
        console.table(groupAIssues.slice(0, 50)); // Show some examples
        if (groupAIssues.length > 50) console.log(`... and ${groupAIssues.length - 50} more.`);
    }

    console.log(`\n--- GROUP B (Friends/Alumni) SUMMARY ---`);
    console.log(`Total members in Group B: ${groupBCount}`);
    console.log(`(N/A is expected for child details in Group B)`);

    console.log(`\n--- PARENTS IN GROUP B (Potential Errors) ---`);
    // Rule: alumini and others should not be considered as parent or staff
    const eligibleForGroupA = parentsInGroupB.filter(p => p.hasLinkedStudent && (p.role === 'Staff' || p.role === 'Parent'));
    console.log(`Found ${parentsInGroupB.length} users with linked students who are in Group B.`);
    console.log(`CRITICAL: ${eligibleForGroupA.length} of these are Parents/Staff who should be in Group A but childInAchariya is false.`);
    
    if (eligibleForGroupA.length > 0) {
        console.table(eligibleForGroupA.slice(0, 50));
        
        // Generate CSV
        try {
            const fs = require('fs');
            const csvHeader = 'userId,fullName,role,mobileNumber,campus,childInAchariya,hasLinkedStudent,studentName\n';
            const csvRows = eligibleForGroupA.map(p => `${p.userId},"${p.fullName}",${p.role},${p.mobileNo},"${p.userCampus}",${p.childInAchariya},${p.hasLinkedStudent},"${p.studentName}"`).join('\n');
            fs.writeFileSync('f:/5 star/eligible_parents_fix.csv', csvHeader + csvRows);
            console.log(`\nCSV file generated: f:/5 star/eligible_parents_fix.csv`);
        } catch (err: any) {
            console.log(`\nNote: Could not update CSV file (likely open in another program). Audit results are still valid in audit_results.txt`);
        }
    }

    await prisma.$disconnect();
}

auditNAValues().catch(console.error);
