export interface UserProfile {
    id: string;
    displayName: string;
    username: string;
    bio: string;
    avatar: string;
    isPrivate?: boolean;
    savedChukipus: string[];
    followers: string[];
    following: string[];
    followRequests?: string[];
    followersCount: number;
    followingCount: number;
    createdAt: number;
    updatedAt: number;
    chukipusCount: number;
    plansCreated: number;
    plansCompleted: number;
}

export interface UserNotification {
    id: string;
    title: string;
    body: string;
    read: boolean;
    type: 'follow' | 'follow_request' | 'invite' | 'join' | 'plan' | 'system';
    relatedId?: string;
    createdAt: number;
}

export interface PlanComment {
    id: string;
    userId: string;
    userName: string;
    userAvatar: string;
    text: string;
    createdAt: number;
}

export interface Plan {
    id: string;
    chukipuId: string;
    title: string;
    description: string;
    image: string;
    category: string;
    genre: string;
    duration: string;
    location: string;
    date: string;
    dateEnd: string;
    details?: Record<string, string>;
    completed: boolean;
    createdBy: string;
    showInProfile?: boolean;
    pinnedBy?: Record<string, boolean>;
    likes?: string[];
    likesCount?: number;
    createdAt: number;
    updatedAt: number;
}

export interface PlanMedia {
    id: string;
    planId: string;
    url: string;
    type: 'photo' | 'video';
    uploadedBy: string;
    uploaderName: string;
    uploaderAvatar: string;
    createdAt: number;
}

export interface FeedbackEntry {
    id: string;
    text: string;
    authorId: string;
    authorName: string;
    authorAvatar: string;
    type: 'feedback' | 'sugerencia' | 'bug';
    createdAt: number;
}

export interface Chukipu {
    id: string;
    name: string;
    image: string;
    createdBy: string;
    members: string[];
    inviteCode?: string;
    isPrivate?: boolean;
    ratingAverage: number;
    ratingCount: number;
    membersCount: number;
    planCount: number;
    category?: string;
    createdAt: number;
    updatedAt: number;
}
