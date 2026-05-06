import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
    GoogleAuthProvider,
    OAuthProvider,
    signOut,
    sendPasswordResetEmail,
    User as FirebaseUser
} from 'firebase/auth';
import { auth } from './firebase';
import { firebaseGet, firebaseSet } from './firebaseMethods';
import { UserProfile } from '../types/firestore';
import { AppError } from '../errors/AppError';

const googleProvider = new GoogleAuthProvider();
const appleProvider = new OAuthProvider('apple.com');

async function ensureUserProfile(uid: string, displayName: string, avatar: string): Promise<void> {
    const existing = await firebaseGet<UserProfile>(`users/${uid}`);
    if (!existing) {
        await firebaseSet(`users/${uid}`, {
            displayName,
            username: `user_${uid.substring(0, 8)}`,
            bio: '',
            avatar,
            savedChukipus: [],
            chukipusCount: 0,
            plansCreated: 0,
            plansCompleted: 0,
        });
    }
}

export async function registerWithEmail(email: string, pass: string, displayName: string): Promise<FirebaseUser> {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, pass);
        const user = userCredential.user;

        await ensureUserProfile(
            user.uid,
            displayName || user.displayName || '',
            user.photoURL || '',
        );

        return user;
    } catch (error) {
        throw AppError.fromError(error, 'Failed to register with email');
    }
}

export async function loginWithEmail(email: string, pass: string): Promise<FirebaseUser> {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, pass);
        return userCredential.user;
    } catch (error) {
        throw AppError.fromError(error, 'Failed to login with email');
    }
}

export async function loginWithGoogle(): Promise<FirebaseUser> {
    try {
        const userCredential = await signInWithPopup(auth, googleProvider);
        return userCredential.user;
    } catch (error) {
        throw AppError.fromError(error, 'Failed to login with Google');
    }
}

export async function loginWithApple(): Promise<FirebaseUser> {
    try {
        const userCredential = await signInWithPopup(auth, appleProvider);
        return userCredential.user;
    } catch (error) {
        throw AppError.fromError(error, 'Failed to login with Apple');
    }
}

export async function logoutUser(): Promise<void> {
    try {
        await signOut(auth);
    } catch (error) {
        throw AppError.fromError(error, 'Failed to log out');
    }
}

export async function resetPassword(email: string): Promise<void> {
    try {
        await sendPasswordResetEmail(auth, email);
    } catch (error) {
        throw AppError.fromError(error, 'Failed to send password reset email');
    }
}
