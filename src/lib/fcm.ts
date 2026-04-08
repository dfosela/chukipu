'use client';

import { getMessaging, getToken, isSupported } from 'firebase/messaging';
import { ref, set } from 'firebase/database';
import { app, db } from './firebase';

async function saveToken(uid: string): Promise<void> {
    const vapidKey = process.env.NEXT_PUBLIC_FCM_VAPID_KEY;
    if (!vapidKey) return;

    const swReg = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
    const messaging = getMessaging(app);
    const token = await getToken(messaging, { vapidKey, serviceWorkerRegistration: swReg });
    if (token) {
        const tokenKey = token.slice(-20);
        await set(ref(db, `users/${uid}/fcmTokens/${tokenKey}`), token);
    }
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

/**
 * Pide permiso al usuario y registra el token.
 * Llamar solo desde una acción explícita del usuario (botón en ajustes).
 */
export async function requestPushPermission(uid: string): Promise<'granted' | 'denied' | 'unsupported'> {
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
        return 'denied';
    }
}
