const encryptReferralCode = (code: string) => code; // Mock

/**
 * MOCK of the current hardened aliasTokens logic in src/app/campaign-dispatcher.ts
 */
const aliasTokensFinalMock = async (text: string, user: any, audienceType: string = 'AMBASSADORS') => {
    if (!text) return ''
    const baseUrl = 'https://www.5starambassador.com'

    const referralCode = user.referralCode || user.referrerCode || ''
    const referralLink = referralCode ? `${baseUrl}/r/${referralCode}` : ''
    const referrerLink = user.referrerCode ? `${baseUrl}/r/${user.referrerCode}` : ''

    // 🔥 GLOBAL PRIORITY mapping
    let resolvedText = text
        .replace(/{userName}|{Ambassador}|{parentName}|{Name}|{leadName}|{studentName}/gi, user.fullName || user.visitorName || user.studentName || 'Recipient')
        .replace(/{campus}|{Campus}|{CAMPUS}/gi, user.assignedCampus || 'Global Campus')
        .replace(/{mobile}|{Mobile}/gi, user.mobileNumber || user.visitorMobile || '')
        .replace(/{referralCode}|{code}|{ReferralCode}/gi, referralCode)
        .replace(/{referralLink}|{ReferralLink}/gi, referralLink)
        .replace(/{referrerLink}|{ReferrerLink}/gi, referrerLink)

    // Handle Dynamic Program Links
    if (resolvedText.includes('{ProgramLink:')) {
        const programRegex = /{ProgramLink:([^}]+)}/gi
        resolvedText = resolvedText.replace(programRegex, (match, slug) => {
            const activeRefCode = user.referralCode || user.referrerCode || ''
            if (activeRefCode) {
                return `${baseUrl}/offer/${slug}?ref=${activeRefCode}`
            }
            return `${baseUrl}/offer/${slug}`
        })
    }

    if (audienceType === 'PROGRAM_LEADS') {
        const programLink = user.programSlug ? `${baseUrl}/p/${user.programSlug}?r=${user.referrerCode || ''}` : ''
        resolvedText = resolvedText
            .replace(/{studentName}/gi, user.studentName || user.visitorName || 'Student')
            .replace(/{source}|{referrerName}/gi, user.source || '')
            .replace(/{programName}/gi, user.programName || '')
            .replace(/{programLink}/gi, programLink)
            .replace(/{status}|{leadStatus}/gi, user.leadStatus || '')
            .replace(/{enquiryDate}/gi, user.enquiryDate || '')
    }

    return resolvedText
}

async function runFinalTestSim() {
    console.log('\n=== REAL-TIME VARIABLE RESOLUTION TEST (CAMPAIGN 34) ===\n');

    // Sample data structure from campaign-actions.ts (Fallbacks applied)
    const testLead = {
        fullName: 'Test Recipient',
        visitorName: 'Test Recipient',
        studentName: 'Test Student',
        referralCode: 'ACH26-S00604',
        referrerCode: 'ACH26-S00604',
        assignedCampus: 'Global Campus',
        source: 'Achariya Staff',
        programSlug: 'wow-summer-camp'
    };

    const mapping = {
        "1": "{Name}",
        "2": "{source}",
        "3": "{ProgramLink:wow-summer-camp}"
    };

    console.log('Recipient Data:', JSON.stringify(testLead, null, 2));
    console.log('\nResolving Variables:');
    
    const results = [];
    for (const [key, token] of Object.entries(mapping)) {
        const resolved = await aliasTokensFinalMock(token, testLead, 'PROGRAM_LEADS');
        results.push({
            "Var Index": key,
            "Template Token": token,
            "Resolved Value": resolved
        });
    }

    console.table(results);

    const bodyTemplate = "Dear *{{1}}*, You’ve been referred by Achariya Parent / Staff, *{{2}}*. To register click: {{3}}";
    let finalMessage = bodyTemplate;
    results.forEach(res => {
        finalMessage = finalMessage.replace(`{{${res["Var Index"]}}}`, res["Resolved Value"]);
    });

    console.log('\n--- FINAL MESSAGE PREVIEW ---');
    console.log(finalMessage);
    console.log('------------------------------\n');
}

runFinalTestSim();
