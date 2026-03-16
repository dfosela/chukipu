'use client';

import { useState, use } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import styles from './page.module.css';
import { firebaseGet, firebaseBatchUpdate, firebasePushId } from '@/lib/firebaseMethods';
import { useAuth } from '@/contexts/AuthContext';
import { sendNotification } from '@/lib/notifications';
import { Chukipu } from '@/types/firestore';

type ExtraFieldDef = {
    key: string;
    label: string;
    required?: boolean;
    type: 'text' | 'number' | 'textarea' | 'time' | 'chips';
    options?: string[];
    placeholder?: string;
    maxLength?: number;
};

type CategoryConfig = {
    label: string;
    category: string;
    titleLabel: string;
    titlePlaceholder: string;
    genres?: string[];
    genresLabel?: string;
    genresRequired?: boolean;
    showDuration?: boolean;
    durationLabel?: string;
    durationPlaceholder?: string;
    showLocation?: boolean;
    locationLabel?: string;
    locationRequired?: boolean;
    locationPlaceholder?: string;
    showDate?: boolean;
    dateLabel?: string;
    dateRequired?: boolean;
    dateType?: 'date' | 'datetime';
    showDateEnd?: boolean;
    dateEndLabel?: string;
    extraFields?: ExtraFieldDef[];
};

const CATEGORY_CONFIG: Record<string, CategoryConfig> = {
    peliculas: {
        label: 'Nueva Película',
        titleLabel: 'Título de la película',
        titlePlaceholder: 'Ej: Interstellar',
        category: 'Película',
        genres: ['Acción', 'Comedia', 'Drama', 'Terror', 'Ciencia ficción', 'Romance', 'Animación', 'Thriller', 'Documental', 'Fantasía', 'Musical', 'Aventura'],
        genresLabel: 'Género',
        genresRequired: true,
        showDuration: true,
        durationLabel: 'Duración',
        durationPlaceholder: 'Ej: 2h 15min',
        showLocation: true,
        locationLabel: 'Dónde verla',
        locationPlaceholder: 'Ej: Cine, Casa, Netflix...',
        showDate: true,
        dateLabel: 'Fecha y hora',
        dateType: 'datetime',
        showDateEnd: false,
    },
    viajes: {
        label: 'Nuevo Viaje',
        titleLabel: 'Destino',
        titlePlaceholder: 'Ej: París, Japón...',
        category: 'Viaje',
        showDate: true,
        dateLabel: 'Fecha de inicio',
        dateRequired: true,
        dateType: 'datetime',
        showDateEnd: true,
        dateEndLabel: 'Fecha de fin',
        extraFields: [
            { key: 'budget', label: 'Presupuesto', type: 'text', placeholder: 'Ej: 500€', maxLength: 40 },
            { key: 'transport', label: 'Transporte', type: 'text', placeholder: 'Ej: Avión, Tren, Coche...', maxLength: 60 },
            { key: 'accommodation', label: 'Alojamiento', type: 'text', placeholder: 'Ej: Hotel, Airbnb, Camping...', maxLength: 60 },
            { key: 'notes', label: 'Notas', type: 'textarea', placeholder: 'Añade cualquier nota...', maxLength: 300 },
        ],
    },
    comidas: {
        label: 'Nueva Comida',
        titleLabel: 'Lugar / Restaurante',
        titlePlaceholder: 'Ej: Ramen Shifu',
        category: 'Comida',
        genres: ['Desayuno', 'Almuerzo', 'Cena', 'Aperitivo', 'Merienda', 'Brunch', 'Picoteo'],
        genresLabel: 'Tipo de comida',
        genresRequired: true,
        showDate: true,
        dateLabel: 'Fecha',
        dateType: 'date',
        showDateEnd: false,
        extraFields: [
            { key: 'time', label: 'Hora', type: 'time' },
            { key: 'cuisineType', label: 'Tipo de cocina', type: 'text', placeholder: 'Ej: Italiana, Japonesa...', maxLength: 40 },
            { key: 'price', label: 'Precio aproximado', type: 'text', placeholder: 'Ej: 20€', maxLength: 20 },
            { key: 'notes', label: 'Notas', type: 'textarea', placeholder: 'Añade cualquier nota...', maxLength: 300 },
        ],
    },
    escapadas: {
        label: 'Nueva Escapada',
        titleLabel: 'Destino',
        titlePlaceholder: 'Ej: Sierra de Gredos',
        category: 'Escapada',
        showDate: true,
        dateLabel: 'Fecha',
        dateRequired: true,
        dateType: 'datetime',
        showDateEnd: false,
        showDuration: true,
        durationLabel: 'Duración',
        durationPlaceholder: 'Ej: Fin de semana, 3 días...',
        extraFields: [
            { key: 'transport', label: 'Transporte', type: 'text', placeholder: 'Ej: Coche, Tren...', maxLength: 60 },
            { key: 'accommodation', label: 'Alojamiento', type: 'text', placeholder: 'Ej: Hotel, Casa rural...', maxLength: 60 },
            { key: 'budget', label: 'Presupuesto', type: 'text', placeholder: 'Ej: 200€', maxLength: 40 },
            { key: 'activities', label: 'Actividades planeadas', type: 'textarea', placeholder: 'Ej: Senderismo, visita al pueblo...', maxLength: 300 },
        ],
    },
    deportes: {
        label: 'Nuevo Deporte',
        titleLabel: 'Deporte',
        titlePlaceholder: 'Ej: Pádel, Fútbol, Running...',
        category: 'Deporte',
        showLocation: true,
        locationLabel: 'Lugar',
        locationRequired: true,
        locationPlaceholder: 'Ej: Polideportivo, Parque...',
        showDate: true,
        dateLabel: 'Fecha',
        dateType: 'date',
        showDateEnd: false,
        extraFields: [
            { key: 'time', label: 'Hora', type: 'time' },
            { key: 'duration', label: 'Duración', type: 'text', placeholder: 'Ej: 1h 30min', maxLength: 20 },
            { key: 'level', label: 'Nivel', type: 'chips', options: ['Amateur', 'Intermedio', 'Profesional'] },
            { key: 'players', label: 'Participantes', type: 'text', placeholder: 'Ej: Juan, María, Pedro...', maxLength: 100 },
        ],
    },
    cenas: {
        label: 'Nueva Cena',
        titleLabel: 'Restaurante / Lugar',
        titlePlaceholder: 'Ej: Restaurante Sakura',
        category: 'Cena',
        showDate: true,
        dateLabel: 'Fecha',
        dateRequired: true,
        dateType: 'date',
        showDateEnd: false,
        extraFields: [
            { key: 'time', label: 'Hora', type: 'time' },
            { key: 'foodType', label: 'Tipo de comida', type: 'text', placeholder: 'Ej: Japonesa, Italiana...', maxLength: 40 },
            { key: 'people', label: 'Número de personas', type: 'number', placeholder: 'Ej: 4' },
            { key: 'price', label: 'Precio estimado', type: 'text', placeholder: 'Ej: 30€ por persona', maxLength: 40 },
            { key: 'notes', label: 'Notas', type: 'textarea', placeholder: 'Añade cualquier nota...', maxLength: 300 },
        ],
    },
    cocina: {
        label: 'Cocina en Casa',
        titleLabel: 'Receta / Plato',
        titlePlaceholder: 'Ej: Pizza casera',
        category: 'Cocina en casa',
        genres: ['Desayuno', 'Comida', 'Cena', 'Aperitivo', 'Postre', 'Snack', 'Merienda'],
        genresLabel: 'Tipo de comida',
        genresRequired: true,
        showDate: true,
        dateLabel: 'Fecha',
        dateType: 'date',
        showDateEnd: false,
        extraFields: [
            { key: 'prepTime', label: 'Tiempo de preparación', type: 'text', placeholder: 'Ej: 30 min', maxLength: 30 },
            { key: 'difficulty', label: 'Dificultad', type: 'chips', options: ['Fácil', 'Media', 'Difícil'] },
            { key: 'ingredients', label: 'Ingredientes principales', type: 'textarea', placeholder: 'Ej: Harina, tomate, mozzarella...', maxLength: 300 },
            { key: 'notes', label: 'Notas', type: 'textarea', placeholder: 'Añade cualquier nota...', maxLength: 200 },
        ],
    },
    gaming: {
        label: 'Nuevo Gaming',
        titleLabel: 'Videojuego',
        titlePlaceholder: 'Ej: It Takes Two',
        category: 'Gaming',
        genres: ['PC', 'PlayStation', 'Xbox', 'Nintendo Switch', 'Mobile', 'Otro'],
        genresLabel: 'Plataforma',
        genresRequired: true,
        showDate: true,
        dateLabel: 'Fecha',
        dateType: 'date',
        showDateEnd: false,
        extraFields: [
            { key: 'time', label: 'Hora', type: 'time' },
            { key: 'duration', label: 'Duración de la sesión', type: 'text', placeholder: 'Ej: 2h', maxLength: 20 },
            { key: 'gameMode', label: 'Modo de juego', type: 'chips', options: ['Solo', 'Multijugador local', 'Online'] },
            { key: 'players', label: 'Amigos / Jugadores', type: 'text', placeholder: 'Ej: Juan, María...', maxLength: 100 },
        ],
    },
    'juegos-de-mesa': {
        label: 'Nuevo Juego de Mesa',
        titleLabel: 'Juego de mesa',
        titlePlaceholder: 'Ej: Catan, Cluedo...',
        category: 'Juego de mesa',
        showLocation: true,
        locationLabel: 'Lugar',
        locationPlaceholder: 'Ej: Casa, Bar de juegos...',
        showDate: true,
        dateLabel: 'Fecha',
        dateType: 'date',
        showDateEnd: false,
        showDuration: true,
        durationLabel: 'Duración',
        durationPlaceholder: 'Ej: 2h',
        extraFields: [
            { key: 'players', label: 'Número de jugadores', type: 'number', placeholder: 'Ej: 4', required: true },
            { key: 'winner', label: 'Ganador', type: 'text', placeholder: 'Ej: Nombre del ganador', maxLength: 60 },
            { key: 'notes', label: 'Notas', type: 'textarea', placeholder: 'Añade cualquier nota...', maxLength: 300 },
        ],
    },
    cultura: {
        label: 'Nueva Cultura',
        titleLabel: 'Evento o lugar',
        titlePlaceholder: 'Ej: Museo del Prado',
        category: 'Cultura',
        genres: ['Museo', 'Teatro', 'Concierto', 'Exposición', 'Festival', 'Monumento', 'Tour', 'Cine', 'Ópera'],
        genresLabel: 'Tipo de actividad',
        genresRequired: true,
        showLocation: true,
        locationLabel: 'Lugar / Ciudad',
        locationRequired: true,
        locationPlaceholder: 'Ej: Madrid, Barcelona...',
        showDate: true,
        dateLabel: 'Fecha',
        dateType: 'date',
        showDateEnd: false,
        extraFields: [
            { key: 'time', label: 'Hora', type: 'time' },
            { key: 'price', label: 'Precio', type: 'text', placeholder: 'Ej: 12€', maxLength: 20 },
            { key: 'company', label: 'Compañía', type: 'text', placeholder: 'Ej: Con quién vas', maxLength: 80 },
            { key: 'notes', label: 'Notas', type: 'textarea', placeholder: 'Añade cualquier nota...', maxLength: 300 },
        ],
    },
    lectura: {
        label: 'Nueva Lectura',
        titleLabel: 'Título del libro',
        titlePlaceholder: 'Ej: El Principito',
        category: 'Lectura',
        genres: ['Novela', 'Ciencia ficción', 'Fantasía', 'Romance', 'Thriller', 'No ficción', 'Biografía', 'Poesía', 'Cómic', 'Ensayo'],
        genresLabel: 'Género',
        genresRequired: false,
        showDate: true,
        dateLabel: 'Fecha de inicio',
        dateType: 'date',
        showDateEnd: true,
        dateEndLabel: 'Fecha de finalización',
        extraFields: [
            { key: 'author', label: 'Autor', type: 'text', placeholder: 'Ej: Antoine de Saint-Exupéry', required: true, maxLength: 80 },
            { key: 'pages', label: 'Número de páginas', type: 'number', placeholder: 'Ej: 280' },
            { key: 'rating', label: 'Valoración', type: 'chips', options: ['★', '★★', '★★★', '★★★★', '★★★★★'] },
        ],
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
    const [details, setDetails] = useState<Record<string, string>>({});
    const [isCreating, setIsCreating] = useState(false);

    const setDetail = (key: string, val: string) =>
        setDetails(prev => ({ ...prev, [key]: val }));

    const handleCreate = async () => {
        if (!title.trim() || !user) return;
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
                    details,
                    completed: false,
                    createdBy: user.uid,
                    showInProfile: false,
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                },
                [`chukipus/${chukipuId}/planCount`]: currentCount + 1,
            });

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

            router.push(`/chukipus/${chukipuId}/plans/${planId}`);
        } catch (err) {
            console.error('Error creating plan:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const requiredExtras = config.extraFields?.filter(f => f.required) ?? [];
    const optionalExtras = config.extraFields?.filter(f => !f.required) ?? [];

    const isValid =
        title.trim().length > 0 &&
        (!config.genres || config.genresRequired === false || genre.length > 0) &&
        (!config.locationRequired || location.trim().length > 0) &&
        (!config.dateRequired || date.length > 0) &&
        requiredExtras.every(f => (details[f.key] || '').trim().length > 0);

    const renderExtraField = (field: ExtraFieldDef) => {
        const value = details[field.key] || '';
        const setVal = (v: string) => setDetail(field.key, v);

        return (
            <div key={field.key} className={styles.fieldGroup}>
                <label className={styles.fieldLabel}>
                    {field.label}
                    {!field.required && <span className={styles.optional}> (opcional)</span>}
                </label>
                {field.type === 'chips' ? (
                    <div className={styles.chipsWrap}>
                        {field.options!.map(opt => (
                            <button
                                key={opt}
                                type="button"
                                className={`${styles.chip} ${value === opt ? styles.chipSelected : ''}`}
                                onClick={() => setVal(value === opt ? '' : opt)}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                ) : field.type === 'textarea' ? (
                    <textarea
                        placeholder={field.placeholder}
                        value={value}
                        onChange={e => setVal(e.target.value)}
                        className={styles.textarea}
                        maxLength={field.maxLength}
                        rows={3}
                    />
                ) : field.type === 'time' ? (
                    <input
                        type="time"
                        value={value}
                        onChange={e => setVal(e.target.value)}
                        className={styles.input}
                    />
                ) : (
                    <input
                        type={field.type === 'number' ? 'number' : 'text'}
                        placeholder={field.placeholder}
                        value={value}
                        onChange={e => setVal(e.target.value)}
                        className={styles.input}
                        maxLength={field.maxLength}
                        min={field.type === 'number' ? 1 : undefined}
                    />
                )}
            </div>
        );
    };

    const inputDateType = config.dateType === 'date' ? 'date' : 'datetime-local';

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

                {/* Required extra fields (shown right after title) */}
                {requiredExtras.map(renderExtraField)}

                {/* Genre / type chips */}
                {config.genres && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>
                            {config.genresLabel || 'Género'}
                            {config.genresRequired === false && <span className={styles.optional}> (opcional)</span>}
                        </label>
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

                {/* Location */}
                {config.showLocation && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>
                            {config.locationLabel || 'Lugar'}
                            {!config.locationRequired && <span className={styles.optional}> (opcional)</span>}
                        </label>
                        <input
                            type="text"
                            placeholder={config.locationPlaceholder || 'Ej: Madrid'}
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            className={styles.input}
                            maxLength={60}
                        />
                    </div>
                )}

                {/* Date */}
                {config.showDate !== false && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>
                            {config.dateLabel || 'Fecha y hora'}
                            {!config.dateRequired && <span className={styles.optional}> (opcional)</span>}
                        </label>
                        <input
                            type={inputDateType}
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className={styles.input}
                        />
                    </div>
                )}

                {/* End date */}
                {config.showDateEnd && date && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>
                            {config.dateEndLabel || 'Fecha de fin'}
                            <span className={styles.optional}> (opcional)</span>
                        </label>
                        <input
                            type={inputDateType}
                            value={dateEnd}
                            onChange={e => setDateEnd(e.target.value)}
                            className={styles.input}
                            min={date}
                        />
                    </div>
                )}

                {/* Duration */}
                {config.showDuration && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>
                            {config.durationLabel || 'Duración'}
                            <span className={styles.optional}> (opcional)</span>
                        </label>
                        <input
                            type="text"
                            placeholder={config.durationPlaceholder || 'Ej: 2h'}
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                            className={styles.input}
                            maxLength={30}
                        />
                    </div>
                )}

                {/* Optional extra fields */}
                {optionalExtras.map(renderExtraField)}
            </div>

            {/* Sticky footer with create button */}
            <div className={styles.footer}>
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
