// In-memory mock data store for frontend-only operation
import { mockData } from './mockData';

// Type definitions
export type UserRole = 'super_admin' | 'owner' | 'manager' | 'housekeeping' | 'staff';

// Deep clone helper
const clone = <T>(obj: T): T => JSON.parse(JSON.stringify(obj));

// Simulated delay for async operations
const delay = (ms: number = 100) => new Promise(resolve => setTimeout(resolve, ms));

// Generate unique ID
const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Store state
let store = {
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
    currentUser: null as any,
};

// Reset store to initial state
export const resetStore = () => {
    store = {
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
        currentUser: store.currentUser,
    };
};

// Generic CRUD operations
export const mockStore = {
    // Auth operations
    auth: {
        getCurrentUser: async () => {
            await delay(50);
            return clone(store.currentUser);
        },

        setCurrentUser: (user: any) => {
            store.currentUser = user;
            if (user) {
                localStorage.setItem('mock_user', JSON.stringify(user));
            } else {
                localStorage.removeItem('mock_user');
            }
        },

        signIn: async (email: string, password: string) => {
            await delay(200);

            // Find user by email
            const user = mockData.testUsers.find(u => u.email === email);

            if (!user || user.password !== password) {
                throw new Error('Invalid email or password');
            }

            const session = {
                user: {
                    id: user.id,
                    email: user.email,
                    user_metadata: {
                        full_name: user.full_name,
                        role: user.role,
                    },
                },
            };

            store.currentUser = session.user;
            localStorage.setItem('mock_user', JSON.stringify(session.user));

            return { data: session, error: null };
        },

        signUp: async (email: string, password: string, fullName?: string) => {
            await delay(200);

            // Check if user already exists
            if (mockData.testUsers.find(u => u.email === email)) {
                throw new Error('User already exists');
            }

            const newUser = {
                id: generateId(),
                email,
                password,
                full_name: fullName || email.split('@')[0],
                role: 'owner' as UserRole,
            };

            mockData.testUsers.push(newUser);

            return { data: { user: newUser }, error: null };
        },

        signOut: async () => {
            await delay(100);
            store.currentUser = null;
            localStorage.removeItem('mock_user');
            localStorage.removeItem('super-admin-selected-hotel');
        },

        initializeFromStorage: () => {
            const stored = localStorage.getItem('mock_user');
            if (stored) {
                try {
                    store.currentUser = JSON.parse(stored);
                } catch (e) {
                    localStorage.removeItem('mock_user');
                }
            }
        },
    },

    // Guests
    guests: {
        getAll: async (hotelId: string) => {
            await delay(100);
            return clone(store.guests.filter(g => g.hotel_id === hotelId));
        },

        create: async (guest: any, hotelId: string) => {
            await delay(150);
            const newGuest = {
                ...guest,
                id: generateId(),
                hotel_id: hotelId,
                created_at: new Date().toISOString(),
                total_stays: 0,
                total_spent: 0,
                last_stay_at: null,
            };
            store.guests.push(newGuest);
            return clone(newGuest);
        },

        update: async (id: string, updates: any) => {
            await delay(100);
            const index = store.guests.findIndex(g => g.id === id);
            if (index === -1) throw new Error('Guest not found');
            store.guests[index] = { ...store.guests[index], ...updates };
            return clone(store.guests[index]);
        },

        delete: async (id: string) => {
            await delay(100);
            const index = store.guests.findIndex(g => g.id === id);
            if (index === -1) throw new Error('Guest not found');
            store.guests.splice(index, 1);
        },
    },

    // Bookings
    bookings: {
        getAll: async (hotelId: string) => {
            await delay(100);
            const bookings = store.bookings.filter(b => b.hotel_id === hotelId);

            // Join with guests and rooms
            return clone(bookings.map(booking => {
                const guest = store.guests.find(g => g.id === booking.guest_id);
                const room = store.rooms.find(r => r.id === booking.room_id);

                return {
                    ...booking,
                    guest: guest ? {
                        id: guest.id,
                        name: guest.name,
                        email: guest.email,
                        tags: guest.tags,
                    } : null,
                    room: room ? {
                        id: room.id,
                        number: room.number,
                        type: room.type,
                    } : null,
                };
            }));
        },

        create: async (booking: any, hotelId: string) => {
            await delay(150);
            const bookingNumber = `BK-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

            const newBooking = {
                ...booking,
                id: generateId(),
                booking_number: bookingNumber,
                hotel_id: hotelId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };

            store.bookings.push(newBooking);

            // Update room status if applicable
            if (booking.status === 'checked_in' && booking.room_id) {
                const room = store.rooms.find(r => r.id === booking.room_id);
                if (room) room.status = 'occupied';
            }

            return clone(newBooking);
        },

        update: async (id: string, updates: any) => {
            await delay(100);
            const index = store.bookings.findIndex(b => b.id === id);
            if (index === -1) throw new Error('Booking not found');

            const booking = store.bookings[index];
            const oldStatus = booking.status;

            store.bookings[index] = {
                ...booking,
                ...updates,
                updated_at: new Date().toISOString(),
            };

            // Handle status changes
            if (updates.status && updates.status !== oldStatus) {
                if (updates.status === 'checked_out' && booking.room_id) {
                    // Update room to dirty
                    const room = store.rooms.find(r => r.id === booking.room_id);
                    if (room) room.status = 'dirty';

                    // Create housekeeping task
                    store.housekeepingTasks.push({
                        id: generateId(),
                        hotel_id: booking.hotel_id,
                        room_id: booking.room_id,
                        status: 'pending',
                        type: 'checkout_clean',
                        priority: 'medium',
                        description: `Checkout cleaning for room`,
                        assigned_to: null,
                        created_at: new Date().toISOString(),
                        updated_at: new Date().toISOString(),
                    });
                }
            }

            return clone(store.bookings[index]);
        },

        delete: async (id: string) => {
            await delay(100);
            const index = store.bookings.findIndex(b => b.id === id);
            if (index === -1) throw new Error('Booking not found');
            store.bookings.splice(index, 1);
        },
    },

    // Rooms
    rooms: {
        getAll: async (hotelId: string) => {
            await delay(100);
            return clone(store.rooms.filter(r => r.hotel_id === hotelId));
        },

        create: async (room: any, hotelId: string) => {
            await delay(150);
            const newRoom = {
                ...room,
                id: generateId(),
                hotel_id: hotelId,
                created_at: new Date().toISOString(),
            };
            store.rooms.push(newRoom);
            return clone(newRoom);
        },

        update: async (id: string, updates: any) => {
            await delay(100);
            const index = store.rooms.findIndex(r => r.id === id);
            if (index === -1) throw new Error('Room not found');
            store.rooms[index] = { ...store.rooms[index], ...updates };
            return clone(store.rooms[index]);
        },

        delete: async (id: string) => {
            await delay(100);
            const index = store.rooms.findIndex(r => r.id === id);
            if (index === -1) throw new Error('Room not found');
            store.rooms.splice(index, 1);
        },
    },

    // Housekeeping Tasks
    housekeeping: {
        getAll: async (hotelId: string) => {
            await delay(100);
            const tasks = store.housekeepingTasks.filter(t => t.hotel_id === hotelId);

            // Join with rooms and staff
            return clone(tasks.map(task => {
                const room = store.rooms.find(r => r.id === task.room_id);
                const assignee = task.assigned_to ? store.staff.find(s => s.id === task.assigned_to) : null;

                return {
                    ...task,
                    room: room ? {
                        id: room.id,
                        number: room.number,
                        type: room.type,
                    } : null,
                    assignee: assignee ? {
                        id: assignee.id,
                        full_name: assignee.full_name,
                    } : null,
                };
            }));
        },

        create: async (task: any, hotelId: string) => {
            await delay(150);
            const newTask = {
                ...task,
                id: generateId(),
                hotel_id: hotelId,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
            };
            store.housekeepingTasks.push(newTask);
            return clone(newTask);
        },

        update: async (id: string, updates: any) => {
            await delay(100);
            const index = store.housekeepingTasks.findIndex(t => t.id === id);
            if (index === -1) throw new Error('Task not found');

            const task = store.housekeepingTasks[index];
            store.housekeepingTasks[index] = {
                ...task,
                ...updates,
                updated_at: new Date().toISOString(),
            };

            // If task is completed, update room status
            if (updates.status === 'completed' && task.room_id) {
                const room = store.rooms.find(r => r.id === task.room_id);
                if (room && room.status === 'dirty') {
                    room.status = 'available';
                }
            }

            return clone(store.housekeepingTasks[index]);
        },

        delete: async (id: string) => {
            await delay(100);
            const index = store.housekeepingTasks.findIndex(t => t.id === id);
            if (index === -1) throw new Error('Task not found');
            store.housekeepingTasks.splice(index, 1);
        },
    },

    // Staff
    staff: {
        getAll: async (hotelId: string) => {
            await delay(100);
            let staff = hotelId === 'global' ? store.staff : store.staff.filter(s => s.hotel_id === hotelId);

            // Join with hotel info for global view
            return clone(staff.map(s => {
                const hotel = store.hotels.find(h => h.id === s.hotel_id);
                return {
                    ...s,
                    saas_role: s.role, // Alias for compatibility with some components
                    hotels: hotel ? { name: hotel.name } : null
                };
            }));
        },

        create: async (staff: any, hotelId: string) => {
            await delay(150);
            const staffId = generateId();
            const userId = staff.user_id || generateId();

            const newStaff = {
                ...staff,
                id: staffId,
                user_id: userId,
                hotel_id: hotelId,
                created_at: new Date().toISOString(),
            };

            store.staff.push(newStaff);

            // Also create a test user so they can log in
            if (staff.email) {
                const existingUser = mockData.testUsers.find(u => u.email === staff.email);
                if (!existingUser) {
                    mockData.testUsers.push({
                        id: userId,
                        email: staff.email,
                        password: staff.password || 'password123',
                        full_name: staff.full_name || staff.name || 'New Staff',
                        role: staff.role as any,
                    });
                }
            }

            return clone(newStaff);
        },

        update: async (id: string, updates: any) => {
            await delay(100);
            const index = store.staff.findIndex(s => s.id === id);
            if (index === -1) throw new Error('Staff not found');
            store.staff[index] = { ...store.staff[index], ...updates };
            return clone(store.staff[index]);
        },

        delete: async (id: string) => {
            await delay(100);
            const index = store.staff.findIndex(s => s.id === id);
            if (index === -1) throw new Error('Staff not found');
            store.staff.splice(index, 1);
        },

        getByUserId: async (userId: string) => {
            await delay(50);
            const staff = store.staff.find(s => s.user_id === userId);
            return staff ? clone(staff) : null;
        },
    },

    // Hotels
    hotels: {
        getAll: async () => {
            await delay(100);
            return clone(store.hotels);
        },

        getById: async (id: string) => {
            await delay(50);
            return clone(store.hotels.find(h => h.id === id));
        },

        update: async (id: string, updates: any) => {
            await delay(100);
            const index = store.hotels.findIndex(h => h.id === id);
            if (index === -1) throw new Error('Hotel not found');
            store.hotels[index] = { ...store.hotels[index], ...updates };
            return clone(store.hotels[index]);
        }
    },

    // Messages
    messages: {
        getAll: async (hotelId: string) => {
            await delay(100);
            return clone(store.messages.filter(m => m.hotel_id === hotelId));
        },

        create: async (message: any, hotelId: string) => {
            await delay(150);
            const newMessage = {
                ...message,
                id: generateId(),
                hotel_id: hotelId,
                created_at: new Date().toISOString(),
            };
            store.messages.push(newMessage);
            return clone(newMessage);
        },

        update: async (id: string, updates: any) => {
            await delay(100);
            const index = store.messages.findIndex(m => m.id === id);
            if (index === -1) throw new Error('Message not found');
            store.messages[index] = { ...store.messages[index], ...updates };
            return clone(store.messages[index]);
        },

        delete: async (id: string) => {
            await delay(100);
            const index = store.messages.findIndex(m => m.id === id);
            if (index === -1) throw new Error('Message not found');
            store.messages.splice(index, 1);
        },
    },

    // Notifications
    notifications: {
        getAll: async (hotelId: string) => {
            await delay(100);
            return clone(store.notifications.filter(n => n.hotel_id === hotelId));
        },

        create: async (notification: any, hotelId: string) => {
            await delay(150);
            const newNotification = {
                ...notification,
                id: generateId(),
                hotel_id: hotelId,
                created_at: new Date().toISOString(),
            };
            store.notifications.push(newNotification);
            return clone(newNotification);
        },

        update: async (id: string, updates: any) => {
            await delay(100);
            const index = store.notifications.findIndex(n => n.id === id);
            if (index === -1) throw new Error('Notification not found');
            store.notifications[index] = { ...store.notifications[index], ...updates };
            return clone(store.notifications[index]);
        },

        delete: async (id: string) => {
            await delay(100);
            const index = store.notifications.findIndex(n => n.id === id);
            if (index === -1) throw new Error('Notification not found');
            store.notifications.splice(index, 1);
        },
    },

    // Invoices
    invoices: {
        getAll: async (hotelId: string) => {
            await delay(100);
            const invoices = store.invoices.filter(i => i.hotel_id === hotelId);

            // Join with bookings and guests
            return clone(invoices.map(invoice => {
                const booking = store.bookings.find(b => b.id === invoice.booking_id);
                const guest = store.guests.find(g => g.id === invoice.guest_id);

                return {
                    ...invoice,
                    booking: booking ? {
                        id: booking.id,
                        room: booking.room_id ? {
                            number: store.rooms.find(r => r.id === booking.room_id)?.number || ''
                        } : null
                    } : null,
                    guest: guest ? {
                        id: guest.id,
                        name: guest.name,
                        email: guest.email
                    } : null,
                };
            }));
        },

        create: async (invoice: any, hotelId: string) => {
            await delay(150);
            const invoiceNumber = `INV-${String(Math.floor(Math.random() * 10000)).padStart(4, '0')}`;

            const newInvoice = {
                ...invoice,
                id: generateId(),
                invoice_number: invoiceNumber,
                hotel_id: hotelId,
                created_at: new Date().toISOString(),
            };
            store.invoices.push(newInvoice);
            return clone(newInvoice);
        },

        update: async (id: string, updates: any) => {
            await delay(100);
            const index = store.invoices.findIndex(i => i.id === id);
            if (index === -1) throw new Error('Invoice not found');
            store.invoices[index] = { ...store.invoices[index], ...updates };
            return clone(store.invoices[index]);
        },

        delete: async (id: string) => {
            await delay(100);
            const index = store.invoices.findIndex(i => i.id === id);
            if (index === -1) throw new Error('Invoice not found');
            store.invoices.splice(index, 1);
        },
    },

    // Expenses
    expenses: {
        getAll: async (hotelId: string) => {
            await delay(100);
            return clone(store.expenses.filter(e => e.hotel_id === hotelId));
        },

        create: async (expense: any, hotelId: string) => {
            await delay(150);
            const newExpense = {
                ...expense,
                id: generateId(),
                hotel_id: hotelId,
                created_at: new Date().toISOString(),
            };
            store.expenses.push(newExpense);
            return clone(newExpense);
        },

        update: async (id: string, updates: any) => {
            await delay(100);
            const index = store.expenses.findIndex(e => e.id === id);
            if (index === -1) throw new Error('Expense not found');
            store.expenses[index] = { ...store.expenses[index], ...updates };
            return clone(store.expenses[index]);
        },

        delete: async (id: string) => {
            await delay(100);
            const index = store.expenses.findIndex(e => e.id === id);
            if (index === -1) throw new Error('Expense not found');
            store.expenses.splice(index, 1);
        },
    },

    // Automations
    automations: {
        getAll: async (hotelId: string) => {
            await delay(100);
            return clone(store.automations.filter(a => a.hotel_id === hotelId));
        },

        create: async (automation: any, hotelId: string) => {
            await delay(150);
            const newAutomation = {
                ...automation,
                id: generateId(),
                hotel_id: hotelId,
                created_at: new Date().toISOString(),
            };
            store.automations.push(newAutomation);
            return clone(newAutomation);
        },

        update: async (id: string, updates: any) => {
            await delay(100);
            const index = store.automations.findIndex(a => a.id === id);
            if (index === -1) throw new Error('Automation not found');
            store.automations[index] = { ...store.automations[index], ...updates };
            return clone(store.automations[index]);
        },

        delete: async (id: string) => {
            await delay(100);
            const index = store.automations.findIndex(a => a.id === id);
            if (index === -1) throw new Error('Automation not found');
            store.automations.splice(index, 1);
        },
    },

    // Activity Logs
    activity: {
        getAll: async (hotelId: string) => {
            await delay(100);
            return clone(store.activityLogs.filter(a => a.hotel_id === hotelId));
        },

        create: async (log: any, hotelId: string) => {
            await delay(50);
            const newLog = {
                ...log,
                id: generateId(),
                hotel_id: hotelId,
                created_at: new Date().toISOString(),
            };
            store.activityLogs.push(newLog);
            return clone(newLog);
        },
    },
};

// Initialize auth from storage on load
mockStore.auth.initializeFromStorage();
