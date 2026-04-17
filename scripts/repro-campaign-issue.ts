export {};
// Manually copied aliasTokens logice to avoid server-only imports
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

    // Default: AMBASSADORS
    resolvedText = resolvedText
        .replace(/{role}|{Role}/gi, user.role || 'Ambassador')
        .replace(/{referralCount}/gi, (user.confirmedReferralCount || 0).toString())

    if (resolvedText.includes('{ProgramLink:')) {
        const programRegex = /{ProgramLink:([^}]+)}/gi
        resolvedText = resolvedText.replace(programRegex, (match, slug) => {
            return `${baseUrl}/offer/${slug}`
        })
    }

    return resolvedText
}

async function testRepro() {
    const campaign = {
        id: 34,
        waVariableMapping: {
            "1": "{Name}",
            "2": "{source}",
            "3": "{ProgramLink:wow-summer-camp}"
        }
    };

    const user = {
        userId: 0,
        fullName: 'H. Jaswanth',
        studentName: '',
        programName: '',
        programSlug: '',
        leadStatus: 'CLICKED',
        email: '',
        mobileNumber: '916385136116',
        assignedCampus: 'ABSM - PADMANABHANAGAR',
        source: 'Program',
        referrerCode: '',
        referralCode: null,
        enquiryDate: '',
        role: 'Lead'
    };

    const mapping = (campaign as any).waVariableMapping || {};
    const mappingKeys = Object.keys(mapping).filter(k => {
        const cleanKey = k.replace('button_', 'var_');
        return !isNaN(Number(cleanKey.replace(/\D/g, '')));
    });

    const waVars: string[] = [];
    const maxVar = mappingKeys.length > 0 ? Math.max(...mappingKeys.map(k => Number(k.replace(/\D/g, '')))) : 5;

    console.log(`Max Var: ${maxVar}`);
    console.log(`Mapping Keys: ${JSON.stringify(mappingKeys)}`);

    for (let i = 1; i <= maxVar; i++) {
        const key = i.toString();
        const bodyMappedValue = mapping[key];
        console.log(`Checking key: ${key}, value: ${bodyMappedValue}`);
        
        if (bodyMappedValue === 'STATIC') {
            waVars.push((mapping[`static_${key}`] || '').toString().replace(/[\r\n]+/g, ' ').trim());
        } else if (bodyMappedValue) {
            const resolved = await aliasTokensMock(bodyMappedValue, user, 'PROGRAM_LEADS');
            console.log(`  Resolved: "${resolved}"`);
            waVars.push(resolved.toString().replace(/[\r\n]+/g, ' ').trim());
        }
    }

    console.log(`Final waVars: ${JSON.stringify(waVars)}`);
}

testRepro().catch(console.error);
