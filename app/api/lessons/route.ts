import { NextRequest } from 'next/server';
import { authenticateRequest, requireRole, apiError, apiSuccess } from '@/lib/api/auth-middleware';
import { getFirestore } from '@/lib/firebase/admin';

/**
 * GET /api/lessons - List lessons (optionally filter by programId)
 */
export async function GET(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    const { searchParams } = new URL(request.url);
    const programId = searchParams.get('programId');

    const firestore = getFirestore();

    console.log('[GET /api/lessons] Fetching content, programId:', programId || 'all');

    let snapshot;
    try {
      // Use 'content' collection (not 'lessons')
      let query = firestore.collection('content');

      if (programId) {
        query = query.where('programId', '==', programId) as any;
      }

      // Try ordering by createdAt instead of order
      query = query.orderBy('createdAt', 'desc') as any;

      snapshot = await query.get();
      console.log('[GET /api/lessons] With orderBy - Found', snapshot.size, 'content items');
    } catch (orderError: any) {
      console.warn('[GET /api/lessons] orderBy failed, trying without:', orderError.message);
      // Fallback: fetch without ordering
      let query = firestore.collection('content');
      if (programId) {
        query = query.where('programId', '==', programId) as any;
      }
      snapshot = await query.get();
      console.log('[GET /api/lessons] Without orderBy - Found', snapshot.size, 'content items');
    }

    const lessons = snapshot.docs.map((doc) => {
      const data = doc.data();
      console.log('[GET /api/lessons] Lesson doc:', doc.id, 'has fields:', Object.keys(data));
      return {
        id: doc.id,
        ...doc.data(),
      };
    });

    console.log('[GET /api/lessons] Returning', lessons.length, 'lessons');
    return apiSuccess({ lessons });
  } catch (error: any) {
    console.error('GET /api/lessons error:', error);
    return apiError(error.message || 'Failed to fetch lessons', 401);
  }
}

/**
 * POST /api/lessons - Create a new lesson
 */
export async function POST(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();
    const { programId, title, type = 'video', storagePath, durationSec = 0, order = 0, transcript = '' } = body;

    if (!title || !programId) {
      return apiError('Title and programId are required', 400);
    }

    // Verify program exists and user has permission
    const firestore = getFirestore();
    const programDoc = await firestore.collection('programs').doc(programId).get();

    if (!programDoc.exists) {
      return apiError('Program not found', 404);
    }

    const programData = programDoc.data();
    if (user.role === 'teacher' && programData?.authorId !== user.uid) {
      return apiError('You can only add lessons to your own programs', 403);
    }

    const lessonRef = firestore.collection('lessons').doc();

    const lessonData = {
      programId,
      title,
      type,
      storagePath: storagePath || null,
      durationSec,
      order,
      transcript,
      createdAt: new Date().toISOString(),
    };

    await lessonRef.set(lessonData);

    // Update program mediaCount
    await firestore
      .collection('programs')
      .doc(programId)
      .update({
        mediaCount: (programData?.mediaCount || 0) + 1,
        updatedAt: new Date().toISOString(),
      });

    return apiSuccess({ id: lessonRef.id, ...lessonData }, 201);
  } catch (error: any) {
    console.error('POST /api/lessons error:', error);
    return apiError(error.message || 'Failed to create lesson', 500);
  }
}

/**
 * PATCH /api/lessons/:id - Update lesson
 */
export async function PATCH(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin', 'teacher'])) {
      return apiError('Insufficient permissions', 403);
    }

    const body = await request.json();
    const { id, title, type, storagePath, durationSec, order, transcript } = body;

    if (!id) {
      return apiError('Lesson ID is required', 400);
    }

    const firestore = getFirestore();
    const lessonRef = firestore.collection('lessons').doc(id);
    const lessonDoc = await lessonRef.get();

    if (!lessonDoc.exists) {
      return apiError('Lesson not found', 404);
    }

    const lessonData = lessonDoc.data();

    // Verify program ownership for teachers
    if (user.role === 'teacher' && lessonData?.programId) {
      const programDoc = await firestore.collection('programs').doc(lessonData.programId).get();
      const programData = programDoc.data();
      if (programData?.authorId !== user.uid) {
        return apiError('You can only edit lessons in your own programs', 403);
      }
    }

    const updateData: any = {};

    if (title) updateData.title = title;
    if (type) updateData.type = type;
    if (storagePath !== undefined) updateData.storagePath = storagePath;
    if (durationSec !== undefined) updateData.durationSec = durationSec;
    if (order !== undefined) updateData.order = order;
    if (transcript !== undefined) updateData.transcript = transcript;

    await lessonRef.update(updateData);

    return apiSuccess({ success: true, id });
  } catch (error: any) {
    console.error('PATCH /api/lessons error:', error);
    return apiError(error.message || 'Failed to update lesson', 500);
  }
}

/**
 * DELETE /api/lessons/:id - Delete lesson
 */
export async function DELETE(request: NextRequest) {
  try {
    const user = await authenticateRequest(request);

    if (!requireRole(user, ['admin'])) {
      return apiError('Only admins can delete lessons', 403);
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return apiError('Lesson ID is required', 400);
    }

    const firestore = getFirestore();
    const lessonRef = firestore.collection('lessons').doc(id);
    const lessonDoc = await lessonRef.get();

    if (!lessonDoc.exists) {
      return apiError('Lesson not found', 404);
    }

    const lessonData = lessonDoc.data();

    // Decrement program mediaCount
    if (lessonData?.programId) {
      const programDoc = await firestore.collection('programs').doc(lessonData.programId).get();
      if (programDoc.exists) {
        const programData = programDoc.data();
        await firestore
          .collection('programs')
          .doc(lessonData.programId)
          .update({
            mediaCount: Math.max(0, (programData?.mediaCount || 0) - 1),
            updatedAt: new Date().toISOString(),
          });
      }
    }

    await lessonRef.delete();

    return apiSuccess({ success: true, id });
  } catch (error: any) {
    console.error('DELETE /api/lessons error:', error);
    return apiError(error.message || 'Failed to delete lesson', 500);
  }
}
