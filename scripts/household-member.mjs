#!/usr/bin/env node
// Manage household membership (clients cannot change `members`; see firestore.rules).
//
// Usage:
//   npm run household:member -- list   [--household main]
//   npm run household:member -- add    --email partner@gmail.com [--household main]
//   npm run household:member -- remove --email partner@gmail.com [--household main]
//   npm run household:member -- export [--household main]     # JSON backup to backups/
//
// Options: --project <id>, --database <id>
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseArgs } from 'node:util';
import { FieldValue } from 'firebase-admin/firestore';
import { HOUSEHOLDS_COLLECTION, initAdmin, resolveMembers } from './lib/household-admin.mjs';

const { values: args, positionals } = parseArgs({
  allowPositionals: true,
  options: {
    household: { type: 'string', default: 'main' },
    email: { type: 'string' },
    project: { type: 'string' },
    database: { type: 'string' },
  },
});

async function main() {
  const command = positionals[0];
  if (!['list', 'add', 'remove', 'export'].includes(command)) {
    throw new Error('Command must be one of: list, add, remove, export');
  }

  const { db, auth } = initAdmin({ projectId: args.project, databaseId: args.database });
  const ref = db.collection(HOUSEHOLDS_COLLECTION).doc(args.household);
  const snap = await ref.get();
  if (!snap.exists) throw new Error(`${ref.path} does not exist`);

  if (command === 'list') {
    for (const uid of snap.get('members') ?? []) {
      const user = await auth.getUser(uid).catch(() => null);
      console.log(`${uid}\t${user?.email ?? '(deleted user)'}`);
    }
    return;
  }

  if (command === 'export') {
    const dir = path.resolve('backups');
    await mkdir(dir, { recursive: true });
    const file = path.join(dir, `firestore-${args.household}-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
    await writeFile(file, JSON.stringify({ id: snap.id, data: snap.get('data'), members: snap.get('members') }, null, 2), 'utf8');
    console.log(`Exported: ${file}`);
    return;
  }

  if (!args.email) throw new Error('--email is required');
  const [uid] = await resolveMembers(auth, [args.email]);
  const members = snap.get('members') ?? [];

  if (command === 'add') {
    await ref.update({ members: FieldValue.arrayUnion(uid) });
    console.log(`Added ${args.email} (${uid}) to ${ref.path}`);
  } else {
    if (members.includes(uid) && members.length === 1) throw new Error('Refusing to remove the last member');
    await ref.update({ members: FieldValue.arrayRemove(uid) });
    console.log(`Removed ${args.email} (${uid}) from ${ref.path}`);
  }
}

main().catch((error) => {
  console.error(`ERROR: ${error.message}`);
  process.exitCode = 1;
});
