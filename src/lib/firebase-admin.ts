import 'server-only'

let firebaseAdmin: any = undefined

export async function getFirebaseAdmin() {
    if (firebaseAdmin) {
        return firebaseAdmin
    }

    const admin = await import('firebase-admin')

    if (!admin.apps.length) {
        try {
            // Option 1: Env Vars
            if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
                firebaseAdmin = admin.initializeApp({
                    credential: admin.credential.cert({
                        projectId: process.env.FIREBASE_PROJECT_ID,
                        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
                        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
                    }),
                })
            }
            // Option 2: Service Account File (Fallback)
            else {
                const serviceAccount: any = await import('../../service-account.json')
                firebaseAdmin = admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount.default || serviceAccount),
                })
            }
        } catch (error) {
            console.error('Firebase Admin Init Error:', error)
            // Return mock or null to prevent crash in dev if not set up
            return null
        }
    } else {
        firebaseAdmin = admin.app()
    }

    return firebaseAdmin
}
