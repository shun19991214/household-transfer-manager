#!/usr/bin/env node
// Migrate the single Supabase `finance_data` row into Firestore `households/{householdId}`.
//
// Dry-run by default; pass --commit to write. Always saves a local JSON backup of the source first.
//
// Usage:
//   npm run migrate:firestore -- --member you@gmail.com [--member partner@gmail.com] [--commit]
//   npm run migrate:firestore -- --from-file backups/xxx.json --member you@gmail.com --commit
//
// Options:
//   --household <id>    Firestore document ID (default: main)
//   --member <email>    Household member Google account (repeatable, required)
//   --from-file <path>  Read payload from a backup JSON instead of Supabase
//   --source-id <id>    Supabase finance_data.id to read (default: main)
//   --project <id>      Firebase/GCP project (default: VITE_FIREBASE_PROJECT_ID)
//   --database <id>     Named Firestore database (default: "(default)")
//   --commit            Actually write to Firestore
//   --force             Overwrite an existing household document
//
// Env (read from .env.local via npm script):
//   VITE_SUPABASE_URL, and SUPABASE_SERVICE_ROLE_KEY or VITE_SUPABASE_ANON_KEY
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { FieldValue } from 'firebase-admin/firestore';
import {
  HOUSEHOLDS_COLLECTION, PAYLOAD_KEYS, PAYLOAD_HARD_LIMIT_BYTES,
  initAdmin, resolveMembers, stableStringify, byteLength,
} from './lib/household-admin.mjs';

const { values: args } = parseArgs({
  options: {
    household: { type: 'string', default: 'main' },
    member: { type: 'string', multiple: true, default: [] },
    'from-file': { type: 'string' },
    'source-id': { type: 'string', default: 'main' },
    project: { type: 'string' },
    database: { type: 'string' },
    commit: { type: 'boolean', default: false },
    force: { type: 'boolean', default: false },
  },
});

async function fetchFromSupabase(sourceId) {
  const url = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (or VITE_SUPABASE_ANON_KEY) are required');

  const endpoint = `${url.replace(/\/$/, '')}/rest/v1/finance_data?id=eq.${encodeURIComponent(sourceId)}&select=id,data,updated_at`;
  const res = await fetch(endpoint, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  if (!res.ok) throw new Error(`Supabase request failed: ${res.status} ${await res.text()}`);
  const rows = await res.json();
  if (!Array.isArray(rows) || rows.length !== 1) {
    throw new Error(`Expected exactly 1 row for id=${sourceId}, got ${Array.isArray(rows) ? rows.length : typeof rows}. If RLS blocks the anon key, set SUPABASE_SERVICE_ROLE_KEY.`);
  }
  return rows[0];
}

function validatePayload(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Payload is not an object');
  const unknownKeys = Object.keys(data).filter((k) => !PAYLOAD_KEYS.includes(k));
  if (unknownKeys.length) console.warn(`  ! Unknown keys will be migrated as-is: ${unknownKeys.join(', ')}`);
  for (const k of ['fixedCosts', 'monthlyData', 'scholarshipLoans', 'savingsGoals', 'transferRecords', 'bankAccounts']) {
    if (k in data && !Array.isArray(data[k])) throw new Error(`${k} must be an array`);
  }
  const size = byteLength(stableStringify(data));
  if (size > PAYLOAD_HARD_LIMIT_BYTES) throw new Error(`Payload is ${size} bytes, exceeds Firestore 1 MiB document limit`);
  return size;
}

function summarize(data) {
  const count = (k) => (Array.isArray(data[k]) ? data[k].length : '-');
  const variableCosts = Array.isArray(data.monthlyData)
    ? data.monthlyData.reduce((n, m) => n + (Array.isArray(m?.variableCosts) ? m.variableCosts.length : 0), 0)
    : '-';
  return {
    fixedCosts: count('fixedCosts'),
    monthlyData: count('monthlyData'),
    variableCosts,
    scholarshipLoans: count('scholarshipLoans'),
    savingsGoals: count('savingsGoals'),
    transferRecords: count('transferRecords'),
    bankAccounts: count('bankAccounts'),
  };
}

async function main() {
  if (args.member.length === 0) throw new Error('At least one --member <email> is required');

  // 1. Load source
  let source;
  if (args['from-file']) {
    const raw = JSON.parse(await readFile(args['from-file'], 'utf8'));
    source = raw.data && !raw.fixedCosts ? raw : { id: args['source-id'], data: raw, updated_at: null };
    console.log(`Source: file ${args['from-file']}`);
  } else {
    source = await fetchFromSupabase(args['source-id']);
    console.log(`Source: Supabase finance_data id=${source.id} (updated_at ${source.updated_at})`);

    // 2. Backup before anything else
    const dir = path.resolve('backups');
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `supabase-finance_data-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    await writeFile(file, JSON.stringify(source, null, 2), 'utf8');
    console.log(`Backup written: ${file}`);
  }

  const data = source.data;
  const size = validatePayload(data);
  console.log(`Payload size: ${(size / 1024).toFixed(1)} KB`);
  console.table(summarize(data));

  // 3. Target
  const { project, databaseId, db, auth } = initAdmin({ projectId: args.project, databaseId: args.database });
  const members = await resolveMembers(auth, args.member);
  const ref = db.collection(HOUSEHOLDS_COLLECTION).doc(args.household);
  console.log(`Target: project=${project} database=${databaseId} doc=${ref.path}`);
  console.log(`Members: ${args.member.map((e, i) => `${e} (${members[i]})`).join(', ')}`);

  const existing = await ref.get();
  if (existing.exists && !args.force) {
    throw new Error(`${ref.path} already exists. Re-run with --force to overwrite (export it first).`);
  }

  if (!args.commit) {
    console.log('\nDry run complete. Re-run with --commit to write.');
    return;
  }

  // 4. Write
  await ref.set({
    members,
    data,
    updatedAt: FieldValue.serverTimestamp(),
    updatedBy: 'migration',
    migratedFrom: { source: args['from-file'] ? 'file' : 'supabase', sourceId: String(source.id), sourceUpdatedAt: source.updated_at ?? null },
  });

  // 5. Verify
  const written = await ref.get();
  if (stableStringify(written.get('data')) !== stableStringify(data)) {
    throw new Error('Verification failed: Firestore data differs from source');
  }
  console.log(`\nMigrated and verified: ${ref.path}`);
}

main().catch((error) => {
  console.error(`\nERROR: ${error.message}`);
  process.exitCode = 1;
});
