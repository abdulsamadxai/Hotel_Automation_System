// Server-side automation rule engine, mirroring the frontend's
// evaluateAutomations in src/lib/mockStore.ts.
//
// Events: booking.created, booking.checked_in, booking.checked_out,
// booking.cancelled, room.updated, invoice.created, invoice.paid.
// On each event, every enabled rule for the hotel whose trigger matches
// runs. At most one housekeeping task and one invoice are created per
// event, so two rules with the same action cannot double-create.
//
// Every rule run writes an AutomationExecution row and bumps the rule's
// execution_count / last_triggered_at. send_email is LOG ONLY — no email
// provider exists yet, so the execution is recorded with status 'logged'
// and nothing is sent.
import type { Automation, Booking, Invoice, Room } from '@prisma/client';
import type { DbClient } from './counters.js';
import { nextNumber } from './counters.js';
import { createInvoiceRecord } from './invoices.js';
import { logActivity } from './activity.js';

export type StoreEventType =
  | 'booking.created'
  | 'booking.checked_in'
  | 'booking.checked_out'
  | 'booking.cancelled'
  | 'room.updated'
  | 'invoice.created'
  | 'invoice.paid';

export interface AutomationEvent {
  type: StoreEventType;
  hotelId: string;
  booking?: Booking | null;
  room?: Room | null;
  invoice?: Invoice | null;
  actorId?: string | null;
  actorName?: string | null;
}

export interface EngineResult {
  createdTask: boolean;
  createdInvoice: boolean;
}

type Config = Record<string, unknown>;

function configOf(rule: Automation): Config {
  const raw = rule.config;
  return raw && typeof raw === 'object' && !Array.isArray(raw)
    ? (raw as Config)
    : {};
}

function titleForEvent(type: StoreEventType): string {
  switch (type) {
    case 'booking.checked_out':
      return 'Guest Checked Out';
    case 'booking.checked_in':
      return 'Guest Checked In';
    case 'booking.created':
      return 'New Booking';
    case 'booking.cancelled':
      return 'Booking Cancelled';
    case 'invoice.paid':
      return 'Invoice Paid';
    case 'invoice.created':
      return 'Invoice Created';
    case 'room.updated':
      return 'Room Updated';
    default:
      return 'Automation Notification';
  }
}

export async function evaluateAutomations(
  db: DbClient,
  event: AutomationEvent,
): Promise<EngineResult> {
  const result: EngineResult = { createdTask: false, createdInvoice: false };
  const rules = await db.automation.findMany({
    where: { hotel_id: event.hotelId, trigger: event.type, enabled: true },
    orderBy: { created_at: 'asc' },
  });

  // Resolve the room / guest name once for all rules in this event.
  let room = event.room ?? null;
  if (!room && event.booking?.room_id) {
    room = await db.room.findUnique({ where: { id: event.booking.room_id } });
  }
  let guestName = 'Guest';
  if (event.booking?.guest_id) {
    const guest = await db.guest.findUnique({
      where: { id: event.booking.guest_id },
    });
    if (guest) guestName = guest.name;
  }
  const roomNumber = room?.number ?? null;
  const booking = event.booking ?? null;

  for (const rule of rules) {
    const config = configOf(rule);
    let status: 'completed' | 'logged' | 'skipped' | 'failed' = 'completed';
    let detail = `Automation "${rule.name}" ran on ${event.type}`;

    switch (rule.action) {
      case 'create_housekeeping_task': {
        if (result.createdTask || !room) {
          status = 'skipped';
          detail = result.createdTask
            ? 'Skipped: a housekeeping task was already created for this event'
            : 'Skipped: no room on this event';
          break;
        }
        const taskType = (config.task_type as string) ?? 'checkout_clean';
        const priority = (config.priority as string) ?? 'high';
        const taskNumber = await nextNumber(db, event.hotelId, 'task');
        await db.housekeepingTask.create({
          data: {
            hotel_id: event.hotelId,
            task_number: taskNumber,
            room_id: room.id,
            booking_id: booking?.id ?? null,
            type: taskType as 'checkout_clean' | 'stay_clean' | 'deep_clean' | 'daily_clean' | 'inspection' | 'maintenance',
            status: 'pending',
            priority: priority as 'low' | 'medium' | 'high',
            description: `Checkout cleaning for room ${roomNumber}`,
            assigned_to: null,
            automation_triggered: true,
          },
        });
        await logActivity(db, {
          hotel_id: event.hotelId,
          user_id: event.actorId ?? null,
          user_name: event.actorName ?? null,
          action: 'task_created',
          details: `Created task ${taskNumber}: Checkout cleaning for room ${roomNumber}`,
          entity_type: 'housekeeping_task',
          entity_id: undefined,
        });
        result.createdTask = true;
        detail = `Created checkout cleaning task ${taskNumber} for room ${roomNumber}`;
        break;
      }
      case 'create_notification': {
        const title = titleForEvent(event.type);
        await db.notification.create({
          data: {
            hotel_id: event.hotelId,
            type: 'info',
            title,
            message: booking
              ? `${title}: ${guestName} (${booking.booking_number})${roomNumber ? `, room ${roomNumber}` : ''}`
              : title,
          },
        });
        detail = `Created notification "${title}"`;
        break;
      }
      case 'log_activity': {
        await logActivity(db, {
          hotel_id: event.hotelId,
          user_id: event.actorId ?? null,
          user_name: event.actorName ?? null,
          action: 'automation_executed',
          details: `Automation "${rule.name}" ran on ${event.type}`,
          entity_type: 'automation',
          entity_id: rule.id,
        });
        break;
      }
      case 'create_invoice': {
        if (result.createdInvoice || !booking) {
          status = 'skipped';
          detail = result.createdInvoice
            ? 'Skipped: an invoice was already created for this event'
            : 'Skipped: no booking on this event';
          break;
        }
        const invoice = await createInvoiceRecord(db, event.hotelId, {
          guest_id: booking.guest_id,
          booking_id: booking.id,
          amount: booking.total_amount,
          nights: booking.nights,
          due_date: booking.check_out.toISOString().slice(0, 10),
        });
        result.createdInvoice = true;
        detail = `Created invoice ${invoice.invoice_number} for $${invoice.total.toFixed(2)}`;
        break;
      }
      case 'send_email': {
        // No email provider is configured: record the action, send nothing.
        status = 'logged';
        detail =
          `Email action recorded (template: ${String(config.template ?? 'default')}) ` +
          `for booking ${booking?.booking_number ?? ''} — no email provider is configured, nothing was sent`;
        await logActivity(db, {
          hotel_id: event.hotelId,
          user_id: event.actorId ?? null,
          user_name: event.actorName ?? null,
          action: 'automation_executed',
          details: detail,
          entity_type: 'automation',
          entity_id: rule.id,
        });
        break;
      }
      default: {
        status = 'failed';
        detail = `Unknown automation action "${rule.action}"`;
        break;
      }
    }

    await db.automationExecution.create({
      data: {
        automation_id: rule.id,
        hotel_id: event.hotelId,
        event: event.type,
        status,
        detail,
      },
    });
    await db.automation.update({
      where: { id: rule.id },
      data: {
        execution_count: { increment: 1 },
        last_triggered_at: new Date(),
      },
    });
  }

  return result;
}
