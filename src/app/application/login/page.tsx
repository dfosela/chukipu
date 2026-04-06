'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import styles from './page.module.css';
import ThemeToggle from '@/components/ThemeToggle/ThemeToggle';
import { registerWithEmail, loginWithEmail, loginWithGoogle, loginWithApple, resetPassword } from '@/lib/auth';

export default function LoginPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [displayName, setDisplayName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPass, setShowPass] = useState(false);
    const [focusedField, setFocusedField] = useState<string | null>(null);
    const [isRegister, setIsRegister] = useState(false);
    const [error, setError] = useState('');
    const [forgotStatus, setForgotStatus] = useState<'idle' | 'sent' | 'error'>('idle');

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        try {
            if (isRegister) {
                await registerWithEmail(email, password, displayName);
            } else {
                await loginWithEmail(email, password);
            }
            router.push('/application');
        } catch (err: unknown) {
            setError((err as Error).message || 'Error al iniciar sesión');
        } finally {
            setIsLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        if (!email) {
            setError('Introduce tu email para recuperar la contraseña');
            return;
        }
        setIsLoading(true);
        setError('');
        setForgotStatus('idle');
        try {
            await resetPassword(email);
            setForgotStatus('sent');
        } catch (err: unknown) {
            setError((err as Error).message || 'Error al enviar el email');
            setForgotStatus('error');
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogle = async () => {
        setIsLoading(true);
        setError('');
        try {
            await loginWithGoogle();
            router.push('/application');
        } catch (err: unknown) {
            setError((err as Error).message || 'Error con Google');
        } finally {
            setIsLoading(false);
        }
    };

    const handleApple = async () => {
        setIsLoading(true);
        setError('');
        try {
            await loginWithApple();
            router.push('/application');
        } catch (err: unknown) {
            setError((err as Error).message || 'Error con Apple');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.container}>
            {/* Background decorations */}
            <div className={styles.bgOrb1} />
            <div className={styles.bgOrb2} />
            <div className={styles.bgOrb3} />

            {/* Theme toggle */}
            <div className={styles.themeBtn}>
                <ThemeToggle />
            </div>

            {/* Main content */}
            <div className={styles.content}>
                {/* Logo */}
                <div className={styles.logoArea}>
                    <div className={styles.logoIcon}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1.8" strokeLinecap="round">
                            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                        </svg>
                    </div>
                    <h1 className={styles.logo}>Chukipu</h1>
                    <p className={styles.tagline}>Tus momentos, vuestros recuerdos</p>
                </div>

                {/* Glass form card */}
                <div className={styles.formCard}>
                    <h2 className={styles.formTitle}>{isRegister ? 'Crea tu cuenta' : 'Bienvenida de nuevo'}</h2>
                    <p className={styles.formSubtitle}>{isRegister ? 'Regístrate para empezar' : 'Inicia sesión para continuar'}</p>

                    {error && <p className={styles.errorText}>{error}</p>}

                    <form className={styles.form} onSubmit={handleSubmit}>
                        {/* Name (only register) */}
                        {isRegister && (
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
                                    onChange={(e) => setDisplayName(e.target.value)}
                                    onFocus={() => setFocusedField('name')}
                                    onBlur={() => setFocusedField(null)}
                                    className={styles.input}
                                    required
                                />
                            </div>
                        )}

                        {/* Email */}
                        <div className={`${styles.inputGroup} ${focusedField === 'email' ? styles.focused : ''}`}>
                            <div className={styles.inputIcon}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                                    <polyline points="22,6 12,13 2,6" />
                                </svg>
                            </div>
                            <input
                                type="email"
                                placeholder="tu@email.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                onFocus={() => setFocusedField('email')}
                                onBlur={() => setFocusedField(null)}
                                className={styles.input}
                                required
                                autoComplete="email"
                            />
                        </div>

                        {/* Password */}
                        <div className={`${styles.inputGroup} ${focusedField === 'password' ? styles.focused : ''}`}>
                            <div className={styles.inputIcon}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                                </svg>
                            </div>
                            <input
                                type={showPass ? 'text' : 'password'}
                                placeholder="Contraseña"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onFocus={() => setFocusedField('password')}
                                onBlur={() => setFocusedField(null)}
                                className={styles.input}
                                required
                                autoComplete={isRegister ? 'new-password' : 'current-password'}
                            />
                            <button
                                type="button"
                                className={styles.showPassBtn}
                                onClick={() => setShowPass(!showPass)}
                                aria-label="Mostrar contraseña"
                            >
                                {showPass ? (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                                ) : (
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                )}
                            </button>
                        </div>

                        {!isRegister && (
                            <div>
                                <button
                                    type="button"
                                    className={styles.forgotBtn}
                                    onClick={handleForgotPassword}
                                    disabled={isLoading}
                                >
                                    ¿Olvidaste tu contraseña?
                                </button>
                                {forgotStatus === 'sent' && (
                                    <p className={styles.forgotSuccess}>Email enviado a {email}</p>
                                )}
                            </div>
                        )}

                        <button
                            type="submit"
                            className={`${styles.submitBtn} ${isLoading ? styles.loading : ''}`}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <span className={styles.spinner} />
                            ) : (
                                isRegister ? 'Crear cuenta' : 'Iniciar sesión'
                            )}
                        </button>
                    </form>

                    <div className={styles.divider}>
                        <span className={styles.dividerLine} />
                        <span className={styles.dividerText}>o continúa con</span>
                        <span className={styles.dividerLine} />
                    </div>

                    <div className={styles.socialRow}>
                        <button className={styles.socialBtn} aria-label="Google" onClick={handleGoogle} disabled={isLoading}>
                            <svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" /><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" /><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" /><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" /></svg>
                            <span>Google</span>
                        </button>
                        <button className={styles.socialBtn} aria-label="Apple" onClick={handleApple} disabled={isLoading}>
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12.152 6.896c-.948 0-2.415-1.078-3.96-1.04-2.04.027-3.91 1.183-4.961 3.014-2.117 3.675-.546 9.103 1.519 12.09 1.013 1.454 2.208 3.09 3.792 3.039 1.52-.065 2.09-.987 3.935-.987 1.831 0 2.35.987 3.96.948 1.637-.026 2.676-1.48 3.676-2.948 1.156-1.688 1.636-3.325 1.662-3.415-.039-.013-3.182-1.221-3.22-4.857-.026-3.04 2.48-4.494 2.597-4.559-1.429-2.09-3.623-2.324-4.39-2.376-2-.156-3.675 1.09-4.61 1.09zM15.53 3.83c.843-1.012 1.4-2.427 1.245-3.83-1.207.052-2.662.805-3.532 1.818-.78.896-1.454 2.338-1.273 3.714 1.338.104 2.715-.688 3.559-1.701" /></svg>
                            <span>Apple</span>
                        </button>
                    </div>

                    <p className={styles.registerPrompt}>
                        {isRegister ? '¿Ya tienes cuenta? ' : '¿Primera vez aquí? '}
                        <button className={styles.registerLink} onClick={() => { setIsRegister(!isRegister); setError(''); }}>
                            {isRegister ? 'Inicia sesión' : 'Crea una cuenta'}
                        </button>
                    </p>
                </div>
            </div>
        </div>
    );
}
