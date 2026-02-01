/**
 * POST /api/email/send
 *
 * Send an email based on type and recipient.
 * Handles template rendering, i18n, and Resend integration.
 *
 * Required permissions: admin only
 */

import { NextRequest } from 'next/server';
import {
  authenticateRequest,
  requireRole,
  apiError,
  apiSuccess,
} from '@/lib/api/auth-middleware';
import { sendEmail } from '@/lib/email/send-email';
import { logAuditEvent } from '@/lib/audit/logger';
import type { SendEmailRequest } from '@/types/email';
import { hasPermission } from '@/lib/rbac';

export async function POST(request: NextRequest) {
  try {
    // Authenticate request
    const user = await authenticateRequest(request);

    // Check permission
    if (!hasPermission(user.role, 'canSendEmails')) {
      return apiError('Insufficient permissions to send emails', 403);
    }

    // Parse request body
    const body: SendEmailRequest = await request.json();
    const {
      emailType,
      recipientEmail,
      recipientUid,
      language = 'fr',
      variables,
      priority = 'normal',
    } = body;

    // Validate required fields
    if (!emailType) {
      return apiError('emailType is required', 400);
    }

    if (!recipientEmail) {
      return apiError('recipientEmail is required', 400);
    }

    // Get client info for logging
    const ipAddress =
      request.headers.get('x-forwarded-for')?.split(',')[0] ||
      request.headers.get('x-real-ip') ||
      request.headers.get('cf-connecting-ip') ||
      'unknown';
    const userAgent = request.headers.get('user-agent') || undefined;

    // Send email
    const result = await sendEmail({
      emailType,
      recipientEmail,
      recipientUid,
      language,
      variables: variables || {},
      priority,
      triggeredBy: 'admin',
      ipAddress,
      userAgent,
    });

    if (!result.success) {
      // Log failed attempt
      logAuditEvent({
        action: 'email_send_failed',
        resourceType: 'email',
        resourceId: emailType,
        actorId: user.uid,
        actorEmail: user.email || 'unknown',
        changesAfter: {
          emailType,
          recipientEmail,
          error: result.error,
        },
        request,
      });

      return apiError(result.error || 'Failed to send email', 500);
    }

    // Log successful send
    logAuditEvent({
      action: 'email_sent',
      resourceType: 'email',
      resourceId: result.messageId || emailType,
      actorId: user.uid,
      actorEmail: user.email || 'unknown',
      changesAfter: {
        emailType,
        recipientEmail,
        language,
        messageId: result.messageId,
      },
      request,
    });

    return apiSuccess(
      {
        success: true,
        messageId: result.messageId,
        message: 'Email sent successfully',
      },
      201
    );
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : 'Failed to send email';
    console.error('[API] POST /api/email/send error:', errorMessage);

    // Handle authentication errors
    if (
      errorMessage.includes('authorization') ||
      errorMessage.includes('token')
    ) {
      return apiError(errorMessage, 401);
    }

    return apiError(errorMessage, 500);
  }
}
