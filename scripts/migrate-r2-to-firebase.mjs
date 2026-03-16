#!/usr/bin/env node
/**
 * Migración de imágenes: Cloudflare R2 → Firebase Storage
 *
 * PREREQUISITOS:
 *   Descarga el service account JSON desde:
 *   Firebase Console → Project Settings → Service accounts
 *   → "Generate new private key" → guárdalo como service-account.json en la raíz
 *
 * USO:
 *   node scripts/migrate-r2-to-firebase.mjs
 *   node scripts/migrate-r2-to-firebase.mjs --dry-run
 *   node scripts/migrate-r2-to-firebase.mjs --service-account=./otra-ruta.json
 *
 * Sin dependencias adicionales — solo fetch nativo (Node 18+) y crypto built-in.
 */

import { readFileSync } from 'fs';
import { createPrivateKey, createSign } from 'crypto';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

// ── Argumentos ────────────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const saArg = args.find(a => a.startsWith('--service-account='));
const SERVICE_ACCOUNT_PATH = saArg
    ? saArg.replace('--service-account=', '')
    : resolve(ROOT, 'service-account.json');

// ── Cargar .env ───────────────────────────────────────────────────────────────

function loadEnv() {
    const env = {};
    try {
        const content = readFileSync(resolve(ROOT, '.env'), 'utf8');
        for (const line of content.split(/\r?\n/)) {
            const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
            if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '').trim();
        }
    } catch {
        console.error('⚠️  No se pudo leer .env, usando variables de entorno del sistema.');
    }
    return { ...process.env, ...env };
}

const env = loadEnv();

const R2_ACCOUNT_ID    = env.R2_ACCOUNT_ID;
const R2_API_TOKEN     = env.R2_API_TOKEN;
const R2_BUCKET_NAME   = env.R2_BUCKET_NAME;
const R2_PUBLIC_URL    = env.R2_PUBLIC_URL?.replace(/\/+$/, '');
const STORAGE_BUCKET   = env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET;
const DATABASE_URL     = env.NEXT_PUBLIC_DATABASE_URL?.replace(/\/+$/, '');

// ── Validar config ────────────────────────────────────────────────────────────

const missing = ['R2_PUBLIC_URL',
    'NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET','NEXT_PUBLIC_DATABASE_URL']
    .filter(k => !env[k]);
if (missing.length) {
    console.error(`\n❌  Faltan variables de entorno: ${missing.join(', ')}\n`);
    process.exit(1);
}

// ── Cargar service account ────────────────────────────────────────────────────

let serviceAccount;
try {
    serviceAccount = JSON.parse(readFileSync(SERVICE_ACCOUNT_PATH, 'utf8'));
} catch {
    console.error(`\n❌  No se encontró el service account en: ${SERVICE_ACCOUNT_PATH}`);
    console.error('    Descárgalo desde Firebase Console → Project Settings → Service accounts\n');
    process.exit(1);
}

// ── Google OAuth2 con JWT del service account ─────────────────────────────────

function buildJWT() {
    const header  = Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })).toString('base64url');
    const now     = Math.floor(Date.now() / 1000);
    const payload = Buffer.from(JSON.stringify({
        iss:   serviceAccount.client_email,
        sub:   serviceAccount.client_email,
        aud:   'https://oauth2.googleapis.com/token',
        iat:   now,
        exp:   now + 3600,
        scope: [
            'https://www.googleapis.com/auth/firebase',
            'https://www.googleapis.com/auth/firebase.database',
            'https://www.googleapis.com/auth/devstorage.read_write',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/cloud-platform',
        ].join(' '),
    })).toString('base64url');

    const sigInput = `${header}.${payload}`;
    const sign = createSign('RSA-SHA256');
    sign.update(sigInput);
    const sig = sign.sign(createPrivateKey(serviceAccount.private_key), 'base64url');
    return `${sigInput}.${sig}`;
}

async function getAccessToken() {
    const res = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
            grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            assertion:  buildJWT(),
        }),
    });
    const data = await res.json();
    if (!data.access_token) throw new Error(`OAuth error: ${JSON.stringify(data)}`);
    return data.access_token;
}

// (R2 listing eliminado — trabajamos directamente desde las URLs de la DB)

// ── R2: descargar archivo por URL pública ─────────────────────────────────────

async function downloadFromR2(key) {
    const url = `${R2_PUBLIC_URL}/${key}`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status} al descargar ${url}`);
    const buffer = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get('content-type') || 'application/octet-stream';
    return { buffer, contentType };
}

// ── Firebase Storage: subir archivo (REST API) ────────────────────────────────

async function uploadToFirebase(key, buffer, contentType, accessToken) {
    const encodedName = encodeURIComponent(key);
    const url = `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o?name=${encodedName}&uploadType=media`;

    const res = await fetch(url, {
        method:  'POST',
        headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type':  contentType,
        },
        body: buffer,
    });

    if (!res.ok) {
        const txt = await res.text();
        throw new Error(`Storage upload failed (${res.status}): ${txt}`);
    }

    const meta = await res.json();
    const token = meta.downloadTokens;
    const encodedPath = key.split('/').map(encodeURIComponent).join('%2F');
    return `https://firebasestorage.googleapis.com/v0/b/${STORAGE_BUCKET}/o/${encodedPath}?alt=media&token=${token}`;
}

// ── Firebase Realtime Database: REST API ──────────────────────────────────────

async function dbGet(path, accessToken) {
    const res = await fetch(`${DATABASE_URL}/${path}.json?access_token=${accessToken}`);
    if (!res.ok) throw new Error(`DB GET ${path} failed (${res.status})`);
    return res.json();
}

async function dbPatch(path, data, accessToken) {
    const res = await fetch(`${DATABASE_URL}/${path}.json?access_token=${accessToken}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(data),
    });
    if (!res.ok) throw new Error(`DB PATCH ${path} failed (${res.status})`);
}

// ── Helpers URL ───────────────────────────────────────────────────────────────

function isR2Url(url) {
    return typeof url === 'string' && url.startsWith(R2_PUBLIC_URL);
}

function r2UrlToKey(url) {
    return decodeURIComponent(url.replace(R2_PUBLIC_URL + '/', ''));
}

// ── Recopilar todas las URLs de R2 en la DB ───────────────────────────────────

async function collectR2UrlsFromDB(accessToken) {
    const entries = [];

    const [users, chukipus, plans, planMedia] = await Promise.all([
        dbGet('users', accessToken),
        dbGet('chukipus', accessToken),
        dbGet('plans', accessToken),
        dbGet('planMedia', accessToken),
    ]);

    for (const [uid, user] of Object.entries(users ?? {})) {
        if (isR2Url(user?.avatar))
            entries.push({ dbPath: `users/${uid}`, field: 'avatar', key: r2UrlToKey(user.avatar) });
    }
    for (const [id, c] of Object.entries(chukipus ?? {})) {
        if (isR2Url(c?.image))
            entries.push({ dbPath: `chukipus/${id}`, field: 'image', key: r2UrlToKey(c.image) });
    }
    for (const [id, p] of Object.entries(plans ?? {})) {
        if (isR2Url(p?.image))
            entries.push({ dbPath: `plans/${id}`, field: 'image', key: r2UrlToKey(p.image) });
    }
    for (const [planId, mediaMap] of Object.entries(planMedia ?? {})) {
        for (const [mediaId, media] of Object.entries(mediaMap ?? {})) {
            if (isR2Url(media?.url))
                entries.push({ dbPath: `planMedia/${planId}/${mediaId}`, field: 'url', key: r2UrlToKey(media.url) });
        }
    }

    return entries;
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
    console.log(`\n🚀  Migración R2 → Firebase Storage${DRY_RUN ? ' [DRY RUN]' : ''}\n`);

    console.log('🔑  Obteniendo token de acceso...');
    const accessToken = await getAccessToken();
    console.log('    ✓ Token OK\n');

    console.log('🗄️   Escaneando Firebase Realtime Database...');
    const dbEntries = await collectR2UrlsFromDB(accessToken);
    console.log(`    ✓ ${dbEntries.length} referencias a R2 encontradas\n`);

    if (dbEntries.length === 0) {
        console.log('✅  Nada que migrar — no hay URLs de R2 en la DB.\n');
        return;
    }

    console.log('📋  Archivos a migrar:');
    dbEntries.forEach(e => console.log(`    ${e.key}  →  ${e.dbPath}.${e.field}`));
    console.log();

    if (DRY_RUN) {
        console.log('✅  Dry run completado. Ejecuta sin --dry-run para aplicar.\n');
        return;
    }

    // Subir cada archivo referenciado en DB directamente desde la URL pública de R2
    const keyToNewUrl = new Map();
    let uploadOk = 0, uploadFail = 0;

    for (const entry of dbEntries) {
        if (keyToNewUrl.has(entry.key)) continue; // ya subido (misma imagen en varios registros)
        process.stdout.write(`  ⬆️  ${entry.key} ... `);
        try {
            const { buffer, contentType } = await downloadFromR2(entry.key);
            const newUrl = await uploadToFirebase(entry.key, buffer, contentType, accessToken);
            keyToNewUrl.set(entry.key, newUrl);
            process.stdout.write('✓\n');
            uploadOk++;
        } catch (err) {
            process.stdout.write(`✗ ${err.message}\n`);
            uploadFail++;
        }
    }

    console.log(`\n    Subidos: ${uploadOk}  |  Errores: ${uploadFail}\n`);

    // Actualizar URLs en la DB
    let dbOk = 0, dbFail = 0;
    console.log('🗄️   Actualizando DB...');

    for (const entry of dbEntries) {
        const newUrl = keyToNewUrl.get(entry.key);
        if (!newUrl) {
            console.log(`  ⚠️  ${entry.key} no se subió — registro omitido`);
            continue;
        }
        try {
            await dbPatch(entry.dbPath, { [entry.field]: newUrl }, accessToken);
            dbOk++;
        } catch (err) {
            console.log(`  ✗  ${entry.dbPath}.${entry.field}: ${err.message}`);
            dbFail++;
        }
    }

    // Resumen
    console.log('\n═══════════════════════════════════════════');
    console.log(`✅  Migración completada`);
    console.log(`   Archivos subidos a Firebase Storage : ${uploadOk}${uploadFail ? `  (⚠️ ${uploadFail} errores)` : ''}`);
    console.log(`   Registros DB actualizados           : ${dbOk}${dbFail ? `  (⚠️ ${dbFail} errores)` : ''}`);
    console.log(`\n   ℹ️  Los archivos en R2 no se han borrado.`);
    console.log(`      Verifica que las imágenes cargan en la app y luego vacía el bucket desde Cloudflare.\n`);
}

main().catch(err => {
    console.error('\n❌  Error inesperado:', err.message);
    process.exit(1);
});
