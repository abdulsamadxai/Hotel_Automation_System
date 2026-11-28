// Zod schemas for every write input. Field names mirror the frontend's
// canonical types in src/lib/types.ts (snake_case). IDs from the seed data
// are plain strings like "hotel-001", so no .cuid() validation anywhere.
import { z } from 'zod';

const isoDate = z
  .string()
  .refine((v) => !Number.isNaN(Date.parse(v)), 'Invalid date');

const optionalHotelId = z.string().min(1).optional();

export const roomStatusEnum = z.enum([
  'available',
  'occupied',
  'dirty',
  'cleaning',
  'maintenance',
]);
export const roomTypeEnum = z.enum(['standard', 'deluxe', 'suite', 'penthouse']);
export const guestTagEnum = z.enum(['vip', 'regular', 'blocked']);
export const bookingStatusEnum = z.enum([
  'pending',
  'confirmed',
  'checked_in',
  'checked_out',
  'cancelled',
]);
export const paymentStatusEnum = z.enum([
  'pending',
  'partially_paid',
  'paid',
  'refunded',
]);
export const taskStatusEnum = z.enum([
  'pending',
  'in_progress',
  'completed',
  'overdue',
]);
export const taskTypeEnum = z.enum([
  'checkout_clean',
  'stay_clean',
  'deep_clean',
  'daily_clean',
  'inspection',
  'maintenance',
]);
export const taskPriorityEnum = z.enum(['low', 'medium', 'high']);
export const staffRoleEnum = z.enum(['housekeeping', 'manager', 'owner', 'staff']);
export const staffStatusEnum = z.enum(['on_duty', 'off_duty', 'break', 'active']);
export const messageStatusEnum = z.enum([
  'sent',
  'delivered',
  'read',
  'failed',
  'pending',
  'resolved',
]);
export const messageDirectionEnum = z.enum(['inbound', 'outbound']);
export const messageChannelEnum = z.enum(['email', 'sms', 'whatsapp', 'internal']);
export const messagePriorityEnum = z.enum(['low', 'medium', 'high']);
export const notificationTypeEnum = z.enum([
  'booking',
  'task',
  'alert',
  'automation',
  'room',
  'info',
  'warning',
  'success',
]);
export const lineItemTypeEnum = z.enum(['charge', 'service', 'tax', 'discount']);
export const invoiceStatusEnum = z.enum([
  'pending',
  'partially_paid',
  'paid',
  'refunded',
  'cancelled',
]);
export const automationTriggerEnum = z.enum([
  'booking.created',
  'booking.checked_in',
  'booking.checked_out',
  'booking.cancelled',
  'room.updated',
  'invoice.created',
  'invoice.paid',
]);
export const automationActionEnum = z.enum([
  'create_housekeeping_task',
  'create_notification',
  'log_activity',
  'create_invoice',
  'send_email',
]);
export const userRoleEnum = z.enum([
  'super_admin',
  'owner',
  'manager',
  'housekeeping',
  'staff',
]);

// --- Auth -----------------------------------------------------------------

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  hotel_code: z.string().optional(),
});

export const signupSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: z.enum(['manager', 'housekeeping', 'staff']),
  hotel_code: z.string().min(1, 'Hotel code is required'),
});

// --- Hotels ---------------------------------------------------------------

export const hotelCreateSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  access_code: z.string().min(1),
  location: z.string().optional(),
  logo_url: z.string().optional(),
  owner_name: z.string().optional(),
});

export const hotelUpdateSchema = hotelCreateSchema.partial();

// --- Users ----------------------------------------------------------------

export const changePasswordSchema = z.object({
  current_password: z.string().optional(),
  new_password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const userPatchSchema = z.object({
  full_name: z.string().min(1).optional(),
  role: userRoleEnum.optional(),
});

/**
 * Admin-created login user. Unlike signup, any role may be created here —
 * including owner, which self-registration deliberately forbids ("Owner
 * accounts are created by an administrator"). hotel_id is required for
 * every role except super_admin (enforced in the route, where the hotel
 * must also exist).
 */
export const createUserSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email(),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  role: userRoleEnum,
  hotel_id: optionalHotelId,
});

// --- Rooms ----------------------------------------------------------------

export const roomCreateSchema = z.object({
  number: z.string().min(1),
  type: roomTypeEnum,
  floor: z.number().int(),
  status: roomStatusEnum.optional(),
  price_per_night: z.number().min(0),
  capacity: z.number().int().min(1),
  amenities: z.array(z.string()).optional(),
  hotel_id: optionalHotelId,
});

export const roomUpdateSchema = roomCreateSchema
  .omit({ hotel_id: true })
  .partial();

// --- Guests ---------------------------------------------------------------

export const guestCreateSchema = z.object({
  name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  nationality: z.string().nullable().optional(),
  id_number: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  tags: z.array(guestTagEnum).optional(),
  hotel_id: optionalHotelId,
});

export const guestUpdateSchema = guestCreateSchema
  .omit({ hotel_id: true })
  .partial();

// --- Bookings -------------------------------------------------------------

export const bookingCreateSchema = z.object({
  guest_id: z.string().min(1),
  room_id: z.string().nullable().optional(),
  guest_type: z.enum(['national', 'international']).default('international'),
  check_in: isoDate,
  check_out: isoDate,
  notes: z.string().nullable().optional(),
  status: bookingStatusEnum.optional(),
  payment_status: paymentStatusEnum.optional(),
  deposit_amount: z.number().min(0).optional(),
  total_amount: z.number().min(0).optional(),
  hotel_id: optionalHotelId,
});

export const bookingUpdateSchema = z.object({
  guest_id: z.string().min(1).optional(),
  room_id: z.string().nullable().optional(),
  guest_type: z.enum(['national', 'international']).optional(),
  check_in: isoDate.optional(),
  check_out: isoDate.optional(),
  notes: z.string().nullable().optional(),
  status: bookingStatusEnum.optional(),
  payment_status: paymentStatusEnum.optional(),
  deposit_amount: z.number().min(0).optional(),
  total_amount: z.number().min(0).optional(),
});

// --- Invoices -------------------------------------------------------------

export const lineItemSchema = z.object({
  description: z.string().min(1),
  amount: z.number(),
  quantity: z.number().int().positive().default(1),
  type: lineItemTypeEnum.default('charge'),
});

export const invoiceCreateSchema = z.object({
  guest_id: z.string().nullable().optional(),
  booking_id: z.string().nullable().optional(),
  amount: z.number().min(0),
  tax: z.number().min(0).optional(),
  line_items: z.array(lineItemSchema).optional(),
  status: invoiceStatusEnum.optional(),
  due_date: isoDate.nullable().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
  hotel_id: optionalHotelId,
});

export const payInvoiceSchema = z.object({
  amount: z.number().positive('Amount must be greater than 0'),
  payment_method: z.string().optional(),
});

// Line-item edits from the Billing page (Save button). Status changes go
// through /pay and /cancel instead; `total` is always recomputed server-side
// as amount + tax so it stays authoritative.
export const invoiceUpdateSchema = z.object({
  amount: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  line_items: z.array(lineItemSchema).optional(),
  due_date: isoDate.nullable().optional(),
  payment_method: z.string().optional(),
  notes: z.string().optional(),
});

// --- Housekeeping ---------------------------------------------------------

export const taskCreateSchema = z.object({
  room_id: z.string().min(1),
  booking_id: z.string().nullable().optional(),
  type: taskTypeEnum,
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  description: z.string().min(1),
  assigned_to: z.string().nullable().optional(),
  due_at: isoDate.nullable().optional(),
  notes: z.string().nullable().optional(),
  hotel_id: optionalHotelId,
});

export const taskUpdateSchema = z.object({
  type: taskTypeEnum.optional(),
  status: taskStatusEnum.optional(),
  priority: taskPriorityEnum.optional(),
  description: z.string().min(1).optional(),
  assigned_to: z.string().nullable().optional(),
  due_at: isoDate.nullable().optional(),
  notes: z.string().nullable().optional(),
});

// --- Staff ----------------------------------------------------------------

export const staffCreateSchema = z.object({
  full_name: z.string().min(1),
  email: z.string().email().nullable().optional(),
  phone: z.string().nullable().optional(),
  role: staffRoleEnum,
  status: staffStatusEnum.optional(),
  shift: z.string().nullable().optional(),
  hire_date: isoDate.optional(),
  user_id: z.string().nullable().optional(),
  hotel_id: optionalHotelId,
});

export const staffUpdateSchema = staffCreateSchema
  .omit({ hotel_id: true })
  .partial();

// --- Expenses -------------------------------------------------------------

export const expenseCreateSchema = z.object({
  amount: z.number(),
  category: z.string().min(1),
  description: z.string().min(1),
  date: isoDate,
  vendor: z.string().optional(),
  created_by: z.string().optional(),
  hotel_id: optionalHotelId,
});

export const expenseUpdateSchema = expenseCreateSchema
  .omit({ hotel_id: true })
  .partial();

// --- Automations ----------------------------------------------------------

export const automationCreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  trigger: automationTriggerEnum,
  action: automationActionEnum,
  enabled: z.boolean().optional(),
  config: z.record(z.unknown()).optional(),
  hotel_id: optionalHotelId,
});

export const automationUpdateSchema = automationCreateSchema
  .omit({ hotel_id: true })
  .partial();

// --- Messages -------------------------------------------------------------

export const messageCreateSchema = z.object({
  guest_id: z.string().min(1),
  guest_name: z.string().optional(),
  guest_email: z.string().optional(),
  guest_phone: z.string().optional(),
  subject: z.string().optional(),
  message: z.string().min(1),
  direction: messageDirectionEnum.optional(),
  channel: messageChannelEnum.optional(),
  status: messageStatusEnum.optional(),
  priority: messagePriorityEnum.optional(),
  assigned_to: z.string().nullable().optional(),
  hotel_id: optionalHotelId,
});

export const messageUpdateSchema = z.object({
  status: messageStatusEnum.optional(),
  assigned_to: z.string().nullable().optional(),
});

// --- Settings -------------------------------------------------------------

export const settingsPatchSchema = z.object({
  currency: z.string().min(1).optional(),
  tax_rate: z.number().min(0).max(1).optional(),
  check_in_time: z.string().optional(),
  check_out_time: z.string().optional(),
});
