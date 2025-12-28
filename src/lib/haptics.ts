import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

/**
 * Light haptic feedback for subtle interactions (e.g., button press)
 */
export async function hapticLight() {
    if (!Capacitor.isNativePlatform()) return
    try {
        await Haptics.impact({ style: ImpactStyle.Light })
    } catch (e) {
        console.log('Haptics not available')
    }
}

/**
 * Medium haptic feedback for confirmations (e.g., toggle switch)
 */
export async function hapticMedium() {
    if (!Capacitor.isNativePlatform()) return
    try {
        await Haptics.impact({ style: ImpactStyle.Medium })
    } catch (e) {
        console.log('Haptics not available')
    }
}

/**
 * Heavy haptic feedback for important actions (e.g., submit)
 */
export async function hapticHeavy() {
    if (!Capacitor.isNativePlatform()) return
    try {
        await Haptics.impact({ style: ImpactStyle.Heavy })
    } catch (e) {
        console.log('Haptics not available')
    }
}

/**
 * Success notification haptic
 */
export async function hapticSuccess() {
    if (!Capacitor.isNativePlatform()) return
    try {
        await Haptics.notification({ type: NotificationType.Success })
    } catch (e) {
        console.log('Haptics not available')
    }
}

/**
 * Error/Warning notification haptic
 */
export async function hapticError() {
    if (!Capacitor.isNativePlatform()) return
    try {
        await Haptics.notification({ type: NotificationType.Error })
    } catch (e) {
        console.log('Haptics not available')
    }
}
