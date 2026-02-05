/**
 * Resend Webhook Handler
 *
 * POST /api/email/webhook - Receives delivery events from Resend
 *
 * Events handled:
 * - email.sent
 * - email.delivered
 * - email.opened
 * - email.clicked
 * - email.bounced
 * - email.complained
 */

import { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import crypto from 'crypto';
import { createSupabaseServiceClient } from '@/lib/supabase/server';

// Resend webhook event types
type ResendEventType =
  | 'email.sent'
  | 'email.delivered'
  | 'email.delivery_delayed'
  | 'email.opened'
  | 'email.clicked'
  | 'email.bounced'
  | 'email.complained';

interface ResendWebhookEvent {
  type: ResendEventType;
  created_at: string;
  data: {
    email_id: string;
    from: string;
    to: string[];
    subject: string;
    created_at: string;
    // Additional fields based on event type
    click?: {
      link: string;
      timestamp: string;
    };
    bounce?: {
      message: string;
    };
  };
}

/**
 * Verify Resend webhook signature
 */
function verifyWebhookSignature(
  payload: string,
  signature: string | null,
  webhookSecret: string
): boolean {
  if (!signature || !webhookSecret) {
    console.warn('[Webhook] Missing signature or secret');
    return false;
  }

  try {
    const expectedSignature = crypto
      .createHmac('sha256', webhookSecret)
      .update(payload)
      .digest('hex');

    // Resend uses svix for webhooks, signature format: v1,<signature>
    const signatureParts = signature.split(',');
    const receivedSignature = signatureParts.length > 1
      ? signatureParts[1]
      : signature;

    return crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(receivedSignature)
    );
  } catch (error) {
    console.error('[Webhook] Signature verification error:', error);
    return false;
  }
}

/**
 * POST /api/email/webhook - Handle Resend webhook events
 */
export async function POST(request: NextRequest) {
  try {
    const payload = await request.text();
    const headersList = await headers();
    const signature = headersList.get('svix-signature');
    const webhookId = headersList.get('svix-id');
    const webhookTimestamp = headersList.get('svix-timestamp');

    // Log incoming webhook for debugging
    console.log(`[Webhook] Received webhook ID: ${webhookId}`);

    // Verify signature in production
    const webhookSecret = process.env.RESEND_WEBHOOK_SECRET;
    if (webhookSecret && process.env.NODE_ENV === 'production') {
      // Build the signed payload as Svix does it
      const signedPayload = `${webhookId}.${webhookTimestamp}.${payload}`;
      if (!verifyWebhookSignature(signedPayload, signature, webhookSecret)) {
        console.error('[Webhook] Invalid signature');
        return new Response('Invalid signature', { status: 401 });
      }
    }

    const event: ResendWebhookEvent = JSON.parse(payload);
    console.log(`[Webhook] Event type: ${event.type}, Email ID: ${event.data.email_id}`);

    const supabase = createSupabaseServiceClient();

    // Find the email log by resend_id
    const { data: logRows } = await supabase
      .from('email_logs')
      .select('id')
      .eq('resend_id', event.data.email_id)
      .limit(1);

    if (!logRows || logRows.length === 0) {
      // Try to find by recipient email if resend_id not found
      const recipientEmail = event.data.to[0];
      console.log(`[Webhook] Log not found by resend_id, trying email: ${recipientEmail}`);

      // Create a new tracking entry if not found
      await supabase.from('email_tracking').insert({
        resend_id: event.data.email_id,
        recipient_email: recipientEmail,
        subject: event.data.subject,
        event_type: event.type,
        event_data: event.data,
        created_at: new Date().toISOString(),
      });
    } else {
      // Update existing log
      const logId = logRows[0].id;
      const updateData = getUpdateDataForEvent(event);

      await supabase
        .from('email_logs')
        .update(updateData)
        .eq('id', logId);

      console.log(`[Webhook] Updated log ${logId} with ${event.type}`);
    }

    // Update aggregate stats
    await updateEmailStats(supabase, event.type);

    return new Response('OK', { status: 200 });
  } catch (error) {
    console.error('[Webhook] Error processing webhook:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}

/**
 * Get update data based on event type
 */
function getUpdateDataForEvent(event: ResendWebhookEvent): Record<string, unknown> {
  const now = new Date().toISOString();
  const baseUpdate = {
    updated_at: now,
  };

  switch (event.type) {
    case 'email.sent':
      return {
        ...baseUpdate,
        status: 'sent',
        sent_at: now,
      };

    case 'email.delivered':
      return {
        ...baseUpdate,
        status: 'delivered',
        delivered_at: now,
      };

    case 'email.delivery_delayed':
      return {
        ...baseUpdate,
        status: 'delayed',
        delayed_at: now,
      };

    case 'email.opened':
      return {
        ...baseUpdate,
        status: 'opened',
        opened_at: now,
      };

    case 'email.clicked':
      return {
        ...baseUpdate,
        status: 'clicked',
        clicked_at: now,
        last_clicked_link: event.data.click?.link,
      };

    case 'email.bounced':
      return {
        ...baseUpdate,
        status: 'bounced',
        bounced_at: now,
        bounce_message: event.data.bounce?.message,
      };

    case 'email.complained':
      return {
        ...baseUpdate,
        status: 'complained',
        complained_at: now,
      };

    default:
      return baseUpdate;
  }
}

/**
 * Update aggregate email stats
 */
async function updateEmailStats(supabase: ReturnType<typeof createSupabaseServiceClient>, eventType: ResendEventType): Promise<void> {
  const today = new Date().toISOString().split('T')[0];

  try {
    // Check if stats row exists for today
    const { data: existing } = await supabase
      .from('email_stats')
      .select('*')
      .eq('date', today)
      .single();

    const fieldMap: Record<ResendEventType, string> = {
      'email.sent': 'sent',
      'email.delivered': 'delivered',
      'email.delivery_delayed': 'delayed',
      'email.opened': 'opened',
      'email.clicked': 'clicked',
      'email.bounced': 'bounced',
      'email.complained': 'complained',
    };

    const field = fieldMap[eventType];
    if (!field) return;

    if (!existing) {
      // Create new stats document for today
      const newStats: Record<string, unknown> = {
        date: today,
        sent: 0,
        delivered: 0,
        opened: 0,
        clicked: 0,
        bounced: 0,
        complained: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      newStats[field] = 1;

      await supabase.from('email_stats').insert(newStats);
    } else {
      // Increment the field
      const currentValue = (existing as Record<string, unknown>)[field] as number || 0;
      await supabase
        .from('email_stats')
        .update({
          [field]: currentValue + 1,
          updated_at: new Date().toISOString(),
        })
        .eq('date', today);
    }
  } catch (error) {
    console.error('[Webhook] Error updating stats:', error);
  }
}

/**
 * GET /api/email/webhook - Health check for webhook endpoint
 */
export async function GET() {
  return new Response(
    JSON.stringify({
      status: 'ok',
      message: 'Resend webhook endpoint is active',
      timestamp: new Date().toISOString(),
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
