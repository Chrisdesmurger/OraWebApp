# 🔄 Android App Compatibility Guide

Ce guide explique comment l'admin web Ora est configuré pour être **100% compatible** avec l'application Android existante.

## 📊 Vue d'Ensemble

**Stratégie**: Même projet Firebase pour Android App + Admin Web
- ✅ Partage la même Authentication
- ✅ Partage la même base de données Firestore
- ✅ Collections compatibles avec l'app Android
- ✅ RBAC (Role-Based Access Control) pour séparer les users et les admins

---

## 🔐 Custom Claims & RBAC

### Attribution des Rôles

**App Android (utilisateurs normaux):**
```javascript
// Pas de custom claims OU role: 'user'
{
  uid: "user123",
  customClaims: {} // vide ou { role: "user" }
}
```

**Admin Web (administrateurs/enseignants):**
```javascript
// Admin
{
  uid: "admin123",
  customClaims: { role: "admin" }
}

// Teacher
{
  uid: "teacher456",
  customClaims: { role: "teacher" }
}
```

### Comment Attribuer le Rôle Admin

#### Option 1: Firebase Console
1. Aller dans **Authentication → Users**
2. Cliquer sur l'utilisateur
3. Aller dans **Custom claims**
4. Ajouter: `{"role": "admin"}`

#### Option 2: Firebase CLI
```bash
firebase functions:shell
> admin.auth().setCustomUserClaims('USER_UID_HERE', { role: 'admin' })
```

#### Option 3: Via l'API Admin
```typescript
import { getAuth } from '@/lib/firebase/admin';

const auth = getAuth();
await auth.setCustomUserClaims(uid, { role: 'admin' });
```

---

## 📦 Collections Firestore

### Collections Partagées (App + Admin)

#### 1. `users/{uid}` - Profils Utilisateurs

**Champs Android (snake_case):**
```typescript
{
  uid: string
  first_name?: string        // Prénom
  last_name?: string         // Nom
  email?: string
  photo_url?: string         // URL de la photo
  motto?: string             // Devise personnelle
  plan_tier: 'FREE' | 'PREMIUM' | 'LIFETIME'
  created_at: Timestamp
  updated_at?: Timestamp
  locale?: 'fr' | 'en'

  // Champs Admin Web (optionnels)
  role?: 'admin' | 'teacher' | 'viewer' | 'user'
  is_fake?: boolean          // Pour les users de test
}
```

**Accès:**
- **App Android**: Chaque user peut lire/écrire son propre profil
- **Admin Web**: Admin peut lire/modifier tous les profils

#### 2. `programs/{programId}` - Catalogue de Programmes

**Champs:**
```typescript
{
  id: string
  title: string
  description: string
  category: string           // Ex: "Méditation", "Yoga"
  duration: number           // En jours
  level: string             // "Débutant", "Intermédiaire", "Avancé"
  participant_count: number
  rating: number
  thumbnail_url?: string
  instructor?: string
  is_premium_only: boolean
  sessions: Array<object>
  is_active: boolean
  created_at: Timestamp
  updated_at?: Timestamp

  // Champs Admin Web
  author_id?: string         // UID du créateur (teacher/admin)
  status?: 'draft' | 'published'
}
```

**Accès:**
- **App Android**: Lecture seule pour tous les users authentifiés
- **Admin Web**: Admin/Teacher peuvent créer/modifier

#### 3. `stats/{uid}` - Statistiques Utilisateur

**Champs:**
```typescript
{
  uid: string
  total_minutes: number
  total_sessions: number
  current_streak: number
  longest_streak?: number
  last_practice_at?: Timestamp
  created_at: Timestamp
  updated_at: Timestamp
}
```

**Accès:**
- **App Android**: Chaque user peut lire/écrire ses propres stats
- **Admin Web**: Admin peut lire toutes les stats (analytics)

### Collections App Android Uniquement

#### 4. `gratitudes/{uid}/entries/{date}` - Journal de Gratitudes

**Champs:**
```typescript
{
  uid: string
  date: string               // Format: "YYYY-MM-DD"
  gratitudes: string[]       // 1 à 3 gratitudes
  notes?: string
  created_at: Timestamp
  updated_at?: Timestamp
}
```

**Accès:**
- **App Android**: Privé, chaque user accède uniquement aux siennes
- **Admin Web**: Admin peut lire (analytics seulement)

#### 5. `user_programs/{uid}/enrolled/{programId}` - Programmes Inscrits

**Champs:**
```typescript
{
  uid: string
  program_id: string
  current_day: number
  total_days: number
  is_completed: boolean
  started_at: Timestamp
  last_session_at?: Timestamp
  completed_at?: Timestamp
}
```

**Accès:**
- **App Android**: Privé, chaque user accède uniquement aux siens
- **Admin Web**: Admin peut lire (analytics)

#### 6. `users/{uid}/sessions/{sessionId}` - Historique des Sessions

**Champs:**
```typescript
{
  uid: string
  content_id: string
  content_title: string
  practice_type: 'yoga' | 'meditation' | 'pilates' | 'breathing'
  duration_minutes: number
  planned_duration_minutes: number
  completion_percentage: number
  completed: boolean
  started_at: number         // timestamp
  completed_at: number       // timestamp
  created_at: number         // timestamp
}
```

**Accès:**
- **App Android**: Privé, chaque user écrit ses propres sessions
- **Admin Web**: Admin peut lire (analytics)

### Collections Admin Web Uniquement

#### 7. `commands/{commandId}` - Commandes Admin

**Champs:**
```typescript
{
  name: string
  label: string
  last_run_at: Timestamp
  last_status: 'success' | 'error'
  last_output: string
  last_run_by: string        // UID admin
}
```

**Accès:**
- **Admin Web**: Admin uniquement

#### 8. `audit_logs/{logId}` - Logs d'Audit

**Champs:**
```typescript
{
  actor_uid: string
  action: string
  target_type: string
  target_id: string
  timestamp: Timestamp
  meta?: object
}
```

**Accès:**
- **Admin Web**: Admin lecture seule, serveur écrit

#### 9. `media/{mediaId}` - Métadonnées Média

**Champs:**
```typescript
{
  type: 'image' | 'video' | 'audio'
  storage_path: string
  mime_type: string
  size: number
  uploaded_by: string        // UID
  linked_to: string          // programId ou lessonId
  upload_type: 'program' | 'lesson' | 'user'
  created_at: Timestamp
}
```

**Accès:**
- **Admin Web**: Admin/Teacher peuvent uploader
- **App Android**: Lecture des URLs signées via Cloud Functions

---

## 🔒 Firestore Security Rules

Les rules ont été **fusionnées** pour supporter les deux apps :

```javascript
// Exemple pour users/
match /users/{uid} {
  // App Android: User peut lire/écrire son propre profil
  // Admin Web: Admin peut tout lire/écrire
  allow read: if isAdmin() || isOwner(uid);
  allow update: if isAdmin() ||
                  (isOwner(uid) &&
                   !affectsProtectedFields(['role', 'is_admin']));
}

// Exemple pour programs/
match /programs/{programId} {
  // App Android: Tous peuvent lire
  allow read: if isAuthenticated();

  // Admin Web: Admin/Teacher peuvent écrire
  allow create: if isAdmin() || isTeacher();
  allow update: if isAdmin() || isTeacherOwner();
}
```

**Fonction Helper:**
```javascript
// Détermine automatiquement le rôle
function getUserRole() {
  return request.auth.token.keys().hasAny(['role'])
    ? request.auth.token.role
    : 'user'; // Par défaut = user app
}

function isAdmin() {
  return getUserRole() == 'admin';
}
```

---

## 📐 Indexes Firestore

Les indexes doivent supporter les requêtes des deux apps:

```json
{
  "indexes": [
    // Pour Admin Web - Liste des users
    {
      "collectionGroup": "users",
      "fields": [
        { "fieldPath": "role", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    },

    // Pour Android App - Programmes actifs
    {
      "collectionGroup": "programs",
      "fields": [
        { "fieldPath": "is_active", "order": "ASCENDING" },
        { "fieldPath": "rating", "order": "DESCENDING" }
      ]
    },

    // Pour Android App - Gratitudes par user
    {
      "collectionGroup": "entries",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "uid", "order": "ASCENDING" },
        { "fieldPath": "created_at", "order": "DESCENDING" }
      ]
    }
  ]
}
```

---

## 🔄 Plan de Migration

### Étape 1: Backup

```bash
# Exporter toutes les collections actuelles
firebase firestore:export gs://your-bucket/backups/$(date +%Y%m%d)
```

### Étape 2: Tester les Rules en Simulation

1. Aller dans **Firestore → Rules**
2. Coller les nouvelles rules
3. Cliquer sur **Simulator**
4. Tester ces scénarios:

**Scénario 1: User Android lit son profil**
```
Operation: get
Location: /users/{uid}
Auth: Authenticated user
Custom Claims: {} (vide)
Result: ✅ ALLOW
```

**Scénario 2: Admin lit tous les users**
```
Operation: list
Location: /users
Auth: Authenticated user
Custom Claims: { "role": "admin" }
Result: ✅ ALLOW
```

**Scénario 3: User Android essaie de lire un autre user**
```
Operation: get
Location: /users/other_uid
Auth: Authenticated user
Custom Claims: {}
Result: ❌ DENY
```

### Étape 3: Déployer les Rules

```bash
cd C:\Users\chris\source\repos\OraWebApp
firebase deploy --only firestore:rules
```

### Étape 4: Déployer les Indexes

```bash
firebase deploy --only firestore:indexes
```

### Étape 5: Créer le Premier Admin

```bash
# Option A: Firebase Console
# Authentication → Users → {votre-user} → Custom Claims
# Ajouter: {"role": "admin"}

# Option B: Firebase CLI
firebase functions:shell
admin.auth().setCustomUserClaims('YOUR_UID', { role: 'admin' })
```

### Étape 6: Tester avec l'App Android

1. Lancer l'app Android
2. Vérifier que:
   - ✅ Login fonctionne toujours
   - ✅ Profil se charge
   - ✅ Programmes visibles
   - ✅ Gratitudes accessibles
   - ✅ Stats affichées

### Étape 7: Tester avec l'Admin Web

1. Lancer l'admin web: `npm run dev`
2. Se connecter avec le compte admin
3. Vérifier que:
   - ✅ Dashboard charge
   - ✅ Liste des users visible
   - ✅ Programmes modifiables
   - ✅ Commandes exécutables

---

## ⚠️ Points d'Attention

### 1. Nommage des Champs

**IMPORTANT**: L'app Android utilise **snake_case**, gardez-le !

❌ **NE PAS FAIRE:**
```typescript
{
  firstName: "Jean",      // camelCase
  lastName: "Dupont"
}
```

✅ **FAIRE:**
```typescript
{
  first_name: "Jean",     // snake_case
  last_name: "Dupont"
}
```

### 2. Plan Tier

**Android App** utilise uppercase:
```typescript
plan_tier: 'FREE' | 'PREMIUM' | 'LIFETIME'
```

**Les rules acceptent les deux formats** (case-insensitive).

### 3. Timestamps

**Android App** utilise **Firestore Timestamp**:
```kotlin
@ServerTimestamp
var createdAt: Date? = null
```

**Admin Web** doit utiliser la même chose:
```typescript
createdAt: serverTimestamp()
```

### 4. Collections Privées

**NE JAMAIS** exposer ces collections dans l'admin web pour modification:
- `gratitudes/{uid}/entries/` - PRIVÉ
- `user_programs/{uid}/enrolled/` - PRIVÉ
- `users/{uid}/sessions/` - PRIVÉ

Admin peut **lire** pour analytics, mais **pas modifier**.

---

## 🧪 Checklist de Validation

Avant de déployer en production:

- [ ] Firestore Rules déployées et testées
- [ ] Indexes déployés
- [ ] Premier admin créé et testé
- [ ] App Android fonctionne toujours normalement:
  - [ ] Login/Logout
  - [ ] Profil utilisateur
  - [ ] Programmes visibles
  - [ ] Gratitudes accessibles
  - [ ] Stats mises à jour
- [ ] Admin Web fonctionne:
  - [ ] Login admin
  - [ ] Liste users
  - [ ] CRUD programmes
  - [ ] Commandes admin
- [ ] Aucune régression de sécurité:
  - [ ] Users ne peuvent pas voir d'autres users
  - [ ] Users ne peuvent pas modifier les programmes
  - [ ] Users ne peuvent pas accéder aux commandes

---

## 📚 Ressources

- [Firestore Rules fusionnées](firestore.rules)
- [Indexes combinés](firestore.indexes.json)
- [Storage Rules](storage.rules)
- [Guide de déploiement](QUICK_START.md)

---

**Questions ?** Consultez le [README](README.md) ou ouvrez une issue.
