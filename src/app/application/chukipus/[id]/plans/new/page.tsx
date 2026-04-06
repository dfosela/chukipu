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
    genresMax?: number;
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
    cartelera: {
        label: 'Nueva Cartelera',
        titleLabel: 'Título',
        titlePlaceholder: 'Ej: Interstellar, Breaking Bad...',
        category: 'Cartelera',
        extraFields: [
            { key: 'mediaType', label: '¿Qué vais a ver?', type: 'chips', options: ['Película', 'Serie', 'Cortometraje'], required: true },
            { key: 'episodes', label: 'Episodios', type: 'number', placeholder: 'Ej: 8' },
        ],
        genres: ['Acción', 'Comedia', 'Drama', 'Terror', 'Ciencia ficción', 'Romance', 'Animación', 'Thriller', 'Documental', 'Fantasía', 'Musical', 'Aventura'],
        genresLabel: 'Género',
        genresRequired: true,
        genresMax: 2,
        showLocation: true,
        locationLabel: 'Dónde verla',
        locationPlaceholder: 'Ej: Cine, Casa, Netflix...',
        showDate: false,
        showDuration: true,
        durationLabel: 'Duración',
        durationPlaceholder: 'Ej: 2h 15min',
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
    fiesta: {
        label: 'Nueva Fiesta',
        titleLabel: 'Nombre de la fiesta',
        titlePlaceholder: 'Ej: Cumpleaños de Ana',
        category: 'Fiesta',
        showLocation: true,
        locationLabel: 'Lugar',
        locationRequired: true,
        locationPlaceholder: 'Ej: Casa, Bar, Salón de eventos...',
        showDate: true,
        dateLabel: 'Fecha y hora',
        dateRequired: true,
        dateType: 'datetime',
        showDateEnd: false,
        extraFields: [
            { key: 'theme', label: 'Temática', type: 'text', placeholder: 'Ej: Años 80, Playa, Halloween...', maxLength: 60 },
            { key: 'guests', label: 'Número de invitados', type: 'number', placeholder: 'Ej: 20' },
            { key: 'music', label: 'Música / DJ', type: 'text', placeholder: 'Ej: Spotify, DJ, Directo...', maxLength: 60 },
            { key: 'notes', label: 'Notas', type: 'textarea', placeholder: 'Añade cualquier nota...', maxLength: 300 },
        ],
    },
    escapadas: {
        label: 'Nueva Escapada',
        titleLabel: 'Destino',
        titlePlaceholder: 'Ej: Sierra de Gredos',
        category: 'Escapada',
        showDate: true,
        dateLabel: 'Fecha de ida',
        dateRequired: true,
        dateType: 'datetime',
        showDateEnd: true,
        dateEndLabel: 'Fecha de vuelta',
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
    salidas: {
        label: 'Nueva Salida',
        titleLabel: 'Plan de salida',
        titlePlaceholder: 'Ej: Noche de bares, Concierto...',
        category: 'Salida',
        genres: ['Bar', 'Discoteca', 'Concierto', 'Terraza', 'Karaoke', 'Cine', 'Restaurante', 'Comida', 'Cena', 'Otro'],
        genresLabel: 'Tipo de salida',
        genresRequired: true,
        showLocation: true,
        locationLabel: 'Zona / Lugar',
        locationPlaceholder: 'Ej: Centro, Malasaña, Chueca...',
        showDate: true,
        dateLabel: 'Fecha',
        dateType: 'datetime',
        showDateEnd: false,
        extraFields: [
            { key: 'endTime', label: 'Hora de fin', type: 'time' },
            { key: 'people', label: 'Número de personas', type: 'number', placeholder: 'Ej: 6' },
            { key: 'budget', label: 'Presupuesto', type: 'text', placeholder: 'Ej: 30€ por persona', maxLength: 40 },
            { key: 'notes', label: 'Notas', type: 'textarea', placeholder: 'Añade cualquier nota...', maxLength: 300 },
        ],
    },
    actividades: {
        label: 'Nueva Actividad',
        titleLabel: 'Actividad',
        titlePlaceholder: 'Ej: Paintball, Karting, Escape Room...',
        category: 'Actividad',
        genres: ['Aventura', 'Deportivo', 'Cultural', 'Creativo', 'Exterior', 'Interior', 'Otro'],
        genresLabel: 'Tipo',
        showLocation: true,
        locationLabel: 'Lugar',
        locationPlaceholder: 'Ej: Centro de actividades, Parque...',
        showDate: true,
        dateLabel: 'Fecha',
        dateType: 'date',
        showDateEnd: false,
        extraFields: [
            { key: 'time', label: 'Hora', type: 'time' },
            { key: 'duration', label: 'Duración', type: 'text', placeholder: 'Ej: 2h', maxLength: 20 },
            { key: 'price', label: 'Precio', type: 'text', placeholder: 'Ej: 25€ por persona', maxLength: 40 },
            { key: 'people', label: 'Número de personas', type: 'number', placeholder: 'Ej: 4' },
            { key: 'notes', label: 'Notas', type: 'textarea', placeholder: 'Añade cualquier nota...', maxLength: 300 },
        ],
    },
    'en-casa': {
        label: 'Plan en Casa',
        titleLabel: 'Plan',
        titlePlaceholder: 'Ej: Maratón de series, Noche de juegos...',
        category: 'En casa',
        genres: ['Series', 'Películas', 'Videojuegos', 'Juegos de mesa', 'Música', 'Manualidades', 'Otro'],
        genresLabel: 'Tipo de plan',
        showDate: true,
        dateLabel: 'Fecha',
        dateType: 'date',
        showDateEnd: false,
        extraFields: [
            { key: 'time', label: 'Hora', type: 'time' },
            { key: 'people', label: 'Personas', type: 'text', placeholder: 'Ej: Juan, María...', maxLength: 100 },
            { key: 'snacks', label: 'Snacks / Comida', type: 'text', placeholder: 'Ej: Palomitas, Pizza, Nachos...', maxLength: 100 },
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
    otro: {
        label: 'Nuevo Plan',
        titleLabel: 'Título',
        titlePlaceholder: 'Ej: Ir al mercado, visitar a los abuelos...',
        category: 'Otro',
        showLocation: true,
        locationLabel: 'Lugar (opcional)',
        locationRequired: false,
        locationPlaceholder: 'Ej: Madrid, en casa...',
        showDate: true,
        dateLabel: 'Fecha',
        dateType: 'date',
        showDateEnd: false,
        extraFields: [
            { key: 'notes', label: 'Descripción', type: 'textarea', placeholder: 'Describe el plan...', maxLength: 500 },
        ],
    },
};

export default function NuevoPlanPage({ params }: { params: Promise<{ id: string }> }) {
    const { id: chukipuId } = use(params);
    const router = useRouter();
    const searchParams = useSearchParams();
    const categoriaSlug = searchParams.get('categoria') || 'cartelera';
    const config = CATEGORY_CONFIG[categoriaSlug] || CATEGORY_CONFIG.cartelera;

    const { user } = useAuth();

    const [title, setTitle] = useState('');
    const [genres, setGenres] = useState<string[]>([]);
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
                    genre: genres.join(', '),
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
                const rawMembers = chukipuSnap.members;
                const memberUids: string[] = Array.isArray(rawMembers)
                    ? rawMembers
                    : Object.keys(rawMembers as Record<string, boolean>);
                const membersToNotify = memberUids.filter(uid => uid !== user.uid);
                await Promise.all(membersToNotify.map(uid =>
                    sendNotification(uid, {
                        type: 'plan',
                        title: 'Nuevo plan',
                        body: `${user.displayName || 'Alguien'} ha añadido "${title.trim()}" a ${chukipuSnap.name || 'un Chukipu'}`,
                        relatedId: planId,
                    })
                ));
            }

            router.push(`/application/chukipus/${chukipuId}/plans/${planId}`);
        } catch (err) {
            console.error('Error creating plan:', err);
        } finally {
            setIsCreating(false);
        }
    };

    const requiredExtras = config.extraFields?.filter(f => f.required) ?? [];
    const optionalExtras = config.extraFields?.filter(f => !f.required) ?? [];

    const toggleGenre = (g: string) => {
        const max = config.genresMax ?? 1;
        if (genres.includes(g)) {
            setGenres(genres.filter(x => x !== g));
        } else if (genres.length < max) {
            setGenres([...genres, g]);
        }
    };

    const isValid =
        title.trim().length > 0 &&
        (!config.genres || config.genresRequired === false || genres.length > 0) &&
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
                            {config.genresMax && config.genresMax > 1
                                ? <span className={styles.optional}> (máx. {config.genresMax})</span>
                                : config.genresRequired === false && <span className={styles.optional}> (opcional)</span>
                            }
                        </label>
                        <div className={styles.chipsWrap}>
                            {config.genres.map(g => {
                                const isSelected = genres.includes(g);
                                const atMax = genres.length >= (config.genresMax ?? 1) && !isSelected;
                                return (
                                    <button
                                        key={g}
                                        type="button"
                                        className={`${styles.chip} ${isSelected ? styles.chipSelected : ''} ${atMax ? styles.chipDisabled : ''}`}
                                        onClick={() => toggleGenre(g)}
                                        disabled={atMax}
                                    >
                                        {g}
                                    </button>
                                );
                            })}
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
