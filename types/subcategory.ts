/**
 * Subcategory Types and Mappers
 *
 * Subcategories allow organizing lessons within categories into smaller groups.
 * Each category (yoga, meditation, etc.) can have multiple subcategories.
 *
 * Example:
 * - Category: "yoga"
 *   - Subcategory: "Soulager les maux"
 *   - Subcategory: "Routines du quotidien"
 */

import type { MultilingualText, LessonCategory } from './lesson';

/**
 * Optional multilingual text (all fields optional)
 */
export interface MultilingualTextOptional {
  fr?: string;
  en?: string;
  es?: string;
}

// ============================================================================
// Status Types
// ============================================================================

export type SubcategoryStatus = 'active' | 'inactive';

// ============================================================================
// Frontend Types (camelCase)
// ============================================================================

/**
 * Subcategory - Frontend model
 */
export interface Subcategory {
  id: string;
  category: LessonCategory;
  name: MultilingualText;
  description?: MultilingualText;
  slug: string;
  displayOrder: number;
  iconUrl?: string;
  status: SubcategoryStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

/**
 * Subcategory with lessons count - for admin listing
 */
export interface SubcategoryWithCount extends Subcategory {
  lessonsCount: number;
}

/**
 * Create subcategory request
 */
export interface CreateSubcategoryRequest {
  category: LessonCategory;
  name: MultilingualText;
  description?: MultilingualTextOptional;
  slug?: string; // Auto-generated if not provided
  displayOrder?: number;
  iconUrl?: string;
  status?: SubcategoryStatus;
}

/**
 * Update subcategory request
 */
export interface UpdateSubcategoryRequest {
  name?: MultilingualText;
  description?: MultilingualTextOptional;
  slug?: string;
  displayOrder?: number;
  iconUrl?: string;
  status?: SubcategoryStatus;
}

// ============================================================================
// Firestore Types (snake_case)
// ============================================================================

/**
 * Subcategory Firestore document
 */
export interface SubcategoryDocument {
  category: string;
  name_fr: string;
  name_en?: string;
  name_es?: string;
  description_fr?: string;
  description_en?: string;
  description_es?: string;
  slug: string;
  display_order: number;
  icon_url?: string;
  status: string;
  created_at: string;
  updated_at: string;
  created_by: string;
}

// ============================================================================
// Mapper Functions
// ============================================================================

/**
 * Convert Firestore document to frontend Subcategory
 */
export function mapSubcategoryFromFirestore(
  id: string,
  doc: SubcategoryDocument
): Subcategory {
  return {
    id,
    category: doc.category as LessonCategory,
    name: {
      fr: doc.name_fr,
      en: doc.name_en,
      es: doc.name_es,
    },
    description: doc.description_fr
      ? {
          fr: doc.description_fr,
          en: doc.description_en,
          es: doc.description_es,
        }
      : undefined,
    slug: doc.slug,
    displayOrder: doc.display_order,
    iconUrl: doc.icon_url,
    status: doc.status as SubcategoryStatus,
    createdAt: doc.created_at,
    updatedAt: doc.updated_at,
    createdBy: doc.created_by,
  };
}

/**
 * Convert frontend Subcategory to Firestore document for creation
 */
export function mapSubcategoryToFirestore(
  subcategory: CreateSubcategoryRequest,
  createdBy: string
): Omit<SubcategoryDocument, 'created_at' | 'updated_at'> {
  const result: Record<string, unknown> = {
    category: subcategory.category,
    name_fr: subcategory.name.fr,
    slug: subcategory.slug || generateSlug(subcategory.name.fr),
    display_order: subcategory.displayOrder ?? 0,
    status: subcategory.status || 'active',
    created_by: createdBy,
  };

  // Only include optional fields if they have values
  if (subcategory.name.en) result.name_en = subcategory.name.en;
  if (subcategory.name.es) result.name_es = subcategory.name.es;
  if (subcategory.description?.fr) result.description_fr = subcategory.description.fr;
  if (subcategory.description?.en) result.description_en = subcategory.description.en;
  if (subcategory.description?.es) result.description_es = subcategory.description.es;
  if (subcategory.iconUrl) result.icon_url = subcategory.iconUrl;

  return result as Omit<SubcategoryDocument, 'created_at' | 'updated_at'>;
}

/**
 * Convert update request to Firestore update data
 */
export function mapSubcategoryUpdateToFirestore(
  updates: UpdateSubcategoryRequest
): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (updates.name) {
    result.name_fr = updates.name.fr;
    if (updates.name.en) result.name_en = updates.name.en;
    if (updates.name.es) result.name_es = updates.name.es;
  }

  if (updates.description) {
    if (updates.description.fr) result.description_fr = updates.description.fr;
    if (updates.description.en) result.description_en = updates.description.en;
    if (updates.description.es) result.description_es = updates.description.es;
  }

  if (updates.slug !== undefined) result.slug = updates.slug;
  if (updates.displayOrder !== undefined) result.display_order = updates.displayOrder;
  if (updates.iconUrl !== undefined) result.icon_url = updates.iconUrl;
  if (updates.status !== undefined) result.status = updates.status;

  return result;
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Generate URL-friendly slug from French name
 */
export function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // Remove accents
    .replace(/[^a-z0-9]+/g, '-') // Replace non-alphanumeric with hyphens
    .replace(/^-+|-+$/g, ''); // Trim hyphens from start/end
}

/**
 * Get display name for a subcategory in the current locale
 */
export function getSubcategoryDisplayName(
  subcategory: Subcategory,
  locale: 'fr' | 'en' | 'es' = 'fr'
): string {
  return subcategory.name[locale] || subcategory.name.fr;
}
