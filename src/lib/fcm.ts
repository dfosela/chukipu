'use client';

import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { ref, set } from 'firebase/database';
import { app, db } from './firebase';

export async function registerPushToken(uid: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const supported = await isSupported();
        if (!supported) return;

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return;

        const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
        if (!vapidKey) return;

        const messaging = getMessaging(app);
        const token = await getToken(messaging, { vapidKey });
        if (token) {
            const tokenKey = token.slice(-20);
            await set(ref(db, `users/${uid}/fcmTokens/${tokenKey}`), token);
        }
    } catch (err) {
        console.error('[FCM] Error registering push token:', err);
    }
}
