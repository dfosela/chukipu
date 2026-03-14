'use client';

import { use, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import { firebaseGet, firebaseGetList } from '@/lib/firebaseMethods';
import { Chukipu, UserProfile } from '@/types/firestore';
import { sendNotification } from '@/lib/notifications';
import { useAuth } from '@/contexts/AuthContext';

export default function InvitarPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = use(params);
    const router = useRouter();
    const { user } = useAuth();
    const [chukipu, setChukipu] = useState<Chukipu | null>(null);
    const [copied, setCopied] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    // Search and Invite
    const [searchQuery, setSearchQuery] = useState('');
    const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
    const [sentInvites, setSentInvites] = useState<Set<string>>(new Set());

    useEffect(() => {
        firebaseGet<Chukipu>(`chukipus/${id}`).then(setChukipu);
        firebaseGetList<UserProfile>('users').then(setAllUsers);
    }, [id]);

    const inviteCode = chukipu?.inviteCode || '';
    const joinLink = typeof window !== 'undefined'
        ? `${window.location.origin}/chukipus/unirse?code=${inviteCode}`
        : '';

    const shareText = `Unete a mi Chukipu "${chukipu?.name || ''}"! Usa el codigo: ${inviteCode} o entra aqui: ${joinLink}`;

    const handleCopyCode = async () => {
        try {
            await navigator.clipboard.writeText(inviteCode);
        } catch {
            const input = document.createElement('input');
            input.value = inviteCode;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(joinLink);
        } catch {
            const input = document.createElement('input');
            input.value = joinLink;
            document.body.appendChild(input);
            input.select();
            document.execCommand('copy');
            document.body.removeChild(input);
        }
        setCopiedLink(true);
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const handleShareWhatsApp = () => {
        window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank');
    };

    const handleShareInstagram = () => {
        // Instagram doesn't have a direct share URL, so we copy the link and tell the user
        handleCopyLink();
    };

    const handleInviteUser = async (targetUser: UserProfile) => {
        if (!user || sentInvites.has(targetUser.id) || !chukipu) return;

        setSentInvites(prev => new Set(prev).add(targetUser.id));

        await sendNotification(targetUser.id, {
            type: 'invite',
            title: 'Invitación a Chukipu',
            body: `${user.displayName || 'Alguien'} te ha invitado a unirte al Chukipu "${chukipu.name}"`,
            relatedId: chukipu.id, // we can use this to show the code in the notification if needed
        });
    };

    const filteredUsers = allUsers.filter(u => {
        if (u.id === user?.uid) return false;
        if (chukipu?.members?.includes(u.id)) return false;
        if (!searchQuery.trim()) return false; // only show when searching

        const q = searchQuery.toLowerCase().replace(/^@/, '');
        return (
            (u.displayName?.toLowerCase().includes(q) || false) ||
            (u.username?.toLowerCase().includes(q) || false)
        );
    });

    if (!chukipu) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                            <polyline points="15 18 9 12 15 6" />
                        </svg>
                    </button>
                    <h1 className={styles.title}>Invitar</h1>
                    <div className={styles.spacer38} />
                </div>
                <div className={styles.content}>
                    <p className={styles.loadingText}>Cargando...</p>
                </div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 className={styles.title}>Invitar</h1>
                <div className={styles.spacer38} />
            </div>

            {/* Content */}
            <div className={styles.content}>
                {/* Icon */}
                <div className={styles.iconWrap}>
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <line x1="19" y1="8" x2="19" y2="14" />
                        <line x1="22" y1="11" x2="16" y2="11" />
                    </svg>
                </div>

                <h2 className={styles.subtitle}>Invita a tu Chukipu</h2>
                <p className={styles.hint}>Comparte este codigo para que se unan a <strong>{chukipu.name}</strong></p>

                {/* Code display */}
                <div className={styles.codeBox} onClick={handleCopyCode}>
                    <span className={styles.codeText}>{inviteCode}</span>
                    <button className={styles.copyCodeBtn}>
                        {copied ? (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        ) : (
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                <rect x="9" y="9" width="13" height="13" rx="2" />
                                <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                            </svg>
                        )}
                    </button>
                </div>
                {copied && <p className={styles.copiedMsg}>Codigo copiado</p>}

                {/* Divider */}
                <div className={styles.divider}>
                    <span>o comparte por</span>
                </div>

                {/* Share buttons */}
                <div className={styles.shareGrid}>
                    <button className={styles.shareBtn} onClick={handleShareWhatsApp}>
                        <div className={`${styles.shareBtnIcon} ${styles.whatsapp}`}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                            </svg>
                        </div>
                        <span>WhatsApp</span>
                    </button>

                    <button className={styles.shareBtn} onClick={handleShareInstagram}>
                        <div className={`${styles.shareBtnIcon} ${styles.instagram}`}>
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z" />
                            </svg>
                        </div>
                        <span>Instagram</span>
                    </button>

                    <button className={styles.shareBtn} onClick={handleCopyLink}>
                        <div className={`${styles.shareBtnIcon} ${styles.link}`}>
                            {copiedLink ? (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            ) : (
                                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
                                    <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
                                </svg>
                            )}
                        </div>
                        <span>{copiedLink ? 'Copiado' : 'Copiar enlace'}</span>
                    </button>
                </div>
                {/* Search & Invite internal users */}
                <div className={styles.searchSection}>
                    <div className={styles.searchHeader}>
                        <span>o invita a usuarios en la app</span>
                    </div>

                    <div className={styles.searchWrap}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className={styles.searchIcon}>
                            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
                        </svg>
                        <input
                            type="search"
                            className={styles.searchInput}
                            placeholder="Buscar por nombre o @usuario..."
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {searchQuery.trim() && (
                        <div className={`${styles.usersList} hide-scrollbar`}>
                            {filteredUsers.length === 0 ? (
                                <p className={styles.emptyUsers}>No se encontraron usuarios</p>
                            ) : (
                                filteredUsers.map(u => (
                                    <div key={u.id} className={styles.userCard}>
                                        {u.avatar ? (
                                            <img src={u.avatar} alt={u.displayName} className={styles.userCardAvatar} />
                                        ) : (
                                            <div className={styles.userCardAvatarPlaceholder}>
                                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#999" strokeWidth="1.5" strokeLinecap="round">
                                                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                                    <circle cx="12" cy="7" r="4" />
                                                </svg>
                                            </div>
                                        )}
                                        <div className={styles.userCardInfo}>
                                            <span className={styles.userCardName}>{u.displayName}</span>
                                            <span className={styles.userCardUsername}>@{u.username}</span>
                                        </div>
                                        <button
                                            className={`${styles.inviteBtn} ${sentInvites.has(u.id) ? styles.inviteBtnSent : ''}`}
                                            onClick={() => handleInviteUser(u)}
                                            disabled={sentInvites.has(u.id)}
                                        >
                                            {sentInvites.has(u.id) ? 'Enviado' : 'Invitar'}
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
