# 002. Use Firebase as Backend

**Date**: 2025-10-23
**Status**: Accepted
**Deciders**: SmartKiwiTech Team
**Tags**: backend, database, authentication, infrastructure

## Context

### Problem Statement

The Ora Admin Portal needs a backend to:
- Authenticate admin users securely
- Store and query user data, programs, lessons
- Handle file uploads (videos, images)
- Provide real-time updates for transcoding progress
- Scale with user growth

### Constraints

- Must integrate with existing Android app (which uses Firebase)
- Must support role-based access control (RBAC)
- Must be cost-effective for early stage
- Must scale to thousands of users
- Must have good developer experience
- Must support both admin portal (web) and mobile app

### Assumptions

- We want to minimize DevOps overhead
- We prefer managed services over self-hosted
- We value rapid development and iteration
- We need strong security out of the box

## Considered Options

### Option 1: Firebase (Firestore + Auth + Storage + Functions)

**Description**: Use Firebase as a complete backend-as-a-service

**Pros**:
- ✅ Zero server management required
- ✅ Real-time database with Firestore
- ✅ Built-in authentication with multiple providers
- ✅ Cloud Storage for media files
- ✅ Cloud Functions for serverless backend logic
- ✅ Security rules for fine-grained access control
- ✅ Auto-scaling built-in
- ✅ Already used by Android app (consistency)
- ✅ Generous free tier
- ✅ Excellent documentation

**Cons**:
- ❌ Vendor lock-in to Google
- ❌ Firestore query limitations (no full-text search, complex joins)
- ❌ Can become expensive at scale
- ❌ Cold start latency for Functions

**Estimated Effort**: S (already familiar, SDK ready)

### Option 2: Supabase (PostgreSQL + Auth + Storage + Edge Functions)

**Description**: Use Supabase as an open-source Firebase alternative

**Pros**:
- ✅ PostgreSQL (more powerful queries)
- ✅ Row-level security (RLS)
- ✅ Real-time subscriptions
- ✅ Open source (can self-host if needed)
- ✅ Edge Functions (Deno)
- ✅ Full-text search built-in

**Cons**:
- ❌ Android app already uses Firebase (inconsistency)
- ❌ Smaller ecosystem than Firebase
- ❌ Need to migrate Android app or run two backends
- ❌ Less mature than Firebase
- ❌ More complex pricing

**Estimated Effort**: M (new technology, migration needed)

### Option 3: Custom Backend (Node.js + PostgreSQL + AWS)

**Description**: Build a custom REST API with Express/Fastify

**Pros**:
- ✅ Full control over architecture
- ✅ No vendor lock-in
- ✅ Can optimize for specific use cases
- ✅ Direct SQL queries

**Cons**:
- ❌ Need to manage servers (DevOps overhead)
- ❌ Need to build authentication from scratch
- ❌ Need to implement real-time updates
- ❌ Need to manage database scaling
- ❌ Android app already uses Firebase (inconsistency)
- ❌ Much more development time

**Estimated Effort**: XL (months of work)

## Decision

We choose **Option 1: Firebase** because:

### Rationale

1. **Consistency**: Android app already uses Firebase, sharing the same backend ensures data consistency
2. **Speed**: No need to build authentication, storage, or real-time infrastructure from scratch
3. **Security**: Firestore security rules provide robust, declarative access control
4. **Scalability**: Auto-scales without DevOps work
5. **Cost-effective**: Generous free tier, pay-as-you-grow pricing
6. **Developer Experience**: Excellent SDKs for web and mobile, great documentation

## Consequences

### Positive Consequences

- ✅ Rapid development (weeks instead of months)
- ✅ Zero DevOps overhead (no servers to manage)
- ✅ Built-in real-time updates (perfect for transcoding progress)
- ✅ Strong security with Firestore rules
- ✅ Seamless integration with Android app
- ✅ Cloud Functions for complex backend logic (transcoding, batch jobs)
- ✅ Firebase Admin SDK for privileged operations (Next.js API routes)

### Negative Consequences

- ❌ Vendor lock-in to Google Cloud - *Mitigation: Design data layer with abstraction, could migrate if needed*
- ❌ Firestore query limitations - *Mitigation: Use Algolia or Typesense for full-text search if needed*
- ❌ Cost can scale - *Mitigation: Monitor usage, optimize queries, use Firebase Emulator for development*
- ❌ Cold start latency for Functions - *Mitigation: Use min instances for critical functions*

### Neutral Consequences

- ⚪ Need to learn Firestore data modeling (denormalization patterns)
- ⚪ Need to understand security rules DSL

## Implementation

### Action Items

- [x] Create Firebase project
- [x] Enable Authentication (Email/Password + Google OAuth)
- [x] Set up Firestore database
- [x] Create collections: users, programs, lessons, stats
- [x] Write Firestore security rules (RBAC)
- [x] Set up Cloud Storage
- [x] Write Storage security rules
- [x] Deploy Cloud Functions for transcoding
- [x] Configure Firebase Admin SDK in Next.js
- [x] Configure Firebase Client SDK for client components

### Data Model

```
Firestore Collections:
├── users/{userId}
│   ├── email, displayName, photoURL
│   ├── role: 'admin' | 'teacher' | 'viewer'
│   └── createdAt, updatedAt
├── programs/{programId}
│   ├── title, description, category
│   ├── lessons: string[]  (lesson IDs)
│   └── created_by, status
├── lessons/{lessonId}
│   ├── title, description, type
│   ├── program_id, order
│   ├── storage_path_original
│   ├── renditions: { quality, size, url }[]
│   └── status: 'draft' | 'uploading' | 'processing' | 'ready'
└── stats/{userId}
    └── daily aggregated stats

Cloud Storage:
└── media/
    ├── lessons/{lessonId}/
    │   ├── original.mp4
    │   ├── 1080p.mp4
    │   ├── 720p.mp4
    │   └── 480p.mp4
    └── images/{programId}/cover.jpg
```

### Security Rules

**Firestore**:
```javascript
// RBAC: Admin > Teacher > Viewer
match /users/{userId} {
  allow read: if isAuthenticated();
  allow write: if isAdmin();
}

match /programs/{programId} {
  allow read: if isAuthenticated();
  allow create: if isTeacherOrAdmin();
  allow update, delete: if isOwnerOrAdmin(resource.data.created_by);
}
```

**Storage**:
```javascript
match /media/lessons/{lessonId}/{file} {
  allow read: if isAuthenticated();
  allow write: if isTeacherOrAdmin() && request.resource.size < 2 * 1024 * 1024 * 1024; // 2GB limit
}
```

### Rollback Plan

If Firebase becomes problematic:
1. Firestore data can be exported to JSON
2. Migrate to Supabase or custom PostgreSQL
3. Update data access layer (use repository pattern for abstraction)
4. Keep Authentication separate (can use Firebase Auth with different database)

## Validation

### Success Metrics

- [x] Authentication works: ✅ Email/Password + Google OAuth
- [x] RBAC enforced: ✅ Security rules tested
- [x] Real-time updates work: ✅ Transcoding progress updates
- [x] File uploads work: ✅ Resumable uploads for large files
- [x] Costs within budget: ✅ Free tier sufficient for development
- [x] Query performance acceptable: ✅ <100ms for typical queries

### Validation Timeline

- **Short-term** (1 week): ✅ Basic CRUD operations working
- **Medium-term** (1 month): ✅ All features implemented, security rules validated
- **Long-term** (3 months): 🔄 Monitor costs and performance in production

## References

- [Firebase Documentation](https://firebase.google.com/docs)
- [Firestore Data Modeling](https://firebase.google.com/docs/firestore/data-model)
- [Firestore Security Rules](https://firebase.google.com/docs/firestore/security/get-started)
- [Cloud Functions](https://firebase.google.com/docs/functions)
- [Firebase with Next.js](https://firebase.google.com/docs/web/setup)

## Notes

### Open Questions

- ~~How to handle full-text search?~~ Resolved: Use Firestore's `array-contains` for tags, consider Algolia for advanced search later
- ~~How to handle complex aggregations?~~ Resolved: Use Cloud Functions with scheduled jobs
- ~~How to prevent costs from exploding?~~ Resolved: Set budget alerts, use Firebase Emulator for dev

### Future Considerations

- Consider Firebase App Check for additional security
- Evaluate Firestore Bundles for faster initial loads
- Monitor for Firestore query limitations, add search service if needed
- Consider Firestore Data Connect when it's GA

---

**Last Updated**: 2025-10-23
**Review Date**: 2026-01-23 (re-evaluate after 3 months in production)
