import { NextRequest, NextResponse } from 'next/server';
import { createSign } from 'crypto';

const PROJECT_ID = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!;
const DATABASE_URL = process.env.NEXT_PUBLIC_DATABASE_URL!;

async function getAccessToken(): Promise<string | null> {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT;
    if (!raw) return null;

    let sa: Record<string, string>;
    try {
        sa = JSON.parse(raw);
    } catch {
        return null;
    }

    const now = Math.floor(Date.now() / 1000);
    const header = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const claim = Buffer.from(JSON.stringify({
        iss: sa.client_email,
        scope: [
            'https://www.googleapis.com/auth/firebase.messaging',
            'https://www.googleapis.com/auth/firebase.database',
            'https://www.googleapis.com/auth/userinfo.email',
        ].join(' '),
        aud: 'https://oauth2.googleapis.com/token',
        iat: now,
        exp: now + 3600,
    })).toString('base64url');

    const input = `${header}.${claim}`;
    const sign = createSign('RSA-SHA256');
    sign.update(input);
    const sig = sign.sign(sa.private_key, 'base64url');
    const jwt = `${input}.${sig}`;

    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion: jwt,
        }),
    });

    if (!res.ok) return null;
    const data = await res.json() as { access_token: string };
    return data.access_token;
}

export async function POST(req: NextRequest) {
    try {
        const { toUid, title, body } = await req.json() as {
            toUid: string;
            title: string;
            body: string;
        };

        const accessToken = await getAccessToken();
        if (!accessToken) return NextResponse.json({ ok: true });

        // Read FCM tokens from Realtime Database via REST
        const dbRes = await fetch(
            `${DATABASE_URL}/users/${toUid}/fcmTokens.json`,
            { headers: { Authorization: `Bearer ${accessToken}` } }
        );

        if (!dbRes.ok) return NextResponse.json({ ok: true });
        const tokensObj = await dbRes.json() as Record<string, string> | null;
        if (!tokensObj) return NextResponse.json({ ok: true });

        const tokens = Object.entries(tokensObj);

        await Promise.all(tokens.map(async ([tokenKey, token]) => {
            const fcmRes = await fetch(
                `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${accessToken}`,
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        message: {
                            token,
                            notification: { title, body },
                            webpush: {
                                notification: {
                                    icon: '/logos/chukipuPWA_Android.png',
                                    badge: '/logos/chukipuPWA_Android.png',
                                    requireInteraction: false,
                                },
                                fcm_options: { link: '/application' },
                            },
                        },
                    }),
                }
            );

            // Remove stale / invalid tokens
            if (!fcmRes.ok) {
                const err = await fcmRes.json() as { error?: { status?: string } };
                const status = err?.error?.status;
                if (status === 'NOT_FOUND' || status === 'UNREGISTERED') {
                    await fetch(
                        `${DATABASE_URL}/users/${toUid}/fcmTokens/${tokenKey}.json`,
                        { method: 'DELETE', headers: { Authorization: `Bearer ${accessToken}` } }
                    );
                }
            }
        }));

        return NextResponse.json({ ok: true });
    } catch (err) {
        console.error('[push] Error:', err);
        return NextResponse.json({ ok: true });
    }
}
