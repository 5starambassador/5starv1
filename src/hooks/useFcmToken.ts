'use client'

import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { getMessaging, getToken, onMessage } from 'firebase/messaging'
import { registerDevice } from '@/app/notification-actions'
// import { initializeApp } from 'firebase/app' // We assume app is init elsewhere or we init here

// Firebase Config (Public safe) - User needs to fill this or we fetch from env
const firebaseConfig = {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
}

// Lazy init
const getFirebaseMessaging = async () => {
    const { initializeApp, getApps, getApp } = await import('firebase/app')
    const { getMessaging } = await import('firebase/messaging')

    let app;
    if (!getApps().length) {
        app = initializeApp(firebaseConfig)
    } else {
        app = getApp()
    }
    return getMessaging(app)
}

export function useFcmToken() {
    const [token, setToken] = useState<string | null>(null)
    const [permission, setPermission] = useState('default')

    useEffect(() => {
        async function init() {
            if (Capacitor.isNativePlatform()) {
                // NATIVE (Android/iOS)
                const permStatus = await PushNotifications.checkPermissions()

                let currentPerm = permStatus.receive
                if (permStatus.receive === 'prompt') {
                    const req = await PushNotifications.requestPermissions()
                    currentPerm = req.receive
                    setPermission(req.receive)
                } else {
                    setPermission(permStatus.receive)
                }

                if (currentPerm === 'granted') {
                    await PushNotifications.register()

                    PushNotifications.addListener('registration', async (t) => {
                        console.log('Push Registration Token:', t.value)
                        setToken(t.value)
                        await registerDevice(t.value, Capacitor.getPlatform().toUpperCase() as any)
                    })

                    PushNotifications.addListener('registrationError', (error) => {
                        console.error('Error on registration:', error)
                    })
                }
            } else {
                // WEB
                if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
                    try {
                        const messaging = await getFirebaseMessaging()
                        const permission = await Notification.requestPermission()
                        setPermission(permission)

                        if (permission === 'granted') {
                            const currentToken = await getToken(messaging, {
                                vapidKey: process.env.NEXT_PUBLIC_FIREBASE_VAPID_KEY
                            })

                            if (currentToken) {
                                console.log('Web FCM Token:', currentToken)
                                setToken(currentToken)
                                await registerDevice(currentToken, 'WEB')
                            }
                        }
                    } catch (e) {
                        console.log('FCM Web Init Error (likely missing config):', e)
                    }
                }
            }
        }

        init()
    }, [])

    return { token, permission }
}
