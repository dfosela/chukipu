import { ref, push, set } from 'firebase/database';
import { db } from './firebase';

export type NotificationType =
    | 'follow'          // Alguien te sigue
    | 'follow_request'  // Solicitud de seguimiento (perfil privado)
    | 'invite'          // Alguien te invita a un Chukipu
    | 'join'            // Alguien se une a tu Chukipu
    | 'plan'            // Se añade un plan nuevo a un Chukipu tuyo
    | 'system';         // Aviso del sistema

export interface NotificationPayload {
    title: string;
    body: string;
    type: NotificationType;
    relatedId?: string;
}

/**
 * Writes a notification entry to users/{toUid}/notifications/{newId}.
 * Fire-and-forget safe: errors are logged but not thrown.
 */
export async function sendNotification(
    toUid: string,
    payload: NotificationPayload
): Promise<void> {
    try {
        const notifRef = push(ref(db, `users/${toUid}/notifications`));
        await set(notifRef, {
            id: notifRef.key,
            title: payload.title,
            body: payload.body,
            type: payload.type,
            relatedId: payload.relatedId ?? '',
            read: false,
            createdAt: Date.now(),
        });
    } catch (err) {
        console.error('[sendNotification] Error writing notification:', err);
    }
}
