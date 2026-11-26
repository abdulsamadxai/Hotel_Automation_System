// Canonical entity types for the Hotel Automation System.
//
// ONE type per entity. These are the only field names the seed data, the
// store and the hooks use. Drifted duplicates from the audit (Room `rate`,
// Automation `is_active` / `trigger_event` / `action_type`, Notification
// `read`, Task `assignee_id`, Staff `name`, Invoice `paid_at`, Message
// `content`, ActivityLog `title` / `description` / `event_name` / `source`)
// are deleted — do not reintroduce them.

export type UserRole =
  | 'super_admin'
  | 'owner'
  | 'manager'
  | 'housekeeping'
  | 'staff';

/** A login user. Only the SHA-256 hex digest is stored — never plaintext. */
export interface AuthUser {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  role: UserRole;
  hotel_id?: string | null;
}

/** The session user exposed by useAuth (no password material). */
export interface SessionUser {
  id: string;
  email: string;
  user_metadata: {
    full_name: string;
    role: UserRole;
  };
}

export interface Hotel {
  id: string;
  name: string;
  code: string;
  /** Code staff/manager/housekeeping must present at sign-in. Not a password. */
  access_code: string;
  location: string;
  logo_url: string;
  owner_name: string;
  created_at: string;
}

export type GuestTag = 'vip' | 'regular' | 'blocked';

export interface Guest {
  id: string;
  hotel_id: string;
  name: string;
  email: string | null;
  phone: string | null;
  nationality?: string | null;
  id_number?: string | null;
  notes: string | null;
  tags: GuestTag[];
  total_stays: number;
  total_spent: number;
  last_stay_at?: string | null;
  created_at: string;
}

export type RoomStatus =
  | 'available'
  | 'occupied'
  | 'dirty'
  | 'cleaning'
  | 'maintenance';
export type RoomType = 'standard' | 'deluxe' | 'suite' | 'penthouse';

export interface Room {
  id: string;
  hotel_id: string;
  number: string;
  type: RoomType;
  floor: number;
  status: RoomStatus;
  /** Canonical nightly price. There is no `rate` field. */
  price_per_night: number;
  capacity: number;
  amenities: string[];
  created_at: string;
  updated_at?: string;
}

export type BookingStatus =
  | 'pending'
  | 'confirmed'
  | 'checked_in'
  | 'checked_out'
  | 'cancelled';
export type PaymentStatus =
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'refunded';

export interface Booking {
  id: string;
  hotel_id: string;
  booking_number: string;
  guest_id: string | null;
  room_id: string | null;
  guest_type: 'national' | 'international';
  check_in: string;
  check_out: string;
  status: BookingStatus;
  nights: number;
  total_amount: number;
  notes: string | null;
  payment_status: PaymentStatus;
  deposit_amount: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'overdue';
export type TaskType =
  | 'checkout_clean'
  | 'stay_clean'
  | 'deep_clean'
  | 'daily_clean'
  | 'inspection'
  | 'maintenance';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface HousekeepingTask {
  id: string;
  hotel_id: string;
  task_number: string;
  room_id: string;
  booking_id?: string | null;
  type: TaskType;
  status: TaskStatus;
  priority: TaskPriority;
  description: string;
  /** Staff id of the assignee. There is no `assignee_id` field. */
  assigned_to: string | null;
  due_at?: string | null;
  automation_triggered?: boolean;
  notes?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  created_at: string;
  updated_at: string;
}

/** Alias: the housekeeping domain calls these tasks. */
export type Task = HousekeepingTask;

export type StaffRole = 'housekeeping' | 'manager' | 'owner' | 'staff';
export type StaffStatus = 'on_duty' | 'off_duty' | 'break' | 'active';

export interface StaffMember {
  id: string;
  hotel_id: string;
  user_id: string | null;
  /** Canonical staff name. There is no `name` field. */
  full_name: string;
  email: string | null;
  phone: string | null;
  role: StaffRole;
  status: StaffStatus;
  shift?: string | null;
  hire_date?: string;
  created_at: string;
  updated_at?: string;
}

export type MessageStatus =
  | 'sent'
  | 'delivered'
  | 'read'
  | 'failed'
  | 'pending'
  | 'resolved';
export type MessageDirection = 'inbound' | 'outbound';
export type MessageChannel = 'email' | 'sms' | 'whatsapp' | 'internal';

export interface Message {
  id: string;
  hotel_id: string;
  guest_id: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  subject?: string;
  /** Canonical message body. There is no `content` field. */
  message: string;
  direction: MessageDirection;
  channel?: MessageChannel;
  status: MessageStatus;
  priority?: 'low' | 'medium' | 'high';
  assigned_to?: string | null;
  created_at: string;
  updated_at?: string;
}

export type NotificationType =
  | 'booking'
  | 'task'
  | 'alert'
  | 'automation'
  | 'room'
  | 'info'
  | 'warning'
  | 'success';

export interface Notification {
  id: string;
  hotel_id: string;
  user_id?: string | null;
  type: NotificationType;
  title: string;
  message: string;
  link?: string | null;
  /** Canonical read flag. There is no `read` field. */
  is_read: boolean;
  created_at: string;
}

export type LineItemType = 'charge' | 'service' | 'tax' | 'discount';

export interface LineItem {
  description: string;
  amount: number;
  quantity: number;
  type: LineItemType;
}

export type InvoiceStatus =
  | 'pending'
  | 'partially_paid'
  | 'paid'
  | 'refunded'
  | 'cancelled';

export interface Invoice {
  id: string;
  hotel_id: string;
  invoice_number: string;
  guest_id: string | null;
  booking_id: string | null;
  amount: number;
  tax: number;
  /** Authoritative total: total = amount + tax. */
  total: number;
  amount_paid: number;
  line_items: LineItem[];
  status: InvoiceStatus;
  due_date: string | null;
  paid_date: string | null;
  created_at: string;
  updated_at?: string;
  payment_method?: string;
  notes?: string;
}

export interface Expense {
  id: string;
  hotel_id: string;
  amount: number;
  category: string;
  description: string;
  date: string;
  vendor?: string;
  created_by?: string;
  created_at: string;
}

/** Event types emitted by the store; automation `trigger` values match these. */
export type StoreEventType =
  | 'booking.created'
  | 'booking.checked_in'
  | 'booking.checked_out'
  | 'booking.cancelled'
  | 'room.updated'
  | 'invoice.created'
  | 'invoice.paid';

/** Actions the automation engine can execute. */
export type AutomationAction =
  | 'create_housekeeping_task'
  | 'create_notification'
  | 'log_activity'
  | 'create_invoice'
  | 'send_email';

export interface Automation {
  id: string;
  hotel_id: string;
  name: string;
  description: string;
  /** Matches a StoreEventType. There is no `trigger_event` field. */
  trigger: StoreEventType;
  /** There is no `action_type` field. */
  action: AutomationAction;
  /** Canonical on/off flag. There is no `is_active` field. */
  enabled: boolean;
  config?: Record<string, unknown>;
  execution_count: number;
  last_triggered_at: string | null;
  created_at: string;
  updated_at?: string;
}

export interface ActivityLog {
  id: string;
  hotel_id: string;
  user_id?: string | null;
  user_name?: string;
  action: string;
  details: string;
  entity_type: string;
  entity_id?: string;
  created_at: string;
}

/** Persisted counters so booking/invoice/task numbers never repeat. */
export interface StoreCounters {
  booking: number;
  invoice: number;
  task: number;
}

/** Whole persisted store state (localStorage key `has:store:v1`). */
export interface StoreState {
  version: 1;
  users: AuthUser[];
  guests: Guest[];
  bookings: Booking[];
  rooms: Room[];
  housekeepingTasks: HousekeepingTask[];
  staff: StaffMember[];
  messages: Message[];
  notifications: Notification[];
  hotels: Hotel[];
  invoices: Invoice[];
  expenses: Expense[];
  automations: Automation[];
  activityLogs: ActivityLog[];
  counters: StoreCounters;
}
