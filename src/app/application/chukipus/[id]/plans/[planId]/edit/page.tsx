'use client';

import { useState, use, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from '../page.module.css';
import { firebaseGet, firebaseUpdate, firebaseRemove, firebaseBatchUpdate } from '@/lib/firebaseMethods';
import { useAuth } from '@/contexts/AuthContext';
import { Plan } from '@/types/firestore';
import { ref, get } from 'firebase/database';
import { db } from '@/lib/firebase';

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
    cartelera: {
        label: 'Editar Cartelera',
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
        showLocation: true,
        locationLabel: 'Dónde verla',
        locationPlaceholder: 'Ej: Cine, Casa, Netflix...',
        showDate: false,
        showDuration: true,
        durationLabel: 'Duración',
        durationPlaceholder: 'Ej: 2h 15min',
    },
    viajes: {
        label: 'Editar Viaje',
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
        label: 'Editar Fiesta',
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
        label: 'Editar Escapada',
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
        label: 'Editar Deporte',
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
        label: 'Editar Salida',
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
        label: 'Editar Actividad',
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
        label: 'Editar Plan en Casa',
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
        label: 'Editar Cultura',
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
};

// Map category value → config key
const CATEGORY_TO_SLUG: Record<string, string> = {
    'Cartelera': 'cartelera',
    'Viaje': 'viajes',
    'Fiesta': 'fiesta',
    'Escapada': 'escapadas',
    'Deporte': 'deportes',
    'Salida': 'salidas',
    'Actividad': 'actividades',
    'En casa': 'en-casa',
    'Cultura': 'cultura',
};

export default function EditPlanPage({ params }: { params: Promise<{ id: string; planId: string }> }) {
    const { id: chukipuId, planId } = use(params);
    const router = useRouter();
    const { user } = useAuth();

    const [plan, setPlan] = useState<Plan | null>(null);
    const [config, setConfig] = useState<CategoryConfig>(CATEGORY_CONFIG.cartelera);
    const [title, setTitle] = useState('');
    const [genre, setGenre] = useState('');
    const [duration, setDuration] = useState('');
    const [location, setLocation] = useState('');
    const [date, setDate] = useState('');
    const [dateEnd, setDateEnd] = useState('');
    const [details, setDetails] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const setDetail = (key: string, val: string) =>
        setDetails(prev => ({ ...prev, [key]: val }));

    useEffect(() => {
        async function fetchPlan() {
            try {
                const data = await firebaseGet<Plan>(`plans/${planId}`);
                if (data) {
                    if (user) {
                        const membersSnap = await get(ref(db, `chukipus/${chukipuId}/members`));
                        let isMember = false;
                        if (membersSnap.exists()) {
                            const val = membersSnap.val();
                            if (Array.isArray(val)) {
                                isMember = val.includes(user.uid);
                            } else {
                                isMember = val[user.uid] === true;
                            }
                        }
                        if (!isMember) {
                            router.replace(`/application/chukipus/${chukipuId}/plans/${planId}`);
                            return;
                        }
                    }
                    setPlan(data);
                    const slug = CATEGORY_TO_SLUG[data.category] || 'cartelera';
                    setConfig(CATEGORY_CONFIG[slug] || CATEGORY_CONFIG.cartelera);
                    setTitle(data.title);
                    setGenre(data.genre || '');
                    setDuration(data.duration || '');
                    setLocation(data.location || '');
                    setDate(data.date || '');
                    setDateEnd(data.dateEnd || '');
                    setDetails((data.details as Record<string, string>) || {});
                }
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        }
        fetchPlan();
    }, [chukipuId, planId, user, router]);

    const handleSave = async () => {
        if (!title.trim() || isSaving) return;
        setIsSaving(true);
        try {
            await firebaseUpdate(`plans/${planId}`, {
                title: title.trim(),
                genre,
                duration: duration.trim(),
                location: location.trim(),
                date,
                dateEnd,
                details,
            });
            router.push(`/application/chukipus/${chukipuId}/plans/${planId}`);
        } catch (err) {
            console.error('Error saving plan:', err);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        try {
            const chukipuSnap = await firebaseGet<{ planCount?: number }>(`chukipus/${chukipuId}`);
            const currentCount = chukipuSnap?.planCount || 1;
            await firebaseBatchUpdate({
                [`plans/${planId}`]: null,
                [`chukipus/${chukipuId}/planCount`]: Math.max(0, currentCount - 1),
            });
            await firebaseRemove(`planMedia/${planId}`);
            router.push(`/application/chukipus/${chukipuId}`);
        } catch (err) {
            console.error('Error deleting plan:', err);
        }
    };

    const handleToggleCompleted = async () => {
        if (!plan) return;
        try {
            await firebaseUpdate(`plans/${planId}`, { completed: !plan.completed });
            setPlan({ ...plan, completed: !plan.completed });
        } catch (err) {
            console.error(err);
        }
    };

    const backBtn = (
        <button className={styles.backBtn} onClick={() => router.push(`/application/chukipus/${chukipuId}/plans/${planId}`)} aria-label="Volver">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="15 18 9 12 15 6" />
            </svg>
        </button>
    );

    if (loading) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>{backBtn}<h1 className={styles.title}>Cargando...</h1><div className={styles.spacer38} /></div>
            </div>
        );
    }

    if (!plan) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>{backBtn}<h1 className={styles.title}>Error</h1><div className={styles.spacer38} /></div>
                <div className={styles.content}><p className={styles.notFoundText}>Plan no encontrado.</p></div>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                {backBtn}
                <h1 className={styles.title}>Editar Plan</h1>
                <div className={styles.spacer38} />
            </div>

            <div className={styles.content}>
                {/* Completed toggle */}
                <button
                    className={`${styles.completedToggle} ${plan.completed ? styles.completedActive : ''}`}
                    onClick={handleToggleCompleted}
                >
                    <div className={styles.completedCheck}>
                        {plan.completed && (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round">
                                <polyline points="20 6 9 17 4 12" />
                            </svg>
                        )}
                    </div>
                    {plan.completed ? 'Completado' : 'Marcar como completado'}
                </button>

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
                            maxLength={60}
                        />
                        {title && <span className={styles.charCount}>{title.length}/60</span>}
                    </div>
                </div>

                {/* Required extra fields (before genre) */}
                {config.extraFields?.filter(f => f.required).map(field => (
                    <div key={field.key} className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>{field.label}</label>
                        {field.type === 'chips' ? (
                            <div className={styles.chipsWrap}>
                                {field.options?.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        className={`${styles.chip} ${details[field.key] === opt ? styles.chipSelected : ''}`}
                                        onClick={() => setDetail(field.key, details[field.key] === opt ? '' : opt)}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <input
                                type={field.type}
                                placeholder={field.placeholder}
                                value={details[field.key] || ''}
                                onChange={e => setDetail(field.key, e.target.value)}
                                className={styles.input}
                                maxLength={field.maxLength}
                            />
                        )}
                    </div>
                ))}

                {/* Genre chips */}
                {config.genres && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>
                            {config.genresLabel}
                            {!config.genresRequired && <span className={styles.optional}> (opcional)</span>}
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
                            {config.locationLabel}
                            {!config.locationRequired && <span className={styles.optional}> (opcional)</span>}
                        </label>
                        <input
                            type="text"
                            placeholder={config.locationPlaceholder}
                            value={location}
                            onChange={e => setLocation(e.target.value)}
                            className={styles.input}
                            maxLength={80}
                        />
                    </div>
                )}

                {/* Date */}
                {config.showDate && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>
                            {config.dateLabel}
                            {!config.dateRequired && <span className={styles.optional}> (opcional)</span>}
                        </label>
                        <input
                            type={config.dateType === 'datetime' ? 'datetime-local' : 'date'}
                            value={date}
                            onChange={e => setDate(e.target.value)}
                            className={styles.input}
                        />
                    </div>
                )}

                {/* End date */}
                {config.showDateEnd && (
                    <div className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>{config.dateEndLabel} <span className={styles.optional}>(opcional)</span></label>
                        <input
                            type={config.dateType === 'datetime' ? 'datetime-local' : 'date'}
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
                        <label className={styles.fieldLabel}>{config.durationLabel} <span className={styles.optional}>(opcional)</span></label>
                        <input
                            type="text"
                            placeholder={config.durationPlaceholder}
                            value={duration}
                            onChange={e => setDuration(e.target.value)}
                            className={styles.input}
                            maxLength={30}
                        />
                    </div>
                )}

                {/* Optional extra fields */}
                {config.extraFields?.filter(f => !f.required).map(field => (
                    <div key={field.key} className={styles.fieldGroup}>
                        <label className={styles.fieldLabel}>
                            {field.label}
                            <span className={styles.optional}> (opcional)</span>
                        </label>
                        {field.type === 'textarea' ? (
                            <div className={styles.inputWrap}>
                                <textarea
                                    placeholder={field.placeholder}
                                    value={details[field.key] || ''}
                                    onChange={e => setDetail(field.key, e.target.value)}
                                    className={`${styles.input} ${styles.textarea}`}
                                    maxLength={field.maxLength}
                                    rows={3}
                                />
                                {details[field.key] && field.maxLength && (
                                    <span className={styles.charCount}>{details[field.key].length}/{field.maxLength}</span>
                                )}
                            </div>
                        ) : field.type === 'chips' ? (
                            <div className={styles.chipsWrap}>
                                {field.options?.map(opt => (
                                    <button
                                        key={opt}
                                        type="button"
                                        className={`${styles.chip} ${details[field.key] === opt ? styles.chipSelected : ''}`}
                                        onClick={() => setDetail(field.key, details[field.key] === opt ? '' : opt)}
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <input
                                type={field.type}
                                placeholder={field.placeholder}
                                value={details[field.key] || ''}
                                onChange={e => setDetail(field.key, e.target.value)}
                                className={styles.input}
                                maxLength={field.maxLength}
                            />
                        )}
                    </div>
                ))}

                {/* Save button */}
                <button
                    className={styles.saveBtn}
                    disabled={!title.trim() || isSaving || (config.extraFields?.filter(f => f.required).some(f => !(details[f.key] || '').trim()) ?? false) || (config.genresRequired && !genre)}
                    onClick={handleSave}
                >
                    {isSaving ? 'Guardando...' : 'Guardar cambios'}
                </button>

                {/* Delete button */}
                <button className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                    Eliminar plan
                </button>
            </div>

            {showDeleteConfirm && (
                <div className={styles.confirmOverlay} onClick={() => setShowDeleteConfirm(false)}>
                    <div className={styles.confirmSheet} onClick={e => e.stopPropagation()}>
                        <p className={styles.confirmTitle}>¿Eliminar plan?</p>
                        <p className={styles.confirmDesc}>Esta acción no se puede deshacer.</p>
                        <div className={styles.confirmActions}>
                            <button className={styles.confirmCancel} onClick={() => setShowDeleteConfirm(false)}>Cancelar</button>
                            <button className={styles.confirmDelete} onClick={handleDelete}>Eliminar</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
