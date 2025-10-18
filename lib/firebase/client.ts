import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import {
  getAuth,
  Auth,
  signInWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
  signOut as firebaseSignOut,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail as firebaseSendPasswordResetEmail
} from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

/**
 * Firebase Client SDK configuration
 */
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

/**
 * Initialize Firebase app (client-side)
 */
let app: FirebaseApp;

export function getFirebaseApp(): FirebaseApp {
  if (getApps().length === 0) {
    app = initializeApp(firebaseConfig);
  } else {
    app = getApps()[0];
  }
  return app;
}

/**
 * Get Firebase Auth instance
 */
export function getFirebaseAuth(): Auth {
  return getAuth(getFirebaseApp());
}

/**
 * Get Firestore instance (client)
 */
export function getFirebaseFirestore(): Firestore {
  return getFirestore(getFirebaseApp());
}

/**
 * Get Storage instance (client)
 */
export function getFirebaseStorage(): FirebaseStorage {
  return getStorage(getFirebaseApp());
}

/**
 * Sign in with email and password
 */
export async function signInWithEmail(email: string, password: string) {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

/**
 * Sign in with Google
 */
export async function signInWithGoogle() {
  const auth = getFirebaseAuth();
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({
    prompt: 'select_account'
  });
  return signInWithPopup(auth, provider);
}

/**
 * Sign out
 */
export async function signOut() {
  const auth = getFirebaseAuth();
  return firebaseSignOut(auth);
}

/**
 * Send password reset email
 */
export async function sendPasswordResetEmail(email: string) {
  const auth = getFirebaseAuth();
  return firebaseSendPasswordResetEmail(auth, email);
}

/**
 * Auth state observer
 */
export function onAuthStateChange(callback: (user: User | null) => void) {
  const auth = getFirebaseAuth();
  return onAuthStateChanged(auth, callback);
}

/**
 * Get current user ID token
 */
export async function getCurrentUserIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

/**
 * Refresh user token to get updated custom claims
 */
export async function refreshUserToken(): Promise<void> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (user) {
    await user.getIdToken(true); // Force refresh
  }
}
