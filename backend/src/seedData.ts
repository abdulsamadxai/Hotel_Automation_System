// Seed data for the backend (backend/src/seed.ts).
//
// Moved here from the deleted frontend mock data (src/lib/mockData.ts):
// the seed owns the demo hotels, users, rooms, guests, bookings,
// invoices, tasks, staff, messages, notifications, expenses,
// automations and activity logs. The frontend no longer ships this data.
//
// The SHA-256 digest below is legacy (the old frontend-only demo login);
// the seed ignores it and hashes SEED_DEMO_PASSWORD with bcrypt instead.
// No plaintext password appears anywhere in this repo.

// Entity types for the seed data (copied from the deleted
// src/lib/types.ts so the rows stay union-typed).
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


// SHA-256 hex digest of the shared demo password (same for all demo users).
const DEMO_PASSWORD_HASH =
  'c4a6053e32efed708077f12a35bf7e7da295f2a80f527d1d7a94fecd3ad58780';

/** Persisted counters so booking/invoice/task numbers never repeat. */
export interface StoreCounters {
  booking: number;
  invoice: number;
  task: number;
}

export const mockData: {
  testUsers: AuthUser[];
  hotels: Hotel[];
  guests: Guest[];
  rooms: Room[];
  bookings: Booking[];
  housekeepingTasks: HousekeepingTask[];
  staff: StaffMember[];
  messages: Message[];
  notifications: Notification[];
  invoices: Invoice[];
  expenses: Expense[];
  automations: Automation[];
  activityLogs: ActivityLog[];
} = {
  // Demo users for login (all share the same demo password, hashed above).
  testUsers: [
    {
      id: 'user-superadmin-001',
      email: 'admin@demo.hotel',
      password_hash: DEMO_PASSWORD_HASH,
      full_name: 'Super Admin',
      role: 'super_admin',
    },
    {
      id: 'user-owner-001',
      email: 'owner@demo.hotel',
      password_hash: DEMO_PASSWORD_HASH,
      full_name: 'John Smith',
      role: 'owner',
      hotel_id: 'hotel-001',
    },
    {
      id: 'user-manager-001',
      email: 'manager@demo.hotel',
      password_hash: DEMO_PASSWORD_HASH,
      full_name: 'Sarah Johnson',
      role: 'manager',
      hotel_id: 'hotel-001',
    },
    {
      id: 'user-housekeeping-001',
      email: 'housekeeping@demo.hotel',
      password_hash: DEMO_PASSWORD_HASH,
      full_name: 'Maria Garcia',
      role: 'housekeeping',
      hotel_id: 'hotel-001',
    },
    {
      id: 'user-staff-001',
      email: 'staff@demo.hotel',
      password_hash: DEMO_PASSWORD_HASH,
      full_name: 'Carlos Rodriguez',
      role: 'staff',
      hotel_id: 'hotel-001',
    },
  ],

  // Hotels (for super admin view)
  hotels: [
    {
      id: 'hotel-001',
      name: 'Grand Plaza Hotel',
      code: 'GPLZ2024',
      access_code: 'DEMO-1001',
      location: 'Dubai, UAE',
      logo_url: '',
      owner_name: 'John Smith',
      created_at: '2024-01-15T10:00:00Z',
    },
    {
      id: 'hotel-002',
      name: 'Sunset Resort',
      code: 'SNRS2024',
      access_code: 'DEMO-1002',
      location: 'Maldives',
      logo_url: '',
      owner_name: 'Jane Doe',
      created_at: '2024-02-20T10:00:00Z',
    },
  ],

  // Guests
  guests: [
    {
      id: 'guest-001',
      hotel_id: 'hotel-001',
      name: 'Michael Brown',
      email: 'michael.brown@email.com',
      phone: '+1-555-0101',
      nationality: 'USA',
      id_number: 'P12345678',
      notes: 'Prefers room with city view',
      tags: ['vip'],
      total_stays: 5,
      total_spent: 2500,
      last_stay_at: '2024-01-20T00:00:00Z',
      created_at: '2023-06-15T10:00:00Z',
    },
    {
      id: 'guest-002',
      hotel_id: 'hotel-001',
      name: 'Emily Davis',
      email: 'emily.davis@email.com',
      phone: '+1-555-0102',
      nationality: 'Canada',
      id_number: 'C87654321',
      notes: 'Allergic to feather pillows',
      tags: ['regular'],
      total_stays: 3,
      total_spent: 1200,
      last_stay_at: '2024-01-18T00:00:00Z',
      created_at: '2023-08-20T10:00:00Z',
    },
    {
      id: 'guest-003',
      hotel_id: 'hotel-001',
      name: 'Ahmed Al-Mansouri',
      email: 'ahmed.m@email.com',
      phone: '+971-50-1234567',
      nationality: 'UAE',
      id_number: 'E123456789',
      notes: 'Business traveler, early check-in preferred',
      tags: ['vip'],
      total_stays: 8,
      total_spent: 4800,
      last_stay_at: '2024-02-01T00:00:00Z',
      created_at: '2023-05-10T10:00:00Z',
    },
    {
      id: 'guest-004',
      hotel_id: 'hotel-001',
      name: 'Lisa Wong',
      email: 'lisa.wong@email.com',
      phone: '+86-138-0001-2345',
      nationality: 'China',
      id_number: 'G98765432',
      notes: null,
      tags: ['regular'],
      total_stays: 2,
      total_spent: 800,
      last_stay_at: '2023-12-15T00:00:00Z',
      created_at: '2023-11-05T10:00:00Z',
    },
    {
      id: 'guest-005',
      hotel_id: 'hotel-001',
      name: 'Robert Thompson',
      email: 'r.thompson@email.com',
      phone: '+1-555-0103',
      nationality: 'USA',
      id_number: 'P99887766',
      notes: 'Previously complained about noise - assign quiet room',
      tags: ['blocked'],
      total_stays: 1,
      total_spent: 200,
      last_stay_at: '2023-10-10T00:00:00Z',
      created_at: '2023-10-08T10:00:00Z',
    },
  ],

  // Rooms
  rooms: [
    // Standard rooms
    { id: 'room-101', hotel_id: 'hotel-001', number: '101', type: 'standard', floor: 1, status: 'available', price_per_night: 150, capacity: 2, amenities: ['wifi', 'tv', 'ac'], created_at: '2024-01-01T00:00:00Z' },
    { id: 'room-102', hotel_id: 'hotel-001', number: '102', type: 'standard', floor: 1, status: 'occupied', price_per_night: 150, capacity: 2, amenities: ['wifi', 'tv', 'ac'], created_at: '2024-01-01T00:00:00Z' },
    { id: 'room-103', hotel_id: 'hotel-001', number: '103', type: 'standard', floor: 1, status: 'dirty', price_per_night: 150, capacity: 2, amenities: ['wifi', 'tv', 'ac'], created_at: '2024-01-01T00:00:00Z' },
    { id: 'room-104', hotel_id: 'hotel-001', number: '104', type: 'standard', floor: 1, status: 'available', price_per_night: 150, capacity: 2, amenities: ['wifi', 'tv', 'ac'], created_at: '2024-01-01T00:00:00Z' },

    // Deluxe rooms
    { id: 'room-201', hotel_id: 'hotel-001', number: '201', type: 'deluxe', floor: 2, status: 'occupied', price_per_night: 250, capacity: 3, amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony'], created_at: '2024-01-01T00:00:00Z' },
    { id: 'room-202', hotel_id: 'hotel-001', number: '202', type: 'deluxe', floor: 2, status: 'available', price_per_night: 250, capacity: 3, amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony'], created_at: '2024-01-01T00:00:00Z' },
    { id: 'room-203', hotel_id: 'hotel-001', number: '203', type: 'deluxe', floor: 2, status: 'maintenance', price_per_night: 250, capacity: 3, amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony'], created_at: '2024-01-01T00:00:00Z' },

    // Suites
    { id: 'room-301', hotel_id: 'hotel-001', number: '301', type: 'suite', floor: 3, status: 'available', price_per_night: 450, capacity: 4, amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony', 'jacuzzi', 'kitchen'], created_at: '2024-01-01T00:00:00Z' },
    { id: 'room-302', hotel_id: 'hotel-001', number: '302', type: 'suite', floor: 3, status: 'occupied', price_per_night: 450, capacity: 4, amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony', 'jacuzzi', 'kitchen'], created_at: '2024-01-01T00:00:00Z' },
    { id: 'room-303', hotel_id: 'hotel-001', number: '303', type: 'suite', floor: 3, status: 'available', price_per_night: 450, capacity: 4, amenities: ['wifi', 'tv', 'ac', 'minibar', 'balcony', 'jacuzzi', 'kitchen'], created_at: '2024-01-01T00:00:00Z' },
  ],

  // Bookings
  bookings: [
    {
      id: 'booking-001',
      hotel_id: 'hotel-001',
      booking_number: 'BK-0001',
      guest_id: 'guest-001',
      room_id: 'room-102',
      guest_type: 'international',
      check_in: '2024-02-01T14:00:00Z',
      check_out: '2024-02-05T11:00:00Z',
      status: 'checked_in',
      nights: 4,
      total_amount: 600,
      notes: 'Late check-in requested',
      payment_status: 'partially_paid',
      deposit_amount: 300,
      created_by: 'user-manager-001',
      created_at: '2024-01-25T10:00:00Z',
      updated_at: '2024-02-01T14:30:00Z',
    },
    {
      id: 'booking-002',
      hotel_id: 'hotel-001',
      booking_number: 'BK-0002',
      guest_id: 'guest-003',
      room_id: 'room-201',
      guest_type: 'international',
      check_in: '2024-02-02T14:00:00Z',
      check_out: '2024-02-10T11:00:00Z',
      status: 'checked_in',
      nights: 8,
      total_amount: 2000,
      notes: 'VIP guest - extra amenities',
      payment_status: 'paid',
      deposit_amount: 2000,
      created_by: 'user-manager-001',
      created_at: '2024-01-20T10:00:00Z',
      updated_at: '2024-02-02T14:00:00Z',
    },
    {
      id: 'booking-003',
      hotel_id: 'hotel-001',
      booking_number: 'BK-0003',
      guest_id: 'guest-002',
      room_id: 'room-302',
      guest_type: 'international',
      check_in: '2024-02-03T14:00:00Z',
      check_out: '2024-02-06T11:00:00Z',
      status: 'checked_in',
      nights: 3,
      total_amount: 1350,
      notes: 'VIP guest - extra amenities',
      payment_status: 'pending',
      deposit_amount: 0,
      created_by: 'user-manager-001',
      created_at: '2024-01-30T10:00:00Z',
      updated_at: '2024-02-03T14:00:00Z',
    },
    {
      id: 'booking-004',
      hotel_id: 'hotel-001',
      booking_number: 'BK-0004',
      guest_id: 'guest-004',
      room_id: 'room-103',
      guest_type: 'international',
      check_in: '2024-01-28T14:00:00Z',
      check_out: '2024-02-02T11:00:00Z',
      status: 'checked_out',
      nights: 5,
      total_amount: 750,
      notes: null,
      payment_status: 'paid',
      deposit_amount: 750,
      created_by: 'user-manager-001',
      created_at: '2024-01-20T10:00:00Z',
      updated_at: '2024-02-02T11:30:00Z',
    },
    {
      id: 'booking-005',
      hotel_id: 'hotel-001',
      booking_number: 'BK-0005',
      guest_id: 'guest-001',
      room_id: null,
      guest_type: 'international',
      check_in: '2024-02-15T14:00:00Z',
      check_out: '2024-02-20T11:00:00Z',
      status: 'confirmed',
      nights: 5,
      total_amount: 1125,
      notes: 'Awaiting room assignment',
      payment_status: 'pending',
      deposit_amount: 0,
      created_by: 'user-manager-001',
      created_at: '2024-02-01T10:00:00Z',
      updated_at: '2024-02-01T10:00:00Z',
    },
  ],

  // Housekeeping Tasks
  housekeepingTasks: [
    {
      id: 'task-001',
      hotel_id: 'hotel-001',
      task_number: 'TSK-0001',
      room_id: 'room-103',
      status: 'pending',
      type: 'checkout_clean',
      priority: 'high',
      description: 'Checkout cleaning for room 103',
      assigned_to: null,
      due_at: '2024-02-02T18:00:00Z',
      automation_triggered: true,
      created_at: '2024-02-02T11:30:00Z',
      updated_at: '2024-02-02T11:30:00Z',
    },
    {
      id: 'task-002',
      hotel_id: 'hotel-001',
      task_number: 'TSK-0002',
      room_id: 'room-201',
      status: 'in_progress',
      type: 'daily_clean',
      priority: 'medium',
      description: 'Daily cleaning for occupied room',
      assigned_to: 'staff-003',
      due_at: '2024-02-03T18:00:00Z',
      automation_triggered: false,
      created_at: '2024-02-03T08:00:00Z',
      updated_at: '2024-02-03T09:00:00Z',
    },
    {
      id: 'task-003',
      hotel_id: 'hotel-001',
      task_number: 'TSK-0003',
      room_id: 'room-203',
      status: 'pending',
      type: 'maintenance',
      priority: 'high',
      description: 'AC unit repair needed',
      assigned_to: 'staff-004',
      due_at: '2024-02-02T18:00:00Z',
      automation_triggered: false,
      created_at: '2024-02-01T15:00:00Z',
      updated_at: '2024-02-01T15:00:00Z',
    },
  ],

  // Staff Members
  staff: [
    {
      id: 'staff-001',
      hotel_id: 'hotel-001',
      user_id: 'user-owner-001',
      full_name: 'John Smith',
      email: 'owner@demo.hotel',
      phone: '+1-555-1001',
      role: 'owner',
      status: 'active',
      hire_date: '2023-01-01',
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: 'staff-002',
      hotel_id: 'hotel-001',
      user_id: 'user-manager-001',
      full_name: 'Sarah Johnson',
      email: 'manager@demo.hotel',
      phone: '+1-555-1002',
      role: 'manager',
      status: 'active',
      hire_date: '2023-02-15',
      created_at: '2023-02-15T00:00:00Z',
    },
    {
      id: 'staff-003',
      hotel_id: 'hotel-001',
      user_id: 'user-housekeeping-001',
      full_name: 'Maria Garcia',
      email: 'housekeeping@demo.hotel',
      phone: '+1-555-1003',
      role: 'housekeeping',
      status: 'active',
      hire_date: '2023-03-01',
      created_at: '2023-03-01T00:00:00Z',
    },
    {
      id: 'staff-004',
      hotel_id: 'hotel-001',
      user_id: 'user-staff-001',
      full_name: 'Carlos Rodriguez',
      email: 'staff@demo.hotel',
      phone: '+1-555-1004',
      role: 'staff',
      status: 'active',
      hire_date: '2023-04-10',
      created_at: '2023-04-10T00:00:00Z',
    },
  ],

  // Messages
  messages: [
    {
      id: 'msg-001',
      hotel_id: 'hotel-001',
      guest_id: 'guest-001',
      guest_name: 'Michael Brown',
      guest_email: 'michael.brown@email.com',
      guest_phone: '+1-555-0101',
      subject: 'Room service request',
      message: 'Could I please have extra towels sent to room 102?',
      direction: 'inbound',
      channel: 'whatsapp',
      status: 'pending',
      priority: 'medium',
      assigned_to: null,
      created_at: '2024-02-03T10:30:00Z',
      updated_at: '2024-02-03T10:30:00Z',
    },
    {
      id: 'msg-002',
      hotel_id: 'hotel-001',
      guest_id: 'guest-003',
      guest_name: 'Ahmed Al-Mansouri',
      guest_email: 'ahmed.m@email.com',
      guest_phone: '+971-50-1234567',
      subject: 'Late checkout request',
      message: 'I need to extend my checkout to 3 PM on February 10th. Please confirm.',
      direction: 'inbound',
      channel: 'email',
      status: 'resolved',
      priority: 'high',
      assigned_to: 'staff-002',
      created_at: '2024-02-02T08:00:00Z',
      updated_at: '2024-02-02T09:15:00Z',
    },
  ],

  // Notifications
  notifications: [
    {
      id: 'notif-001',
      hotel_id: 'hotel-001',
      title: 'New Booking',
      message: 'New booking BK-0005 created for guest Michael Brown',
      type: 'info',
      is_read: false,
      created_at: '2024-02-01T10:00:00Z',
    },
    {
      id: 'notif-002',
      hotel_id: 'hotel-001',
      title: 'Maintenance Required',
      message: 'Room 203 AC unit needs repair',
      type: 'warning',
      is_read: false,
      created_at: '2024-02-01T15:00:00Z',
    },
    {
      id: 'notif-003',
      hotel_id: 'hotel-001',
      title: 'Guest Checked Out',
      message: 'Guest Lisa Wong checked out from room 103',
      type: 'success',
      is_read: true,
      created_at: '2024-02-02T11:30:00Z',
    },
  ],

  // Invoices
  invoices: [
    {
      id: 'invoice-001',
      hotel_id: 'hotel-001',
      invoice_number: 'INV-0001',
      guest_id: 'guest-004',
      booking_id: 'booking-004',
      amount: 750,
      tax: 75,
      total: 825,
      amount_paid: 825,
      line_items: [
        { description: 'Room charge (5 nights)', amount: 750, quantity: 1, type: 'charge' },
      ],
      status: 'paid',
      due_date: '2024-02-02',
      paid_date: '2024-02-02',
      created_at: '2024-02-02T11:30:00Z',
    },
    {
      id: 'invoice-002',
      hotel_id: 'hotel-001',
      invoice_number: 'INV-0002',
      guest_id: 'guest-001',
      booking_id: 'booking-001',
      amount: 600,
      tax: 60,
      total: 660,
      amount_paid: 300,
      line_items: [
        { description: 'Room charge (4 nights)', amount: 600, quantity: 1, type: 'charge' },
      ],
      status: 'partially_paid',
      due_date: '2024-02-05',
      paid_date: null,
      created_at: '2024-02-01T14:30:00Z',
    },
  ],

  // Expenses
  expenses: [
    {
      id: 'expense-001',
      hotel_id: 'hotel-001',
      category: 'utilities',
      description: 'Electricity bill - January',
      amount: 1250,
      date: '2024-02-01',
      vendor: 'City Power Company',
      created_by: 'staff-001',
      created_at: '2024-02-01T10:00:00Z',
    },
    {
      id: 'expense-002',
      hotel_id: 'hotel-001',
      category: 'maintenance',
      description: 'AC repair parts',
      amount: 350,
      date: '2024-02-01',
      vendor: 'HVAC Supplies Inc',
      created_by: 'staff-002',
      created_at: '2024-02-01T15:30:00Z',
    },
    {
      id: 'expense-003',
      hotel_id: 'hotel-001',
      category: 'supplies',
      description: 'Cleaning supplies - monthly stock',
      amount: 450,
      date: '2024-02-02',
      vendor: 'Hotel Supplies Co',
      created_by: 'staff-002',
      created_at: '2024-02-02T09:00:00Z',
    },
  ],

  // Automations — real user rules only. The 5 fake "System Automations"
  // (sys-1..sys-5, claiming SQL triggers) are deleted: there is no SQL and
  // no backend. Triggers match the store event types in ./types.ts.
  automations: [
    {
      id: 'auto-001',
      hotel_id: 'hotel-001',
      name: 'Auto-create housekeeping task on checkout',
      description: 'Creates a checkout cleaning task when a guest checks out.',
      trigger: 'booking.checked_out',
      action: 'create_housekeeping_task',
      enabled: true,
      config: {
        task_type: 'checkout_clean',
        priority: 'high',
      },
      execution_count: 0,
      last_triggered_at: null,
      created_at: '2024-01-01T00:00:00Z',
    },
    {
      id: 'auto-002',
      hotel_id: 'hotel-001',
      name: 'Send welcome email on check-in',
      description: 'Records a welcome-email action when a guest checks in.',
      trigger: 'booking.checked_in',
      action: 'send_email',
      enabled: true,
      config: {
        template: 'welcome',
      },
      execution_count: 0,
      last_triggered_at: null,
      created_at: '2024-01-01T00:00:00Z',
    },
  ],

  // Activity Logs
  activityLogs: [
    {
      id: 'log-001',
      hotel_id: 'hotel-001',
      user_id: 'user-manager-001',
      user_name: 'Sarah Johnson',
      action: 'booking_created',
      entity_type: 'booking',
      entity_id: 'booking-005',
      details: 'Created booking BK-0005 for guest Michael Brown',
      created_at: '2024-02-01T10:00:00Z',
    },
    {
      id: 'log-002',
      hotel_id: 'hotel-001',
      user_id: 'user-manager-001',
      user_name: 'Sarah Johnson',
      action: 'booking_status_changed',
      entity_type: 'booking',
      entity_id: 'booking-004',
      details: 'Changed booking status from checked_in to checked_out',
      created_at: '2024-02-02T11:30:00Z',
    },
    {
      id: 'log-003',
      hotel_id: 'hotel-001',
      user_id: 'user-housekeeping-001',
      user_name: 'Maria Garcia',
      action: 'task_updated',
      entity_type: 'housekeeping_task',
      entity_id: 'task-002',
      details: 'Started cleaning task for room 201',
      created_at: '2024-02-03T09:00:00Z',
    },
  ],
};

/** Counters matching the highest seed numbers (BK-0005, INV-0002, TSK-0003). */
export const initialCounters: StoreCounters = {
  booking: 5,
  invoice: 2,
  task: 3,
};
