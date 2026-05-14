import { aliasTokens } from './src/app/campaign-dispatcher'

async function testResolution() {
    console.log('--- Testing REFERRALS Resolution ---')
    const referralUser = {
        fullName: 'gayathri devi',
        parentName: 'gayathri devi',
        referrerCode: 'ACH-TEST-001',
        programSlug: 'wow-summer-camp'
    }
    
    const res1 = await aliasTokens('{Name}', referralUser, 'REFERRALS')
    console.log('Name (Referral):', res1) // Should be Gayathri Devi
    
    const res2 = await aliasTokens('{ProgramLink}', referralUser, 'REFERRALS')
    console.log('Generic ProgramLink (Referral):', res2) // Should be admission link
    
    const res3 = await aliasTokens('{ProgramLink:wow-summer-camp}', referralUser, 'REFERRALS')
    console.log('Specific ProgramLink (Referral):', res3) // Should be summer camp offer link
    
    console.log('\n--- Testing PROGRAM_LEADS Resolution ---')
    const leadUser = {
        visitorName: 'john doe',
        programName: 'Robotics',
        programSlug: 'robotics-2025',
        referrerCode: 'ACH-REF-999'
    }
    
    const res4 = await aliasTokens('{Name}', leadUser, 'PROGRAM_LEADS')
    console.log('Name (Lead):', res4) // Should be John Doe
    
    const res5 = await aliasTokens('{programLink}', leadUser, 'PROGRAM_LEADS')
    console.log('Program Link (Lead):', res5) // Should be robotics offer link
}

testResolution().catch(console.error)
