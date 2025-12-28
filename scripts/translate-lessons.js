#!/usr/bin/env node

/**
 * translate-lessons.js
 *
 * Adds i18n fields to all lessons and programs in Firestore
 *
 * Usage:
 *   node scripts/translate-lessons.js [--dry-run] [--lessons] [--programs]
 */

const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

// Load service account from Ora firebase directory
const serviceAccountPath = path.join(__dirname, '..', '..', 'Ora', 'firebase', 'serviceAccountKey.json');
const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const db = admin.firestore();

// Parse args
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const processLessons = !args.includes('--programs') || args.includes('--lessons');
const processPrograms = !args.includes('--lessons') || args.includes('--programs');

console.log('🌍 Ora i18n Migration - Lessons & Programs');
console.log('==========================================');
console.log(`Mode: ${isDryRun ? '🔍 DRY RUN' : '✍️  WRITE MODE'}`);
console.log(`Processing: ${processLessons ? 'Lessons ' : ''}${processPrograms ? 'Programs' : ''}`);
console.log('');

// Translation dictionaries
const categoryTranslations = {
  'Meditation': { fr: 'Méditation', en: 'Meditation', es: 'Meditación' },
  'Méditation': { fr: 'Méditation', en: 'Meditation', es: 'Meditación' },
  'Yoga': { fr: 'Yoga', en: 'Yoga', es: 'Yoga' },
  'Respiration': { fr: 'Respiration', en: 'Breathing', es: 'Respiración' },
  'Breathing': { fr: 'Respiration', en: 'Breathing', es: 'Respiración' },
  'Pilates': { fr: 'Pilates', en: 'Pilates', es: 'Pilates' },
  'Sommeil': { fr: 'Sommeil', en: 'Sleep', es: 'Sueño' },
  'Sleep': { fr: 'Sommeil', en: 'Sleep', es: 'Sueño' },
  'Massage': { fr: 'Massage', en: 'Massage', es: 'Masaje' },
  'Auto-massage': { fr: 'Auto-massage', en: 'Self-massage', es: 'Automasaje' },
  'Bien-etre': { fr: 'Bien-être', en: 'Wellness', es: 'Bienestar' },
  'Bien-être': { fr: 'Bien-être', en: 'Wellness', es: 'Bienestar' },
  'Wellness': { fr: 'Bien-être', en: 'Wellness', es: 'Bienestar' }
};

const difficultyTranslations = {
  'Débutant': { fr: 'Débutant', en: 'Beginner', es: 'Principiante' },
  'Beginner': { fr: 'Débutant', en: 'Beginner', es: 'Principiante' },
  'Intermédiaire': { fr: 'Intermédiaire', en: 'Intermediate', es: 'Intermedio' },
  'Intermediate': { fr: 'Intermédiaire', en: 'Intermediate', es: 'Intermedio' },
  'Avancé': { fr: 'Avancé', en: 'Advanced', es: 'Avanzado' },
  'Advanced': { fr: 'Avancé', en: 'Advanced', es: 'Avanzado' },
  'Tous niveaux': { fr: 'Tous niveaux', en: 'All levels', es: 'Todos los niveles' },
  'All levels': { fr: 'Tous niveaux', en: 'All levels', es: 'Todos los niveles' }
};

function detectLanguage(text) {
  if (!text) return 'unknown';
  const lowerText = text.toLowerCase();

  const frenchIndicators = ['é', 'è', 'ê', 'à', 'ç', 'œ', 'du ', 'le ', 'la ', 'les ', 'de ', 'des '];
  const hasFrench = frenchIndicators.some(indicator => lowerText.includes(indicator));

  const englishIndicators = [' the ', ' and ', ' for ', ' with ', ' your '];
  const hasEnglish = englishIndicators.some(indicator => lowerText.includes(indicator));

  const spanishIndicators = ['ñ', 'á', 'í', 'ó', 'ú', ' el ', ' la ', ' los ', ' las ', ' para '];
  const hasSpanish = spanishIndicators.some(indicator => lowerText.includes(indicator));

  if (hasFrench) return 'fr';
  if (hasSpanish) return 'es';
  if (hasEnglish) return 'en';

  return 'fr'; // Default
}

function translateCategory(category) {
  if (!category) return { fr: null, en: null, es: null };
  const translation = categoryTranslations[category];
  if (translation) return translation;
  console.warn(`⚠️  Unknown category: "${category}"`);
  return { fr: category, en: category, es: category };
}

function translateDifficulty(difficulty) {
  if (!difficulty) return { fr: null, en: null, es: null };
  const translation = difficultyTranslations[difficulty];
  if (translation) return translation;
  console.warn(`⚠️  Unknown difficulty: "${difficulty}"`);
  return { fr: difficulty, en: difficulty, es: difficulty };
}

function translateText(text) {
  if (!text) return { fr: null, en: null, es: null };
  const sourceLang = detectLanguage(text);
  return {
    fr: sourceLang === 'fr' ? text : null,
    en: sourceLang === 'en' ? text : null,
    es: sourceLang === 'es' ? text : null
  };
}

async function processLesson(doc) {
  const data = doc.data();
  const lessonId = doc.id;

  console.log(`\n📝 Lesson: ${lessonId}`);
  console.log(`   Title: ${data.title || '(no title)'}`);

  const hasI18n = data.title_fr || data.title_en || data.title_es;
  if (hasI18n && !isDryRun) {
    console.log('   ⏭️  Already has i18n fields - skipping');
    return { skipped: true };
  }

  const titleTrans = translateText(data.title);
  const descTrans = translateText(data.description);

  let category = data.category || 'Bien-être';
  if (data.tags && Array.isArray(data.tags)) {
    if (data.tags.some(t => t.toLowerCase().includes('yoga'))) category = 'Yoga';
    else if (data.tags.some(t => t.toLowerCase().includes('meditation'))) category = 'Meditation';
    else if (data.tags.some(t => t.toLowerCase().includes('breathing') || t.toLowerCase().includes('respiration'))) category = 'Respiration';
    else if (data.tags.some(t => t.toLowerCase().includes('pilates'))) category = 'Pilates';
    else if (data.tags.some(t => t.toLowerCase().includes('sleep') || t.toLowerCase().includes('sommeil'))) category = 'Sommeil';
    else if (data.tags.some(t => t.toLowerCase().includes('massage'))) category = 'Massage';
  }

  const categoryTrans = translateCategory(category);

  const updateData = {
    title_fr: titleTrans.fr || data.title,
    title_en: titleTrans.en || `[TO TRANSLATE] ${data.title}`,
    title_es: titleTrans.es || `[TRADUCIR] ${data.title}`,
    description_fr: descTrans.fr || data.description,
    description_en: descTrans.en || (data.description ? `[TO TRANSLATE] ${data.description}` : null),
    description_es: descTrans.es || (data.description ? `[TRADUCIR] ${data.description}` : null),
    category_fr: categoryTrans.fr,
    category_en: categoryTrans.en,
    category_es: categoryTrans.es
  };

  console.log(`   FR: ${updateData.title_fr}`);
  console.log(`   EN: ${updateData.title_en}`);
  console.log(`   ES: ${updateData.title_es}`);
  console.log(`   Category: ${updateData.category_fr} / ${updateData.category_en} / ${updateData.category_es}`);

  if (!isDryRun) {
    await doc.ref.update(updateData);
    console.log('   ✅ Updated');
    return { updated: true };
  } else {
    console.log('   🔍 [DRY RUN] Would update');
    return { dryRun: true };
  }
}

async function processProgram(doc) {
  const data = doc.data();
  const programId = doc.id;

  console.log(`\n📚 Program: ${programId}`);
  console.log(`   Title: ${data.title || '(no title)'}`);

  const hasI18n = data.title_fr || data.title_en || data.title_es;
  if (hasI18n && !isDryRun) {
    console.log('   ⏭️  Already has i18n fields - skipping');
    return { skipped: true };
  }

  const titleTrans = translateText(data.title);
  const descTrans = translateText(data.description);
  const difficultyTrans = translateDifficulty(data.difficulty);

  const updateData = {
    title_fr: titleTrans.fr || data.title,
    title_en: titleTrans.en || `[TO TRANSLATE] ${data.title}`,
    title_es: titleTrans.es || `[TRADUCIR] ${data.title}`,
    description_fr: descTrans.fr || data.description,
    description_en: descTrans.en || (data.description ? `[TO TRANSLATE] ${data.description}` : null),
    description_es: descTrans.es || (data.description ? `[TRADUCIR] ${data.description}` : null),
    difficulty_fr: difficultyTrans.fr,
    difficulty_en: difficultyTrans.en,
    difficulty_es: difficultyTrans.es
  };

  console.log(`   FR: ${updateData.title_fr}`);
  console.log(`   EN: ${updateData.title_en}`);
  console.log(`   ES: ${updateData.title_es}`);
  console.log(`   Difficulty: ${updateData.difficulty_fr} / ${updateData.difficulty_en} / ${updateData.difficulty_es}`);

  if (!isDryRun) {
    await doc.ref.update(updateData);
    console.log('   ✅ Updated');
    return { updated: true };
  } else {
    console.log('   🔍 [DRY RUN] Would update');
    return { dryRun: true };
  }
}

async function migrate() {
  const stats = {
    lessons: { total: 0, updated: 0, skipped: 0, errors: 0 },
    programs: { total: 0, updated: 0, skipped: 0, errors: 0 }
  };

  try {
    if (processLessons) {
      console.log('\n📝 Processing LESSONS collection...\n');
      const lessonsSnapshot = await db.collection('lessons').get();
      stats.lessons.total = lessonsSnapshot.size;

      for (const doc of lessonsSnapshot.docs) {
        try {
          const result = await processLesson(doc);
          if (result.updated) stats.lessons.updated++;
          if (result.skipped) stats.lessons.skipped++;
        } catch (error) {
          console.error(`   ❌ Error:`, error.message);
          stats.lessons.errors++;
        }
      }
    }

    if (processPrograms) {
      console.log('\n\n📚 Processing PROGRAMS collection...\n');
      const programsSnapshot = await db.collection('programs').get();
      stats.programs.total = programsSnapshot.size;

      for (const doc of programsSnapshot.docs) {
        try {
          const result = await processProgram(doc);
          if (result.updated) stats.programs.updated++;
          if (result.skipped) stats.programs.skipped++;
        } catch (error) {
          console.error(`   ❌ Error:`, error.message);
          stats.programs.errors++;
        }
      }
    }
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    process.exit(1);
  }

  console.log('\n\n==========================================');
  console.log('🎉 Migration Complete!');
  console.log('==========================================\n');

  if (processLessons) {
    console.log('📝 LESSONS:');
    console.log(`   Total: ${stats.lessons.total}`);
    console.log(`   Updated: ${stats.lessons.updated}`);
    console.log(`   Skipped: ${stats.lessons.skipped}`);
    console.log(`   Errors: ${stats.lessons.errors}`);
  }

  if (processPrograms) {
    console.log('\n📚 PROGRAMS:');
    console.log(`   Total: ${stats.programs.total}`);
    console.log(`   Updated: ${stats.programs.updated}`);
    console.log(`   Skipped: ${stats.programs.skipped}`);
    console.log(`   Errors: ${stats.programs.errors}`);
  }

  console.log('\n⚠️  NOTE: Review all "[TO TRANSLATE]" / "[TRADUCIR]" placeholders\n');

  process.exit(0);
}

migrate();
