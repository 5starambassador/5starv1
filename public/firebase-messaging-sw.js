importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
firebase.initializeApp({
    apiKey: "YOUR_API_KEY", // Will be replaced by MobileConfig logic or env if needed, but SW needs hardcoded or params
    authDomain: "achariya-ambassador.firebaseapp.com",
    projectId: "achariya-ambassador",
    storageBucket: "achariya-ambassador.appspot.com",
    messagingSenderId: "YOUR_SENDER_ID",
    appId: "YOUR_APP_ID"
});

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification.title;
    const notificationOptions = {
        body: payload.notification.body,
        icon: '/icons/icon-192x192.png', // Ensure this exists
        badge: '/icons/badge-72x72.png',
        data: payload.data
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});
