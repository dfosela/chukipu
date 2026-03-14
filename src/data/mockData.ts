// Mock data for demonstration — replace with real API calls

export interface Plan {
    id: string;
    title: string;
    description: string;
    image: string;
    category: string;
    completed: boolean;
    chukipuId: string;
}

export interface Chukipu {
    id: string;
    name: string;
    image: string;
    planCount: number;
    lastActivity: string;
    isPublic: boolean;
    rating?: number;
    membersCount?: number;
    plans?: Plan[];
    members?: { avatar: string }[];
}

export interface UserProfile {
    id: string;
    name: string;
    username: string;
    bio: string;
    avatar: string;
    chukipusCount: number;
    plansCreated: number;
    plansCompleted: number;
}

export const mockUser: UserProfile = {
    id: 'u1',
    name: 'Daniela',
    username: '@daniela',
    bio: 'Coleccionando momentos contigo 🌸',
    avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b1ac?w=200&q=80',
    chukipusCount: 3,
    plansCreated: 35,
    plansCompleted: 17,
};

const otherMember = 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=200&q=80';
const otherMember2 = 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=200&q=80';

export const mockChukipus: Chukipu[] = [
    {
        id: '1',
        name: 'Aventuras Juntos',
        image: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=600&q=80',
        planCount: 12,
        lastActivity: 'Hace 2 horas',
        isPublic: false,
        rating: 4.8,
        members: [{ avatar: mockUser.avatar }, { avatar: otherMember }],
        plans: [
            { id: 'p1', title: 'Senderismo en la montaña', description: 'Un día en la naturaleza explorando senderos y disfrutando de las vistas.', image: 'https://images.unsplash.com/photo-1551632811-561732d1e306?w=600&q=80', category: 'Naturaleza', completed: false, chukipuId: '1' },
            { id: 'p2', title: 'Picnic en el parque', description: 'Tarde relajada con comida casera y buena compañía.', image: 'https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=600&q=80', category: 'Romántico', completed: true, chukipuId: '1' },
            { id: 'p3', title: 'Kayak al amanecer', description: 'Remar juntos mientras el sol aparece sobre el horizonte.', image: 'https://images.unsplash.com/photo-1506748686214-e9df14d4d9d0?w=600&q=80', category: 'Deporte', completed: false, chukipuId: '1' },
        ],
    },
    {
        id: '2',
        name: 'Cultura y Arte',
        image: 'https://images.unsplash.com/photo-1513364776144-60967b0f800f?w=600&q=80',
        planCount: 8,
        lastActivity: 'Ayer',
        isPublic: false,
        rating: 4.6,
        members: [{ avatar: mockUser.avatar }, { avatar: otherMember2 }],
        plans: [
            { id: 'p4', title: 'Visita al museo de arte moderno', description: 'Explorar las exposiciones temporales y colecciones permanentes.', image: 'https://images.unsplash.com/photo-1540575467063-178a50c2df87?w=600&q=80', category: 'Cultura', completed: false, chukipuId: '2' },
            { id: 'p5', title: 'Noche de teatro', description: 'Ver una obra de teatro clásico en el centro histórico.', image: 'https://images.unsplash.com/photo-1503095396549-807759245b35?w=600&q=80', category: 'Arte', completed: false, chukipuId: '2' },
        ],
    },
    {
        id: '3',
        name: 'Gastronomía',
        image: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=80',
        planCount: 15,
        lastActivity: 'Hace 3 días',
        isPublic: false,
        rating: 4.9,
        members: [{ avatar: mockUser.avatar }, { avatar: otherMember }, { avatar: otherMember2 }],
        plans: [
            { id: 'p6', title: 'Cena en restaurante japonés', description: 'Probar el menú omakase del nuevo restaurante de sushi.', image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=600&q=80', category: 'Gastronomía', completed: true, chukipuId: '3' },
            { id: 'p7', title: 'Clase de cocina italiana', description: 'Aprender a hacer pasta fresca desde cero con un chef local.', image: 'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=600&q=80', category: 'Gastronomía', completed: false, chukipuId: '3' },
        ],
    },
];

export const mockPublicChukipus: Chukipu[] = [
    { id: 'pub1', name: 'Road Trip por Europa', image: 'https://images.unsplash.com/photo-1476514525535-07fb3b4ae5f1?w=600&q=80', planCount: 24, lastActivity: '', isPublic: true, rating: 4.9, membersCount: 1240 },
    { id: 'pub2', name: 'Citas Románticas NYC', image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?w=600&q=80', planCount: 18, lastActivity: '', isPublic: true, rating: 4.7, membersCount: 890 },
    { id: 'pub3', name: 'Aventuras de Fin de Semana', image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=600&q=80', planCount: 31, lastActivity: '', isPublic: true, rating: 4.8, membersCount: 2100 },
    { id: 'pub4', name: 'Gastronomía Mundial', image: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600&q=80', planCount: 42, lastActivity: '', isPublic: true, rating: 4.6, membersCount: 3400 },
    { id: 'pub5', name: 'Arte y Museos', image: 'https://images.unsplash.com/photo-1531243269054-5ebf6f34081e?w=600&q=80', planCount: 15, lastActivity: '', isPublic: true, rating: 4.5, membersCount: 760 },
    { id: 'pub6', name: 'Deportes Extremos', image: 'https://images.unsplash.com/photo-1527515637462-cff94eecc1ac?w=600&q=80', planCount: 20, lastActivity: '', isPublic: true, rating: 4.8, membersCount: 1560 },
];


