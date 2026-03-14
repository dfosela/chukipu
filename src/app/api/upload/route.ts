import { NextRequest, NextResponse } from 'next/server';

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID!;
const BUCKET = process.env.R2_BUCKET_NAME!;
const API_TOKEN = process.env.R2_API_TOKEN!;
const PUBLIC_URL = process.env.R2_PUBLIC_URL!;

export async function POST(request: NextRequest) {
    try {
        const formData = await request.formData();
        const file = formData.get('file') as File | null;
        const folder = (formData.get('folder') as string) || 'uploads';

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const arrayBuffer = await file.arrayBuffer();
        const ext = file.name.split('.').pop() || 'bin';
        const customName = formData.get('fileName') as string | null;

        const safeFolder = folder.replace(/\/+$/, '');
        const safeCustomName = customName?.replace(/^\/+/, '');

        const key = safeCustomName
            ? `${safeFolder}/${safeCustomName}.${ext}`
            : `${safeFolder}/${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${ext}`;

        // Upload using Cloudflare API (not S3 endpoint)
        const res = await fetch(
            `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/r2/buckets/${BUCKET}/objects/${key}`,
            {
                method: 'PUT',
                headers: {
                    'Authorization': `Bearer ${API_TOKEN}`,
                    'Content-Type': file.type,
                },
                body: arrayBuffer,
            }
        );

        if (!res.ok) {
            const text = await res.text();
            console.error('R2 upload failed:', res.status, text);
            return NextResponse.json({ error: `R2 error: ${res.status}`, details: text }, { status: 500 });
        }

        const publicUrl = `${PUBLIC_URL.replace(/\/+$/, '')}/${key.replace(/^\/+/, '')}`;

        return NextResponse.json({ url: publicUrl, key });
    } catch (error: any) {
        console.error('Upload error:', error?.message);
        return NextResponse.json(
            { error: error?.message || 'Upload failed' },
            { status: 500 }
        );
    }
}
