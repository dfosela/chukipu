import { NextRequest, NextResponse } from 'next/server';

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const BUCKET = process.env.R2_BUCKET_NAME!;
const API_TOKEN = process.env.R2_API_TOKEN!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

/**
 * DELETE /api/delete
 * Body: { key: string }  — the R2 object key (e.g. "planMedia/abc123/xyz.jpg")
 * OR:   { url: string }  — full public URL; we derive the key from it
 */
export async function DELETE(request: NextRequest) {
    try {
        const body = await request.json();
        let key: string = body.key;

        // Derive key from URL if key not provided directly
        if (!key && body.url) {
            const base = PUBLIC_URL.replace(/\/+$/, '');
            key = body.url.replace(base + '/', '');
        }

        if (!key) {
            return NextResponse.json({ error: 'No key or url provided' }, { status: 400 });
        }

        const res = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${encodeURIComponent(key)}`,
            {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${API_TOKEN}` },
            }
        );

        if (!res.ok && res.status !== 404) {
            const text = await res.text();
            console.error('R2 delete failed:', res.status, text);
            return NextResponse.json({ error: `R2 error: ${res.status}` }, { status: 500 });
        }

        return NextResponse.json({ success: true, key });
    } catch (error: unknown) {
        const msg = error instanceof Error ? error.message : String(error);
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
