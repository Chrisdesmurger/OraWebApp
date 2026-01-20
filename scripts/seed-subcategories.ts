/**
 * Script de seed pour créer les sous-catégories initiales
 *
 * Usage: npx tsx scripts/seed-subcategories.ts
 *
 * Prerequisites:
 * - Set FIREBASE_SERVICE_ACCOUNT_JSON in .env.local
 */

import * as dotenv from 'dotenv';
import { resolve } from 'path';

// Load .env.local
dotenv.config({ path: resolve(__dirname, '../.env.local') });

import { getFirestore } from '../lib/firebase/admin';
import { generateSlug, type SubcategoryDocument } from '../types/subcategory';
import type { LessonCategory } from '../types/lesson';

interface SubcategoryData {
  category: LessonCategory;
  nameFr: string;
  nameEn: string;
  nameEs?: string;
  displayOrder: number;
}

// Initial subcategories based on the plan
const SUBCATEGORIES: SubcategoryData[] = [
  // Yoga
  { category: 'yoga', nameFr: 'Soulager les maux', nameEn: 'Relieve Pain', displayOrder: 0 },
  { category: 'yoga', nameFr: 'Routines du quotidien', nameEn: 'Daily Routines', displayOrder: 1 },

  // Pilates (Yoga Fit)
  { category: 'pilates', nameFr: 'Full body', nameEn: 'Full Body', displayOrder: 0 },
  { category: 'pilates', nameFr: 'Bras', nameEn: 'Arms', displayOrder: 1 },
  { category: 'pilates', nameFr: 'Jambes', nameEn: 'Legs', displayOrder: 2 },
  { category: 'pilates', nameFr: 'Fesses', nameEn: 'Glutes', displayOrder: 3 },

  // Auto-massage
  { category: 'auto-massage', nameFr: 'Visage', nameEn: 'Face', displayOrder: 0 },
  { category: 'auto-massage', nameFr: 'Corps', nameEn: 'Body', displayOrder: 1 },

  // Meditation
  { category: 'meditation', nameFr: 'Routine du matin', nameEn: 'Morning Routine', displayOrder: 0 },
  { category: 'meditation', nameFr: 'Épanouissement et confiance en soi', nameEn: 'Growth & Self-Confidence', displayOrder: 1 },
  { category: 'meditation', nameFr: 'Stress/anxiété', nameEn: 'Stress/Anxiety', displayOrder: 2 },
  { category: 'meditation', nameFr: 'Routine du soir', nameEn: 'Evening Routine', displayOrder: 3 },
  { category: 'meditation', nameFr: 'En mouvement', nameEn: 'In Motion', displayOrder: 4 },

  // Respiration (Breathing)
  { category: 'respiration', nameFr: 'Respiration Énergies et Émotions', nameEn: 'Energy & Emotion Breathing', displayOrder: 0 },
  { category: 'respiration', nameFr: 'Respiration calmantes et équilibrantes', nameEn: 'Calming & Balancing Breathing', displayOrder: 1 },
];

async function seedSubcategories() {
  console.log('Seeding subcategories...\n');

  const db = getFirestore();
  const subcategoriesRef = db.collection('subcategories');

  // Check existing subcategories
  const existingSnapshot = await subcategoriesRef.get();
  if (!existingSnapshot.empty) {
    console.log(`Found ${existingSnapshot.size} existing subcategories.`);
    console.log('Do you want to skip existing ones? (Script will only add new ones)\n');
  }

  const existingSlugs = new Map<string, Set<string>>();
  existingSnapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (!existingSlugs.has(data.category)) {
      existingSlugs.set(data.category, new Set());
    }
    existingSlugs.get(data.category)!.add(data.slug);
  });

  const now = new Date().toISOString();
  let created = 0;
  let skipped = 0;

  for (const sub of SUBCATEGORIES) {
    const slug = generateSlug(sub.nameFr);

    // Check if already exists
    if (existingSlugs.get(sub.category)?.has(slug)) {
      console.log(`  [SKIP] ${sub.category}/${slug} already exists`);
      skipped++;
      continue;
    }

    const docData: SubcategoryDocument = {
      category: sub.category,
      name_fr: sub.nameFr,
      name_en: sub.nameEn,
      name_es: sub.nameEs,
      slug,
      display_order: sub.displayOrder,
      status: 'active',
      created_by: 'system',
      created_at: now,
      updated_at: now,
    };

    // Filter out undefined values
    const filteredData = Object.fromEntries(
      Object.entries(docData).filter(([_, v]) => v !== undefined)
    ) as SubcategoryDocument;

    await subcategoriesRef.add(filteredData);
    console.log(`  [CREATE] ${sub.category}/${slug}: "${sub.nameFr}"`);
    created++;
  }

  console.log('\n----------------------------');
  console.log(`Created: ${created}`);
  console.log(`Skipped: ${skipped}`);
  console.log('----------------------------\n');

  console.log('Seed completed!');
}

// Run the script
seedSubcategories()
  .then(() => {
    console.log('\nScript finished successfully.');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\nScript failed with error:', error);
    process.exit(1);
  });
