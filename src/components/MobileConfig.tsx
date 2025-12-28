'use client'

import { useEffect } from 'react'
import { StatusBar, Style } from '@capacitor/status-bar'
import { Capacitor } from '@capacitor/core'
import { App, URLOpenListenerEvent } from '@capacitor/app'
// import { PushNotifications } from '@capacitor/push-notifications'
import { useRouter } from 'next/navigation'

export function MobileConfig() {
    const router = useRouter()

    useEffect(() => {
        const configureMobile = async () => {
            if (!Capacitor.isNativePlatform()) return

            try {
                // 1. Status Bar
                await StatusBar.setBackgroundColor({ color: '#DC2626' })
                await StatusBar.setStyle({ style: Style.Dark })

                // 2. Push Notifications (Disabled until google-services.json is available)
                // const permStatus = await PushNotifications.checkPermissions()
                // if (permStatus.receive === 'prompt') {
                //     await PushNotifications.requestPermissions()
                // }
                // if (permStatus.receive !== 'denied') {
                //     await PushNotifications.register()
                // }

                // PushNotifications.addListener('registration', token => {
                //     console.log('Push Registration Token:', token.value)
                // })

                // PushNotifications.addListener('pushNotificationReceived', notification => {
                //     console.log('Notification received:', notification)
                // })

                // 3. Deep Linking
                App.addListener('appUrlOpen', (event: URLOpenListenerEvent) => {
                    // Example URL: achariya://ambassador/refer or https://ambassador.achariya.in/refer
                    const slug = event.url.split('.in').pop() || event.url.split('://').pop()
                    if (slug) {
                        // Navigate to the path
                        router.push(slug.startsWith('/') ? slug : `/${slug}`)
                    }
                })

            } catch (e) {
                console.error('Error configuring mobile features', e)
            }
        }

        configureMobile()
    }, [router])

    return null
}
