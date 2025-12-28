import { Capacitor } from '@capacitor/core'

let Badge: any = null

export async function setBadgeCount(count: number) {
    if (!Capacitor.isNativePlatform()) return

    try {
        if (!Badge) {
            const module = await import('@capawesome/capacitor-badge')
            Badge = module.Badge
        }

        if (count > 0) {
            await Badge.set({ count })
        } else {
            await Badge.clear()
        }
    } catch (e) {
        console.log('Badge not available', e)
    }
}

export async function clearBadge() {
    await setBadgeCount(0)
}
