/**
 * Comprehensive Firebase → Supabase Data Migration Script
 *
 * Migrates ALL data from Firebase (Firestore + Auth) to Supabase (PostgreSQL + Auth).
 *
 * Usage:
 *   npx tsx scripts/migrate-firebase-to-supabase.ts              # Dry run (read-only)
 *   npx tsx scripts/migrate-firebase-to-supabase.ts --execute     # Actually migrate
 *
 * Prerequisites:
 * - firebase-admin installed (devDependency)
 * - .env.local with:
 *     NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *     FIREBASE_SERVICE_ACCOUNT_PATH (path to firebase-service-account.json)
 *       OR place firebase-service-account.json in project root
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';
import { existsSync, readFileSync } from 'fs';

dotenv.config({ path: resolve(__dirname, '../.env.local') });

import * as admin from 'firebase-admin';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

// ============================================================
// CONFIG
// ============================================================

const DRY_RUN = !process.argv.includes('--execute');
const BATCH_SIZE = 100;

// ============================================================
// INITIALIZATION
// ============================================================

function initFirebase(): admin.app.App {
  const serviceAccountPath =
    process.env.FIREBASE_SERVICE_ACCOUNT_PATH ||
    resolve(__dirname, '../firebase-service-account.json');

  if (!existsSync(serviceAccountPath)) {
    console.error(`Firebase service account not found at: ${serviceAccountPath}`);
    console.error('Set FIREBASE_SERVICE_ACCOUNT_PATH in .env.local or place firebase-service-account.json in project root');
    process.exit(1);
  }

  const serviceAccount = JSON.parse(readFileSync(serviceAccountPath, 'utf-8'));

  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}

function initSupabase(): SupabaseClient {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local');
    process.exit(1);
  }

  return createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

// ============================================================
// HELPERS
// ============================================================

/** Safely extract a string from a value that may be string, object {fr, en, es}, or other */
function toStr(val: unknown, maxLen?: number): string | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'string') return maxLen ? val.slice(0, maxLen) : val;
  if (typeof val === 'number') return String(val);
  if (typeof val === 'object') {
    // Handle multilingual object like { fr: "...", en: "...", es: "..." }
    const obj = val as Record<string, unknown>;
    const text = obj.fr || obj.en || obj.es || Object.values(obj).find((v) => typeof v === 'string');
    if (typeof text === 'string') return maxLen ? text.slice(0, maxLen) : text;
    return null;
  }
  return null;
}

/** Safely extract i18n field: check flat field, then nested object, then fallback */
function i18nField(d: Record<string, unknown>, fieldBase: string, lang: string, fallback?: string): string | null {
  // Check flat snake_case field: title_fr, title_en, etc.
  const flat = d[`${fieldBase}_${lang}`];
  if (typeof flat === 'string' && flat.length > 0) return flat;

  // Check nested object: title: { fr: "...", en: "..." }
  const nested = d[fieldBase];
  if (typeof nested === 'object' && nested !== null && !Array.isArray(nested)) {
    const val = (nested as Record<string, unknown>)[lang];
    if (typeof val === 'string' && val.length > 0) return val;
  }

  // For primary language (fr), use the plain field as fallback
  if (lang === 'fr' && typeof nested === 'string') return nested;

  return fallback ?? null;
}

/** Convert Firestore Timestamp to ISO string */
function toISO(val: unknown): string | null {
  if (!val) return null;
  if (val instanceof admin.firestore.Timestamp) {
    return val.toDate().toISOString();
  }
  if (val instanceof Date) {
    return val.toISOString();
  }
  if (typeof val === 'string') {
    return val;
  }
  if (typeof val === 'object' && val !== null && '_seconds' in val) {
    const ts = val as { _seconds: number; _nanoseconds: number };
    return new Date(ts._seconds * 1000).toISOString();
  }
  return null;
}

/** Map Firebase category to valid PostgreSQL enum */
function mapCategory(cat: unknown): string {
  const catStr = typeof cat === 'string' ? cat.toLowerCase() : '';
  const mapping: Record<string, string> = {
    yoga: 'yoga',
    pilates: 'pilates',
    meditation: 'meditation',
    respiration: 'respiration',
    'auto-massage': 'auto-massage',
    // Firebase-specific values that need mapping
    wellness: 'yoga',
    mindfulness: 'meditation',
    breathing: 'respiration',
    massage: 'auto-massage',
  };
  return mapping[catStr] || 'yoga';
}

/** Read all documents from a Firestore collection (returns empty on error) */
async function readCollection(
  db: admin.firestore.Firestore,
  collectionPath: string
): Promise<{ id: string; data: admin.firestore.DocumentData }[]> {
  try {
    const snapshot = await db.collection(collectionPath).get();
    return snapshot.docs.map((doc) => ({ id: doc.id, data: doc.data() }));
  } catch (err) {
    console.warn(`  Warning: Could not read collection '${collectionPath}':`, (err as Error).message);
    return [];
  }
}

/** Read all documents from a Firestore sub-collection across all parent docs */
async function readSubCollections(
  db: admin.firestore.Firestore,
  parentCollection: string,
  subCollection: string
): Promise<{ parentId: string; id: string; data: admin.firestore.DocumentData }[]> {
  try {
    const parentDocs = await db.collection(parentCollection).listDocuments();
    const results: { parentId: string; id: string; data: admin.firestore.DocumentData }[] = [];

    for (const parentDoc of parentDocs) {
      const subDocs = await parentDoc.collection(subCollection).get();
      for (const doc of subDocs.docs) {
        results.push({ parentId: parentDoc.id, id: doc.id, data: doc.data() });
      }
    }

    return results;
  } catch (err) {
    console.warn(`  Warning: Could not read sub-collection '${parentCollection}/*/\${subCollection}':`, (err as Error).message);
    return [];
  }
}

/** Insert rows in batches into Supabase */
async function batchInsert(
  supabase: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  label: string
): Promise<number> {
  if (rows.length === 0) {
    console.log(`  [${label}] No rows to insert.`);
    return 0;
  }

  if (DRY_RUN) {
    console.log(`  [${label}] DRY RUN: Would insert ${rows.length} rows into ${table}`);
    return rows.length;
  }

  let inserted = 0;
  for (let i = 0; i < rows.length; i += BATCH_SIZE) {
    const batch = rows.slice(i, i + BATCH_SIZE);
    // Try upsert first, fall back to individual inserts on error
    const { error } = await supabase.from(table).upsert(batch, { onConflict: 'id', ignoreDuplicates: true });
    if (error) {
      // Try inserting one by one to skip only the problematic rows
      let batchInserted = 0;
      for (const row of batch) {
        const { error: rowError } = await supabase.from(table).upsert(row, { onConflict: 'id', ignoreDuplicates: true });
        if (rowError) {
          // Skip silently - likely duplicate on composite unique constraint
        } else {
          batchInserted++;
        }
      }
      inserted += batchInserted;
      if (batchInserted < batch.length) {
        console.warn(`  [${label}] Batch ${Math.floor(i / BATCH_SIZE) + 1}: ${batchInserted}/${batch.length} rows (${batch.length - batchInserted} skipped/errors)`);
      }
    } else {
      inserted += batch.length;
    }
  }

  console.log(`  [${label}] Inserted ${inserted}/${rows.length} rows into ${table}`);
  return inserted;
}

// ============================================================
// ID MAPPING
// ============================================================

const userIdMap = new Map<string, string>();
const programIdMap = new Map<string, string>();
const lessonIdMap = new Map<string, string>();
const subcategoryIdMap = new Map<string, string>();

/** First admin user ID - used as fallback for orphan author_id references */
let fallbackAdminId: string | null = null;

function mapUserId(firebaseUid: string): string | null {
  return userIdMap.get(firebaseUid) || null;
}

/** Map user ID with fallback to admin for special values like "admin-migration" */
function mapUserIdOrFallback(firebaseUid: string | undefined | null): string | null {
  if (!firebaseUid) return fallbackAdminId;
  return userIdMap.get(firebaseUid) || fallbackAdminId;
}

// ============================================================
// MIGRATION FUNCTIONS
// ============================================================

/**
 * Step 1: Migrate Firebase Auth users → Supabase Auth + public.users
 * Also handles Firestore-only users (profiles without Firebase Auth account)
 */
async function migrateUsers(
  firebaseApp: admin.app.App,
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 1: Migrating Users');
  console.log('========================================');

  // 1a. Read all Firebase Auth users
  const authUsers: admin.auth.UserRecord[] = [];
  let nextPageToken: string | undefined;
  do {
    const result = await admin.auth(firebaseApp).listUsers(1000, nextPageToken);
    authUsers.push(...result.users);
    nextPageToken = result.pageToken;
  } while (nextPageToken);
  console.log(`  Found ${authUsers.length} Firebase Auth users`);

  // 1b. Read Firestore users collection
  const firestoreUsers = await readCollection(db, 'users');
  const firestoreUserMap = new Map(firestoreUsers.map((u) => [u.id, u.data]));
  console.log(`  Found ${firestoreUsers.length} Firestore user profiles`);

  // Track which Firestore UIDs are covered by Auth users
  const authUids = new Set(authUsers.map((u) => u.uid));

  let created = 0;
  let skipped = 0;

  // 1c. Migrate Firebase Auth users
  for (const authUser of authUsers) {
    const profile = firestoreUserMap.get(authUser.uid) || {};
    const email = authUser.email || profile.email || `${authUser.uid.slice(0, 8)}@migrated.local`;

    if (DRY_RUN) {
      const fakeUuid = `00000000-0000-4000-8000-${authUser.uid.padStart(12, '0').slice(0, 12)}`;
      userIdMap.set(authUser.uid, fakeUuid);
      if (!fallbackAdminId) fallbackAdminId = fakeUuid;
      created++;
      continue;
    }

    try {
      const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
        email,
        email_confirm: true,
        phone: authUser.phoneNumber || undefined,
        user_metadata: {
          first_name: profile.first_name || profile.firstName || '',
          last_name: profile.last_name || profile.lastName || '',
          migrated_from_firebase: true,
          firebase_uid: authUser.uid,
        },
      });

      let supabaseUserId: string | null = null;

      if (authError) {
        if (authError.message?.includes('already been registered')) {
          const { data: existingUsers } = await supabase.auth.admin.listUsers();
          const existing = existingUsers?.users?.find((u) => u.email === email);
          if (existing) {
            supabaseUserId = existing.id;
            userIdMap.set(authUser.uid, supabaseUserId);
            if (!fallbackAdminId) fallbackAdminId = supabaseUserId;
            // Don't continue - fall through to upsert profile below
          } else {
            console.error(`  Failed to find existing auth user ${email}`);
            skipped++;
            continue;
          }
        } else {
          console.error(`  Failed to create auth user ${email}: ${authError.message}`);
          skipped++;
          continue;
        }
      } else if (!newUser?.user) {
        skipped++;
        continue;
      } else {
        supabaseUserId = newUser.user.id;
        userIdMap.set(authUser.uid, supabaseUserId);
        if (!fallbackAdminId) fallbackAdminId = supabaseUserId;
      }

      const firebaseRole = authUser.customClaims?.role || profile.role;
      const validRoles = ['admin', 'teacher', 'viewer', 'user'];
      const role = validRoles.includes(firebaseRole) ? firebaseRole : 'user';

      const planTier = profile.plan_tier || profile.planTier || 'free';
      const validTiers = ['free', 'premium', 'lifetime'];
      const tier = validTiers.includes(planTier) ? planTier : 'free';

      const { error: profileError } = await supabase.from('users').upsert({
        id: supabaseUserId,
        email,
        first_name: profile.first_name || profile.firstName || null,
        last_name: profile.last_name || profile.lastName || null,
        photo_url: profile.photo_url || profile.photoURL || authUser.photoURL || null,
        role,
        plan_tier: tier,
        language: profile.language || 'fr',
        is_fake: profile.is_fake || profile.isFake || false,
        disabled: authUser.disabled || false,
        last_login_at: toISO(authUser.metadata.lastSignInTime) || null,
        created_at: toISO(authUser.metadata.creationTime) || toISO(profile.created_at) || new Date().toISOString(),
        updated_at: toISO(profile.updated_at) || new Date().toISOString(),
      }, { onConflict: 'id' });

      if (profileError) {
        console.error(`  Failed to upsert profile for ${email}: ${profileError.message}`);
      } else {
        created++;
      }
    } catch (err) {
      console.error(`  Error migrating user ${email}:`, err);
      skipped++;
    }
  }

  // 1d. Migrate Firestore-only users (not in Firebase Auth)
  const firestoreOnlyUsers = firestoreUsers.filter((u) => !authUids.has(u.id));
  if (firestoreOnlyUsers.length > 0) {
    console.log(`  Found ${firestoreOnlyUsers.length} Firestore-only users (not in Auth)`);

    for (const fsUser of firestoreOnlyUsers) {
      const d = fsUser.data;
      const email = d.email || `${fsUser.id.slice(0, 8)}@migrated.local`;

      if (DRY_RUN) {
        const fakeUuid = `11111111-0000-4000-8000-${fsUser.id.padStart(12, '0').slice(0, 12)}`;
        userIdMap.set(fsUser.id, fakeUuid);
        created++;
        continue;
      }

      try {
        const { data: newUser, error: authError } = await supabase.auth.admin.createUser({
          email,
          email_confirm: true,
          user_metadata: {
            migrated_from_firebase: true,
            firebase_uid: fsUser.id,
            firestore_only: true,
          },
        });

        let fsUserId: string | null = null;

        if (authError) {
          if (authError.message?.includes('already been registered')) {
            const { data: existingUsers } = await supabase.auth.admin.listUsers();
            const existing = existingUsers?.users?.find((u) => u.email === email);
            if (existing) {
              fsUserId = existing.id;
              userIdMap.set(fsUser.id, fsUserId);
            } else {
              console.error(`  Failed to find existing Firestore-only user ${email}`);
              skipped++;
              continue;
            }
          } else {
            console.error(`  Failed to create Firestore-only user ${email}: ${authError.message}`);
            skipped++;
            continue;
          }
        } else if (newUser?.user) {
          fsUserId = newUser.user.id;
          userIdMap.set(fsUser.id, fsUserId);
        }

        if (fsUserId) {
          const role = ['admin', 'teacher', 'viewer', 'user'].includes(d.role) ? d.role : 'user';
          const tier = ['free', 'premium', 'lifetime'].includes(d.plan_tier) ? d.plan_tier : 'free';

          await supabase.from('users').upsert({
            id: fsUserId,
            email,
            first_name: d.first_name || d.firstName || null,
            last_name: d.last_name || d.lastName || null,
            photo_url: d.photo_url || d.photoURL || null,
            role,
            plan_tier: tier,
            language: d.language || 'fr',
            is_fake: d.is_fake || d.isFake || false,
            disabled: d.disabled || false,
            created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
            updated_at: toISO(d.updated_at || d.updatedAt) || new Date().toISOString(),
          }, { onConflict: 'id' });
          created++;
        }
      } catch (err) {
        console.error(`  Error migrating Firestore-only user ${fsUser.id}:`, err);
        skipped++;
      }
    }
  }

  console.log(`  Users: ${created} created, ${skipped} skipped`);
  console.log(`  User ID mappings: ${userIdMap.size}`);
  console.log(`  Fallback admin ID: ${fallbackAdminId || 'NONE'}`);
}

/**
 * Step 2: Migrate Programs
 */
async function migratePrograms(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 2: Migrating Programs');
  console.log('========================================');

  const programs = await readCollection(db, 'programs');
  console.log(`  Found ${programs.length} programs in Firestore`);

  const rows: Record<string, unknown>[] = [];

  for (const doc of programs) {
    const d = doc.data;

    // Resolve author - use mapping or fallback to admin
    const rawAuthorId = d.author_id || d.authorId;
    const authorId = mapUserIdOrFallback(rawAuthorId);

    if (!authorId) {
      console.warn(`  Skipping program "${toStr(d.title) || doc.id}" - no author_id available`);
      continue;
    }

    const category = mapCategory(d.category);

    const validDifficulties = ['beginner', 'intermediate', 'advanced'];
    const difficulty = validDifficulties.includes(d.difficulty) ? d.difficulty : 'beginner';

    const validStatuses = ['draft', 'published', 'archived'];
    const status = validStatuses.includes(d.status) ? d.status : 'draft';

    const newId = crypto.randomUUID();
    programIdMap.set(doc.id, newId);

    // Extract title - can be string or multilingual object
    const title = i18nField(d, 'title', 'fr', 'Sans titre') || 'Sans titre';
    const description = i18nField(d, 'description', 'fr', 'Pas de description') || 'Pas de description';

    rows.push({
      id: newId,
      title: title.slice(0, 100),
      description: description.slice(0, 1000),
      category,
      difficulty,
      duration_days: Math.max(1, Math.min(365, d.duration_days || d.durationDays || 7)),
      cover_image_url: d.cover_image_url || d.coverImageUrl || null,
      cover_storage_path: d.cover_storage_path || d.coverStoragePath || null,
      status,
      author_id: authorId,
      tags: Array.isArray(d.tags) ? d.tags : [],
      lessons: [], // Updated after lesson migration
      media_count: d.media_count || d.mediaCount || 0,
      scheduled_publish_at: toISO(d.scheduled_publish_at || d.scheduledPublishAt),
      scheduled_archive_at: toISO(d.scheduled_archive_at || d.scheduledArchiveAt),
      auto_publish_enabled: d.auto_publish_enabled || d.autoPublishEnabled || false,
      created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
      updated_at: toISO(d.updated_at || d.updatedAt) || new Date().toISOString(),
    });
  }

  await batchInsert(supabase, 'programs', rows, 'Programs');
}

/**
 * Step 3: Migrate Lessons
 */
async function migrateLessons(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 3: Migrating Lessons');
  console.log('========================================');

  const lessons = await readCollection(db, 'lessons');
  console.log(`  Found ${lessons.length} lessons in Firestore`);

  const rows = lessons.map((doc) => {
    const d = doc.data;
    const newId = crypto.randomUUID();
    lessonIdMap.set(doc.id, newId);

    const validTypes = ['video', 'audio'];
    const type = validTypes.includes(d.type) ? d.type : 'video';

    const validStatuses = ['draft', 'uploading', 'processing', 'ready', 'failed'];
    const status = validStatuses.includes(d.status) ? d.status : 'draft';

    const programId = d.program_id || d.programId;
    const mappedProgramId = programId ? (programIdMap.get(programId) || null) : null;

    const authorId = d.author_id || d.authorId;
    const mappedAuthorId = authorId ? (mapUserId(authorId) || fallbackAdminId) : null;

    return {
      id: newId,
      // i18n fields
      title_fr: i18nField(d, 'title', 'fr', 'Sans titre') || 'Sans titre',
      title_en: i18nField(d, 'title', 'en'),
      title_es: i18nField(d, 'title', 'es'),
      description_fr: i18nField(d, 'description', 'fr'),
      description_en: i18nField(d, 'description', 'en'),
      description_es: i18nField(d, 'description', 'es'),
      category_fr: i18nField(d, 'category', 'fr'),
      category_en: i18nField(d, 'category', 'en'),
      category_es: i18nField(d, 'category', 'es'),
      transcript_fr: i18nField(d, 'transcript', 'fr'),
      transcript_en: i18nField(d, 'transcript', 'en'),
      transcript_es: i18nField(d, 'transcript', 'es'),
      ambient_sound_name_fr: i18nField(d, 'ambient_sound_name', 'fr'),
      ambient_sound_name_en: i18nField(d, 'ambient_sound_name', 'en'),
      ambient_sound_name_es: i18nField(d, 'ambient_sound_name', 'es'),
      breathing_instruction_fr: i18nField(d, 'breathing_instruction', 'fr'),
      breathing_instruction_en: i18nField(d, 'breathing_instruction', 'en'),
      breathing_instruction_es: i18nField(d, 'breathing_instruction', 'es'),
      // Core fields
      type,
      program_id: mappedProgramId,
      order: d.order || 0,
      duration_sec: d.duration_sec || d.durationSec || d.duration || null,
      tags: Array.isArray(d.tags) ? d.tags : [],
      status,
      // Media
      storage_path_original: d.storage_path_original || d.storagePathOriginal || d.storagePath || null,
      renditions: d.renditions || {},
      audio_variants: d.audio_variants || d.audioVariants || {},
      codec: d.codec || null,
      size_bytes: d.size_bytes || d.sizeBytes || null,
      mime_type: d.mime_type || d.mimeType || null,
      thumbnail_url: d.thumbnail_url || d.thumbnailUrl || d.thumbnailURL || null,
      preview_image_url: d.preview_image_url || d.previewImageUrl || null,
      preview_storage_path: d.preview_storage_path || d.previewStoragePath || null,
      // Metadata
      author_id: mappedAuthorId,
      subcategory_id: null,
      subcategory_slug: d.subcategory_slug || d.subcategorySlug || null,
      // Specialized content
      chapters: d.chapters || null,
      body_zones: d.body_zones || d.bodyZones || null,
      phases: d.phases || null,
      yoga_poses: d.yoga_poses || d.yogaPoses || null,
      // Aspect ratio
      source_aspect_ratio: d.source_aspect_ratio || d.sourceAspectRatio || null,
      output_aspect_ratio: d.output_aspect_ratio || d.outputAspectRatio || null,
      aspect_conversion_mode: d.aspect_conversion_mode || d.aspectConversionMode || null,
      // Scheduling
      scheduled_publish_at: toISO(d.scheduled_publish_at || d.scheduledPublishAt),
      scheduled_archive_at: toISO(d.scheduled_archive_at || d.scheduledArchiveAt),
      auto_publish_enabled: d.auto_publish_enabled || d.autoPublishEnabled || false,
      created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
      updated_at: toISO(d.updated_at || d.updatedAt) || new Date().toISOString(),
    };
  });

  await batchInsert(supabase, 'lessons', rows, 'Lessons');

  // Update programs.lessons arrays with new lesson UUIDs
  console.log('  Updating programs.lessons arrays with new lesson IDs...');
  const programs = await readCollection(db, 'programs');
  let updatedCount = 0;
  for (const prog of programs) {
    const newProgramId = programIdMap.get(prog.id);
    if (!newProgramId) continue;

    const oldLessonIds: string[] = Array.isArray(prog.data.lessons) ? prog.data.lessons : [];
    const newLessonIds = oldLessonIds
      .map((oldId: string) => lessonIdMap.get(oldId))
      .filter(Boolean);

    if (newLessonIds.length > 0) {
      if (DRY_RUN) {
        updatedCount++;
      } else {
        const { error } = await supabase
          .from('programs')
          .update({ lessons: newLessonIds })
          .eq('id', newProgramId);
        if (error) {
          console.error(`  Failed to update lessons for program ${newProgramId}: ${error.message}`);
        } else {
          updatedCount++;
        }
      }
    }
  }
  console.log(`  ${DRY_RUN ? 'Would update' : 'Updated'} lessons arrays for ${updatedCount} programs`);
}

/**
 * Step 4: Migrate Subcategories
 */
async function migrateSubcategories(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 4: Migrating Subcategories');
  console.log('========================================');

  const subcategories = await readCollection(db, 'subcategories');
  console.log(`  Found ${subcategories.length} subcategories in Firestore`);

  const rows = subcategories.map((doc) => {
    const d = doc.data;
    const newId = crypto.randomUUID();
    subcategoryIdMap.set(doc.id, newId);

    const category = mapCategory(d.category);

    const validStatuses = ['active', 'inactive'];
    const status = validStatuses.includes(d.status) ? d.status : 'active';

    const createdBy = d.created_by || d.createdBy;
    const mappedCreatedBy = createdBy ? (mapUserId(createdBy) || fallbackAdminId) : null;

    const nameFr = i18nField(d, 'name', 'fr') || toStr(d.name, 100) || 'Sans nom';

    return {
      id: newId,
      category,
      name_fr: nameFr.slice(0, 100),
      name_en: i18nField(d, 'name', 'en'),
      name_es: i18nField(d, 'name', 'es'),
      description_fr: i18nField(d, 'description', 'fr'),
      description_en: i18nField(d, 'description', 'en'),
      description_es: i18nField(d, 'description', 'es'),
      slug: (typeof d.slug === 'string' ? d.slug : doc.id).slice(0, 100),
      display_order: d.display_order || d.displayOrder || 0,
      icon_url: d.icon_url || d.iconUrl || null,
      status,
      created_by: mappedCreatedBy,
      created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
      updated_at: toISO(d.updated_at || d.updatedAt) || new Date().toISOString(),
    };
  });

  await batchInsert(supabase, 'subcategories', rows, 'Subcategories');
}

/**
 * Step 5: Migrate Onboarding Configs
 */
async function migrateOnboardingConfigs(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 5: Migrating Onboarding Configs');
  console.log('========================================');

  const configs = await readCollection(db, 'onboarding_configs');
  console.log(`  Found ${configs.length} onboarding configs in Firestore`);

  const rows = configs.map((doc) => {
    const d = doc.data;

    const validStatuses = ['draft', 'active', 'archived'];
    const status = validStatuses.includes(d.status) ? d.status : 'draft';

    const createdBy = d.created_by || d.createdBy;
    const publishedBy = d.published_by || d.publishedBy;

    const title = toStr(d.title, 200) || 'Untitled';
    const description = toStr(d.description, 1000) || 'No description';

    return {
      id: crypto.randomUUID(),
      title: title.length >= 3 ? title : title.padEnd(3, '.'),
      description: description.length >= 10 ? description : description.padEnd(10, '.'),
      status,
      version: d.version || '1.0',
      questions: d.questions || [],
      information_screens: d.information_screens || d.informationScreens || [],
      recommendation_rules: d.recommendation_rules || d.recommendationRules || [],
      created_by: createdBy ? (mapUserId(createdBy) || fallbackAdminId) : null,
      published_at: toISO(d.published_at || d.publishedAt),
      published_by: publishedBy ? (mapUserId(publishedBy) || fallbackAdminId) : null,
      created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
      updated_at: toISO(d.updated_at || d.updatedAt) || new Date().toISOString(),
    };
  });

  await batchInsert(supabase, 'onboarding_configs', rows, 'Onboarding');
}

/**
 * Step 6: Migrate Audit Logs
 */
async function migrateAuditLogs(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 6: Migrating Audit Logs');
  console.log('========================================');

  const logs = await readCollection(db, 'audit_logs');
  console.log(`  Found ${logs.length} audit logs in Firestore`);

  const validActions = [
    'create', 'update', 'delete', 'role_change', 'status_change',
    'email_sent', 'email_send_failed',
    'onboarding_created', 'onboarding_updated', 'onboarding_published',
    'onboarding_deleted', 'onboarding_exported',
  ];
  const validResourceTypes = [
    'user', 'program', 'lesson', 'onboarding_config', 'subcategory',
    'email', 'onboarding_responses', 'email_template',
  ];

  const rows = logs.map((doc) => {
    const d = doc.data;

    let action = String(d.action || 'update').replace(/\./g, '_');
    if (!validActions.includes(action)) action = 'update';

    let resourceType = String(d.resource_type || d.resourceType || 'lesson').replace(/\./g, '_');
    if (!validResourceTypes.includes(resourceType)) resourceType = 'lesson';

    const actorId = d.actor_id || d.actorId;

    return {
      id: crypto.randomUUID(),
      action,
      resource_type: resourceType,
      resource_id: String(d.resource_id || d.resourceId || doc.id),
      actor_id: actorId ? mapUserId(actorId) : null,
      actor_email: d.actor_email || d.actorEmail || null,
      changes: d.changes || null,
      ip_address: d.ip_address || d.ipAddress || null,
      user_agent: d.user_agent || d.userAgent || null,
      created_at: toISO(d.created_at || d.createdAt || d.timestamp) || new Date().toISOString(),
    };
  });

  await batchInsert(supabase, 'audit_logs', rows, 'AuditLogs');
}

/**
 * Step 7: Migrate User Sessions (sub-collection users/{uid}/sessions)
 */
async function migrateUserSessions(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 7: Migrating User Sessions');
  console.log('========================================');

  const sessions = await readSubCollections(db, 'users', 'sessions');
  console.log(`  Found ${sessions.length} user sessions across all users`);

  const rows = sessions
    .map((s) => {
      const userId = mapUserId(s.parentId);
      if (!userId) return null;

      const d = s.data;
      const lessonId = d.lesson_id || d.lessonId;

      return {
        id: crypto.randomUUID(),
        user_id: userId,
        practice_type: d.practice_type || d.practiceType || null,
        started_at: toISO(d.started_at || d.startedAt),
        duration_sec: d.duration_sec || d.durationSec || d.duration || null,
        lesson_id: lessonId ? (lessonIdMap.get(lessonId) || null) : null,
        metadata: d.metadata || null,
        created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  await batchInsert(supabase, 'user_sessions', rows, 'UserSessions');
}

/**
 * Step 8: Migrate User Practice Stats
 */
async function migrateUserPracticeStats(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 8: Migrating User Practice Stats');
  console.log('========================================');

  const stats = await readSubCollections(db, 'users', 'practiceStats');
  console.log(`  Found ${stats.length} practice stats across all users`);

  const rows = stats
    .map((s) => {
      const userId = mapUserId(s.parentId);
      if (!userId) return null;

      const d = s.data;
      return {
        id: crypto.randomUUID(),
        user_id: userId,
        practice_type: d.practice_type || d.practiceType || s.id,
        total_sessions: d.total_sessions || d.totalSessions || 0,
        total_duration_sec: d.total_duration_sec || d.totalDurationSec || 0,
        streak_days: d.streak_days || d.streakDays || 0,
        updated_at: toISO(d.updated_at || d.updatedAt) || new Date().toISOString(),
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  await batchInsert(supabase, 'user_practice_stats', rows, 'PracticeStats');
}

/**
 * Step 9: Migrate User Daily Journal
 */
async function migrateUserDailyJournal(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 9: Migrating User Daily Journal');
  console.log('========================================');

  const journals = await readSubCollections(db, 'users', 'dailyJournal');
  console.log(`  Found ${journals.length} journal entries across all users`);

  const rows = journals
    .map((j) => {
      const userId = mapUserId(j.parentId);
      if (!userId) return null;

      const d = j.data;
      const date = d.date || j.id;

      return {
        id: crypto.randomUUID(),
        user_id: userId,
        date: typeof date === 'string' ? date : new Date().toISOString().split('T')[0],
        content: d.content || d,
        created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  await batchInsert(supabase, 'user_daily_journal', rows, 'DailyJournal');
}

/**
 * Step 10: Migrate User Stats
 */
async function migrateUserStats(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 10: Migrating User Stats');
  console.log('========================================');

  const stats = await readCollection(db, 'stats');
  console.log(`  Found ${stats.length} user stats documents`);

  const rows = stats
    .map((doc) => {
      const userId = mapUserId(doc.id);
      if (!userId) return null;

      return {
        id: crypto.randomUUID(),
        user_id: userId,
        data: doc.data,
        updated_at: toISO(doc.data.updated_at || doc.data.updatedAt) || new Date().toISOString(),
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  await batchInsert(supabase, 'user_stats', rows, 'UserStats');
}

/**
 * Step 11: Migrate Gratitude Entries
 */
async function migrateGratitudeEntries(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 11: Migrating Gratitude Entries');
  console.log('========================================');

  const entries = await readSubCollections(db, 'gratitudes', 'entries');
  console.log(`  Found ${entries.length} gratitude entries across all users`);

  const rows = entries
    .map((e) => {
      const userId = mapUserId(e.parentId);
      if (!userId) return null;

      const d = e.data;
      const date = d.date || e.id;

      return {
        id: crypto.randomUUID(),
        user_id: userId,
        date: typeof date === 'string' ? date : new Date().toISOString().split('T')[0],
        content: d.content || d,
        created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  await batchInsert(supabase, 'gratitude_entries', rows, 'GratitudeEntries');
}

/**
 * Step 12: Migrate User Program Enrollments
 */
async function migrateUserProgramEnrollments(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 12: Migrating Program Enrollments');
  console.log('========================================');

  const enrollments = await readSubCollections(db, 'user_programs', 'enrolled');
  console.log(`  Found ${enrollments.length} program enrollments across all users`);

  const rows = enrollments
    .map((e) => {
      const userId = mapUserId(e.parentId);
      if (!userId) return null;

      const d = e.data;
      const programId = d.program_id || d.programId || e.id;
      const mappedProgramId = programIdMap.get(programId);
      if (!mappedProgramId) return null;

      return {
        id: crypto.randomUUID(),
        user_id: userId,
        program_id: mappedProgramId,
        current_day: d.current_day || d.currentDay || 1,
        is_completed: d.is_completed || d.isCompleted || false,
        started_at: toISO(d.started_at || d.startedAt) || new Date().toISOString(),
        completed_at: toISO(d.completed_at || d.completedAt),
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  await batchInsert(supabase, 'user_program_enrollments', rows, 'Enrollments');
}

/**
 * Step 13: Migrate Media
 */
async function migrateMedia(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 13: Migrating Media Records');
  console.log('========================================');

  const media = await readCollection(db, 'media');
  console.log(`  Found ${media.length} media records in Firestore`);

  const rows = media.map((doc) => {
    const d = doc.data;
    const uploadedBy = d.uploaded_by || d.uploadedBy;

    return {
      id: crypto.randomUUID(),
      type: d.type || 'video',
      storage_path: d.storage_path || d.storagePath || '',
      mime_type: d.mime_type || d.mimeType || null,
      size_bytes: d.size_bytes || d.sizeBytes || null,
      uploaded_by: uploadedBy ? mapUserId(uploadedBy) : null,
      linked_to: d.linked_to || d.linkedTo || null,
      upload_type: d.upload_type || d.uploadType || null,
      created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
    };
  });

  await batchInsert(supabase, 'media', rows, 'Media');
}

/**
 * Step 14: Migrate Command Logs
 */
async function migrateCommandLogs(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 14: Migrating Command Logs');
  console.log('========================================');

  const logs = await readCollection(db, 'command_logs');
  console.log(`  Found ${logs.length} command logs in Firestore`);

  const rows = logs.map((doc) => {
    const d = doc.data;
    return {
      id: crypto.randomUUID(),
      command_name: d.command_name || d.commandName || 'unknown',
      status: d.status || 'unknown',
      started_at: toISO(d.started_at || d.startedAt),
      completed_at: toISO(d.completed_at || d.completedAt),
      executed_by: d.executed_by || d.executedBy || null,
      output: d.output || null,
      error: d.error || null,
      duration_ms: d.duration_ms || d.durationMs || null,
      metadata: d.metadata || null,
      created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
    };
  });

  await batchInsert(supabase, 'command_logs', rows, 'CommandLogs');
}

/**
 * Step 15: Migrate Email Logs
 */
async function migrateEmailLogs(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 15: Migrating Email Logs');
  console.log('========================================');

  const logs = await readCollection(db, 'email_logs');
  console.log(`  Found ${logs.length} email logs in Firestore`);

  const rows = logs.map((doc) => {
    const d = doc.data;
    const recipientUid = d.recipient_uid || d.recipientUid;

    return {
      id: crypto.randomUUID(),
      email_type: d.email_type || d.emailType || 'unknown',
      recipient_uid: recipientUid ? mapUserId(recipientUid) : null,
      recipient_email: d.recipient_email || d.recipientEmail || null,
      language: d.language || 'fr',
      status: d.status || 'unknown',
      error_message: d.error_message || d.errorMessage || null,
      sent_at: toISO(d.sent_at || d.sentAt),
      created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
    };
  });

  await batchInsert(supabase, 'email_logs', rows, 'EmailLogs');
}

/**
 * Step 16: Migrate Email Preferences
 */
async function migrateEmailPreferences(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 16: Migrating Email Preferences');
  console.log('========================================');

  const prefs = await readCollection(db, 'email_preferences');
  console.log(`  Found ${prefs.length} email preference records`);

  const rows = prefs
    .map((doc) => {
      const d = doc.data;
      const userId = mapUserId(doc.id) || (d.user_id ? mapUserId(d.user_id) : null);
      if (!userId) return null;

      return {
        id: crypto.randomUUID(),
        user_id: userId,
        marketing: d.marketing !== undefined ? d.marketing : true,
        digest: d.digest !== undefined ? d.digest : true,
        inactivity: d.inactivity !== undefined ? d.inactivity : true,
        updated_at: toISO(d.updated_at || d.updatedAt) || new Date().toISOString(),
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  await batchInsert(supabase, 'email_preferences', rows, 'EmailPrefs');
}

/**
 * Step 17: Migrate User Recommendations
 */
async function migrateUserRecommendations(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 17: Migrating User Recommendations');
  console.log('========================================');

  const recs = await readCollection(db, 'user_recommendations');
  console.log(`  Found ${recs.length} recommendation records`);

  const rows = recs
    .map((doc) => {
      const d = doc.data;
      const userId = mapUserId(doc.id) || (d.user_id ? mapUserId(d.user_id) : null);
      if (!userId) return null;

      return {
        id: crypto.randomUUID(),
        user_id: userId,
        recommendations: d.recommendations || d,
        generated_at: toISO(d.generated_at || d.generatedAt) || new Date().toISOString(),
        created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
      };
    })
    .filter(Boolean) as Record<string, unknown>[];

  await batchInsert(supabase, 'user_recommendations', rows, 'Recommendations');
}

/**
 * Step 18: Migrate Daily Needs Categories (extra collection)
 */
async function migrateDailyNeedsCategories(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 18: Migrating Daily Needs Categories');
  console.log('========================================');

  const categories = await readCollection(db, 'daily_needs_categories');
  console.log(`  Found ${categories.length} daily needs categories`);

  if (categories.length === 0) return;

  const rows = categories.map((doc) => {
    const d = doc.data;
    return {
      id: crypto.randomUUID(),
      slug: d.id || doc.id,
      name_fr: d.name_fr || null,
      name_en: d.name_en || null,
      description_fr: d.description_fr || null,
      description_en: d.description_en || null,
      icon_url: d.icon_url || null,
      color_hex: d.color_hex || null,
      filter_tags: Array.isArray(d.filter_tags) ? d.filter_tags : [],
      lesson_ids: Array.isArray(d.lesson_ids) ? d.lesson_ids : [],
      is_active: d.is_active !== undefined ? d.is_active : true,
      display_order: d.order || d.display_order || 0,
      created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
      updated_at: toISO(d.updated_at || d.updatedAt) || new Date().toISOString(),
    };
  });

  await batchInsert(supabase, 'daily_needs_categories', rows, 'DailyNeedsCats');
}

/**
 * Step 19: Migrate Email Stats (extra collection)
 */
async function migrateEmailStats(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 19: Migrating Email Stats');
  console.log('========================================');

  const stats = await readCollection(db, 'email_stats');
  console.log(`  Found ${stats.length} email stats records`);

  if (stats.length === 0) return;

  const rows = stats.map((doc) => {
    const d = doc.data;
    return {
      id: crypto.randomUUID(),
      date: d.date || doc.id,
      sent: d.sent || 0,
      delivered: d.delivered || 0,
      opened: d.opened || 0,
      clicked: d.clicked || 0,
      bounced: d.bounced || 0,
      complained: d.complained || 0,
      created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
      updated_at: toISO(d.updated_at || d.updatedAt) || new Date().toISOString(),
    };
  });

  await batchInsert(supabase, 'email_stats', rows, 'EmailStats');
}

/**
 * Step 20: Migrate Email Tracking (extra collection)
 */
async function migrateEmailTracking(
  db: admin.firestore.Firestore,
  supabase: SupabaseClient
) {
  console.log('\n========================================');
  console.log('STEP 20: Migrating Email Tracking');
  console.log('========================================');

  const tracking = await readCollection(db, 'email_tracking');
  console.log(`  Found ${tracking.length} email tracking records`);

  if (tracking.length === 0) return;

  const rows = tracking.map((doc) => {
    const d = doc.data;
    return {
      id: crypto.randomUUID(),
      resend_id: d.resend_id || null,
      recipient_email: d.recipient_email || null,
      subject: d.subject || null,
      event_type: d.event_type || 'unknown',
      event_data: d.event_data || null,
      created_at: toISO(d.created_at || d.createdAt) || new Date().toISOString(),
    };
  });

  await batchInsert(supabase, 'email_tracking', rows, 'EmailTracking');
}

// ============================================================
// MAIN
// ============================================================

async function discoverCollections(db: admin.firestore.Firestore): Promise<string[]> {
  const collections = await db.listCollections();
  return collections.map((c) => c.id);
}

async function main() {
  console.log('='.repeat(60));
  console.log('  Firebase -> Supabase Data Migration');
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN (read-only)' : 'EXECUTE (writing data)'}`);
  console.log('='.repeat(60));

  if (!DRY_RUN) {
    console.log('\n  WARNING: This will write data to Supabase!');
    console.log('  Press Ctrl+C within 5 seconds to abort...\n');
    await new Promise((r) => setTimeout(r, 5000));
  }

  const firebaseApp = initFirebase();
  const db = admin.firestore(firebaseApp);
  const supabase = initSupabase();

  // Discover
  console.log('\n--- Discovering Firestore collections ---');
  const collections = await discoverCollections(db);
  console.log(`  Found collections: ${collections.join(', ')}`);

  const startTime = Date.now();

  // Core migration (order matters for FK constraints)
  await migrateUsers(firebaseApp, db, supabase);
  await migratePrograms(db, supabase);
  await migrateLessons(db, supabase);
  await migrateSubcategories(db, supabase);
  await migrateOnboardingConfigs(db, supabase);
  await migrateAuditLogs(db, supabase);
  await migrateUserSessions(db, supabase);
  await migrateUserPracticeStats(db, supabase);
  await migrateUserDailyJournal(db, supabase);
  await migrateUserStats(db, supabase);
  await migrateGratitudeEntries(db, supabase);
  await migrateUserProgramEnrollments(db, supabase);
  await migrateMedia(db, supabase);
  await migrateCommandLogs(db, supabase);
  await migrateEmailLogs(db, supabase);
  await migrateEmailPreferences(db, supabase);
  await migrateUserRecommendations(db, supabase);

  // Extra collections discovered in Firebase
  await migrateDailyNeedsCategories(db, supabase);
  await migrateEmailStats(db, supabase);
  await migrateEmailTracking(db, supabase);

  // Check for anything still unmigrated
  const knownCollections = [
    'users', 'programs', 'lessons', 'subcategories', 'audit_logs',
    'onboarding_configs', 'stats', 'gratitudes', 'user_programs',
    'media', 'command_logs', 'email_logs', 'email_preferences',
    'user_recommendations', 'daily_needs_categories', 'email_stats',
    'email_tracking', 'user_onboarding',
  ];
  const unmigrated = collections.filter((c) => !knownCollections.includes(c));
  if (unmigrated.length > 0) {
    console.log('\n========================================');
    console.log('UNMIGRATED COLLECTIONS:');
    console.log('========================================');
    for (const col of unmigrated) {
      const docs = await readCollection(db, col);
      console.log(`  - ${col}: ${docs.length} documents`);
      if (docs.length > 0) {
        console.log(`    Sample fields: ${Object.keys(docs[0].data).join(', ')}`);
      }
    }
  }

  // Summary
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log('\n' + '='.repeat(60));
  console.log('  MIGRATION COMPLETE');
  console.log(`  Duration: ${elapsed}s`);
  console.log(`  Mode: ${DRY_RUN ? 'DRY RUN' : 'EXECUTED'}`);
  console.log(`  Users mapped: ${userIdMap.size}`);
  console.log(`  Programs mapped: ${programIdMap.size}`);
  console.log(`  Lessons mapped: ${lessonIdMap.size}`);
  console.log(`  Subcategories mapped: ${subcategoryIdMap.size}`);
  console.log('='.repeat(60));

  if (DRY_RUN) {
    console.log('\n  To execute the migration, run:');
    console.log('  npx tsx scripts/migrate-firebase-to-supabase.ts --execute\n');
  }

  // Save ID mapping
  if (!DRY_RUN) {
    const { writeFileSync } = await import('fs');
    const mapping = {
      users: Object.fromEntries(userIdMap),
      programs: Object.fromEntries(programIdMap),
      lessons: Object.fromEntries(lessonIdMap),
      subcategories: Object.fromEntries(subcategoryIdMap),
      migrated_at: new Date().toISOString(),
    };
    const mappingPath = resolve(__dirname, '../migration-id-mapping.json');
    writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));
    console.log(`\n  ID mapping saved to: ${mappingPath}`);
  }

  await firebaseApp.delete();
  process.exit(0);
}

main().catch((err) => {
  console.error('Migration failed:', err);
  process.exit(1);
});
