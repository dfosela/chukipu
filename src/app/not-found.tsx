import Link from 'next/link';

export default function NotFound() {
    return (
        <html lang="es">
            <body style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '100vh',
                fontFamily: 'sans-serif',
                backgroundColor: '#13101A',
                color: '#ffffff',
                margin: 0,
                gap: '16px',
            }}>
                <h1 style={{ fontSize: '48px', margin: 0 }}>404</h1>
                <p style={{ color: '#94a3b8', margin: 0 }}>Esta página no existe</p>
                <Link href="/landing" style={{
                    marginTop: '8px',
                    padding: '10px 24px',
                    backgroundColor: '#e8749a',
                    color: '#ffffff',
                    borderRadius: '999px',
                    textDecoration: 'none',
                    fontSize: '14px',
                }}>
                    Ir a Chukipu
                </Link>
            </body>
        </html>
    );
}
