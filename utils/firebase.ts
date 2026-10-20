import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth, GoogleAuthProvider } from 'firebase/auth';
import { initializeFirestore, Firestore } from 'firebase/firestore';

// Vite inlines VITE_* at build time. Firebase web config values are public identifiers,
// not secrets: access control is enforced by Firestore Security Rules (firestore.rules).
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Optional: named Firestore database. Omit to use "(default)".
const databaseId: string | undefined = import.meta.env.VITE_FIREBASE_DATABASE_ID || undefined;

export const HOUSEHOLDS_COLLECTION = 'households';

export interface FirebaseServices {
  app: FirebaseApp;
  auth: Auth;
  db: Firestore;
  googleProvider: GoogleAuthProvider;
}

export const isFirebaseConfigured = (): boolean =>
  Boolean(firebaseConfig.apiKey && firebaseConfig.authDomain && firebaseConfig.projectId && firebaseConfig.appId);

let services: FirebaseServices | null = null;

// Lazily initialize so the app still runs in local-only mode when config is missing.
export const getFirebase = (): FirebaseServices | null => {
  if (services) return services;
  if (!isFirebaseConfigured()) return null;

  const app = initializeApp(firebaseConfig);
  const db = databaseId
    ? initializeFirestore(app, { ignoreUndefinedProperties: true }, databaseId)
    : initializeFirestore(app, { ignoreUndefinedProperties: true });
  const googleProvider = new GoogleAuthProvider();
  googleProvider.setCustomParameters({ prompt: 'select_account' });

  services = { app, auth: getAuth(app), db, googleProvider };
  return services;
};
