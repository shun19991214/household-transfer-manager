// Shared helpers for Admin SDK maintenance scripts (Node >= 22).
// Auth: Application Default Credentials (`gcloud auth application-default login`), no key files.
import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

export const HOUSEHOLDS_COLLECTION = 'households';

export const PAYLOAD_KEYS = [
  'fixedCosts', 'monthlyData', 'scholarshipLoans', 'savingsGoals', 'transferRecords', 'bankAccounts',
  'scholarshipReserveInitial', 'scholarshipReserveBonus', 'scholarshipReserveBonusMonths',
];

export const PAYLOAD_HARD_LIMIT_BYTES = 1_000_000;

export function initAdmin({ projectId, databaseId }) {
  const project = projectId || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) throw new Error('Project ID is required (--project or FIREBASE_PROJECT_ID / VITE_FIREBASE_PROJECT_ID)');
  const app = initializeApp({ projectId: project });
  const dbId = databaseId || process.env.VITE_FIREBASE_DATABASE_ID || undefined;
  const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
  db.settings({ ignoreUndefinedProperties: true });
  return { project, databaseId: dbId ?? '(default)', db, auth: getAuth(app) };
}

// Resolve emails to UIDs. Each person must have signed in to the app once so the Auth user exists.
export async function resolveMembers(auth, emails) {
  const uids = [];
  for (const email of emails) {
    try {
      const user = await auth.getUserByEmail(email);
      uids.push(user.uid);
    } catch (error) {
      if (error?.code === 'auth/user-not-found') {
        throw new Error(`Auth user not found for ${email}. Sign in to the deployed app with this Google account once, then retry.`);
      }
      throw error;
    }
  }
  return uids;
}

// Sorted-key JSON for structural comparison (mirrors utils/financePayload.ts)
export function stableStringify(value) {
  const normalize = (v) => {
    if (Array.isArray(v)) return v.map((item) => (item === undefined ? null : normalize(item)));
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      const out = {};
      for (const key of Object.keys(v).sort()) {
        if (v[key] !== undefined) out[key] = normalize(v[key]);
      }
      return out;
    }
    return v;
  };
  return JSON.stringify(normalize(value));
}

export function byteLength(s) {
  return Buffer.byteLength(s, 'utf8');
}
