import { getMarketingAssets, getMarketingCategories } from '@/app/marketing-actions'
import { MarketingClient } from './marketing-client'

export default async function MarketingPage() {
    const result = await getMarketingAssets()
    const categories = await getMarketingCategories()

    return (
        <MarketingClient
            grouped={result.grouped}
            categories={categories}
        />
    )
}
