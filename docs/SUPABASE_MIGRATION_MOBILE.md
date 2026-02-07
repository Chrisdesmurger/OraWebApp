# Guide de Migration Firebase -> Supabase : Apps Android & iOS

> Document de reference pour Claude - Migration des applications mobiles Ora (Android Kotlin / iOS Swift) de Firebase vers Supabase.

## Contexte

Les applications mobiles Ora (Android + iOS) sont en cours de migration de Firebase vers Supabase. Ce document fournit toutes les informations necessaires pour effectuer cette migration.

### Services Firebase utilises actuellement
- **Firebase Auth** : Email/Password, Google Sign-In, Magic Link
- **Cloud Firestore** : Lecture/ecriture directe (avec security rules)
- **Firebase Cloud Storage** : Telechargement de medias (video/audio/images)
- **Firebase Analytics + Crashlytics** : **A CONSERVER** (independants de la migration)

### Decision cles
- **UIDs** : Depart a zero. Supabase utilise des UUID natifs (pas de mapping Firebase)
- **Analytics** : Firebase Analytics et Crashlytics restent en place
- **Transcoding** : Gere par un service Cloud Run (transparent pour le mobile)

---

## Architecture Cible

```
App Android/iOS
  |-- Supabase Auth SDK --> Authentification utilisateur
  |     |-- supabase-kt (Android/Kotlin)
  |     |-- supabase-swift (iOS/Swift)
  |-- Supabase PostgREST SDK --> Requetes PostgreSQL via API REST
  |     |-- SELECT FROM users WHERE id = auth.uid()
  |     |-- SELECT FROM programs WHERE status = 'published'
  |     |-- SELECT FROM lessons WHERE program_id = ?
  |     |-- INSERT/UPDATE pour sessions, stats, journal, etc.
  |-- Supabase Storage SDK --> Telechargement medias
  |-- Supabase Realtime --> Ecoute changements en temps reel (optionnel)
  |-- Firebase Analytics + Crashlytics --> Monitoring (CONSERVE)
```

---

## Schema de la Base de Donnees PostgreSQL

### Tables principales pour l'app mobile

| Table | Usage Mobile | Operations |
|-------|-------------|------------|
| `users` | Profil utilisateur | Lecture/ecriture propre profil |
| `programs` | Catalogue programmes | Lecture (published uniquement) |
| `lessons` | Contenu lecons | Lecture seule |
| `subcategories` | Categories de contenu | Lecture seule |
| `onboarding_configs` | Questionnaire initial | Lecture (active uniquement) |
| `user_sessions` | Historique des pratiques | CRUD propre utilisateur |
| `user_practice_stats` | Stats agregees par type | CRUD propre utilisateur |
| `user_daily_journal` | Journal quotidien | CRUD propre utilisateur |
| `gratitude_entries` | Entrees de gratitude | CRUD propre utilisateur |
| `user_program_enrollments` | Inscriptions programmes | CRUD propre utilisateur |
| `user_stats` | Statistiques globales | CRUD propre utilisateur |
| `user_recommendations` | Recommandations personnalisees | Lecture propre utilisateur |

### Champs i18n

Les champs multilingues utilisent des suffixes de langue :
```
title_fr (requis), title_en (optionnel), title_es (optionnel)
description_fr, description_en, description_es
```

L'app mobile doit selectionner le champ correspondant a la langue de l'utilisateur avec **fallback sur `_fr`**.

### Types ENUM PostgreSQL

```sql
user_role: 'admin' | 'teacher' | 'viewer' | 'user'
content_status: 'draft' | 'published' | 'archived'
lesson_status: 'draft' | 'uploading' | 'processing' | 'ready' | 'failed'
lesson_type: 'video' | 'audio'
category_type: 'yoga' | 'pilates' | 'meditation' | 'respiration' | 'auto-massage'
difficulty_type: 'beginner' | 'intermediate' | 'advanced'
plan_tier: 'free' | 'premium' | 'lifetime'
```

### Schema detaille des tables utilisees par le mobile

```sql
-- Table users
users (
  id UUID PRIMARY KEY,        -- meme ID que auth.users
  email TEXT,
  first_name TEXT,
  last_name TEXT,
  photo_url TEXT,
  role user_role DEFAULT 'user',
  plan_tier plan_tier DEFAULT 'free',
  language TEXT DEFAULT 'fr',
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
)

-- Table programs
programs (
  id UUID PRIMARY KEY,
  title TEXT,
  description TEXT,
  category category_type,
  difficulty difficulty_type,
  duration_days INT,
  cover_image_url TEXT,
  status content_status,
  tags TEXT[],
  lessons UUID[],             -- ordered lesson IDs
  created_at TIMESTAMPTZ
)

-- Table lessons (avec i18n)
lessons (
  id UUID PRIMARY KEY,
  title_fr TEXT, title_en TEXT, title_es TEXT,
  description_fr TEXT, description_en TEXT, description_es TEXT,
  type lesson_type,           -- 'video' | 'audio'
  program_id UUID,
  "order" INT,
  duration_sec INT,
  tags TEXT[],
  status lesson_status,
  renditions JSONB,           -- {high: {path, width, height}, medium: {...}, low: {...}}
  audio_variants JSONB,       -- {high: {path, bitrate_kbps}, medium: {...}, low: {...}}
  thumbnail_url TEXT,
  subcategory_id UUID,
  chapters JSONB,             -- yoga chapters
  body_zones JSONB,           -- massage body zones
  phases JSONB,               -- meditation phases
  yoga_poses JSONB,           -- yoga/pilates poses
  created_at TIMESTAMPTZ
)

-- Table user_sessions
user_sessions (
  id UUID PRIMARY KEY,
  user_id UUID,               -- FK -> users.id
  practice_type TEXT,
  started_at TIMESTAMPTZ,
  duration_sec INT,
  lesson_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ
)

-- Table user_practice_stats
user_practice_stats (
  user_id UUID,
  practice_type TEXT,
  total_sessions INT,
  total_duration_sec INT,
  streak_days INT,
  updated_at TIMESTAMPTZ,
  UNIQUE(user_id, practice_type)
)

-- Table user_program_enrollments
user_program_enrollments (
  user_id UUID,
  program_id UUID,
  current_day INT,
  is_completed BOOLEAN,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  UNIQUE(user_id, program_id)
)

-- Table gratitude_entries
gratitude_entries (
  user_id UUID,
  date DATE,
  content JSONB,
  UNIQUE(user_id, date)
)

-- Table user_daily_journal
user_daily_journal (
  user_id UUID,
  date DATE,
  content JSONB,
  UNIQUE(user_id, date)
)

-- Table onboarding_configs
onboarding_configs (
  id UUID PRIMARY KEY,
  title TEXT,
  description TEXT,
  status onboarding_status,   -- 'draft' | 'active' | 'archived'
  questions JSONB,            -- Array of question objects
  information_screens JSONB,
  recommendation_rules JSONB
)
```

---

## Migration par Composant

### 1. Authentification

#### Android (Kotlin)

```kotlin
// ============ AVANT - Firebase ============
val auth = Firebase.auth
auth.signInWithEmailAndPassword(email, password)
    .addOnSuccessListener { result ->
        val uid = result.user?.uid
        val token = result.user?.getIdToken(false)
    }

// Listener
Firebase.auth.addAuthStateListener { auth ->
    val user = auth.currentUser
}

// ============ APRES - Supabase ============
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.gotrue.Auth
import io.github.jan.supabase.gotrue.auth
import io.github.jan.supabase.gotrue.providers.builtin.Email

val supabase = createSupabaseClient(
    supabaseUrl = "https://xxx.supabase.co",
    supabaseKey = "eyJ...anon_key"
) {
    install(Auth)
}

// Sign in
supabase.auth.signInWith(Email) {
    this.email = email
    this.password = password
}

// Get current user
val user = supabase.auth.currentUserOrNull()
val uid = user?.id  // UUID string

// Listener
supabase.auth.sessionStatus.collect { status ->
    when (status) {
        is SessionStatus.Authenticated -> { /* user logged in */ }
        is SessionStatus.NotAuthenticated -> { /* user logged out */ }
    }
}
```

#### iOS (Swift)

```swift
// ============ AVANT - Firebase ============
Auth.auth().signIn(withEmail: email, password: password) { result, error in
    let uid = result?.user.uid
}

Auth.auth().addStateDidChangeListener { auth, user in
    // handle auth state
}

// ============ APRES - Supabase ============
import Supabase

let client = SupabaseClient(
    supabaseURL: URL(string: "https://xxx.supabase.co")!,
    supabaseKey: "eyJ...anon_key"
)

// Sign in
try await client.auth.signIn(email: email, password: password)

// Get current user
let user = try await client.auth.session.user
let uid = user.id  // UUID

// Listener
for await event in client.auth.authStateChanges {
    switch event {
    case .signedIn: // handle sign in
    case .signedOut: // handle sign out
    default: break
    }
}
```

#### Google Sign-In

Configurer OAuth dans le dashboard Supabase :
1. Aller dans Authentication > Providers > Google
2. Ajouter Client ID et Client Secret
3. Configurer le redirect URL dans la Google Cloud Console

```kotlin
// Android
supabase.auth.signInWith(Google) {
    // Configure according to supabase-kt docs
}

// iOS
try await client.auth.signIn(provider: .google)
```

#### Magic Link

```kotlin
// Android - Supabase native magic link
supabase.auth.signInWith(OTP) {
    this.email = email
}

// iOS
try await client.auth.signInWithOTP(email: email)
```

### 2. Lecture de Donnees (Firestore -> PostgREST)

#### Mapping des Requetes

```kotlin
// ============ AVANT - Firestore ============

// Lire le profil utilisateur
val doc = firestore.collection("users").document(uid).get().await()
val firstName = doc.getString("first_name")

// Lister les programmes publies
val snapshot = firestore.collection("programs")
    .whereEqualTo("status", "published")
    .orderBy("created_at", Query.Direction.DESCENDING)
    .get().await()

// Lister les lecons d'un programme
val lessons = firestore.collection("lessons")
    .whereEqualTo("program_id", programId)
    .orderBy("order")
    .get().await()

// Sous-collection: sessions utilisateur
val sessions = firestore.collection("users/$uid/sessions")
    .orderBy("created_at", Query.Direction.DESCENDING)
    .limit(20)
    .get().await()

// ============ APRES - Supabase ============

import io.github.jan.supabase.postgrest.postgrest
import io.github.jan.supabase.postgrest.query.Columns

// Lire le profil utilisateur
val user = supabase.postgrest["users"]
    .select { filter { eq("id", uid) } }
    .decodeSingle<UserProfile>()

// Lister les programmes publies
val programs = supabase.postgrest["programs"]
    .select { filter { eq("status", "published") } }
    .order("created_at", Order.DESCENDING)
    .decodeList<Program>()

// Lister les lecons d'un programme
val lessons = supabase.postgrest["lessons"]
    .select { filter { eq("program_id", programId) } }
    .order("order", Order.ASCENDING)
    .decodeList<Lesson>()

// Sessions utilisateur (table plate, pas sous-collection)
val sessions = supabase.postgrest["user_sessions"]
    .select { filter { eq("user_id", uid) } }
    .order("created_at", Order.DESCENDING)
    .limit(20)
    .decodeList<UserSession>()
```

#### iOS Equivalent

```swift
// Lire le profil
let user: UserProfile = try await client.database
    .from("users")
    .select()
    .eq("id", value: uid)
    .single()
    .execute()
    .value

// Lister les programmes publies
let programs: [Program] = try await client.database
    .from("programs")
    .select()
    .eq("status", value: "published")
    .order("created_at", ascending: false)
    .execute()
    .value

// Lister les lecons
let lessons: [Lesson] = try await client.database
    .from("lessons")
    .select()
    .eq("program_id", value: programId)
    .order("order")
    .execute()
    .value
```

### 3. Ecriture de Donnees

```kotlin
// ============ AVANT - Firestore ============

// Creer une session
firestore.collection("users/$uid/sessions").add(sessionData)

// Mettre a jour le profil
firestore.collection("users").document(uid).update(mapOf(
    "first_name" to "John",
    "updated_at" to FieldValue.serverTimestamp()
))

// Upsert stats
firestore.collection("users/$uid/practiceStats").document("yoga").set(statsData)

// ============ APRES - Supabase ============

// Creer une session
supabase.postgrest["user_sessions"]
    .insert(UserSession(userId = uid, practiceType = "yoga", ...))

// Mettre a jour le profil
supabase.postgrest["users"]
    .update({ set("first_name", "John") })
    { filter { eq("id", uid) } }

// Upsert stats
supabase.postgrest["user_practice_stats"]
    .upsert(PracticeStats(userId = uid, practiceType = "yoga", ...))
```

### 4. Storage (Medias)

```kotlin
// ============ AVANT - Firebase Storage ============
val ref = Firebase.storage.reference
    .child("media/lessons/$lessonId/video/high.mp4")
ref.downloadUrl.addOnSuccessListener { uri ->
    // Play video with ExoPlayer using uri
}

// ============ APRES - Supabase Storage ============

// Public URL (buckets publics)
val url = supabase.storage.from("media-lessons")
    .publicUrl("$lessonId/video/high.mp4")
// Play video with ExoPlayer using url

// OU signed URL (si bucket prive)
val signedUrl = supabase.storage.from("media-lessons")
    .createSignedUrl("$lessonId/video/high.mp4", expiresIn = 3600.seconds)
```

#### Structure des Buckets

```
Bucket: media-lessons (public)
  {lessonId}/original/{filename}   -- fichier original
  {lessonId}/video/high.mp4        -- rendu haute qualite
  {lessonId}/video/medium.mp4      -- rendu qualite moyenne
  {lessonId}/video/low.mp4         -- rendu basse qualite
  {lessonId}/audio/high.m4a        -- audio haute qualite
  {lessonId}/audio/medium.m4a      -- audio qualite moyenne
  {lessonId}/audio/low.m4a         -- audio basse qualite
  {lessonId}/thumb.jpg             -- thumbnail

Bucket: media-programs (public)
  {programId}/{filename}           -- cover images

Bucket: media-users (public)
  {userId}/{filename}              -- avatars
```

### 5. Realtime (remplace Firestore onSnapshot)

```kotlin
// ============ AVANT - Firestore ============
firestore.collection("users").document(uid)
    .addSnapshotListener { snapshot, error ->
        if (snapshot != null) {
            // Update UI with new data
        }
    }

// ============ APRES - Supabase Realtime ============
import io.github.jan.supabase.realtime.realtime
import io.github.jan.supabase.realtime.channel
import io.github.jan.supabase.realtime.postgresChangeFlow

val channel = supabase.channel("user-profile")
val changes = channel.postgresChangeFlow<PostgresAction.Update>(schema = "public") {
    table = "users"
    filter = "id=eq.$uid"
}

changes.collect { change ->
    // Update UI with change.record
}

channel.subscribe()
```

### 6. Securite (RLS)

Les Row Level Security policies sont appliquees **automatiquement** cote serveur PostgreSQL. L'app mobile n'a **rien a gerer** - les policies garantissent que :

- Un utilisateur ne peut lire/ecrire que son propre profil
- Les programmes publies sont accessibles a tous les utilisateurs authentifies
- Les sessions/stats/journal sont prives par utilisateur
- Seuls les admins peuvent modifier le contenu
- Les roles sont verifies par la fonction `get_user_role()` en base

---

## Dependances

### Android (build.gradle.kts)

```kotlin
// ===== SUPPRIMER =====
implementation("com.google.firebase:firebase-auth-ktx")
implementation("com.google.firebase:firebase-firestore-ktx")
implementation("com.google.firebase:firebase-storage-ktx")

// ===== CONSERVER =====
implementation(platform("com.google.firebase:firebase-bom:33.x.x"))
implementation("com.google.firebase:firebase-analytics-ktx")
implementation("com.google.firebase:firebase-crashlytics-ktx")

// ===== AJOUTER =====
val supabaseVersion = "3.x.x"  // Utiliser la derniere version stable
implementation("io.github.jan-tennert.supabase:gotrue-kt:$supabaseVersion")
implementation("io.github.jan-tennert.supabase:postgrest-kt:$supabaseVersion")
implementation("io.github.jan-tennert.supabase:storage-kt:$supabaseVersion")
implementation("io.github.jan-tennert.supabase:realtime-kt:$supabaseVersion")
implementation("io.ktor:ktor-client-android:2.x.x")
```

### iOS (Package.swift)

```swift
// ===== SUPPRIMER =====
// Firebase Auth, Firestore, Storage packages

// ===== CONSERVER =====
// FirebaseAnalytics, FirebaseCrashlytics packages

// ===== AJOUTER =====
.package(url: "https://github.com/supabase/supabase-swift", from: "2.x.x")
// Targets: Auth, PostgREST, Storage, Realtime
```

---

## Configuration

### Android

Supprimer de `google-services.json` les sections liees a Auth/Firestore/Storage (garder Analytics/Crashlytics).

Ajouter la configuration Supabase :
```kotlin
// Dans Application class ou module DI
val supabase = createSupabaseClient(
    supabaseUrl = BuildConfig.SUPABASE_URL,
    supabaseKey = BuildConfig.SUPABASE_ANON_KEY
) {
    install(Auth) {
        // Session auto-refresh
    }
    install(Postgrest)
    install(Storage)
    install(Realtime)  // optionnel
}
```

### iOS

Garder `GoogleService-Info.plist` pour Analytics/Crashlytics.

```swift
let supabase = SupabaseClient(
    supabaseURL: URL(string: "https://xxx.supabase.co")!,
    supabaseKey: "eyJ...anon_key"
)
```

---

## Points d'Attention Critiques

### 1. Offline Support
Firestore a un cache offline natif. Supabase n'a **pas** d'equivalent direct.

**Solutions :**
- Implementer un cache local avec **Room** (Android) / **Core Data** (iOS)
- Utiliser **PowerSync** pour la synchronisation offline avec Supabase
- Cache en memoire pour les donnees consultees recemment

### 2. IDs (UUID vs Firebase String)
- Supabase utilise des UUID natifs (ex: `550e8400-e29b-41d4-a716-446655440000`)
- Firebase utilisait des strings de 28 caracteres
- Puisque c'est un depart a zero, pas de mapping necessaire
- Mettre a jour les types Kotlin/Swift pour utiliser `String` (format UUID)

### 3. Sous-collections -> Tables Plates
Firestore avait des sous-collections imbriquees. PostgreSQL utilise des tables plates avec des foreign keys :

| Firestore Path | Table Supabase |
|---------------|----------------|
| `users/{uid}` | `users` |
| `users/{uid}/sessions/{id}` | `user_sessions` (avec `user_id` FK) |
| `users/{uid}/practiceStats/{type}` | `user_practice_stats` (avec `user_id` FK) |
| `users/{uid}/dailyJournal/{date}` | `user_daily_journal` (avec `user_id` FK) |
| `gratitudes/{uid}/entries/{date}` | `gratitude_entries` (avec `user_id` FK) |
| `user_programs/{uid}/enrolled/{programId}` | `user_program_enrollments` (avec `user_id` FK) |

### 4. Timestamps
- Firestore : `FieldValue.serverTimestamp()` ou `Timestamp`
- Supabase : Les colonnes `created_at` et `updated_at` sont auto-gerees par PostgreSQL
- Pour les requetes, utiliser le format ISO 8601 : `"2024-01-15T10:30:00Z"`

### 5. Push Notifications
Firebase Cloud Messaging (FCM) est **independant** de Firestore/Auth.
- **Option A** : Garder FCM pour les push (aucun changement)
- **Option B** : Migrer vers OneSignal ou un autre service
- Le trigger d'envoi de push peut etre un Supabase Edge Function ou un webhook

### 6. Requetes complexes
PostgreSQL supporte des requetes plus puissantes que Firestore :
- `JOIN` entre tables (ex: lecons + programmes)
- `LIKE` / `ILIKE` pour la recherche textuelle
- Aggregations (`COUNT`, `SUM`, `AVG`)
- Fonctions serveur (`rpc`) pour la logique complexe

---

## Checklist de Migration

### Android
- [ ] Remplacer les dependances Firebase Auth/Firestore/Storage par Supabase
- [ ] Configurer le client Supabase (URL + anon key)
- [ ] Migrer l'authentification (sign in, sign out, session management)
- [ ] Migrer toutes les lectures Firestore vers PostgREST
- [ ] Migrer toutes les ecritures Firestore vers PostgREST
- [ ] Migrer les listeners onSnapshot vers Supabase Realtime
- [ ] Migrer les URLs de media vers Supabase Storage
- [ ] Implementer le cache offline (Room)
- [ ] Tester l'inscription / connexion
- [ ] Tester la lecture du catalogue (programmes, lecons)
- [ ] Tester l'enregistrement de sessions de pratique
- [ ] Tester le journal et les gratitudes
- [ ] Tester la lecture de medias (video/audio)
- [ ] Verifier que Firebase Analytics fonctionne toujours

### iOS
- [ ] Memes etapes que Android
- [ ] Utiliser supabase-swift au lieu de supabase-kt
- [ ] Adapter la gestion de session pour iOS (Keychain storage)
