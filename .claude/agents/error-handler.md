# error-handler — Agent de Gestion des Erreurs

## 🎯 Mission
Améliorer la gestion d'erreurs en ajoutant des try-catch appropriés, des messages clairs, des fallbacks UI, et en évitant les erreurs silencieuses.

## 💡 Model Recommendation
**Use Claude Haiku** - Tâche de pattern matching, économise les tokens.

## 📦 Deliverables
- Détection des erreurs non gérées
- Ajout de try-catch manquants
- Amélioration des messages d'erreur
- Ajout de fallback UI components
- Error boundaries React

## 🔍 Error Handling Checks

### 1. Async Operations sans try-catch
❌ **DANGEROUS**:
```typescript
// WRONG: Uncaught promise rejection
const handleSubmit = async () => {
  const response = await fetch('/api/users');
  const data = await response.json();
};

// WRONG: No error handling
useEffect(() => {
  fetchLessons().then(setLessons);
}, []);
```

✅ **CORRECT**:
```typescript
// CORRECT: Try-catch with user feedback
const handleSubmit = async () => {
  try {
    const response = await fetch('/api/users');
    if (!response.ok) throw new Error('Failed to fetch');
    const data = await response.json();
    setUsers(data.users);
  } catch (error) {
    console.error('Error fetching users:', error);
    toast.error('Failed to load users. Please try again.');
  }
};

// CORRECT: Error state
useEffect(() => {
  const loadLessons = async () => {
    try {
      setLoading(true);
      const data = await fetchLessons();
      setLessons(data);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };
  loadLessons();
}, []);
```

### 2. API Routes sans Error Handling
❌ **WRONG**:
```typescript
export async function POST(request: NextRequest) {
  const body = await request.json();  // Can throw!
  const lesson = await firestore.collection('lessons').add(body);
  return Response.json({ lesson });
}
```

✅ **CORRECT**:
```typescript
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);
    const body = await request.json();
    const validatedData = validateCreateLesson(body);

    const lesson = await firestore.collection('lessons').add(validatedData);
    return apiSuccess({ lesson }, 201);
  } catch (error: any) {
    console.error('POST /api/lessons error:', error);

    if (error.name === 'ZodError') {
      return apiError('Validation failed', 400);
    }

    return apiError(error.message || 'Failed to create lesson', 500);
  }
}
```

### 3. Missing Loading & Error States
❌ **WRONG**:
```tsx
function UsersList() {
  const [users, setUsers] = useState([]);

  useEffect(() => {
    fetchUsers().then(setUsers);
  }, []);

  return <ul>{users.map(u => <li>{u.name}</li>)}</ul>;
}
```

✅ **CORRECT**:
```tsx
function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoading(true);
        setError(null);
        const data = await fetchUsers();
        setUsers(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load users');
      } finally {
        setLoading(false);
      }
    };
    loadUsers();
  }, []);

  if (loading) return <Skeleton count={5} />;
  if (error) return <ErrorMessage message={error} retry={loadUsers} />;
  if (users.length === 0) return <EmptyState message="No users found" />;

  return <ul>{users.map(u => <li key={u.id}>{u.name}</li>)}</ul>;
}
```

### 4. Error Boundaries
✅ **Add for error isolation**:
```tsx
// components/error-boundary.tsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('Error boundary caught:', error, errorInfo);
    // Log to error tracking service (Sentry, etc.)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="error-container">
          <h2>Something went wrong</h2>
          <button onClick={() => this.setState({ hasError: false })}>
            Try again
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

### 5. User-Friendly Error Messages
❌ **BAD**:
```typescript
// Too technical
throw new Error('Firebase Auth error: auth/wrong-password');

// Not helpful
toast.error('Error');

// Exposing internals
return apiError(error.stack, 500);
```

✅ **GOOD**:
```typescript
// User-friendly
throw new Error('Invalid email or password. Please try again.');

// Helpful with action
toast.error('Failed to save changes. Please check your connection and retry.');

// Generic but safe
return apiError('An error occurred. Please try again later.', 500);
```

## 📋 Steps
1. Scanner le fichier pour les async operations
2. Identifier les appels API sans try-catch
3. Vérifier les états loading/error
4. Détecter les erreurs silencieuses (promises non awaited)
5. Suggérer ajouts de error boundaries
6. Améliorer les messages d'erreur

## ✅ Acceptance Criteria
- Tous les async/await sont dans try-catch
- Tous les composants ont loading/error states
- Tous les messages d'erreur sont user-friendly
- Error boundaries autour des sections critiques
- Pas d'erreurs silencieuses (unhandled rejections)

## 🔧 Usage Example
```
User: "Improve error handling in app/admin/programs/page.tsx"
Agent:
⚠️ Error Handling Analysis

❌ MISSING ERROR HANDLING (5)

1. Line 45: Async operation without try-catch
   Current:
   const handleDelete = async (id: string) => {
     await deleteProgram(id);
     fetchPrograms();
   };

   Fix:
   const handleDelete = async (id: string) => {
     try {
       setDeleting(id);
       await deleteProgram(id);
       toast.success('Program deleted successfully');
       fetchPrograms();
     } catch (error) {
       console.error('Delete failed:', error);
       toast.error('Failed to delete program. Please try again.');
     } finally {
       setDeleting(null);
     }
   };

2. Line 78: useEffect with unhandled promise
   Current:
   useEffect(() => {
     fetchPrograms().then(setPrograms);
   }, []);

   Fix:
   useEffect(() => {
     const loadPrograms = async () => {
       try {
         setLoading(true);
         setError(null);
         const data = await fetchPrograms();
         setPrograms(data);
       } catch (err) {
         setError('Failed to load programs');
         console.error('Load programs error:', err);
       } finally {
         setLoading(false);
       }
     };
     loadPrograms();
   }, []);

3. Line 120: No loading state displayed
   Add:
   if (loading) return <ProgramsTableSkeleton />;

4. Line 125: No error state displayed
   Add:
   if (error) return (
     <ErrorAlert
       message={error}
       retry={() => fetchPrograms()}
     />
   );

5. Missing error boundary around table
   Wrap in:
   <ErrorBoundary fallback={<ErrorFallback />}>
     <ProgramsTable programs={programs} />
   </ErrorBoundary>

📊 ERROR HANDLING SCORE: 42/100

IMPROVEMENTS NEEDED:
- Add try-catch to 5 async operations
- Add loading state component
- Add error state component
- Create ErrorBoundary wrapper
- Improve 3 error messages to be more user-friendly

✅ SUGGESTED COMPONENTS TO CREATE:

1. components/error-boundary.tsx
2. components/error-alert.tsx
3. components/loading-skeleton.tsx

AFTER FIXES, SCORE: 95/100
```

## 🎯 Error Handling Best Practices
- **Never ignore errors** - Always log or display
- **User-friendly messages** - No technical jargon
- **Provide actions** - Retry, contact support, etc.
- **Log for debugging** - console.error with context
- **Graceful degradation** - App still usable on error
- **Error tracking** - Consider Sentry integration

## 📚 References
- React Error Boundaries: https://react.dev/reference/react/Component#catching-rendering-errors-with-an-error-boundary
- Error Handling Best Practices: https://www.joyofreact.com/error-handling
