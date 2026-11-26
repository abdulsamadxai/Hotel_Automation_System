// In-memory mock data store for frontend-only operation, backed by
// localStorage (key `has:store:v1`, schema version 1) so changes survive a
// reload. All entities use the canonical types in ./types.ts.
//
// Rules enforced here:
// - Booking totals come from room.price_per_night * nights (never NaN);
//   check-out must be after check-in; no overlapping booking per room;
//   blocked guests cannot book.
// - Booking/invoice/task numbers come from persisted counters, never random.
// - Every mutation writes an ActivityLog entry and persists the whole state.
// - A tiny event bus + rule engine evaluates enabled automations on
//   booking/room/invoice events (see `emit` / `evaluateAutomations`).
import { initialCounters, mockData } from './mockData';
import { sha256Hex } from './hash';
import type {
  ActivityLog,
  AuthUser,
  Automation,
  AutomationAction,
  Booking,
  BookingStatus,
  Expense,
  Guest,
  GuestTag,
  Hotel,
  HousekeepingTask,
  Invoice,
  Message,
  Notification,
  Room,
  SessionUser,
  StaffMember,
  StaffRole,
  StoreEventType,
  StoreState,
  UserRole,
} from './types';

export type { UserRole } from './types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const STORE_KEY = 'has:store:v1';

/** JSON round-trip clone. With booking totals fixed, no NaN reaches here. */
const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

const delay = (ms = 100) =>
  new Promise((resolve) => setTimeout(resolve, ms));

const generateId = () =>
  `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;

const nowIso = () => new Date().toISOString();

function storageGet(key: string): string | null {
  try {
    return typeof localStorage !== 'undefined'
      ? localStorage.getItem(key)
      : null;
  } catch {
    return null;
  }
}

function storageSet(key: string, value: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(key, value);
    }
  } catch {
    // Storage full / unavailable: the in-memory state still works.
  }
}

function storageRemove(key: string): void {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(key);
    }
  } catch {
    // Ignore.
  }
}

// ---------------------------------------------------------------------------
// State + persistence
// ---------------------------------------------------------------------------

function seedState(): StoreState {
  return {
    version: 1,
    users: clone(mockData.testUsers),
    guests: clone(mockData.guests),
    bookings: clone(mockData.bookings),
    rooms: clone(mockData.rooms),
    housekeepingTasks: clone(mockData.housekeepingTasks),
    staff: clone(mockData.staff),
    messages: clone(mockData.messages),
    notifications: clone(mockData.notifications),
    hotels: clone(mockData.hotels),
    invoices: clone(mockData.invoices),
    expenses: clone(mockData.expenses),
    automations: clone(mockData.automations),
    activityLogs: clone(mockData.activityLogs),
    counters: { ...initialCounters },
  };
}

function isValidState(value: unknown): value is StoreState {
  if (typeof value !== 'object' || value === null) return false;
  const state = value as Partial<StoreState>;
  return (
    state.version === 1 &&
    Array.isArray(state.users) &&
    Array.isArray(state.bookings) &&
    Array.isArray(state.rooms) &&
    Array.isArray(state.invoices) &&
    Array.isArray(state.housekeepingTasks) &&
    typeof state.counters === 'object' &&
    state.counters !== null
  );
}

function loadState(): StoreState {
  const raw = storageGet(STORE_KEY);
  if (raw) {
    try {
      const parsed: unknown = JSON.parse(raw);
      if (isValidState(parsed)) return parsed;
    } catch {
      // Corrupt persisted state: fall through to seeding.
    }
  }
  const seeded = seedState();
  storageSet(STORE_KEY, JSON.stringify(seeded));
  return seeded;
}

let state: StoreState = loadState();
let currentUser: SessionUser | null = null;

function persist(): void {
  storageSet(STORE_KEY, JSON.stringify(state));
}

// Reset store to initial seed state (clears the persisted store key).
export const resetStore = () => {
  state = seedState();
  storageRemove(STORE_KEY);
  persist();
};

// ---------------------------------------------------------------------------
// Internal (synchronous) mutation helpers — callers persist afterwards.
// ---------------------------------------------------------------------------

function actorName(): string | undefined {
  return currentUser?.user_metadata.full_name;
}

function logActivityInternal(input: {
  action: string;
  details: string;
  entity_type: string;
  entity_id?: string;
  hotel_id: string;
}): ActivityLog {
  const log: ActivityLog = {
    id: generateId(),
    hotel_id: input.hotel_id,
    user_id: currentUser?.id ?? null,
    user_name: actorName(),
    action: input.action,
    details: input.details,
    entity_type: input.entity_type,
    entity_id: input.entity_id,
    created_at: nowIso(),
  };
  state.activityLogs.push(log);
  return log;
}

function nextBookingNumber(): string {
  state.counters.booking += 1;
  return `BK-${String(state.counters.booking).padStart(4, '0')}`;
}

function nextInvoiceNumber(): string {
  state.counters.invoice += 1;
  return `INV-${String(state.counters.invoice).padStart(4, '0')}`;
}

function nextTaskNumber(): string {
  state.counters.task += 1;
  return `TSK-${String(state.counters.task).padStart(4, '0')}`;
}

interface TaskCreateInput {
  hotel_id: string;
  room_id: string;
  booking_id?: string | null;
  type: HousekeepingTask['type'];
  priority: HousekeepingTask['priority'];
  description: string;
  assigned_to?: string | null;
  due_at?: string | null;
  automation_triggered?: boolean;
  notes?: string | null;
}

function createTaskInternal(input: TaskCreateInput): HousekeepingTask {
  const task: HousekeepingTask = {
    id: generateId(),
    hotel_id: input.hotel_id,
    task_number: nextTaskNumber(),
    room_id: input.room_id,
    booking_id: input.booking_id ?? null,
    type: input.type,
    status: 'pending',
    priority: input.priority,
    description: input.description,
    assigned_to: input.assigned_to ?? null,
    due_at: input.due_at ?? null,
    automation_triggered: input.automation_triggered ?? false,
    notes: input.notes ?? null,
    created_at: nowIso(),
    updated_at: nowIso(),
  };
  state.housekeepingTasks.push(task);
  logActivityInternal({
    action: 'task_created',
    details: `Created task ${task.task_number}: ${task.description}`,
    entity_type: 'housekeeping_task',
    entity_id: task.id,
    hotel_id: task.hotel_id,
  });
  return task;
}

interface NotificationCreateInput {
  hotel_id: string;
  type: Notification['type'];
  title: string;
  message: string;
  user_id?: string | null;
  link?: string | null;
}

function createNotificationInternal(
  input: NotificationCreateInput,
): Notification {
  const notification: Notification = {
    id: generateId(),
    hotel_id: input.hotel_id,
    user_id: input.user_id ?? null,
    type: input.type,
    title: input.title,
    message: input.message,
    link: input.link ?? null,
    is_read: false,
    created_at: nowIso(),
  };
  state.notifications.push(notification);
  return notification;
}

interface InvoiceCreateInput {
  hotel_id: string;
  guest_id: string | null;
  booking_id: string | null;
  amount: number;
  nights?: number;
  due_date?: string | null;
  status?: Invoice['status'];
  line_items?: Invoice['line_items'];
}

function createInvoiceInternal(input: InvoiceCreateInput): Invoice {
  const amount = Number.isFinite(input.amount) ? input.amount : 0;
  const tax = Math.round(amount * 0.1 * 100) / 100;
  const nights = input.nights ?? 1;
  const invoice: Invoice = {
    id: generateId(),
    hotel_id: input.hotel_id,
    invoice_number: nextInvoiceNumber(),
    guest_id: input.guest_id,
    booking_id: input.booking_id,
    amount,
    tax,
    total: amount + tax,
    amount_paid: 0,
    line_items: input.line_items ?? [
      {
        description: `Room charge (${nights} night${nights === 1 ? '' : 's'})`,
        amount,
        quantity: 1,
        type: 'charge',
      },
    ],
    status: input.status ?? 'pending',
    due_date: input.due_date ?? null,
    paid_date: null,
    created_at: nowIso(),
  };
  state.invoices.push(invoice);
  logActivityInternal({
    action: 'invoice_created',
    details: `Created invoice ${invoice.invoice_number} for $${invoice.total.toFixed(2)}`,
    entity_type: 'invoice',
    entity_id: invoice.id,
    hotel_id: invoice.hotel_id,
  });
  return invoice;
}

// ---------------------------------------------------------------------------
// Event bus + minimal automation engine
// ---------------------------------------------------------------------------

export interface StoreEvent {
  type: StoreEventType;
  hotelId: string;
  booking?: Booking;
  room?: Room;
  invoice?: Invoice;
}

interface EngineResult {
  createdTask: boolean;
  createdInvoice: boolean;
}

function roomNumberFor(booking: Booking | undefined): string | null {
  if (!booking?.room_id) return null;
  return state.rooms.find((r) => r.id === booking.room_id)?.number ?? null;
}

function guestNameFor(booking: Booking | undefined): string {
  if (!booking?.guest_id) return 'Guest';
  return state.guests.find((g) => g.id === booking.guest_id)?.name ?? 'Guest';
}

/**
 * Runs every enabled automation whose trigger matches the event. Updates
 * execution_count / last_triggered_at on every real run. At most one
 * housekeeping task and one invoice are created per event, so two rules
 * with the same action cannot double-create.
 */
function evaluateAutomations(event: StoreEvent): EngineResult {
  const result: EngineResult = { createdTask: false, createdInvoice: false };
  const now = nowIso();

  const rules = state.automations.filter(
    (rule) =>
      rule.enabled && rule.hotel_id === event.hotelId && rule.trigger === event.type,
  );

  for (const rule of rules) {
    const booking = event.booking;
    const room =
      event.room ??
      (booking?.room_id
        ? state.rooms.find((r) => r.id === booking.room_id)
        : undefined);
    const roomNumber = room?.number ?? roomNumberFor(booking);

    switch (rule.action as AutomationAction) {
      case 'create_housekeeping_task': {
        if (result.createdTask || !room) break;
        const taskType =
          (rule.config?.task_type as HousekeepingTask['type']) ??
          'checkout_clean';
        const priority =
          (rule.config?.priority as HousekeepingTask['priority']) ?? 'high';
        createTaskInternal({
          hotel_id: event.hotelId,
          room_id: room.id,
          booking_id: booking?.id ?? null,
          type: taskType,
          priority,
          description: `Checkout cleaning for room ${roomNumber}`,
          automation_triggered: true,
        });
        result.createdTask = true;
        break;
      }
      case 'create_notification': {
        const title =
          event.type === 'booking.checked_out'
            ? 'Guest Checked Out'
            : event.type === 'booking.checked_in'
              ? 'Guest Checked In'
              : event.type === 'booking.created'
                ? 'New Booking'
                : 'Automation Notification';
        createNotificationInternal({
          hotel_id: event.hotelId,
          type: 'info',
          title,
          message: booking
            ? `${title}: ${guestNameFor(booking)} (${booking.booking_number})${roomNumber ? `, room ${roomNumber}` : ''}`
            : title,
        });
        break;
      }
      case 'log_activity': {
        logActivityInternal({
          action: 'automation_executed',
          details: `Automation "${rule.name}" ran on ${event.type}`,
          entity_type: 'automation',
          entity_id: rule.id,
          hotel_id: event.hotelId,
        });
        break;
      }
      case 'create_invoice': {
        if (result.createdInvoice || !booking) break;
        createInvoiceInternal({
          hotel_id: event.hotelId,
          guest_id: booking.guest_id,
          booking_id: booking.id,
          amount: booking.total_amount,
          nights: booking.nights,
          due_date: booking.check_out.slice(0, 10),
        });
        result.createdInvoice = true;
        break;
      }
      case 'send_email': {
        // No real email exists in this frontend-only app; record the action.
        logActivityInternal({
          action: 'automation_executed',
          details: `Automation "${rule.name}" recorded a ${String(rule.config?.template ?? 'email')} email action for booking ${booking?.booking_number ?? ''}`,
          entity_type: 'automation',
          entity_id: rule.id,
          hotel_id: event.hotelId,
        });
        break;
      }
      default: {
        logActivityInternal({
          action: 'automation_executed',
          details: `Automation "${rule.name}" ran action "${rule.action}" on ${event.type}`,
          entity_type: 'automation',
          entity_id: rule.id,
          hotel_id: event.hotelId,
        });
        break;
      }
    }

    rule.execution_count += 1;
    rule.last_triggered_at = now;
  }

  return result;
}

function emit(event: StoreEvent): EngineResult {
  return evaluateAutomations(event);
}

// ---------------------------------------------------------------------------
// Joined view types
// ---------------------------------------------------------------------------

export type BookingWithJoins = Booking & {
  guest: {
    id: string;
    name: string;
    email: string | null;
    tags: GuestTag[];
  } | null;
  room: { id: string; number: string; type: string } | null;
};

export type InvoiceWithJoins = Invoice & {
  booking: {
    id: string;
    room: { number: string } | null;
  } | null;
  guest: { id: string; name: string; email: string | null } | null;
};

export type TaskWithJoins = HousekeepingTask & {
  room: { id: string; number: string; type: string } | null;
  assignee: { id: string; full_name: string } | null;
};

export type StaffWithJoins = StaffMember & {
  saas_role: StaffRole;
  hotels: { name: string } | null;
};

// ---------------------------------------------------------------------------
// Create / update input types
// ---------------------------------------------------------------------------

export interface BookingCreateInput {
  guest_id: string;
  room_id: string | null;
  guest_type: 'national' | 'international';
  check_in: string;
  check_out: string;
  notes?: string | null;
  status?: BookingStatus;
  payment_status?: Booking['payment_status'];
  deposit_amount?: number;
  total_amount?: number;
  nights?: number;
  created_by?: string | null;
}

export interface RoomCreateInput {
  number: string;
  type: Room['type'];
  floor: number;
  status?: Room['status'];
  price_per_night: number;
  capacity: number;
  amenities?: string[];
}

export interface GuestCreateInput {
  name: string;
  email?: string | null;
  phone?: string | null;
  nationality?: string | null;
  id_number?: string | null;
  notes?: string | null;
  tags?: GuestTag[];
}

export interface StaffCreateInput {
  full_name: string;
  email?: string | null;
  phone?: string | null;
  role: StaffRole;
  status?: StaffMember['status'];
  shift?: string | null;
  hire_date?: string;
  user_id?: string | null;
}

export interface MessageCreateInput {
  guest_id: string;
  guest_name?: string;
  guest_email?: string;
  guest_phone?: string;
  subject?: string;
  message: string;
  direction?: Message['direction'];
  channel?: Message['channel'];
  status?: Message['status'];
  priority?: Message['priority'];
  assigned_to?: string | null;
}

export interface InvoiceCreateInputPublic {
  guest_id?: string | null;
  booking_id?: string | null;
  amount?: number;
  tax?: number;
  total?: number;
  amount_paid?: number;
  line_items?: Invoice['line_items'];
  status?: Invoice['status'];
  due_date?: string | null;
  paid_date?: string | null;
  payment_method?: string;
  notes?: string;
}

export interface AutomationCreateInput {
  name: string;
  description?: string;
  trigger: StoreEventType;
  action: AutomationAction;
  enabled?: boolean;
  config?: Record<string, unknown>;
}

export interface ActivityCreateInput {
  action: string;
  details: string;
  entity_type: string;
  entity_id?: string;
  user_id?: string | null;
  user_name?: string;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const mockStore = {
  // Auth operations
  auth: {
    getCurrentUser: async (): Promise<SessionUser | null> => {
      await delay(50);
      return clone(currentUser);
    },

    setCurrentUser: (user: SessionUser | null) => {
      currentUser = user;
      if (user) {
        storageSet('mock_user', JSON.stringify(user));
      } else {
        storageRemove('mock_user');
      }
    },

    signIn: async (
      email: string,
      password: string,
      hotelCode?: string | null,
    ) => {
      await delay(200);

      const user = state.users.find((u) => u.email === email);
      if (!user || sha256Hex(password) !== user.password_hash) {
        throw new Error('Invalid email or password');
      }

      // Manager / housekeeping / staff must present the hotel's access code.
      if (
        user.role === 'manager' ||
        user.role === 'housekeeping' ||
        user.role === 'staff'
      ) {
        const staffRecord = state.staff.find((s) => s.user_id === user.id);
        const hotel = state.hotels.find(
          (h) => h.id === (staffRecord?.hotel_id ?? user.hotel_id ?? ''),
        );
        if (!hotel || !hotelCode || hotelCode !== hotel.access_code) {
          throw new Error('Invalid hotel access code');
        }
      }

      const sessionUser: SessionUser = {
        id: user.id,
        email: user.email,
        user_metadata: {
          full_name: user.full_name,
          role: user.role,
        },
      };

      const session = { user: sessionUser };
      currentUser = sessionUser;
      storageSet('mock_user', JSON.stringify(sessionUser));
      return { data: session, error: null };
    },

    signUp: async (
      email: string,
      password: string,
      fullName?: string,
      role?: UserRole,
      hotelCode?: string | null,
    ) => {
      await delay(200);

      if (role === 'owner' || role === 'super_admin') {
        throw new Error('Owner accounts are created by an administrator');
      }
      const effectiveRole: UserRole = role ?? 'staff';

      // Staff / manager / housekeeping sign-up requires a valid hotel code.
      const hotel = hotelCode
        ? state.hotels.find((h) => h.access_code === hotelCode)
        : undefined;
      if (!hotel) {
        throw new Error('Invalid hotel access code');
      }

      if (state.users.find((u) => u.email === email)) {
        throw new Error('User already exists');
      }

      const newUser: AuthUser = {
        id: generateId(),
        email,
        password_hash: sha256Hex(password),
        full_name: fullName || email.split('@')[0],
        role: effectiveRole,
        hotel_id: hotel.id,
      };
      state.users.push(newUser);

      // The new user joins the hotel matching the code.
      const staffRole = effectiveRole as StaffRole;
      state.staff.push({
        id: generateId(),
        hotel_id: hotel.id,
        user_id: newUser.id,
        full_name: newUser.full_name,
        email: newUser.email,
        phone: null,
        role: staffRole,
        status: 'active',
        created_at: nowIso(),
      });

      persist();
      return {
        data: {
          user: {
            id: newUser.id,
            email: newUser.email,
            full_name: newUser.full_name,
            role: newUser.role,
            hotel_id: hotel.id,
          },
        },
        error: null,
      };
    },

    /**
     * Change a login user's password (updates the stored hash). Used when a
     * staff member's password is changed — staff records hold no password.
     */
    updatePassword: async (userId: string, newPassword: string) => {
      await delay(100);
      const user = state.users.find((u) => u.id === userId);
      if (!user) throw new Error('User not found');
      user.password_hash = sha256Hex(newPassword);
      persist();
    },

    signOut: async () => {
      await delay(100);
      currentUser = null;
      storageRemove('mock_user');
      storageRemove('super-admin-selected-hotel');
    },

    initializeFromStorage: () => {
      const stored = storageGet('mock_user');
      if (stored) {
        try {
          currentUser = JSON.parse(stored) as SessionUser;
        } catch {
          storageRemove('mock_user');
        }
      }
    },
  },

  // Guests
  guests: {
    getAll: async (hotelId: string): Promise<Guest[]> => {
      await delay(100);
      return clone(state.guests.filter((g) => g.hotel_id === hotelId));
    },

    create: async (
      guest: GuestCreateInput,
      hotelId: string,
    ): Promise<Guest> => {
      await delay(150);
      const newGuest: Guest = {
        id: generateId(),
        hotel_id: hotelId,
        name: guest.name,
        email: guest.email ?? null,
        phone: guest.phone ?? null,
        nationality: guest.nationality ?? null,
        id_number: guest.id_number ?? null,
        notes: guest.notes ?? null,
        // New guests start with no tags unless the form says otherwise.
        tags: guest.tags ?? [],
        total_stays: 0,
        total_spent: 0,
        last_stay_at: null,
        created_at: nowIso(),
      };
      state.guests.push(newGuest);
      logActivityInternal({
        action: 'guest_created',
        details: `Created guest ${newGuest.name}`,
        entity_type: 'guest',
        entity_id: newGuest.id,
        hotel_id: hotelId,
      });
      persist();
      return clone(newGuest);
    },

    update: async (
      id: string,
      updates: Partial<Omit<Guest, 'id' | 'hotel_id'>>,
    ): Promise<Guest> => {
      await delay(100);
      const index = state.guests.findIndex((g) => g.id === id);
      if (index === -1) throw new Error('Guest not found');
      state.guests[index] = { ...state.guests[index], ...updates };
      logActivityInternal({
        action: 'guest_updated',
        details: `Updated guest ${state.guests[index].name}`,
        entity_type: 'guest',
        entity_id: id,
        hotel_id: state.guests[index].hotel_id,
      });
      persist();
      return clone(state.guests[index]);
    },

    delete: async (id: string): Promise<void> => {
      await delay(100);
      const index = state.guests.findIndex((g) => g.id === id);
      if (index === -1) throw new Error('Guest not found');
      const [removed] = state.guests.splice(index, 1);
      logActivityInternal({
        action: 'guest_deleted',
        details: `Deleted guest ${removed.name}`,
        entity_type: 'guest',
        entity_id: id,
        hotel_id: removed.hotel_id,
      });
      persist();
    },
  },

  // Bookings
  bookings: {
    getAll: async (hotelId: string): Promise<BookingWithJoins[]> => {
      await delay(100);
      const bookings = state.bookings.filter((b) => b.hotel_id === hotelId);
      return clone(
        bookings.map((booking) => {
          const guest = state.guests.find((g) => g.id === booking.guest_id);
          const room = state.rooms.find((r) => r.id === booking.room_id);
          return {
            ...booking,
            guest: guest
              ? {
                  id: guest.id,
                  name: guest.name,
                  email: guest.email,
                  tags: guest.tags,
                }
              : null,
            room: room
              ? { id: room.id, number: room.number, type: room.type }
              : null,
          };
        }),
      );
    },

    create: async (
      booking: BookingCreateInput,
      hotelId: string,
    ): Promise<Booking> => {
      await delay(150);

      const checkIn = new Date(booking.check_in);
      const checkOut = new Date(booking.check_out);
      if (
        Number.isNaN(checkIn.getTime()) ||
        Number.isNaN(checkOut.getTime()) ||
        checkOut <= checkIn
      ) {
        throw new Error('Check-out date must be after check-in date');
      }
      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24),
      );

      let totalAmount: number;
      if (booking.room_id) {
        const room = state.rooms.find((r) => r.id === booking.room_id);
        if (!room) throw new Error('Room not found');

        const overlaps = state.bookings.some(
          (b) =>
            b.room_id === booking.room_id &&
            b.status !== 'cancelled' &&
            new Date(b.check_in) < checkOut &&
            checkIn < new Date(b.check_out),
        );
        if (overlaps) {
          throw new Error('Room is already booked for the selected dates');
        }

        const guest = state.guests.find((g) => g.id === booking.guest_id);
        if (guest?.tags.includes('blocked')) {
          throw new Error('Guest is blocked and cannot be booked');
        }

        // Authoritative total — never NaN: price_per_night is always set.
        totalAmount = room.price_per_night * nights;
      } else {
        totalAmount =
          booking.total_amount !== undefined &&
          Number.isFinite(booking.total_amount)
            ? booking.total_amount
            : 0;
      }

      const newBooking: Booking = {
        id: generateId(),
        hotel_id: hotelId,
        booking_number: nextBookingNumber(),
        guest_id: booking.guest_id,
        room_id: booking.room_id,
        guest_type: booking.guest_type,
        check_in: booking.check_in,
        check_out: booking.check_out,
        status: booking.status ?? 'confirmed',
        nights,
        total_amount: totalAmount,
        notes: booking.notes ?? null,
        payment_status: booking.payment_status ?? 'pending',
        deposit_amount: booking.deposit_amount ?? 0,
        created_by: booking.created_by ?? null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      state.bookings.push(newBooking);

      if (newBooking.status === 'checked_in' && newBooking.room_id) {
        const room = state.rooms.find((r) => r.id === newBooking.room_id);
        if (room) room.status = 'occupied';
      }

      logActivityInternal({
        action: 'booking_created',
        details: `Created booking ${newBooking.booking_number} for ${guestNameFor(newBooking)}`,
        entity_type: 'booking',
        entity_id: newBooking.id,
        hotel_id: hotelId,
      });
      emit({
        type: 'booking.created',
        hotelId,
        booking: newBooking,
      });
      if (newBooking.status === 'checked_in') {
        emit({
          type: 'booking.checked_in',
          hotelId,
          booking: newBooking,
        });
      }
      persist();
      return clone(newBooking);
    },

    update: async (
      id: string,
      updates: Partial<Omit<Booking, 'id' | 'hotel_id' | 'booking_number'>>,
    ): Promise<Booking> => {
      await delay(100);
      const index = state.bookings.findIndex((b) => b.id === id);
      if (index === -1) throw new Error('Booking not found');

      const booking = state.bookings[index];

      // Edits must pass the same validation as creates: dates must be
      // valid and the room must not already be booked for the new range
      // (excluding this booking itself).
      if (
        updates.check_in !== undefined ||
        updates.check_out !== undefined ||
        updates.room_id !== undefined
      ) {
        const effectiveCheckIn = updates.check_in ?? booking.check_in;
        const effectiveCheckOut = updates.check_out ?? booking.check_out;
        const effectiveRoomId = updates.room_id ?? booking.room_id;
        const ci = new Date(effectiveCheckIn);
        const co = new Date(effectiveCheckOut);
        if (
          Number.isNaN(ci.getTime()) ||
          Number.isNaN(co.getTime()) ||
          co <= ci
        ) {
          throw new Error('Check-out date must be after check-in date');
        }
        if (effectiveRoomId) {
          const overlaps = state.bookings.some(
            (b) =>
              b.id !== id &&
              b.room_id === effectiveRoomId &&
              b.status !== 'cancelled' &&
              new Date(b.check_in) < co &&
              ci < new Date(b.check_out),
          );
          if (overlaps) {
            throw new Error('Room is already booked for the selected dates');
          }
        }
      }
      const oldStatus = booking.status;

      state.bookings[index] = {
        ...booking,
        ...updates,
        updated_at: nowIso(),
      };
      const updated = state.bookings[index];
      const room = updated.room_id
        ? state.rooms.find((r) => r.id === updated.room_id)
        : undefined;

      if (updates.status && updates.status !== oldStatus) {
        if (updates.status === 'checked_in') {
          if (room) room.status = 'occupied';
          emit({
            type: 'booking.checked_in',
            hotelId: updated.hotel_id,
            booking: updated,
            room,
          });
        } else if (updates.status === 'checked_out') {
          if (room) room.status = 'dirty';

          // Checkout housekeeping task: from the rule engine when a
          // matching enabled rule exists, otherwise direct fallback.
          const engine = emit({
            type: 'booking.checked_out',
            hotelId: updated.hotel_id,
            booking: updated,
            room,
          });
          if (!engine.createdTask && room) {
            createTaskInternal({
              hotel_id: updated.hotel_id,
              room_id: room.id,
              booking_id: updated.id,
              type: 'checkout_clean',
              priority: 'high',
              description: `Checkout cleaning for room ${room.number}`,
              automation_triggered: false,
            });
          }

          // Final invoice: engine first, direct fallback second.
          if (!engine.createdInvoice) {
            createInvoiceInternal({
              hotel_id: updated.hotel_id,
              guest_id: updated.guest_id,
              booking_id: updated.id,
              amount: updated.total_amount,
              nights: updated.nights,
              due_date: updated.check_out.slice(0, 10),
            });
          }

          // Guest lifetime stats.
          const guest = state.guests.find((g) => g.id === updated.guest_id);
          if (guest) {
            guest.total_stays += 1;
            guest.total_spent += updated.total_amount;
            guest.last_stay_at = updated.check_out;
          }
        } else if (updates.status === 'cancelled') {
          // Free the room if this booking had it occupied.
          if (room && room.status === 'occupied') room.status = 'available';
          // Cancel any unpaid invoice for the booking.
          for (const invoice of state.invoices) {
            if (
              invoice.booking_id === updated.id &&
              invoice.status !== 'paid' &&
              invoice.status !== 'refunded' &&
              invoice.status !== 'cancelled'
            ) {
              invoice.status = 'cancelled';
            }
          }
          // Remove pending housekeeping tasks for the room.
          if (updated.room_id) {
            state.housekeepingTasks = state.housekeepingTasks.filter(
              (t) =>
                !(t.room_id === updated.room_id && t.status === 'pending'),
            );
          }
          emit({
            type: 'booking.cancelled',
            hotelId: updated.hotel_id,
            booking: updated,
            room,
          });
        }

        logActivityInternal({
          action: 'booking_status_changed',
          details: `Changed booking ${updated.booking_number} status from ${oldStatus} to ${updated.status}`,
          entity_type: 'booking',
          entity_id: updated.id,
          hotel_id: updated.hotel_id,
        });
      } else {
        logActivityInternal({
          action: 'booking_updated',
          details: `Updated booking ${updated.booking_number}`,
          entity_type: 'booking',
          entity_id: updated.id,
          hotel_id: updated.hotel_id,
        });
      }

      persist();
      return clone(state.bookings[index]);
    },

    delete: async (id: string): Promise<void> => {
      await delay(100);
      const index = state.bookings.findIndex((b) => b.id === id);
      if (index === -1) throw new Error('Booking not found');
      const [removed] = state.bookings.splice(index, 1);
      logActivityInternal({
        action: 'booking_deleted',
        details: `Deleted booking ${removed.booking_number}`,
        entity_type: 'booking',
        entity_id: id,
        hotel_id: removed.hotel_id,
      });
      persist();
    },
  },

  // Rooms
  rooms: {
    getAll: async (hotelId: string): Promise<Room[]> => {
      await delay(100);
      return clone(state.rooms.filter((r) => r.hotel_id === hotelId));
    },

    create: async (room: RoomCreateInput, hotelId: string): Promise<Room> => {
      await delay(150);
      const newRoom: Room = {
        id: generateId(),
        hotel_id: hotelId,
        number: room.number,
        type: room.type,
        floor: room.floor,
        status: room.status ?? 'available',
        price_per_night: room.price_per_night,
        capacity: room.capacity,
        amenities: room.amenities ?? [],
        created_at: nowIso(),
      };
      state.rooms.push(newRoom);
      logActivityInternal({
        action: 'room_created',
        details: `Created room ${newRoom.number}`,
        entity_type: 'room',
        entity_id: newRoom.id,
        hotel_id: hotelId,
      });
      persist();
      return clone(newRoom);
    },

    update: async (
      id: string,
      updates: Partial<Omit<Room, 'id' | 'hotel_id'>>,
    ): Promise<Room> => {
      await delay(100);
      const index = state.rooms.findIndex((r) => r.id === id);
      if (index === -1) throw new Error('Room not found');
      state.rooms[index] = { ...state.rooms[index], ...updates };
      const updated = state.rooms[index];
      logActivityInternal({
        action: 'room_updated',
        details: `Updated room ${updated.number} (status: ${updated.status})`,
        entity_type: 'room',
        entity_id: id,
        hotel_id: updated.hotel_id,
      });
      emit({
        type: 'room.updated',
        hotelId: updated.hotel_id,
        room: updated,
      });
      persist();
      return clone(updated);
    },

    delete: async (id: string): Promise<void> => {
      await delay(100);
      const index = state.rooms.findIndex((r) => r.id === id);
      if (index === -1) throw new Error('Room not found');
      const [removed] = state.rooms.splice(index, 1);
      logActivityInternal({
        action: 'room_deleted',
        details: `Deleted room ${removed.number}`,
        entity_type: 'room',
        entity_id: id,
        hotel_id: removed.hotel_id,
      });
      persist();
    },
  },

  // Housekeeping Tasks
  housekeeping: {
    getAll: async (hotelId: string): Promise<TaskWithJoins[]> => {
      await delay(100);
      const tasks = state.housekeepingTasks.filter(
        (t) => t.hotel_id === hotelId,
      );
      return clone(
        tasks.map((task) => {
          const room = state.rooms.find((r) => r.id === task.room_id);
          const assignee = task.assigned_to
            ? state.staff.find((s) => s.id === task.assigned_to)
            : null;
          return {
            ...task,
            room: room
              ? { id: room.id, number: room.number, type: room.type }
              : null,
            assignee: assignee
              ? { id: assignee.id, full_name: assignee.full_name }
              : null,
          };
        }),
      );
    },

    create: async (
      task: Omit<TaskCreateInput, 'hotel_id'> & {
        status?: HousekeepingTask['status'];
      },
      hotelId: string,
    ): Promise<HousekeepingTask> => {
      await delay(150);
      const created = createTaskInternal({
        ...task,
        hotel_id: hotelId,
      });
      if (task.status) created.status = task.status;
      created.updated_at = nowIso();
      persist();
      return clone(created);
    },

    update: async (
      id: string,
      updates: Partial<Omit<HousekeepingTask, 'id' | 'hotel_id' | 'task_number'>>,
    ): Promise<HousekeepingTask> => {
      await delay(100);
      const index = state.housekeepingTasks.findIndex((t) => t.id === id);
      if (index === -1) throw new Error('Task not found');

      const task = state.housekeepingTasks[index];
      state.housekeepingTasks[index] = {
        ...task,
        ...updates,
        updated_at: nowIso(),
      };
      const updated = state.housekeepingTasks[index];

      if (updates.status === 'completed' && updated.room_id) {
        const room = state.rooms.find((r) => r.id === updated.room_id);
        if (room && room.status === 'dirty') {
          room.status = 'available';
        }
      }

      logActivityInternal({
        action: 'task_updated',
        details: `Updated task ${updated.task_number} (status: ${updated.status})`,
        entity_type: 'housekeeping_task',
        entity_id: id,
        hotel_id: updated.hotel_id,
      });
      persist();
      return clone(updated);
    },

    delete: async (id: string): Promise<void> => {
      await delay(100);
      const index = state.housekeepingTasks.findIndex((t) => t.id === id);
      if (index === -1) throw new Error('Task not found');
      const [removed] = state.housekeepingTasks.splice(index, 1);
      logActivityInternal({
        action: 'task_deleted',
        details: `Deleted task ${removed.task_number}`,
        entity_type: 'housekeeping_task',
        entity_id: id,
        hotel_id: removed.hotel_id,
      });
      persist();
    },
  },

  // Staff
  staff: {
    getAll: async (hotelId: string): Promise<StaffWithJoins[]> => {
      await delay(100);
      const staff =
        hotelId === 'global'
          ? state.staff
          : state.staff.filter((s) => s.hotel_id === hotelId);
      return clone(
        staff.map((s) => {
          const hotel = state.hotels.find((h) => h.id === s.hotel_id);
          return {
            ...s,
            saas_role: s.role,
            hotels: hotel ? { name: hotel.name } : null,
          };
        }),
      );
    },

    // Staff record creation only. It does NOT create a login user and does
    // NOT mutate the shared seed data. Use auth.updatePassword to change a
    // staff member's login password.
    create: async (
      staff: StaffCreateInput,
      hotelId: string,
    ): Promise<StaffMember> => {
      await delay(150);
      const newStaff: StaffMember = {
        id: generateId(),
        hotel_id: hotelId,
        user_id: staff.user_id ?? null,
        full_name: staff.full_name,
        email: staff.email ?? null,
        phone: staff.phone ?? null,
        role: staff.role,
        status: staff.status ?? 'active',
        shift: staff.shift ?? null,
        hire_date: staff.hire_date,
        created_at: nowIso(),
      };
      state.staff.push(newStaff);
      logActivityInternal({
        action: 'staff_created',
        details: `Added staff member ${newStaff.full_name} (${newStaff.role})`,
        entity_type: 'staff',
        entity_id: newStaff.id,
        hotel_id: hotelId,
      });
      persist();
      return clone(newStaff);
    },

    update: async (
      id: string,
      updates: Partial<Omit<StaffMember, 'id' | 'hotel_id'>>,
    ): Promise<StaffMember> => {
      await delay(100);
      const index = state.staff.findIndex((s) => s.id === id);
      if (index === -1) throw new Error('Staff not found');
      state.staff[index] = { ...state.staff[index], ...updates };
      logActivityInternal({
        action: 'staff_updated',
        details: `Updated staff member ${state.staff[index].full_name}`,
        entity_type: 'staff',
        entity_id: id,
        hotel_id: state.staff[index].hotel_id,
      });
      persist();
      return clone(state.staff[index]);
    },

    delete: async (id: string): Promise<void> => {
      await delay(100);
      const index = state.staff.findIndex((s) => s.id === id);
      if (index === -1) throw new Error('Staff not found');
      const [removed] = state.staff.splice(index, 1);
      logActivityInternal({
        action: 'staff_deleted',
        details: `Removed staff member ${removed.full_name}`,
        entity_type: 'staff',
        entity_id: id,
        hotel_id: removed.hotel_id,
      });
      persist();
    },

    getByUserId: async (userId: string): Promise<StaffMember | null> => {
      await delay(50);
      const staff = state.staff.find((s) => s.user_id === userId);
      return staff ? clone(staff) : null;
    },
  },

  // Hotels
  hotels: {
    getAll: async (): Promise<Hotel[]> => {
      await delay(100);
      return clone(state.hotels);
    },

    getById: async (id: string): Promise<Hotel | undefined> => {
      await delay(50);
      const hotel = state.hotels.find((h) => h.id === id);
      return hotel ? clone(hotel) : undefined;
    },

    update: async (
      id: string,
      updates: Partial<Omit<Hotel, 'id'>>,
    ): Promise<Hotel> => {
      await delay(100);
      const index = state.hotels.findIndex((h) => h.id === id);
      if (index === -1) throw new Error('Hotel not found');
      state.hotels[index] = { ...state.hotels[index], ...updates };
      logActivityInternal({
        action: 'hotel_updated',
        details: `Updated hotel ${state.hotels[index].name}`,
        entity_type: 'hotel',
        entity_id: id,
        hotel_id: id,
      });
      persist();
      return clone(state.hotels[index]);
    },
  },

  // Messages
  messages: {
    getAll: async (hotelId: string): Promise<Message[]> => {
      await delay(100);
      return clone(state.messages.filter((m) => m.hotel_id === hotelId));
    },

    create: async (
      message: MessageCreateInput,
      hotelId: string,
    ): Promise<Message> => {
      await delay(150);
      const newMessage: Message = {
        id: generateId(),
        hotel_id: hotelId,
        guest_id: message.guest_id,
        guest_name: message.guest_name,
        guest_email: message.guest_email,
        guest_phone: message.guest_phone,
        subject: message.subject,
        message: message.message,
        direction: message.direction ?? 'outbound',
        channel: message.channel,
        status: message.status ?? 'sent',
        priority: message.priority,
        assigned_to: message.assigned_to ?? null,
        created_at: nowIso(),
        updated_at: nowIso(),
      };
      state.messages.push(newMessage);
      persist();
      return clone(newMessage);
    },

    update: async (
      id: string,
      updates: Partial<Omit<Message, 'id' | 'hotel_id'>>,
    ): Promise<Message> => {
      await delay(100);
      const index = state.messages.findIndex((m) => m.id === id);
      if (index === -1) throw new Error('Message not found');
      state.messages[index] = {
        ...state.messages[index],
        ...updates,
        updated_at: nowIso(),
      };
      persist();
      return clone(state.messages[index]);
    },

    delete: async (id: string): Promise<void> => {
      await delay(100);
      const index = state.messages.findIndex((m) => m.id === id);
      if (index === -1) throw new Error('Message not found');
      state.messages.splice(index, 1);
      persist();
    },
  },

  // Notifications
  notifications: {
    getAll: async (hotelId: string): Promise<Notification[]> => {
      await delay(100);
      return clone(state.notifications.filter((n) => n.hotel_id === hotelId));
    },

    create: async (
      notification: NotificationCreateInput,
      hotelId: string,
    ): Promise<Notification> => {
      await delay(150);
      const created = createNotificationInternal({
        ...notification,
        hotel_id: hotelId,
      });
      persist();
      return clone(created);
    },

    update: async (
      id: string,
      updates: Partial<Omit<Notification, 'id' | 'hotel_id'>>,
    ): Promise<Notification> => {
      await delay(100);
      const index = state.notifications.findIndex((n) => n.id === id);
      if (index === -1) throw new Error('Notification not found');
      state.notifications[index] = { ...state.notifications[index], ...updates };
      persist();
      return clone(state.notifications[index]);
    },

    delete: async (id: string): Promise<void> => {
      await delay(100);
      const index = state.notifications.findIndex((n) => n.id === id);
      if (index === -1) throw new Error('Notification not found');
      state.notifications.splice(index, 1);
      persist();
    },
  },

  // Invoices
  invoices: {
    getAll: async (hotelId: string): Promise<InvoiceWithJoins[]> => {
      await delay(100);
      const invoices = state.invoices.filter((i) => i.hotel_id === hotelId);
      return clone(
        invoices.map((invoice) => {
          const booking = state.bookings.find(
            (b) => b.id === invoice.booking_id,
          );
          const guest = state.guests.find((g) => g.id === invoice.guest_id);
          return {
            ...invoice,
            booking: booking
              ? {
                  id: booking.id,
                  room: booking.room_id
                    ? {
                        number:
                          state.rooms.find((r) => r.id === booking.room_id)
                            ?.number || '',
                      }
                    : null,
                }
              : null,
            guest: guest
              ? { id: guest.id, name: guest.name, email: guest.email }
              : null,
          };
        }),
      );
    },

    create: async (
      invoice: InvoiceCreateInputPublic,
      hotelId: string,
    ): Promise<Invoice> => {
      await delay(150);
      const amount =
        invoice.amount !== undefined && Number.isFinite(invoice.amount)
          ? invoice.amount
          : 0;
      const tax =
        invoice.tax !== undefined && Number.isFinite(invoice.tax)
          ? invoice.tax
          : Math.round(amount * 0.1 * 100) / 100;
      // total is authoritative: total = amount + tax.
      const newInvoice: Invoice = {
        id: generateId(),
        hotel_id: hotelId,
        invoice_number: nextInvoiceNumber(),
        guest_id: invoice.guest_id ?? null,
        booking_id: invoice.booking_id ?? null,
        amount,
        tax,
        total: amount + tax,
        amount_paid: invoice.amount_paid ?? 0,
        line_items: invoice.line_items ?? [],
        status: invoice.status ?? 'pending',
        due_date: invoice.due_date ?? null,
        paid_date: invoice.paid_date ?? null,
        created_at: nowIso(),
        payment_method: invoice.payment_method,
        notes: invoice.notes,
      };
      state.invoices.push(newInvoice);
      logActivityInternal({
        action: 'invoice_created',
        details: `Created invoice ${newInvoice.invoice_number} for $${newInvoice.total.toFixed(2)}`,
        entity_type: 'invoice',
        entity_id: newInvoice.id,
        hotel_id: hotelId,
      });
      emit({
        type: 'invoice.created',
        hotelId,
        invoice: newInvoice,
      });
      persist();
      return clone(newInvoice);
    },

    update: async (
      id: string,
      updates: Partial<Omit<Invoice, 'id' | 'hotel_id' | 'invoice_number'>>,
    ): Promise<Invoice> => {
      await delay(100);
      const index = state.invoices.findIndex((i) => i.id === id);
      if (index === -1) throw new Error('Invoice not found');
      const previous = state.invoices[index];

      // Keep total authoritative unless the caller sets it explicitly.
      const next = { ...previous, ...updates };
      if (
        (updates.amount !== undefined || updates.tax !== undefined) &&
        updates.total === undefined
      ) {
        next.total = next.amount + next.tax;
      }
      if (updates.status === 'paid' && previous.status !== 'paid') {
        if (next.amount_paid < next.total) next.amount_paid = next.total;
        if (!next.paid_date) {
          next.paid_date = nowIso().slice(0, 10);
        }
      }
      state.invoices[index] = next;

      logActivityInternal({
        action: 'invoice_updated',
        details: `Updated invoice ${next.invoice_number} (status: ${next.status})`,
        entity_type: 'invoice',
        entity_id: id,
        hotel_id: next.hotel_id,
      });
      if (updates.status === 'paid' && previous.status !== 'paid') {
        emit({
          type: 'invoice.paid',
          hotelId: next.hotel_id,
          invoice: next,
        });
      }
      persist();
      return clone(next);
    },

    delete: async (id: string): Promise<void> => {
      await delay(100);
      const index = state.invoices.findIndex((i) => i.id === id);
      if (index === -1) throw new Error('Invoice not found');
      const [removed] = state.invoices.splice(index, 1);
      logActivityInternal({
        action: 'invoice_deleted',
        details: `Deleted invoice ${removed.invoice_number}`,
        entity_type: 'invoice',
        entity_id: id,
        hotel_id: removed.hotel_id,
      });
      persist();
    },
  },

  // Expenses
  expenses: {
    getAll: async (hotelId: string): Promise<Expense[]> => {
      await delay(100);
      return clone(state.expenses.filter((e) => e.hotel_id === hotelId));
    },

    create: async (
      expense: Omit<Expense, 'id' | 'hotel_id' | 'created_at'>,
      hotelId: string,
    ): Promise<Expense> => {
      await delay(150);
      const newExpense: Expense = {
        ...expense,
        id: generateId(),
        hotel_id: hotelId,
        created_at: nowIso(),
      };
      state.expenses.push(newExpense);
      persist();
      return clone(newExpense);
    },

    update: async (
      id: string,
      updates: Partial<Omit<Expense, 'id' | 'hotel_id'>>,
    ): Promise<Expense> => {
      await delay(100);
      const index = state.expenses.findIndex((e) => e.id === id);
      if (index === -1) throw new Error('Expense not found');
      state.expenses[index] = { ...state.expenses[index], ...updates };
      persist();
      return clone(state.expenses[index]);
    },

    delete: async (id: string): Promise<void> => {
      await delay(100);
      const index = state.expenses.findIndex((e) => e.id === id);
      if (index === -1) throw new Error('Expense not found');
      state.expenses.splice(index, 1);
      persist();
    },
  },

  // Automations
  automations: {
    getAll: async (hotelId: string): Promise<Automation[]> => {
      await delay(100);
      return clone(state.automations.filter((a) => a.hotel_id === hotelId));
    },

    create: async (
      automation: AutomationCreateInput,
      hotelId: string,
    ): Promise<Automation> => {
      await delay(150);
      const newAutomation: Automation = {
        id: generateId(),
        hotel_id: hotelId,
        name: automation.name,
        description: automation.description ?? '',
        trigger: automation.trigger,
        action: automation.action,
        enabled: automation.enabled ?? true,
        config: automation.config,
        execution_count: 0,
        last_triggered_at: null,
        created_at: nowIso(),
      };
      state.automations.push(newAutomation);
      logActivityInternal({
        action: 'automation_created',
        details: `Created automation "${newAutomation.name}"`,
        entity_type: 'automation',
        entity_id: newAutomation.id,
        hotel_id: hotelId,
      });
      persist();
      return clone(newAutomation);
    },

    update: async (
      id: string,
      updates: Partial<Omit<Automation, 'id' | 'hotel_id'>>,
    ): Promise<Automation> => {
      await delay(100);
      const index = state.automations.findIndex((a) => a.id === id);
      if (index === -1) throw new Error('Automation not found');
      state.automations[index] = {
        ...state.automations[index],
        ...updates,
        updated_at: nowIso(),
      };
      logActivityInternal({
        action: 'automation_updated',
        details: `Updated automation "${state.automations[index].name}"`,
        entity_type: 'automation',
        entity_id: id,
        hotel_id: state.automations[index].hotel_id,
      });
      persist();
      return clone(state.automations[index]);
    },

    delete: async (id: string): Promise<void> => {
      await delay(100);
      const index = state.automations.findIndex((a) => a.id === id);
      if (index === -1) throw new Error('Automation not found');
      const [removed] = state.automations.splice(index, 1);
      logActivityInternal({
        action: 'automation_deleted',
        details: `Deleted automation "${removed.name}"`,
        entity_type: 'automation',
        entity_id: id,
        hotel_id: removed.hotel_id,
      });
      persist();
    },
  },

  // Activity Logs
  activity: {
    getAll: async (hotelId: string): Promise<ActivityLog[]> => {
      await delay(100);
      const logs = clone(
        state.activityLogs.filter((a) => a.hotel_id === hotelId),
      );
      // Newest first.
      logs.sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      return logs;
    },

    create: async (
      log: ActivityCreateInput,
      hotelId: string,
    ): Promise<ActivityLog> => {
      await delay(50);
      const newLog = logActivityInternal({
        ...log,
        hotel_id: hotelId,
      });
      persist();
      return clone(newLog);
    },

    delete: async (id: string): Promise<void> => {
      await delay(100);
      const index = state.activityLogs.findIndex((a) => a.id === id);
      if (index === -1) throw new Error('Activity log not found');
      state.activityLogs.splice(index, 1);
      persist();
    },
  },
};

// Initialize auth from storage on load
mockStore.auth.initializeFromStorage();
