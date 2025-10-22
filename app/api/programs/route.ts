import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';

/**
 * GET /api/programs - List all programs
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    const firestore = getFirestore();

    console.log('[GET /api/programs] Fetching programs for user role:', user.role);

    let snapshot;
    try {
      let query = firestore.collection('programs').orderBy('createdAt', 'desc');

      // Teachers only see their own programs
      if (user.role === 'teacher') {
        query = query.where('authorId', '==', user.uid) as any;
      }

      snapshot = await query.get();
      console.log('[GET /api/programs] With orderBy - Found', snapshot.size, 'programs');
    } catch (orderError: any) {
      console.warn('[GET /api/programs] orderBy failed, trying without:', orderError.message);
      // Fallback: fetch without ordering
      snapshot = await firestore.collection('programs').get();
      console.log('[GET /api/programs] Without orderBy - Found', snapshot.size, 'programs');
    }

    const programs = snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log('[GET /api/programs] Program doc:', doc.id, 'has fields:', Object.keys(data));
      return {
        id: doc.id,
        ...data,
      };
    });

    console.log('[GET /api/programs] Returning', programs.length, 'programs');
    return apiSuccess({ programs });
  } catch (error: any) {
    console.error('GET /api/programs error:', error);
    return apiError(error.message || 'Failed to fetch programs', 401);
  }
}

/**
 * POST /api/programs - Create a new program
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();
    const { title, description, level, tags = [], coverUrl = null } = body;

    if (!title) {
      return apiError('Title is required', 400);
    }

    const firestore = getFirestore();
    const programRef = firestore.collection('programs').doc();

    const programData = {
      title,
      description: description || '',
      level: level || 'beginner',
      tags,
      status: 'draft',
      authorId: user.uid,
      coverUrl,
      mediaCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await programRef.set(programData);

    return apiSuccess({ id: programRef.id, ...programData }, 201);
  } catch (error: any) {
    console.error('POST /api/programs error:', error);
    return apiError(error.message || 'Failed to create program', 500);
  }
}

/**
 * PATCH /api/programs/:id - Update program
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    const body = await request.json();
    const { id, title, description, level, tags, status, coverUrl } = body;

    if (!id) {
      return apiError('Program ID is required', 400);
    }

    const firestore = getFirestore();
    const programRef = firestore.collection('programs').doc(id);
    const programDoc = await programRef.get();

    if (!programDoc.exists) {
      return apiError('Program not found', 404);
    }

    const programData = programDoc.data();

    // Check permissions: admin can edit all, teacher can edit own
    if (user.role === 'teacher' && programData?.authorId !== user.uid) {
      return apiError('You can only edit your own programs', 403);
    }

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const updateData: any = {
      updatedAt: new Date().toISOString(),
    };

    if (title) updateData.title = title;
    if (description !== undefined) updateData.description = description;
    if (level) updateData.level = level;
    if (tags) updateData.tags = tags;
    if (status) updateData.status = status;
    if (coverUrl !== undefined) updateData.coverUrl = coverUrl;

    await programRef.update(updateData);

    return apiSuccess({ success: true, id });
  } catch (error: any) {
    console.error('PATCH /api/programs error:', error);
    return apiError(error.message || 'Failed to update program', 500);
  }
}

/**
 * DELETE /api/programs/:id - Delete program
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('Program ID is required', 400);
    }

    const firestore = getFirestore();
    const programRef = firestore.collection('programs').doc(id);
    const programDoc = await programRef.get();

    if (!programDoc.exists) {
      return apiError('Program not found', 404);
    }

    const programData = programDoc.data();

    // Check permissions
    if (user.role === 'teacher' && programData?.authorId !== user.uid) {
      return apiError('You can only delete your own programs', 403);
    }

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    await programRef.delete();

    return apiSuccess({ success: true, id });
  } catch (error: any) {
    console.error('DELETE /api/programs error:', error);
    return apiError(error.message || 'Failed to delete program', 500);
  }
}
