'use client';

import { useState, useRef } from 'react';
import styles from './page.module.css';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { firebaseUpdate, uploadFile } from '@/lib/firebaseMethods';

export default function EditarPerfilPage() {
    const { profile, user, refreshProfile } = useAuth();
    const router = useRouter();

    const [displayName, setDisplayName] = useState(profile?.displayName || '');
    const [username, setUsername] = useState(profile?.username || '');
    const [bio, setBio] = useState(profile?.bio || '');
    const [avatarPreview, setAvatarPreview] = useState(profile?.avatar || '');
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef<HTMLInputElement>(null);

    const fallbackAvatar = `https://api.dicebear.com/7.x/initials/svg?seed=${displayName || 'User'}`;

    const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setAvatarFile(file);
            setAvatarPreview(URL.createObjectURL(file));
        }
    };

    const handleSave = async () => {
        if (!user || saving) return;
        setError('');

        const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._]/g, '');
        if (cleanUsername.length < 3) {
            setError('El nombre de usuario debe tener al menos 3 caracteres');
            return;
        }
        if (!displayName.trim()) {
            setError('El nombre no puede estar vacío');
            return;
        }

        setSaving(true);
        try {
            const updates: Record<string, unknown> = {
                displayName: displayName.trim(),
                username: cleanUsername,
                bio: bio.trim(),
            };

            if (avatarFile) {
                updates.avatar = await uploadFile(avatarFile, 'avatars', `${user.uid}-${Date.now()}`);
            }

            await firebaseUpdate(`users/${user.uid}`, updates);
            await refreshProfile();
            router.back();
        } catch (err) {
            console.error('Error updating profile:', err);
            setError('Error al guardar los cambios');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className={styles.container}>
            <header className={styles.header}>
                <button className={styles.headerBtn} onClick={() => router.back()}>
                    Cancelar
                </button>
                <h1 className={styles.pageTitle}>Editar perfil</h1>
                <button
                    className={styles.saveBtn}
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? '...' : 'Hecho'}
                </button>
            </header>

            <div className={`page hide-scrollbar ${styles.pageContent}`}>
                {/* Avatar */}
                <div className={styles.avatarSection}>
                    <div className={styles.avatarWrap} onClick={() => fileInputRef.current?.click()}>
                        <img
                            src={avatarPreview || fallbackAvatar}
                            alt={displayName}
                            className={styles.avatarImg}
                        />
                        <div className={styles.avatarOverlay}>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round">
                                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"></path>
                                <circle cx="12" cy="13" r="4"></circle>
                            </svg>
                        </div>
                    </div>
                    <button
                        className={styles.changePhotoBtn}
                        onClick={() => fileInputRef.current?.click()}
                    >
                        Cambiar foto de perfil
                    </button>
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarChange}
                        className={styles.hidden}
                    />
                </div>

                {/* Fields */}
                <div className={styles.fieldsSection}>
                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Nombre</label>
                        <input
                            type="text"
                            className={styles.fieldInput}
                            value={displayName}
                            onChange={e => setDisplayName(e.target.value)}
                            placeholder="Tu nombre"
                            maxLength={50}
                        />
                    </div>

                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Nombre de usuario</label>
                        <div className={styles.usernameInputWrap}>
                            <span className={styles.usernameAt}>@</span>
                            <input
                                type="text"
                                className={styles.fieldInput}
                                value={username}
                                onChange={e => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9._]/g, ''))}
                                placeholder="tu_usuario"
                                maxLength={30}
                            />
                        </div>
                    </div>

                    <div className={styles.field}>
                        <label className={styles.fieldLabel}>Biografía</label>
                        <textarea
                            className={styles.fieldTextarea}
                            value={bio}
                            onChange={e => setBio(e.target.value)}
                            placeholder="Cuéntanos algo sobre ti..."
                            maxLength={150}
                            rows={3}
                        />
                        <span className={styles.charCount}>{bio.length}/150</span>
                    </div>
                </div>

                {error && <p className={styles.error}>{error}</p>}
            </div>
        </div>
    );
}
