export {};
// We avoid server-only by mocking the environment if needed, 
// but here we just want to test the LOGIC of aliasTokens.
// Since it's a 'use server' file, importing it in a node script might fail.
// So we'll use a modified repro script that has the same logic as the real one now.

const aliasTokensMock = async (text: string, user: any, audienceType: string = 'AMBASSADORS') => {
    if (!text) return ''
    const type = audienceType || 'AMBASSADORS'
    const baseUrl = 'https://5starambassador.com'

    const referralCode = user.referralCode || user.referrerCode || ''
    const referralLink = referralCode ? `${baseUrl}/r/${referralCode}` : ''
    const referrerLink = user.referrerCode ? `${baseUrl}/r/${user.referrerCode}` : ''

    let resolvedText = text
        .replace(/{userName}|{Ambassador}|{parentName}|{Name}|{leadName}|{studentName}/gi, user.fullName || user.studentName || 'Recipient')
        .replace(/{campus}|{Campus}|{CAMPUS}/gi, user.assignedCampus || 'Global Campus')
        .replace(/{mobile}|{Mobile}/gi, user.mobileNumber || '')
        .replace(/{referralCode}|{code}|{ReferralCode}/gi, user.referralCode || '')
        .replace(/{referralLink}|{ReferralLink}/gi, referralLink)
        .replace(/{referrerLink}|{ReferrerLink}/gi, referrerLink)

    // Handle Dynamic Program Links (NEW LOGIC: Before returns)
    if (resolvedText.includes('{ProgramLink:')) {
        const programRegex = /{ProgramLink:([^}]+)}/gi
        resolvedText = resolvedText.replace(programRegex, (match, slug) => {
            if (user.referralCode) {
                return `${baseUrl}/offer/${slug}?ref=${user.referralCode}`
            }
            return `${baseUrl}/offer/${slug}`
        })
    }

    if (type === 'PROGRAM_LEADS') {
        const programLink = user.programSlug ? `${baseUrl}/p/${user.programSlug}?r=${user.referrerCode || ''}` : ''
        return resolvedText
            .replace(/{studentName}/gi, user.studentName || 'Student')
            .replace(/{grade}|{Grade}/gi, user.grade || '')
            .replace(/{source}|{referrerName}/gi, user.source || '')
            .replace(/{programName}/gi, user.programName || '')
            .replace(/{programLink}/gi, programLink)
            .replace(/{status}|{leadStatus}/gi, user.leadStatus || '')
            .replace(/{enquiryDate}/gi, user.enquiryDate || '')
    }

    return resolvedText
}

async function testRepro() {
    console.log('--- VERIFYING BUG FIX ---');
    const user = {
        fullName: 'H. Jaswanth',
        assignedCampus: 'ABSM',
        source: 'Program',
        referralCode: null,
        referrerCode: 'REF123',
        programSlug: 'wow-summer-camp'
    };

    const text = "{ProgramLink:wow-summer-camp}";
    console.log(`Input: "${text}"`);
    
    const resolved = await aliasTokensMock(text, user, 'PROGRAM_LEADS');
    console.log(`Resolved: "${resolved}"`);

    if (resolved.includes('offer/wow-summer-camp')) {
        console.log('✅ SUCCESS: Dynamic link resolved for PROGRAM_LEADS');
    } else {
        console.log('❌ FAILURE: Dynamic link still unresolved');
    }
}

testRepro().catch(console.error);
