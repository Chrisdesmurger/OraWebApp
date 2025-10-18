# 🔥 Firebase Setup Guide

Complete guide to setting up Firebase for the Ora Admin Web Interface.

## Prerequisites

- Firebase account (free tier works)
- Firebase CLI installed: `npm install -g firebase-tools`

## Step 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"**
3. Enter project name: `ora-admin` (or your choice)
4. Enable Google Analytics (optional)
5. Click **"Create project"**

## Step 2: Enable Authentication

1. In Firebase Console, go to **Build → Authentication**
2. Click **"Get started"**
3. Enable **Email/Password**:
   - Click on "Email/Password"
   - Toggle "Enable"
   - Save
4. Enable **Google Sign-In**:
   - Click on "Google"
   - Toggle "Enable"
   - Enter support email
   - Save

## Step 3: Create Firestore Database

1. Go to **Build → Firestore Database**
2. Click **"Create database"**
3. Select **"Start in production mode"** (we'll deploy rules later)
4. Choose location closest to your users (e.g., `us-central1`)
5. Click **"Enable"**

## Step 4: Enable Cloud Storage

1. Go to **Build → Storage**
2. Click **"Get started"**
3. Select **"Start in production mode"**
4. Choose same location as Firestore
5. Click **"Done"**

## Step 5: Get Firebase Config (Client)

1. Go to **Project Settings** (gear icon)
2. Scroll to **"Your apps"**
3. Click **"Web app"** (</> icon)
4. Register app with nickname: `ora-admin-web`
5. Copy the config object:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "ora-admin.firebaseapp.com",
  projectId: "ora-admin",
  storageBucket: "ora-admin.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

6. Add these to your `.env` file as:

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza...
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=ora-admin.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=ora-admin
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=ora-admin.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=123456789
NEXT_PUBLIC_FIREBASE_APP_ID=1:123456789:web:abcdef
```

## Step 6: Get Service Account (Server)

1. Go to **Project Settings → Service Accounts**
2. Click **"Generate new private key"**
3. Click **"Generate key"** (downloads JSON file)
4. **IMPORTANT**: Keep this file secure! Never commit to git!
5. Convert JSON to single-line string:

```bash
# On macOS/Linux:
cat service-account.json | jq -c '.'

# On Windows (PowerShell):
Get-Content service-account.json | ConvertFrom-Json | ConvertTo-Json -Compress
```

6. Add to `.env` as:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account","project_id":"ora-admin",...}
```

## Step 7: Deploy Security Rules

1. Login to Firebase CLI:

```bash
firebase login
```

2. Initialize Firebase in your project:

```bash
cd C:\Users\chris\source\repos\OraWebApp
firebase init
```

3. Select:
   - **Firestore**: Configure security rules and indexes
   - **Storage**: Configure security rules

4. Use existing files:
   - Firestore rules: `firestore.rules` ✅
   - Firestore indexes: `firestore.indexes.json` ✅
   - Storage rules: `storage.rules` ✅

5. Deploy rules:

```bash
firebase deploy --only firestore:rules,storage:rules,firestore:indexes
```

6. Verify deployment in Firebase Console:
   - **Firestore → Rules** tab
   - **Storage → Rules** tab

## Step 8: Create First Admin User

### Option A: Via Firebase Console

1. Go to **Authentication → Users**
2. Click **"Add user"**
3. Enter email and password
4. Click **"Add user"**
5. Note the **UID**
6. Go to **Authentication → Users → [User] → Custom Claims**
7. Add custom claim:

```json
{
  "role": "admin"
}
```

### Option B: Via Firebase CLI

1. Create user via the web app `/login` (sign up)
2. Get user UID from Firebase Console
3. Run:

```bash
firebase functions:shell
```

4. Execute:

```javascript
admin.auth().setCustomUserClaims('USER_UID_HERE', { role: 'admin' })
```

### Option C: Via API Script

Create `scripts/set-admin.ts`:

```typescript
import { getAuth } from '@/lib/firebase/admin';

async function setAdmin(email: string) {
  const auth = getAuth();
  const user = await auth.getUserByEmail(email);
  await auth.setCustomUserClaims(user.uid, { role: 'admin' });
  console.log(`✅ Set ${email} as admin`);
}

setAdmin('your-email@example.com');
```

Run:

```bash
npx ts-node -r dotenv/config scripts/set-admin.ts
```

## Step 9: Test Authentication

1. Start dev server:

```bash
npm run dev
```

2. Navigate to `http://localhost:3000/login`
3. Sign in with admin credentials
4. Verify redirect to `/admin` dashboard
5. Check role badge shows "Administrator"

## Step 10: Seed Initial Data (Optional)

1. Navigate to `/admin/commands`
2. Run commands:
   - **Seed Fake Users**: Creates 10 test users
   - **Seed Sample Content**: Creates sample programs/lessons

## Firestore Collections Structure

After setup, your Firestore should have these collections:

```
users/
  {uid}/
    email: string
    displayName: string
    photoURL: string | null
    role: 'admin' | 'teacher' | 'viewer'
    createdAt: timestamp
    lastLoginAt: timestamp
    isFake: boolean

programs/
  {programId}/
    title: string
    description: string
    level: 'beginner' | 'intermediate' | 'advanced'
    tags: string[]
    status: 'draft' | 'published'
    authorId: string (UID)
    coverUrl: string | null
    mediaCount: number
    createdAt: timestamp
    updatedAt: timestamp

lessons/
  {lessonId}/
    programId: string
    title: string
    type: 'video' | 'audio' | 'text'
    storagePath: string | null
    durationSec: number
    order: number
    transcript: string
    createdAt: timestamp

media/
  {mediaId}/
    type: 'image' | 'video' | 'audio'
    storagePath: string
    mimeType: string
    size: number (bytes)
    uploadedBy: string (UID)
    linkedTo: string (programId or lessonId)
    uploadType: 'program' | 'lesson' | 'user'
    createdAt: timestamp

commands/
  {commandName}/
    name: string
    label: string
    lastRunAt: timestamp
    lastStatus: 'success' | 'error'
    lastOutput: string
    lastRunBy: string (UID)
```

## Security Rules Summary

### Firestore Rules

- **Users**: Admins can read/write all, users can read own
- **Programs**: All authenticated can read, teachers/admins can create, owners can edit
- **Lessons**: All authenticated can read, teachers/admins can write
- **Media**: All authenticated can read, creators can write
- **Commands**: Admins only
- **Audit Logs**: Admins read-only, server writes

### Storage Rules

- **`media/programs/`**: Authenticated can read, teachers/admins can write (max 100MB)
- **`media/lessons/`**: Authenticated can read, teachers/admins can write (max 500MB)
- **`media/users/`**: Public read, user can write own (max 5MB, images only)

## Troubleshooting

### Error: "Missing or insufficient permissions"

- Check Firestore rules are deployed: `firebase deploy --only firestore:rules`
- Verify user has correct role in custom claims
- Check token is being sent in Authorization header

### Error: "Failed to initialize Firebase Admin"

- Verify `FIREBASE_SERVICE_ACCOUNT_JSON` is set correctly
- Ensure JSON is valid (use JSON validator)
- Check service account has necessary permissions

### Error: "Storage upload failed"

- Check Storage rules are deployed: `firebase deploy --only storage:rules`
- Verify file size and type constraints
- Ensure user is authenticated

### Custom Claims Not Working

- Force token refresh: User must log out and log back in
- Or call `refreshUserToken()` in client
- Custom claims can take up to 1 hour to propagate in some cases

## Next Steps

- ✅ Set up monitoring: [Firebase Console → Analytics]
- ✅ Configure billing alerts
- ✅ Review security rules
- ✅ Set up backup schedule
- ✅ Configure custom domain (Firebase Hosting or Vercel)

---

**Need help?** Check the [main README](../README.md) or open an issue.
