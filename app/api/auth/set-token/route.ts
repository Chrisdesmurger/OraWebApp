import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

/**
 * API route to set Firebase ID token in HTTP-only cookie
 */
export async function POST(request: NextRequest) {
  try {
    const { idToken } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    // Set HTTP-only cookie with ID token
    const cookieStore = await cookies();
    cookieStore.set('firebaseIdToken', idToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Set token error:', error);
    return NextResponse.json({ error: 'Failed to set token' }, { status: 500 });
  }
}
