# 🔐 Custom Claims Setup Guide

⚠️ **IMPORTANT**: Firebase custom claims **CANNOT** be set via the Firebase Console UI. They must be set using the Firebase Admin SDK in a secure server environment.

This is a security feature to prevent users from granting themselves elevated privileges.

---

## 📋 Table of Contents

1. [Why Custom Claims?](#why-custom-claims)
2. [Prerequisites](#prerequisites)
3. [Methods to Set Custom Claims](#methods-to-set-custom-claims)
4. [Client-Side Token Refresh](#client-side-token-refresh)
5. [Troubleshooting](#troubleshooting)

---

## 🎯 Why Custom Claims?

Custom claims allow you to assign roles to users for Role-Based Access Control (RBAC):

- **`admin`** - Full access to admin dashboard (users, content, commands, stats)
- **`teacher`** - Can manage their own content and programs
- **`viewer`** - Read-only access to dashboard
- **`user`** (default) - Regular mobile app user

---

## ✅ Prerequisites

1. **Firebase project** configured
2. **Service Account JSON** downloaded
3. **Node.js 18+** installed
4. **Admin Web project** cloned and dependencies installed

```bash
cd C:\Users\chris\source\repos\OraWebApp
npm install
```

5. **Environment variables** set in `.env.local`:

```bash
FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
```

---

## 🛠️ Methods to Set Custom Claims

### Method 1: Node.js Scripts (Recommended ✅)

We've provided ready-to-use TypeScript scripts that run via `npx tsx` (auto-installs TypeScript executor):

#### Set User Role

```bash
npx tsx scripts/set-user-role.ts <email> <role>
```

**Example:**
```bash
npx tsx scripts/set-user-role.ts admin@ora.com admin
```

**Note:** No need to run `npm install` first - `npx tsx` will automatically install the TypeScript executor if needed.

**Output:**
```
🔧 Setting role for admin@ora.com to admin...
✅ Found user: abc123xyz
✅ Custom claims set successfully!
✅ Verified custom claims: { role: 'admin' }

📱 Client-side: User needs to refresh their ID token:
   firebase.auth().currentUser.getIdToken(true)

🎉 Done! User can now access admin features.
```

#### List All Admin Users

```bash
npx tsx scripts/list-admin-users.ts
```

**Output:**
```
📋 Listing users with custom roles...

✅ Found 3 user(s) with custom roles:

1. 👑 admin@ora.com
   UID: abc123xyz
   Role: admin
   Created: Wed, 15 Nov 2023 10:30:00 GMT
   Last Sign In: Fri, 17 Nov 2023 14:20:00 GMT

2. 👨‍🏫 teacher@ora.com
   UID: def456uvw
   Role: teacher
   Created: Thu, 16 Nov 2023 09:00:00 GMT
   Last Sign In: Fri, 17 Nov 2023 11:00:00 GMT

📊 Summary:
   👑 admin: 1
   👨‍🏫 teacher: 1
   👁️ viewer: 1
```

#### Remove User Role

```bash
npx tsx scripts/remove-user-role.ts <email>
```

**Example:**
```bash
npx tsx scripts/remove-user-role.ts user@ora.com
```

---

### Method 2: Admin Web API (After First Admin Created)

Once you have at least one admin user, you can use the admin web interface.

#### Endpoint

```
POST /api/admin/set-role
```

**Request:**
```json
{
  "uid": "user_uid_here",
  "role": "admin" | "teacher" | "viewer" | "user"
}
```

**Response:**
```json
{
  "success": true,
  "uid": "abc123",
  "email": "user@example.com",
  "role": "admin",
  "message": "Role set to admin successfully. User needs to refresh their ID token."
}
```

**cURL Example:**
```bash
curl -X POST http://localhost:3000/api/admin/set-role \
  -H "Authorization: Bearer YOUR_ADMIN_ID_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"uid":"abc123","role":"admin"}'
```

---

### Method 3: Firebase CLI (Advanced)

```bash
# 1. Install Firebase tools
npm install -g firebase-tools

# 2. Login
firebase login

# 3. Open functions shell
firebase functions:shell

# 4. In the shell, run:
admin.auth().setCustomUserClaims('USER_UID_HERE', { role: 'admin' })
```

**Note**: This requires Firebase Functions to be deployed.

---

### Method 4: Custom Node.js Script

Create a file `set-admin.js`:

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('./path/to/serviceAccountKey.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function setAdmin(email, role = 'admin') {
  try {
    const user = await admin.auth().getUserByEmail(email);
    await admin.auth().setCustomUserClaims(user.uid, { role });
    console.log(`✅ ${email} is now a ${role}`);

    // Force token refresh
    console.log('⚠️  User must refresh their ID token to see changes.');
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
  process.exit();
}

// Usage
setAdmin('admin@ora.com', 'admin');
```

**Run:**
```bash
node set-admin.js
```

---

## 🔄 Client-Side Token Refresh

After setting custom claims on the server, the client must refresh their ID token to receive the updated claims.

### Web (Admin Dashboard)

```typescript
import { getAuth } from 'firebase/auth';

const auth = getAuth();
const user = auth.currentUser;

if (user) {
  // Force token refresh
  user.getIdToken(true)
    .then(() => {
      console.log('✅ Token refreshed');
      // Reload page or update UI
      window.location.reload();
    });
}
```

### Android App

```kotlin
import com.google.firebase.auth.FirebaseAuth

val user = FirebaseAuth.getInstance().currentUser
user?.getIdToken(true)?.addOnSuccessListener { result ->
    val role = result.claims["role"] as? String
    Log.d("Auth", "Role: $role")
    // Update UI based on role
}
```

### Automatic Refresh

The client ID token automatically refreshes every hour. If you don't force a refresh, the user will see the new role within 1 hour.

---

## 🐛 Troubleshooting

### Error: "Missing or insufficient permissions"

**Cause**: User doesn't have the correct custom claims yet.

**Solution:**
1. Verify custom claims are set:
   ```bash
   npx tsx scripts/list-admin-users.ts
   ```
2. Force client-side token refresh:
   ```javascript
   user.getIdToken(true)
   ```

### Error: "User not found"

**Cause**: Email doesn't exist in Firebase Auth.

**Solution:**
1. Check email spelling
2. Ensure user has signed up first
3. List all users:
   ```bash
   firebase auth:export users.json
   ```

### Error: "FIREBASE_SERVICE_ACCOUNT_JSON not set"

**Cause**: Environment variable missing.

**Solution:**
1. Create `.env.local` in project root
2. Add service account JSON:
   ```bash
   FIREBASE_SERVICE_ACCOUNT_JSON={"type":"service_account",...}
   ```
3. Restart your terminal/server

### Custom Claims Not Appearing in Firestore Rules

**Cause**: Custom claims are in the **ID token**, not in Firestore documents.

**Solution:**
- Access via `request.auth.token.role` in Firestore Rules
- Don't store role in Firestore `users/{uid}` document (redundant)

### Changes Not Reflecting Immediately

**Cause**: Client hasn't refreshed their ID token.

**Solution:**
1. Force token refresh on client
2. Or wait up to 1 hour for automatic refresh
3. Or logout/login again

---

## 📚 Additional Resources

- [Firebase Custom Claims Docs](https://firebase.google.com/docs/auth/admin/custom-claims)
- [RBAC Guide](../lib/rbac.ts)
- [Firestore Rules](../firestore.rules)
- [Android Compatibility Guide](../ANDROID_COMPATIBILITY_GUIDE.md)

---

## ✅ Quick Start Checklist

- [ ] Service Account JSON downloaded and added to `.env.local`
- [ ] Dependencies installed (`npm install`)
- [ ] First admin user created via script
- [ ] Admin user verified in list
- [ ] Admin user logged in and refreshed token
- [ ] Admin dashboard accessible

**Need help?** Open an issue on GitHub or consult the [README](../README.md).
