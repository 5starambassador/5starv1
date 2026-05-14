import { aliasTokens, resolveWhatsAppVariables } from '../src/lib/campaign-utils'

async function verifyExpertFix() {
    console.log('--- 🛡️ EXPERT PARITY AUDIT ---')
    
    const sampleReferralUser = {
        fullName: 'gayathri devi',
        referrerCode: 'ACH-SAFE-2025',
        programSlug: 'wow-summer-camp'
    }

    const mapping = {
        "1": "{Name}",
        "2": "STATIC",
        "static_1": "Achariya Global",
        "3": "{ProgramLink:wow-summer-camp}"
    }

    // 1. Check TitleCase
    const name = await aliasTokens('{Name}', sampleReferralUser, 'REFERRALS')
    console.log('Name Resolution:', name === 'Gayathri Devi' ? '✅ PASS' : `❌ FAIL (${name})`)

    // 2. Check Specific Program Link
    const link = await aliasTokens('{ProgramLink:wow-summer-camp}', sampleReferralUser, 'REFERRALS')
    console.log('Program Link:', link.includes('/offer/wow-summer-camp?ref=ACH-SAFE-2025') ? '✅ PASS' : `❌ FAIL (${link})`)

    // 3. Check General Referral Link
    const refLink = await aliasTokens('{ReferralLink}', sampleReferralUser, 'REFERRALS')
    console.log('Referral Link:', refLink.includes('/r/') ? '✅ PASS' : `❌ FAIL (${refLink})`)

    // 4. Check Resolution Array
    const { waVars } = await resolveWhatsAppVariables(sampleReferralUser, 'REFERRALS', mapping, 3)
    console.log('Variable Array:', waVars)
    
    if (waVars[0] === 'Gayathri Devi' && waVars[2].includes('summer-camp')) {
        console.log('FINAL AUDIT: 100% SUCCESS')
    } else {
        console.error('FINAL AUDIT: DISCREPANCY DETECTED')
    }
}

verifyExpertFix().catch(console.error)
