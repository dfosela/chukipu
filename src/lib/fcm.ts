'use client';

import { getMessaging, getToken, isSupported, onMessage } from 'firebase/messaging';
import { ref, set } from 'firebase/database';
import { app, db } from './firebase';

async function saveToken(uid: string): Promise<void> {
    const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
    if (!vapidKey) return;

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
    if (!token) throw new Error('getToken() returned empty — check VAPID key');
    const tokenKey = token.slice(-20);
    await set(ref(db, `users/${uid}/fcmTokens/${tokenKey}`), token);
}

/**
 * Si el permiso ya está concedido, registra el token silenciosamente.
 * Llamar en cada login — nunca muestra popup.
 */
export async function registerPushTokenIfGranted(uid: string): Promise<void> {
    if (typeof window === 'undefined') return;
    try {
        const supported = await isSupported();
        if (!supported || Notification.permission !== 'granted') return;
        await saveToken(uid);
    } catch (err) {
        console.error('[FCM] Error registering push token:', err);
    }
}

let onMessageInitialized = false;

/**
 * Sets up onMessage listener for foreground notifications.
 * Call once after login when permission is granted.
 * Guarded to prevent duplicate listeners from multiple onAuthStateChanged fires.
 */
export function setupOnMessage(): void {
    if (typeof window === 'undefined' || onMessageInitialized) return;
    onMessageInitialized = true;

    isSupported().then((supported) => {
        if (!supported || Notification.permission !== 'granted') return;

        const messaging = getMessaging(app);
        onMessage(messaging, (payload) => {
            const title = payload.notification?.title || 'Chukipu';
            const body = payload.notification?.body || '';
            new Notification(title, {
                body,
                icon: '/logos/chukipuPWA_Android.png',
            });
        });
    }).catch((err) => console.error('[FCM] onMessage setup failed:', err));
}

/**
 * Pide permiso al usuario y registra el token.
 * Llamar solo desde una acción explícita del usuario (botón en ajustes).
 */
export async function requestPushPermission(uid: string): Promise<string> {
    if (typeof window === 'undefined') return 'unsupported';
    try {
        const supported = await isSupported();
        if (!supported) return 'unsupported';

        const permission = await Notification.requestPermission();
        if (permission !== 'granted') return 'denied';

        await saveToken(uid);
        return 'granted';
    } catch (err) {
        console.error('[FCM] Error requesting push permission:', err);
        return String(err);
    }
}
