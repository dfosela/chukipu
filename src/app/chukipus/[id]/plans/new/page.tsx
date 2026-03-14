'use client';

import { useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { firebaseGet, firebaseBatchUpdate, firebasePushId } from '@/lib/firebaseMethods';
import { useAuth } from '@/contexts/AuthContext';
import { sendNotification } from '@/lib/notifications';
import { Chukipu } from '@/types/firestore';

const CATEGORY_CONFIG: Record<string, {
    label: string;
    titleLabel: string;
    titlePlaceholder: string;
    category: string;
    genres?: string[];
    showDuration?: boolean;
    showLocation?: boolean;
    durationPlaceholder?: string;
    locationPlaceholder?: string;
}> = {
    peliculas: {
        label: 'Nueva Película',
        titleLabel: 'Título de la película',
        titlePlaceholder: 'Ej: Interstellar',
        category: 'Película',
        genres: ['Acción', 'Comedia', 'Drama', 'Terror', 'Ciencia ficción', 'Romance', 'Animación', 'Thriller', 'Documental', 'Fantasía', 'Musical', 'Aventura'],
        showDuration: true,
        showLocation: true,
        durationPlaceholder: 'Ej: 2h 15min',
        locationPlaceholder: 'Ej: Cine, Casa, Netflix...',
    },
    viajes: {
        label: 'Nuevo Viaje',
        titleLabel: 'Destino',
        titlePlaceholder: 'Ej: París, Japón...',
        category: 'Viaje',
        showDuration: true,
        showLocation: false,
        durationPlaceholder: 'Ej: 5 días',
    },
    comidas: {
        label: 'Nueva Comida',
        titleLabel: 'Nombre del sitio o plato',
        titlePlaceholder: 'Ej: Ramen Shifu',
        category: 'Comida',
        showLocation: true,
        locationPlaceholder: 'Ej: Calle Mayor 12, Madrid',
    },
    escapadas: {
        label: 'Nueva Escapada',
        titleLabel: 'Destino',
        titlePlaceholder: 'Ej: Sierra de Gredos',
        category: 'Escapada',
        showDuration: true,
        showLocation: true,
        durationPlaceholder: 'Ej: Fin de semana',
        locationPlaceholder: 'Ej: Ávila',
    },
    deportes: {
        label: 'Nuevo Deporte',
        titleLabel: 'Actividad',
        titlePlaceholder: 'Ej: Partido de pádel',
        category: 'Deporte',
        showLocation: true,
        locationPlaceholder: 'Ej: Polideportivo, Parque...',
    },
    cenas: {
        label: 'Nueva Cena',
        titleLabel: 'Nombre del restaurante o cena',
        titlePlaceholder: 'Ej: Cena japonesa',
        category: 'Cena',
        showLocation: true,
        locationPlaceholder: 'Ej: Restaurante Sakura',
    },
    cocina: {
        label: 'Cocina en Casa',
        titleLabel: 'Receta o plato',
        titlePlaceholder: 'Ej: Pizza casera',
        category: 'Cocina en casa',
    },
    gaming: {
        label: 'Nuevo Gaming',
        titleLabel: 'Nombre del juego',
        titlePlaceholder: 'Ej: It Takes Two',
        category: 'Gaming',
        genres: ['Aventura', 'Acción', 'RPG', 'Estrategia', 'Puzzle', 'Deportes', 'Terror', 'Simulación', 'Plataformas', 'Cooperativo'],
    },
    'juegos-de-mesa': {
        label: 'Nuevo Juego de Mesa',
        titleLabel: 'Nombre del juego',
        titlePlaceholder: 'Ej: Catan, Cluedo...',
        category: 'Juego de mesa',
        showDuration: true,
        durationPlaceholder: 'Ej: 1h - 2h',
    },
    cultura: {
        label: 'Nueva Cultura',
        titleLabel: 'Evento o lugar',
        titlePlaceholder: 'Ej: Museo del Prado',
        category: 'Cultura',
        genres: ['Museo', 'Teatro', 'Concierto', 'Exposición', 'Festival', 'Monumento', 'Tour'],
        showLocation: true,
        locationPlaceholder: 'Ej: Madrid, Barcelona...',
    },
    lectura: {
        label: 'Nueva Lectura',
        titleLabel: 'Título del libro',
        titlePlaceholder: 'Ej: El Principito',
        category: 'Lectura',
        genres: ['Novela', 'Ciencia ficción', 'Fantasía', 'Romance', 'Thriller', 'No ficción', 'Biografía', 'Poesía', 'Cómic', 'Ensayo'],
    },
};

export default function NuevoPlanPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: chukipuId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const categoriaSlug = searchParams.get('categoria') || 'peliculas';
    const config = CATEGORY_CONFIG[categoriaSlug] || CATEGORY_CONFIG.peliculas;

    const { user } = useAuth();

    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('');
    const [duration, setDuration] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [isCreating, setIsCreating] = useState(false);

    const handleCreate = async () => {
        if (!title.trim() || !user) return;
        if (config.genres && !genre) return;
        setIsCreating(true);

        try {
            const planId = firebasePushId('plans');

            const chukipuSnap = await firebaseGet<Chukipu>(`chukipus/${chukipuId}`);
            const currentCount = chukipuSnap?.planCount || 0;

            await firebaseBatchUpdate({
                [`plans/${planId}`]: {
                    chukipuId,
                    title: title.trim(),
                    description: '',
                    image: '',
                    category: config.category,
                    genre: genre || '',
                    duration: duration.trim(),
                    location: location.trim(),
                    date,
                    dateEnd,
                    completed: false,
                    createdBy: user.uid,
                    showInProfile: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                },
                [`chukipus/${chukipuId}/planCount`]: currentCount + 1,
            });

            // Notify all other members
            if (chukipuSnap && chukipuSnap.members) {
                const membersToNotify = chukipuSnap.members.filter((uid: string) => uid !== user.uid);
                await Promise.all(membersToNotify.map((uid: string) =>
                    sendNotification(uid, {
                        type: 'plan',
                        title: 'Nuevo plan',
                        body: `${user.displayName || 'Alguien'} ha añadido "${title.trim()}" a ${chukipuSnap.name || 'un Chukipu'}`,
                        relatedId: planId,
                    })
                ));
            }

            // Navigate to the plan detail view instead of back to the chukipu
            router.push(`/chukipus/${chukipuId}/plans/${planId}`);
        } catch (err) {
            console.error('Error creating plan:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const isValid = title.trim() && (!config.genres || genre);

    return (
        <div className={styles.container}>
            {/* Header */}
            <div className={styles.header}>
                <button className={styles.backBtn} onClick={() => router.back()} aria-label="Volver">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <polyline points="15 18 9 12 15 6" />
                    </svg>
                </button>
                <h1 className={styles.title}>{config.label}</h1>
                <div className={styles.spacer38} />
            </div>

            {/* Content */}
            <div className={styles.content}>

                {/* Title */}
                <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>{config.titleLabel}</label>
                    <div className={styles.inputWrap}>
                        <input
                            type="text"
                            placeholder={config.titlePlaceholder}
                            value={title}
                            onChange={e => setTitle(e.target.value)}
                            className={styles.input}
                            autoFocus
                            maxLength={60}
                        />
                        {title && (
                            <span className={styles.charCount}>{title.length}/60</span>
                        )}
                    </div>
                </div>

                {/* Genre chips (only if category has genres) */}
                {config.genres && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Género</label>
                        <div className={styles.chipsWrap}>
                            {config.genres.map(g => (
                                <button
                                    key={g}
                                    type="button"
                                    className={`${styles.chip} ${genre === g ? styles.chipSelected : ''}`}
                                    onClick={() => setGenre(genre === g ? '' : g)}
                                >
                                    {g}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Duration (optional, depending on category) */}
                {config.showDuration && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Duración <span className={styles.optional}>(opcional)</span></label>
                        <input
                            type="text"
                            placeholder={config.durationPlaceholder || 'Ej: 2h'}
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                            className={styles.input}
                            maxLength={20}
                        />
                    </div>
                )}

                {/* Location (optional, depending on category) */}
                {config.showLocation && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Lugar <span className={styles.optional}>(opcional)</span></label>
                        <input
                            type="text"
                            placeholder={config.locationPlaceholder || 'Ej: Madrid'}
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            className={styles.input}
                            maxLength={40}
                        />
                    </div>
                )}

                {/* Date */}
                <div className={styles.fieldGroup}>
                    <label className={styles.fieldLabel}>Fecha y hora <span className={styles.optional}>(opcional)</span></label>
                    <input
                        type="datetime-local"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        className={styles.input}
                    />
                </div>

                {/* End date */}
                {date && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>Fecha de fin <span className={styles.optional}>(opcional, si dura más de 1 día)</span></label>
                        <input
                            type="datetime-local"
                            value={dateEnd}
                            onChange={e => setDateEnd(e.target.value)}
                            className={styles.input}
                            min={date}
                        />
                    </div>
                )}

                {/* Create button */}
                <button
                    className={styles.createBtn}
                    disabled={!isValid || isCreating}
                    onClick={handleCreate}
                >
                    {isCreating ? 'Creando...' : 'Crear Plan'}
                </button>
            </div>
        </div>
    );
}
