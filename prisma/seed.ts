
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient({
    log: ['info']
})

const STAFF_NAMES = ["Suresh Chandran", "Amit Patel", "Deepa Thomas", "Karan Johar", "Priya Menon"]
const PARENT_NAMES = ["Vikram Rathore", "Anjali Gupta", "Rohit Sharma", "Sneha Reddy", "Manish Malhotra"]

const SLABS = { 1: 5, 2: 10, 3: 25, 4: 30, 5: 50 } as const

async function main() {
    console.log('Starting seed...')

    // 0. Cleanup existing data to prevent duplicates
    console.log('Cleaning up existing data...')
    await prisma.ticketMessage.deleteMany({})
    await prisma.supportTicket.deleteMany({})
    await prisma.student.deleteMany({})
    await prisma.settlement.deleteMany({})
    await prisma.referralLead.deleteMany({})
    await prisma.user.deleteMany({})
    console.log('Cleanup complete.')

    // 1. Benefits Slabs
    const benefits = [
        { referralCount: 1, yearFeeBenefitPercent: 5, longTermExtraPercent: 5, baseLongTermPercent: 15 },
        { referralCount: 2, yearFeeBenefitPercent: 10, longTermExtraPercent: 10, baseLongTermPercent: 15 },
        { referralCount: 3, yearFeeBenefitPercent: 25, longTermExtraPercent: 15, baseLongTermPercent: 15 },
        { referralCount: 4, yearFeeBenefitPercent: 30, longTermExtraPercent: 20, baseLongTermPercent: 15 },
        { referralCount: 5, yearFeeBenefitPercent: 50, longTermExtraPercent: 25, baseLongTermPercent: 15 },
    ]

    for (const benefit of benefits) {
        await prisma.benefitSlab.upsert({
            where: { referralCount: benefit.referralCount },
            update: {},
            create: benefit,
        })
    }

    // 2. Admins
    const admins = [
        { mobile: '9999999999', name: 'Super Admin', role: 'Super Admin' },
        { mobile: '8888888888', name: 'Campus Head', role: 'Campus Head' },
        { mobile: '7777777777', name: 'Admission Admin', role: 'Admission Admin' },
        { mobile: '6666666666', name: 'Finance Admin', role: 'Finance Admin' }
    ]

    for (const admin of admins) {
        await prisma.admin.upsert({
            where: { adminMobile: admin.mobile },
            update: {},
            create: {
                adminName: admin.name,
                adminMobile: admin.mobile,
                password: '123456',
                role: admin.role
            }
        })
    }

    // 3. Campuses
    const CAMPUS_DATA = [
        { code: "VILL-912", name: "ASM-VILLIANUR(9-12)", location: "Villianur" },
        { code: "VILL-MONT", name: "ASM-VILLIANUR(MONT-8)", location: "Villianur" },
        { code: "VPM", name: "ASM-VILLUPURAM", location: "Villupuram" },
        { code: "ALPK", name: "ASM-ALAPAKKAM", location: "Alapakkam" },
        { code: "ADY", name: "ADYAR", location: "Adyar" }
    ]

    for (const c of CAMPUS_DATA) {
        // Check if campus exists by code or name
        const existingCampus = await prisma.campus.findFirst({
            where: {
                OR: [
                    { campusCode: c.code },
                    { campusName: c.name }
                ]
            }
        })

        if (!existingCampus) {
            await prisma.campus.create({
                data: {
                    campusName: c.name,
                    campusCode: c.code,
                    location: c.location,
                    grades: "K-12"
                }
            })
        }
    }

    // 4. Grade Fees
    const campuses = await prisma.campus.findMany()
    const GRADES = ['KG 1', 'KG 2', 'Grade 1', 'Grade 5', 'Grade 10', 'Grade 12']

    // Clear existing fees to prevent duplicates during testing
    await prisma.gradeFee.deleteMany({})

    for (const campus of campuses) {
        for (const grade of GRADES) {
            let baseFee = 45000
            if (grade.includes('Grade')) baseFee = 65000
            if (grade.includes('10') || grade.includes('12')) baseFee = 85000

            await prisma.gradeFee.create({
                data: {
                    campusId: campus.id,
                    grade: grade,
                    annualFee: baseFee
                }
            })
        }
    }

    // 5. Generate Users & Leads
    await generateGroup(STAFF_NAMES, 'Staff', '900000000') // 9 digits
    await generateGroup(PARENT_NAMES, 'Parent', '910000000') // 9 digits

    // 6. Generate Students
    await generateStudents()

    console.log('Seeding completed.')
}

async function generateGroup(names: string[], role: string, mobilePrefix: string) {
    for (let i = 0; i < names.length; i++) {
        const referralCount = i + 1
        const name = names[i]
        const mobile = `${mobilePrefix}${i + 1}`
        const refCode = `ACH25-${role.substring(0, 1)}${i + 1}`
        const yearBenefit = SLABS[referralCount as keyof typeof SLABS] || 0
        const longTermBenefit = 15 + (referralCount * 5)

        // Check if user exists by mobile or referral code
        let user = await prisma.user.findFirst({
            where: {
                OR: [
                    { mobileNumber: mobile },
                    { referralCode: refCode }
                ]
            }
        })

        if (!user) {
            user = await prisma.user.create({
                data: {
                    fullName: name,
                    mobileNumber: mobile,
                    password: '123456',
                    role: role,
                    childInAchariya: true,
                    referralCode: refCode,
                    confirmedReferralCount: referralCount,
                    yearFeeBenefitPercent: yearBenefit,
                    longTermBenefitPercent: longTermBenefit,
                    isFiveStarMember: true,
                    benefitStatus: 'Active',
                    studentFee: 60000,
                    academicYear: '2025-2026'
                }
            })
            console.log(`Created ${role} ${name}`)
        } else {
            console.log(`Skipped ${role} ${name} (already exists)`)
        }

        await generateLeads(user.userId, referralCount)
        await generateSettlements(user.userId)
    }
}

async function generateLeads(userId: number, count: number) {
    await prisma.referralLead.deleteMany({ where: { userId } })

    // Campuses and Grades for leads
    const CAMPUSES = ["ASM-VILLIANUR(9-12)", "ASM-VILLIANUR(MONT-8)", "ASM-VILLUPURAM"]
    const GRADES_INTERESTED = ['Grade 1', 'Grade 2', 'Grade 6']

    // Names to rotate through for leads
    const LEAD_NAMES = [
        "Ramesh Gupta", "Sita Verma", "Vikram Singh", "Anita Roy", "Rajesh Kumar",
        "Priya Malik", "Amit Shah", "Sneha Reddy", "Karan Johar", "Deepika P",
        "Sanjay Dutt", "Meena Kumari", "Arun Jaitley", "Sushma Swaraj", "Narendra M"
    ]

    for (let i = 0; i < count; i++) {
        const randomName = LEAD_NAMES[(userId + i) % LEAD_NAMES.length]

        await prisma.referralLead.create({
            data: {
                parentName: randomName,
                parentMobile: `98${String(userId).padStart(4, '0')}${String(i).padStart(4, '0')}`.substring(0, 10), // Ensure 10 digits
                campus: CAMPUSES[i % CAMPUSES.length],
                gradeInterested: GRADES_INTERESTED[i % GRADES_INTERESTED.length],
                leadStatus: 'Confirmed',
                userId: userId,
                confirmedDate: new Date(),
                admittedYear: "2025-2026"
            }
        })
    }
}

async function generateSettlements(userId: number) {
    // Generate mocked settlements
    await prisma.settlement.deleteMany({ where: { userId } })

    const amounts = [5000, 12000, 2500]

    // Pending Settlement
    await prisma.settlement.create({
        data: {
            userId: userId,
            amount: amounts[userId % 3],
            status: 'Pending',
            remarks: 'Referral Bonus Q1'
        }
    })

    // Processed Settlement (if user ID is even)
    if (userId % 2 === 0) {
        await prisma.settlement.create({
            data: {
                userId: userId,
                amount: 1500,
                status: 'Processed',
                paymentMethod: 'NEFT',
                processedBy: 1,
                payoutDate: new Date()
            }
        })
    }
}

// Child first names for seeding (30 names for 15 parent + 15 staff students)
const CHILD_FIRST_NAMES = [
    // Parent students (1+2+3+4+5 = 15)
    "Arjun", "Priya", "Rahul", "Ananya", "Karthik",
    "Sneha", "Aditya", "Meera", "Vikram Jr", "Divya",
    "Rohan", "Kavya", "Sanjay", "Pooja", "Nikhil",
    // Staff students (1+2+3+4+5 = 15)
    "Aarav", "Ishaan", "Vihaan", "Aditi", "Saanvi",
    "Diya", "Aadhya", "Reyansh", "Pihu", "Anvi",
    "Krishna", "Lakshmi", "Riya", "Tanvi", "Arnav"
]

async function generateStudents() {
    console.log('Generating students...')

    // Clear existing students
    await prisma.student.deleteMany({})

    // Get all parent users (ordered to ensure consistent assignment)
    const parents = await prisma.user.findMany({
        where: { role: 'Parent' },
        orderBy: { userId: 'asc' }
    })

    // Get all campuses
    const campuses = await prisma.campus.findMany()

    const GRADES = ['Grade 1', 'Grade 5', 'Grade 10', 'Grade 12', 'KG 1', 'KG 2']
    const SECTIONS = ['A', 'B', 'C']

    let studentIndex = 0
    let childNameIndex = 0

    // Each parent gets (index + 1) students: 1st parent = 1, 2nd = 2, etc.
    for (let parentIndex = 0; parentIndex < parents.length; parentIndex++) {
        const parent = parents[parentIndex]
        const numStudents = parentIndex + 1  // 1, 2, 3, 4, 5 students respectively

        // Extract parent's surname
        const parentNameParts = parent.fullName.split(' ')
        const parentSurname = parentNameParts[parentNameParts.length - 1]

        for (let i = 0; i < numStudents && childNameIndex < CHILD_FIRST_NAMES.length; i++) {
            const campus = campuses[studentIndex % campuses.length]
            const grade = GRADES[studentIndex % GRADES.length]
            const section = SECTIONS[studentIndex % SECTIONS.length]

            // Create a dummy parent for this student so Parent != Ambassador
            const dummyParentName = `Parent of ${CHILD_FIRST_NAMES[childNameIndex]}`
            const dummyMobile = `80000${String(studentIndex).padStart(5, '0')}` // Different series for parent-referred

            let dummyParent = await prisma.user.findUnique({ where: { mobileNumber: dummyMobile } })

            if (!dummyParent) {
                dummyParent = await prisma.user.create({
                    data: {
                        fullName: dummyParentName,
                        mobileNumber: dummyMobile,
                        role: 'Parent',
                        childInAchariya: true,
                        referralCode: `PAR-REF-${studentIndex}`,
                        confirmedReferralCount: 0,
                        yearFeeBenefitPercent: 0,
                        longTermBenefitPercent: 0,
                        isFiveStarMember: false,
                        benefitStatus: 'Inactive',
                        studentFee: 60000,
                        academicYear: '2025-2026'
                    }
                })
            }

            // Create student name
            const studentFullName = `${CHILD_FIRST_NAMES[childNameIndex]} ${parentSurname}`

            // Get base fee for this campus/grade
            let baseFee = 60000
            const gradeFee = await prisma.gradeFee.findFirst({
                where: { campusId: campus.id, grade: grade }
            })
            if (gradeFee) baseFee = gradeFee.annualFee

            await prisma.student.create({
                data: {
                    fullName: studentFullName,
                    parentId: dummyParent.userId,
                    ambassadorId: parent.userId, // The existing parent is the ambassador
                    campusId: campus.id,
                    grade: grade,
                    section: section,
                    rollNumber: `R${2024}${String(studentIndex + 1).padStart(3, '0')}`,
                    baseFee: baseFee,
                    discountPercent: parent.yearFeeBenefitPercent || 0,
                    status: 'Active'
                }
            })

            console.log(`Created student: ${studentFullName} for ambassador (parent) ${parent.fullName}`)
            studentIndex++
            childNameIndex++
        }
    }

    // Also create some students for staff users (as if they have children in school)
    const staffUsers = await prisma.user.findMany({
        where: { role: 'Staff' },
        orderBy: { userId: 'asc' }
    })

    // Each staff gets (index + 1) students: 1st staff = 1, 2nd = 2, etc.
    for (let staffIndex = 0; staffIndex < staffUsers.length; staffIndex++) {
        const staff = staffUsers[staffIndex]
        const numStudents = staffIndex + 1  // 1, 2, 3, 4, 5 students respectively

        // Extract staff's surname
        const staffNameParts = staff.fullName.split(' ')
        const staffSurname = staffNameParts[staffNameParts.length - 1]

        for (let i = 0; i < numStudents && childNameIndex < CHILD_FIRST_NAMES.length; i++) {
            const campus = campuses[studentIndex % campuses.length]
            const grade = GRADES[studentIndex % GRADES.length]
            const section = SECTIONS[studentIndex % SECTIONS.length]

            // For staff referrals, we need a separate parent
            // We'll create a dummy parent for this student
            const dummyParentName = `Parent of ${CHILD_FIRST_NAMES[childNameIndex]}`
            const dummyMobile = `90000${String(studentIndex).padStart(5, '0')}`

            // Check if dummy parent exists (to avoid unique errors if re-run without clean)
            let dummyParent = await prisma.user.findUnique({ where: { mobileNumber: dummyMobile } })

            if (!dummyParent) {
                dummyParent = await prisma.user.create({
                    data: {
                        fullName: dummyParentName,
                        mobileNumber: dummyMobile,
                        role: 'Parent',
                        childInAchariya: true,
                        referralCode: `PAR-TEMP-${studentIndex}`, // Dummy referral code
                        confirmedReferralCount: 0,
                        yearFeeBenefitPercent: 0,
                        longTermBenefitPercent: 0,
                        isFiveStarMember: false,
                        benefitStatus: 'Inactive',
                        studentFee: 60000,
                        academicYear: '2025-2026'
                    }
                })
            }

            const studentFullName = `${CHILD_FIRST_NAMES[childNameIndex]} ${staffSurname}`

            let baseFee = 60000
            const gradeFee = await prisma.gradeFee.findFirst({
                where: { campusId: campus.id, grade: grade }
            })
            if (gradeFee) baseFee = gradeFee.annualFee

            await prisma.student.create({
                data: {
                    fullName: studentFullName,
                    parentId: dummyParent.userId,
                    ambassadorId: staff.userId, // The staff is the ambassador
                    campusId: campus.id,
                    grade: grade,
                    section: section,
                    rollNumber: `R${2024}${String(studentIndex + 1).padStart(3, '0')}`,
                    baseFee: baseFee,
                    discountPercent: staff.yearFeeBenefitPercent || 0,
                    status: 'Active'
                }
            })

            console.log(`Created student: ${studentFullName} for ambassador (staff) ${staff.fullName}`)
            studentIndex++
            childNameIndex++
        }
    }

    console.log(`Total students created: ${studentIndex}`)
}

main()
    .then(async () => {
        await prisma.$disconnect()
    })
    .catch(async (e) => {
        console.error(e)
        await prisma.$disconnect()
        process.exit(1)
    })
