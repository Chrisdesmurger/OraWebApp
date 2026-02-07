/**
 * Email Sending Utilities
 *
 * Provides functions for sending emails via Resend
 * with proper error handling, logging, and tracking
 */

import { render } from '@react-email/components';
import { createElement } from 'react';
import { createSupabaseServiceClient } from '@/lib/supabase/server';
import type { SupportedLanguage } from '@/lib/firestore/conversions';
import type {
  EmailType,
  EmailPriority,
  EmailLogDocument,
  SendEmailResponse,
} from '@/types/email';
import {
  getResendClient,
  getFromAddress,
  getReplyToAddress,
  getBaseUrl,
  getEffectiveRecipient,
  isValidEmail,
  isAllowedEmailDomain,
} from './resend';
import { getEmailComponent, getEmailSubject } from './templates';

// ============================================================================
// Main Send Function
// ============================================================================

export interface SendEmailOptions {
  emailType: EmailType;
  recipientEmail: string;
  recipientUid?: string;
  language: SupportedLanguage;
  variables: Record<string, unknown>;
  priority?: EmailPriority;
  triggeredBy?: 'system' | 'admin' | 'user';
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Send an email using Resend
 */
export async function sendEmail(
  options: SendEmailOptions
): Promise<SendEmailResponse> {
  const {
    emailType,
    recipientEmail,
    recipientUid,
    language,
    variables,
    priority = 'normal',
    triggeredBy = 'system',
    ipAddress,
    userAgent,
  } = options;

  // Validate email
  if (!isValidEmail(recipientEmail)) {
    return {
      success: false,
      error: `Invalid email address: ${recipientEmail}`,
    };
  }

  if (!isAllowedEmailDomain(recipientEmail)) {
    return {
      success: false,
      error: `Email domain is blocked: ${recipientEmail}`,
    };
  }

  try {
    // Get the email component and render it
    const EmailComponent = getEmailComponent(emailType);
    if (!EmailComponent) {
      return {
        success: false,
        error: `No template found for email type: ${emailType}`,
      };
    }

    // Build props for the email component
    const emailProps = {
      recipientEmail,
      language,
      baseUrl: getBaseUrl(),
      ...variables,
    };

    // Render the email to HTML
    const emailElement = createElement(EmailComponent, emailProps);
    const html = await render(emailElement);

    // Get the subject line
    const subject = getEmailSubject(emailType, language, variables);

    // Get effective recipient (handles dev override)
    const effectiveRecipient = getEffectiveRecipient(recipientEmail);

    // Send via Resend
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: getFromAddress(),
      to: effectiveRecipient,
      replyTo: getReplyToAddress(),
      subject,
      html,
      tags: [
        { name: 'email_type', value: emailType },
        { name: 'language', value: language },
        { name: 'priority', value: priority },
      ],
    });

    if (error) {
      console.error('[Email] Resend error:', error);

      // Log failed attempt
      await logEmailSent({
        emailType,
        recipientEmail,
        recipientUid,
        language,
        resendId: '',
        status: 'failed',
        errorMessage: error.message,
        triggeredBy,
        ipAddress,
        userAgent,
        variables,
      });

      return {
        success: false,
        error: error.message,
      };
    }

    const messageId = data?.id || '';
    console.log(`[Email] Sent ${emailType} to ${recipientEmail}: ${messageId}`);

    // Log successful send
    await logEmailSent({
      emailType,
      recipientEmail,
      recipientUid,
      language,
      resendId: messageId,
      status: 'sent',
      triggeredBy,
      ipAddress,
      userAgent,
      variables,
    });

    return {
      success: true,
      messageId,
    };
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : 'Unknown error';
    console.error('[Email] Send error:', errorMessage);

    // Log failed attempt
    await logEmailSent({
      emailType,
      recipientEmail,
      recipientUid,
      language,
      resendId: '',
      status: 'failed',
      errorMessage,
      triggeredBy,
      ipAddress,
      userAgent,
      variables,
    });

    return {
      success: false,
      error: errorMessage,
    };
  }
}

// ============================================================================
// Batch Send Function
// ============================================================================

export interface BatchRecipient {
  email: string;
  uid?: string;
  language?: SupportedLanguage;
  variables: Record<string, unknown>;
}

export interface BatchSendResult {
  success: boolean;
  sent: number;
  failed: number;
  errors: Array<{ email: string; error: string }>;
}

/**
 * Send emails to multiple recipients
 */
export async function sendBatchEmails(
  emailType: EmailType,
  recipients: BatchRecipient[],
  triggeredBy: 'system' | 'admin' = 'system'
): Promise<BatchSendResult> {
  const results: BatchSendResult = {
    success: true,
    sent: 0,
    failed: 0,
    errors: [],
  };

  // Process recipients in sequence to respect rate limits
  for (const recipient of recipients) {
    const result = await sendEmail({
      emailType,
      recipientEmail: recipient.email,
      recipientUid: recipient.uid,
      language: recipient.language || 'fr',
      variables: recipient.variables,
      triggeredBy,
    });

    if (result.success) {
      results.sent++;
    } else {
      results.failed++;
      results.errors.push({
        email: recipient.email,
        error: result.error || 'Unknown error',
      });
    }

    // Small delay between sends to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  results.success = results.failed === 0;
  return results;
}

// ============================================================================
// Email Logging
// ============================================================================

interface LogEmailParams {
  emailType: EmailType;
  recipientEmail: string;
  recipientUid?: string;
  language: SupportedLanguage;
  resendId: string;
  status: 'sent' | 'failed';
  errorMessage?: string;
  triggeredBy: 'system' | 'admin' | 'user';
  ipAddress?: string;
  userAgent?: string;
  variables: Record<string, unknown>;
}

/**
 * Log email send attempt to Supabase
 */
async function logEmailSent(params: LogEmailParams): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    const now = Date.now();

    const logDoc: EmailLogDocument = {
      email_type: params.emailType,
      recipient_email: params.recipientEmail,
      recipient_uid: params.recipientUid,
      language: params.language,
      resend_id: params.resendId,
      status: params.status,
      sent_at: now,
      error_message: params.errorMessage,
      retry_count: 0,
      triggered_by: params.triggeredBy,
      ip_address: params.ipAddress,
      user_agent: params.userAgent,
      variables_used: params.variables,
    };

    const { error } = await supabase.from('email_logs').insert(logDoc);
    if (error) {
      console.error('[Email] Failed to log email send:', error);
    }
  } catch (error) {
    // Don't throw - logging failure shouldn't break email sending
    console.error('[Email] Failed to log email send:', error);
  }
}

// ============================================================================
// Update Email Status (for webhooks)
// ============================================================================

/**
 * Update email log status from Resend webhook
 */
export async function updateEmailStatus(
  resendId: string,
  status: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained',
  timestamp?: number
): Promise<void> {
  try {
    const supabase = createSupabaseServiceClient();
    const now = timestamp || Date.now();

    // Find the email log by resend_id
    const { data: rows, error: selectError } = await supabase
      .from('email_logs')
      .select('id')
      .eq('resend_id', resendId)
      .limit(1);

    if (selectError) {
      console.error('[Email] Failed to query email log:', selectError);
      return;
    }

    if (!rows || rows.length === 0) {
      console.warn(`[Email] No log found for resend_id: ${resendId}`);
      return;
    }

    const row = rows[0];
    const updateData: Record<string, unknown> = {
      status,
    };

    // Set the appropriate timestamp field
    switch (status) {
      case 'delivered':
        updateData.delivered_at = now;
        break;
      case 'opened':
        updateData.opened_at = now;
        break;
      case 'clicked':
        updateData.clicked_at = now;
        break;
      case 'bounced':
        updateData.bounced_at = now;
        break;
      case 'complained':
        updateData.status = 'complained';
        break;
    }

    const { error: updateError } = await supabase
      .from('email_logs')
      .update(updateData)
      .eq('id', row.id);

    if (updateError) {
      console.error('[Email] Failed to update email status:', updateError);
      return;
    }

    console.log(`[Email] Updated status for ${resendId}: ${status}`);
  } catch (error) {
    console.error('[Email] Failed to update email status:', error);
  }
}
