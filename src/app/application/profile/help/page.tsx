'use client';

import styles from './page.module.css';

export default function AyudaPage() {
    const faqs = [
        { q: '¿Cómo creo un nuevo Chukipu?', a: 'Desde la pantalla principal, presiona el botón "+" en la parte inferior para comenzar a crear tu Chukipu. Podrás invitar amigos, añadir planes y subir una foto de portada.' },
        { q: '¿Es mi cuenta privada?', a: 'Puedes configurar la privacidad de tu cuenta en la sección "Privacidad" del perfil. Allí podrás elegir quién puede buscarte y si tus planes públicos aparecen en la sección Explorar.' },
        { q: '¿Puedo recuperar un plan borrado?', a: 'Actualmente, los planes eliminados no se pueden recuperar. Asegúrate de confirmar antes de borrar un evento importante o prueba archivarlo.' }
    ];

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.headerBtn} onClick={() => window.history.back()} aria-label="Atrás">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="19" y1="12" x2="5" y2="12"></line>
                        <polyline points="12 19 5 12 12 5"></polyline>
                    </svg>
                </button>
                <h1 className={styles.pageTitle}>Ayuda y soporte</h1>
                <div className={styles.spacer40} />
            </header>

            <div className={`page hide-scrollbar ${styles.pageContent}`}>
                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>PREGUNTAS FRECUENTES</h3>

                    <div className={styles.faqList}>
                        {faqs.map((faq, i) => (
                            <details key={i} className={styles.faqItem}>
                                <summary className={styles.faqQuestion}>
                                    <span>{faq.q}</span>
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={styles.faqIcon}>
                                        <polyline points="6 9 12 15 18 9"></polyline>
                                    </svg>
                                </summary>
                                <p className={styles.faqAnswer}>
                                    {faq.a}
                                </p>
                            </details>
                        ))}
                    </div>
                </div>

                <div className={styles.section}>
                    <h3 className={styles.sectionTitle}>CONTACTO</h3>

                    <div className={styles.contactCard}>
                        <div className={styles.contactIconWrap}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"></path>
                            </svg>
                        </div>
                        <h4 className={styles.contactTitle}>¿Necesitas más ayuda?</h4>
                        <p className={styles.contactText}>
                            Nuestro equipo está disponible 24/7 para responder a tus dudas.
                        </p>
                        <a href="mailto:soporte@chukipu.app" className={styles.contactBtn}>
                            Contactar con soporte
                        </a>
                    </div>
                </div>
            </div>
        </div>
    );
}
