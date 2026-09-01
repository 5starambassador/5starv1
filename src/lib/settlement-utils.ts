/**
 * Settlement Utilities
 * Provides resilient, batch-aware deduplication for settlements uploaded via CSV/UTR.
 */

export function deduplicateSettlements<T extends {
    id?: number | string
    amount: number
    status?: string
    bankReference?: string | null
    createdAt?: Date | string
    payoutDate?: Date | string | null
    referralLeadId?: number | null
    benefitType?: string | null
}>(settlements: T[]): T[] {
    if (!settlements || settlements.length === 0) return []

    const nonProcessed: T[] = []
    const processedByUtr = new Map<string, T[]>()
    const processedWithoutUtr: T[] = []

    for (const s of settlements) {
        if (s.status !== 'Processed') {
            nonProcessed.push(s)
            continue
        }
        const utr = (s.bankReference || '').trim().toUpperCase()
        if (!utr) {
            processedWithoutUtr.push(s)
            continue
        }
        if (!processedByUtr.has(utr)) {
            processedByUtr.set(utr, [])
        }
        processedByUtr.get(utr)!.push(s)
    }

    const deduplicatedProcessed: T[] = [...processedWithoutUtr]

    for (const [_, items] of processedByUtr.entries()) {
        const sortedItems = [...items].sort((a, b) => {
            const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
            const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
            return timeA - timeB
        })
        
        const batches: T[][] = []
        let currentBatch: T[] = []
        let currentBatchTime = 0

        for (const item of sortedItems) {
            const itemTime = item.createdAt ? new Date(item.createdAt).getTime() : 0
            if (currentBatch.length === 0 || Math.abs(itemTime - currentBatchTime) < 60000) {
                currentBatch.push(item)
                currentBatchTime = itemTime
            } else {
                batches.push(currentBatch)
                currentBatch = [item]
                currentBatchTime = itemTime
            }
        }
        if (currentBatch.length > 0) {
            batches.push(currentBatch)
        }

        // The first batch is the canonical batch for this UTR disbursement.
        // Subsequent batches with identical UTR are duplicate re-uploads and are ignored.
        const primaryBatch = batches[0] || []
        deduplicatedProcessed.push(...primaryBatch)
    }

    return [...deduplicatedProcessed, ...nonProcessed].sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : 0
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : 0
        return timeB - timeA
    })
}
