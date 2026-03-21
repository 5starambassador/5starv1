import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

// Helper: Normalize Grade Names for Matching (copied from import-actions.ts)
function normalizeGrade(grade: string | null | undefined): string {
    if (!grade) return ''

    let normalized = grade
        .toUpperCase()                    // Convert to uppercase
        .replace(/\s+/g, ' ')             // Normalize multiple spaces to single space
        .replace(/\s*-\s*/g, '-')         // Remove spaces around hyphens
        .trim()

    // Convert Roman numerals to Arabic numbers
    const romanMap: { [key: string]: string } = {
        'I': '1', 'II': '2', 'III': '3', 'IV': '4', 'V': '5', 'VI': '6',
        'VII': '7', 'VIII': '8', 'IX': '9', 'X': '10', 'XI': '11', 'XII': '12'
    }

    Object.keys(romanMap).forEach(roman => {
        const regex = new RegExp(`-${roman}$`, 'g')
        normalized = normalized.replace(regex, `-${romanMap[roman]}`)
        const spaceRegex = new RegExp(` ${roman}$`, 'g')
        normalized = normalized.replace(spaceRegex, `-${romanMap[roman]}`)
    })

    return normalized
}

async function verify() {
    console.log('--- VERIFYING GRADE 1 RULE ---');
    
    // 1. Find a referral in a higher grade (e.g., Grade - 5)
    // Looking for ANY admitted lead that is not Grade 1
    const leads = await prisma.referralLead.findMany({
        where: { 
            leadStatus: 'Admitted',
            gradeInterested: { contains: 'Grade' }
        },
        take: 20
    });

    const lead = leads.find(l => !l.gradeInterested?.includes('Grade - 1'));

    if (!lead) {
        console.log('No suitable referral found (e.g. Grade 5) for testing in the first 20 admitted leads.');
        return;
    }

    console.log(`Testing with Lead: ${lead.studentName} (${lead.gradeInterested}) at Campus ID: ${lead.campusId}`);
    
    // Logic from finance-actions.ts
    const normGradeValue = normalizeGrade(lead.gradeInterested);
    const isMontOrPreMont = normGradeValue.includes('MONT') || normGradeValue.includes('PRE');
    const gradeLookup = isMontOrPreMont ? normGradeValue : 'Grade-1';
    
    console.log(`Normalized Grade: ${normGradeValue}`);
    console.log(`Grade Lookup decided: ${gradeLookup}`);

    if (gradeLookup === 'Grade-1' && !normGradeValue.includes('GRADE-1')) {
        console.log('SUCCESS: Rule correctly mapped a higher grade to Grade-1 lookup.');
    } else if (isMontOrPreMont && gradeLookup === normGradeValue) {
        console.log('SUCCESS: Rule correctly kept Montessori/PreMont as-is.');
    } else {
        console.log('FAILURE: Rule did not map correctly.');
    }

    await prisma.$disconnect();
}

verify().catch(console.error);
