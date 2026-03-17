'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { firebaseGet } from '../lib/firebaseMethods';
import { UserProfile } from '../types/firestore';

interface AuthContextType {
    user: FirebaseUser | null;
    profile: UserProfile | null;
    loading: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
    user: null,
    profile: null,
    loading: true,
    refreshProfile: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const PUBLIC_ROUTES = ['/application/login', '/landing'];
const ROOT_ROUTE = '/';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<FirebaseUser | null>(null);
    const [profile, setProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const router = useRouter();
    const pathname = usePathname();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
            try {
                if (firebaseUser) {
                    setUser(firebaseUser);
                    const userProfile = await firebaseGet<UserProfile>(`users/${firebaseUser.uid}`);
                    setProfile(userProfile);
                } else {
                    setUser(null);
                    setProfile(null);
                }
            } catch (error) {
                console.error('Error fetching user profile inside AuthProvider:', error);
            } finally {
                setLoading(false);
            }
        });

        return () => unsubscribe();
    }, []);

    const refreshProfile = async () => {
        if (user) {
            const userProfile = await firebaseGet<UserProfile>(`users/${user.uid}`);
            setProfile(userProfile);
        }
    };

    useEffect(() => {
        if (loading) return;

        const isPublic = pathname === ROOT_ROUTE || PUBLIC_ROUTES.some(route => pathname.startsWith(route));

        if (!user && !isPublic) {
            router.replace('/application/login');
        } else if (user && pathname === '/application/login') {
            router.replace('/application');
        }
    }, [user, loading, pathname, router]);

    if (loading) {
        return null;
    }

    const isPublic = pathname === ROOT_ROUTE || PUBLIC_ROUTES.some(route => pathname.startsWith(route));
    if (!user && !isPublic) {
        return null;
    }

    return (
        <AuthContext.Provider value={{ user, profile, loading, refreshProfile }}>
            {children}
        </AuthContext.Provider>
    );
};
