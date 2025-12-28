import { getMarketingAssets, getMarketingCategories } from '@/app/marketing-actions'
import { MarketingClient } from './marketing-client'
import { getCurrentUser } from '@/lib/auth-service'

export default async function MarketingPage() {
    const result = await getMarketingAssets()
    const categories = await getMarketingCategories()
    const user = await getCurrentUser()
    const referralCode = user && 'referralCode' in user ? user.referralCode : undefined

    return (
        <MarketingClient
            grouped={result.grouped}
            categories={categories}
            referralCode={referralCode}
        />
    )
}
