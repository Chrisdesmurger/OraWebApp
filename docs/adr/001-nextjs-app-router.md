# 001. Use Next.js 15 with App Router

**Date**: 2025-10-23
**Status**: Accepted
**Deciders**: SmartKiwiTech Team
**Tags**: frontend, architecture, framework

## Context

### Problem Statement

We need to build an admin portal for the Ora wellbeing platform that provides:
- Server-side rendering for better SEO and performance
- API routes for backend logic
- Modern React patterns with TypeScript
- Easy deployment to Vercel or similar platforms

### Constraints

- Must integrate with Firebase (Firestore, Auth, Storage)
- Must support role-based access control (Admin, Teacher, Viewer)
- Must be maintainable by a small team
- Must have good TypeScript support
- Must support server-side data fetching for security

### Assumptions

- The team is familiar with React and TypeScript
- We want to minimize the number of technologies to learn
- We prefer convention over configuration
- We value developer experience

## Considered Options

### Option 1: Next.js 15 with App Router

**Description**: Use Next.js 15's new App Router with React Server Components

**Pros**:
- ✅ Built-in SSR, SSG, and API routes
- ✅ React Server Components by default (better performance)
- ✅ Excellent TypeScript support
- ✅ File-based routing (convention over configuration)
- ✅ Easy Vercel deployment
- ✅ Great developer experience with Fast Refresh
- ✅ Can mix server and client components easily

**Cons**:
- ❌ App Router is relatively new (may have edge cases)
- ❌ Learning curve for server components paradigm
- ❌ Some third-party libraries may not be fully compatible yet

**Estimated Effort**: M (migration from Pages Router)

### Option 2: Next.js 14 with Pages Router

**Description**: Use the stable Pages Router pattern

**Pros**:
- ✅ More mature and stable
- ✅ Larger ecosystem of compatible libraries
- ✅ Team might be more familiar with it
- ✅ Easier to find solutions online

**Cons**:
- ❌ Older pattern, not the future direction
- ❌ No React Server Components benefits
- ❌ More boilerplate for data fetching
- ❌ Less performant than App Router

**Estimated Effort**: S

### Option 3: Vite + React + Custom Server

**Description**: Build a custom solution with Vite, React, and a Node.js backend

**Pros**:
- ✅ Full control over architecture
- ✅ Lighter build tooling
- ✅ Faster dev server

**Cons**:
- ❌ Need to build SSR infrastructure ourselves
- ❌ More configuration required
- ❌ More pieces to maintain
- ❌ No file-based routing out of the box
- ❌ More effort for deployment

**Estimated Effort**: XL

## Decision

We choose **Option 1: Next.js 15 with App Router** because:

### Rationale

1. **Future-proof**: App Router is the future of Next.js, and starting with it now avoids migration later
2. **Performance**: React Server Components provide better performance by default (less JavaScript sent to client)
3. **Developer Experience**: File-based routing, built-in API routes, and excellent TypeScript support
4. **Security**: Server Components can directly access Firebase Admin SDK without exposing credentials
5. **Ecosystem**: Despite being new, App Router is production-ready and has good community support

## Consequences

### Positive Consequences

- ✅ Better performance with React Server Components (reduced client-side JavaScript)
- ✅ Simplified data fetching (server components can directly fetch data)
- ✅ Better security (API keys only on server, never exposed to client)
- ✅ Faster time-to-interactive for users
- ✅ Easy to add new pages with file-based routing
- ✅ Built-in API routes for backend logic

### Negative Consequences

- ❌ Need to learn "use client" directive for client components - *Mitigation: Clear documentation and examples*
- ❌ Some Firebase libraries need special handling - *Mitigation: Use Firebase Admin SDK on server, client SDK only in client components*
- ❌ May encounter edge cases with new features - *Mitigation: Stay updated with Next.js releases and community*

### Neutral Consequences

- ⚪ Need to understand server vs client component boundaries
- ⚪ Async server components require different patterns than traditional React

## Implementation

### Action Items

- [x] Initialize Next.js 15 project with App Router
- [x] Set up TypeScript configuration
- [x] Configure Firebase Admin SDK for server components
- [x] Configure Firebase Client SDK for client components
- [x] Set up file structure (app/, components/, lib/)
- [x] Create layout with authentication guard
- [x] Implement API routes for data mutations

### Migration Path

N/A (greenfield project)

### Rollback Plan

If we encounter blocking issues with App Router:
1. Create new branch with Pages Router
2. Migrate existing components (should be straightforward as they're React components)
3. Update routing from app/ to pages/
4. Keep API routes (they're compatible)

## Validation

### Success Metrics

- [x] Project builds successfully: ✅ Yes
- [x] Hot reload works smoothly: ✅ Yes
- [x] Firebase integration works: ✅ Yes (both Admin and Client SDKs)
- [x] TypeScript errors are minimal: ✅ Yes (strict mode enabled)
- [x] Development experience is good: ✅ Yes (team is productive)

### Validation Timeline

- **Short-term** (1 week): ✅ Project initialized, basic pages working
- **Medium-term** (1 month): ✅ All major features implemented (auth, CRUD, analytics)
- **Long-term** (3 months): 🔄 Performance metrics validated, team velocity stable

## References

- [Next.js 15 Documentation](https://nextjs.org/docs)
- [App Router Migration Guide](https://nextjs.org/docs/app/building-your-application/upgrading/app-router-migration)
- [React Server Components](https://nextjs.org/docs/app/building-your-application/rendering/server-components)
- [Firebase with Next.js](https://firebase.google.com/docs/web/setup)

## Notes

### Open Questions

- ~~How to handle Firebase Auth in middleware?~~ Resolved: Use `cookies()` and Firebase Admin SDK
- ~~Can we use shadcn/ui with server components?~~ Resolved: Yes, components marked with "use client"

### Future Considerations

- Consider Partial Prerendering (PPR) when it's stable
- Evaluate Server Actions for form submissions
- Monitor React 19 features as they become available

---

**Last Updated**: 2025-10-23
**Review Date**: 2026-04-23 (re-evaluate after 6 months in production)
