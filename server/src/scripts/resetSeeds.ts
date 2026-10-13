/**
 * Run this script to delete all seeded demo accounts so they get re-created
 * with fresh password hashes on next server start.
 *
 * Usage:  npx tsx src/scripts/resetSeeds.ts
 */
import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const SEEDED_EMAILS = [
  'doctor@docin.com',
  'hospital@docin.com',
  'recruiter@docin.com',
  'verifier@docin.com',
  'admin@docin.com',
];

async function reset() {
  const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/docin';
  await mongoose.connect(uri);
  console.log('[Reset] Connected to MongoDB');

  // Delete seeded users + their refresh tokens + doctor profiles
  const db = mongoose.connection.db!;

  const result = await db.collection('users').deleteMany({
    email: { $in: SEEDED_EMAILS },
  });
  console.log(`[Reset] Deleted ${result.deletedCount} seeded user(s)`);

  // Also delete their DoctorProfiles (if any)
  await db.collection('doctorprofiles').deleteMany({});
  console.log('[Reset] Cleared doctor profiles for seeded accounts');

  // Clear refresh tokens
  await db.collection('refreshtokens').deleteMany({});
  console.log('[Reset] Cleared all refresh tokens');

  // Clear old job postings seeded by hospital account
  await db.collection('jobpostings').deleteMany({});
  console.log('[Reset] Cleared seeded job postings');

  await mongoose.disconnect();
  console.log('\n✅ Done! Restart the server — fresh accounts will be seeded automatically.\n');
  process.exit(0);
}

reset().catch((err) => {
  console.error('[Reset Error]:', err);
  process.exit(1);
});
