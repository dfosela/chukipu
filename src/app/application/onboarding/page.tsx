'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { auth } from '@/lib/firebase';
import { firebaseSet, firebaseGetList } from '@/lib/firebaseMethods';
import { UserProfile } from '@/types/firestore';
import styles from './page.module.css';

const USERNAME_RE = /^[a-z0-9_.]{3,20}$/;

export default function OnboardingPage() {
    const router = useRouter();
    const [displayName, setDisplayName] = useState('');
    const [username, setUsername] = useState('');
    const [bio, setBio] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [usernameError, setUsernameError] = useState('');
    const [focusedField, setFocusedField] = useState<string | null>(null);

    useEffect(() => {
        const user = auth.currentUser;
        if (user?.displayName) setDisplayName(user.displayName);
    }, []);

    const validateUsername = (value: string) => {
        if (!value) return 'El usuario es obligatorio';
        if (!USERNAME_RE.test(value)) return 'Solo letras minúsculas, números, _ y . (3-20 caracteres)';
        return '';
    };

    const handleUsernameChange = (value: string) => {
        setUsername(value.toLowerCase());
        setUsernameError(validateUsername(value.toLowerCase()));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const user = auth.currentUser;
        if (!user) return;

        const uErr = validateUsername(username);
        if (uErr) { setUsernameError(uErr); return; }
        if (!displayName.trim()) { setError('El nombre es obligatorio'); return; }

        setIsLoading(true);
        setError('');

        try {
            const allUsers = await firebaseGetList<UserProfile>('users', u => u.username === username);
            if (allUsers.length > 0) {
                setUsernameError('Este usuario ya está en uso');
                return;
            }

            await firebaseSet(`users/${user.uid}`, {
                displayName: displayName.trim(),
                username,
                bio: bio.trim(),
                avatar: user.photoURL || '',
                savedChukipus: [],
                followers: [],
                following: [],
                followersCount: 0,
                followingCount: 0,
                chukipusCount: 0,
                plansCreated: 0,
                plansCompleted: 0,
            });

            router.replace('/application');
        } catch (err: unknown) {
            setError((err as Error).message || 'Error al guardar el perfil');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            <div className={styles.bgOrb1} />
            <div className={styles.bgOrb2} />

            <div className={styles.content}>
                <div className={styles.logoArea}>
                    <div className={styles.logoIcon}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    </div>
                    <h1 className={styles.logo}>Chukipu</h1>
                    <p className={styles.tagline}>Cuéntanos un poco sobre ti</p>
                </div>

                <div className={styles.formCard}>
                    <h2 className={styles.formTitle}>Completa tu perfil</h2>
                    <p className={styles.formSubtitle}>Solo un momento antes de empezar</p>

                    {error && <p className={styles.errorText}>{error}</p>}

                    <form className={styles.form} onSubmit={handleSubmit}>
                        {/* Name */}
                        <div>
                            <div className={`${styles.inputGroup} ${focusedField === 'name' ? styles.focused : ''}`}>
                                <div className={styles.inputIcon}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                                        <circle cx="12" cy="7" r="4" />
                                    </svg>
                                </div>
                                <input
                                    type="text"
                                    placeholder="Tu nombre"
                                    value={displayName}
                                    onChange={e => setDisplayName(e.target.value)}
                                    onFocus={() => setFocusedField('name')}
                                    onBlur={() => setFocusedField(null)}
                                    className={styles.input}
                                    required
                                />
                            </div>
                        </div>

                        {/* Username */}
                        <div>
                            <div className={`${styles.inputGroup} ${focusedField === 'username' ? styles.focused : ''} ${usernameError ? styles.inputError : ''}`}>
                                <div className={styles.inputIcon}>
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                        <circle cx="12" cy="8" r="4" />
                                        <path d="M20 21a8 8 0 1 0-16 0" />
                                    </svg>
                                </div>
                                <span className={styles.atSign}>@</span>
                                <input
                                    type="text"
                                    placeholder="tu_usuario"
                                    value={username}
                                    onChange={e => handleUsernameChange(e.target.value)}
                                    onFocus={() => setFocusedField('username')}
                                    onBlur={() => setFocusedField(null)}
                                    className={styles.input}
                                    required
                                    autoCapitalize="none"
                                    autoCorrect="off"
                                />
                            </div>
                            {usernameError && <p className={styles.fieldError}>{usernameError}</p>}
                        </div>

                        {/* Bio (optional) */}
                        <div className={`${styles.textareaGroup} ${focusedField === 'bio' ? styles.focused : ''}`}>
                            <textarea
                                placeholder="Descripción (opcional)"
                                value={bio}
                                onChange={e => setBio(e.target.value)}
                                onFocus={() => setFocusedField('bio')}
                                onBlur={() => setFocusedField(null)}
                                className={styles.textarea}
                                rows={3}
                                maxLength={150}
                            />
                        </div>

                        <button
                            type="submit"
                            className={`${styles.submitBtn} ${isLoading ? styles.loading : ''}`}
                            disabled={isLoading || !!usernameError}
                        >
                            {isLoading ? <span className={styles.spinner} /> : 'Empezar'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
