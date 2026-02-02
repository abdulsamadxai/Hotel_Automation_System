// STATEFUL MOCK DATABASE - Pure Frontend Persistence
import { toast } from "@/hooks/use-toast";

// Closure to maintain state across re-renders and hook calls
const createMockDb = () => {
  let data = {
    staff_members: [
      { id: 'u1', name: 'Platform Admin', email: 'admin@platform.com', role: 'super_admin', last_login: new Date().toISOString() },
      { id: 'u2', name: 'Hotel Owner', email: 'owner@hotel.com', role: 'owner', hotel_id: 'hotel-1', last_login: new Date().toISOString() },
      { id: 'u3', name: 'Room Manager', email: 'manager@hotel.com', role: 'manager', hotel_id: 'hotel-1', last_login: new Date().toISOString() },
      { id: 'u4', name: 'Cleaning Staff', email: 'housekeeping@hotel.com', role: 'housekeeping', hotel_id: 'hotel-1', last_login: new Date().toISOString() },
    ],
    hotels: [
      { id: 'hotel-1', name: 'Grand Sky Resort', access_code: 'SKY-2026', settings: {} },
      { id: 'hotel-2', name: 'Ocean View Inn', access_code: 'SEA-2026', settings: {} }
    ],
    rooms: [
      { id: 'r1', number: '101', type: 'standard', floor: 1, status: 'available', capacity: 2, rate: 100, hotel_id: 'hotel-1', created_at: new Date().toISOString() },
      { id: 'r2', number: '102', type: 'deluxe', floor: 1, status: 'occupied', capacity: 2, rate: 200, hotel_id: 'hotel-1', created_at: new Date().toISOString() },
      { id: 'r3', number: '201', type: 'suite', floor: 2, status: 'dirty', capacity: 4, rate: 500, hotel_id: 'hotel-1', created_at: new Date().toISOString() },
    ],
    guests: [
      { id: 'g1', name: 'John Doe', email: 'john@example.com', tags: ['regular'], hotel_id: 'hotel-1', created_at: new Date().toISOString() }
    ],
    bookings: [
      {
        id: 'b1',
        guest_id: 'g1',
        room_id: 'r2',
        hotel_id: 'hotel-1',
        check_in: '2026-02-02',
        check_out: '2026-02-05',
        status: 'checked_in',
        guest_type: 'international',
        total_amount: 500,
        created_at: new Date().toISOString()
      }
    ],
    invoices: [],
    housekeeping_tasks: [],
    activity_log: [],
    notifications: []
  };

  return {
    get: (table: string) => (data as any)[table] || [],
    insert: (table: string, records: any[]) => {
      const tableData = (data as any)[table] || [];
      const newRecords = records.map(r => {
        const record = { id: Math.random().toString(36).substr(2, 9), created_at: new Date().toISOString(), ...r };
        if (table === 'bookings' && record.guest_type === 'international') {
          const guest = data.guests.find(g => g.id === record.guest_id);
          if (guest && !guest.tags.includes('vip')) {
            guest.tags = ['vip', ...guest.tags.filter(t => t !== 'regular')];
            toast({ title: "Guest promoted to VIP", description: `${guest.name} is an international guest.` });
          }
        }
        return record;
      });
      (data as any)[table] = [...newRecords, ...tableData];
      return newRecords;
    },
    update: (table: string, id: string, updates: any) => {
      const tableData = (data as any)[table] || [];
      (data as any)[table] = tableData.map((r: any) => r.id === id ? { ...r, ...updates, updated_at: new Date().toISOString() } : r);
      const updated = (data as any)[table].find((r: any) => r.id === id);
      if (table === 'bookings' && updated?.guest_type === 'international') {
        const guest = data.guests.find(g => g.id === updated.guest_id);
        if (guest && !guest.tags.includes('vip')) {
          guest.tags = ['vip', ...guest.tags.filter(t => t !== 'regular')];
        }
      }
      return updated;
    },
    delete: (table: string, id: string) => {
      const tableData = (data as any)[table] || [];
      (data as any)[table] = tableData.filter((r: any) => r.id !== id);
    }
  };
};

const db = createMockDb();

class MockQueryBuilder {
  private table: string;
  private filters: any[] = [];
  private limitCount: number | null = null;
  private isSingle: boolean = false;
  private operation: 'select' | 'insert' | 'update' | 'delete' = 'select';
  private payload: any = null;
  private selectColumns: string[] = [];

  constructor(table: string) { this.table = table; }

  select(query?: string) {
    this.operation = 'select';
    if (query) this.selectColumns = query.split(',').map(c => c.trim());
    return this;
  }
  eq(col: string, val: any) { this.filters.push({ col, val, op: 'eq' }); return this; }
  or(val: string) { this.filters.push({ val, op: 'or' }); return this; }
  order(col: string, opt?: any) { return this; }
  limit(n: number) { this.limitCount = n; return this; }
  single() { this.isSingle = true; return this; }
  maybeSingle() { this.isSingle = true; return this; }

  insert(records: any) { this.operation = 'insert'; this.payload = records; return this; }
  update(updates: any) { this.operation = 'update'; this.payload = updates; return this; }
  delete() { this.operation = 'delete'; return this; }

  async then(resolve: any, reject?: any) {
    try {
      let result: any = null;
      let error: any = null;

      switch (this.operation) {
        case 'insert':
          const inserted = db.insert(this.table, Array.isArray(this.payload) ? this.payload : [this.payload]);
          result = this.isSingle ? inserted[0] : inserted;
          break;
        case 'update':
          const idFilter = this.filters.find(f => f.col === 'id');
          if (idFilter) {
            const updated = db.update(this.table, idFilter.val, this.payload);
            result = this.isSingle ? updated : [updated];
          } else {
            error = { message: "Mock update requires ID filter" };
          }
          break;
        case 'delete':
          const delFilter = this.filters.find(f => f.col === 'id');
          if (delFilter) db.delete(this.table, delFilter.val);
          break;
        case 'select':
        default:
          let data = db.get(this.table);
          this.filters.forEach(f => {
            if (f.op === 'eq') data = data.filter((r: any) => r[f.col] == f.val);
            if (f.op === 'or') {
              const parts = f.val.split(',');
              if (parts.length === 2 && parts[0].includes('phone.eq')) {
                const phoneVal = parts[0].split('.')[2];
                const emailVal = parts[1].split('.')[2];
                data = data.filter((r: any) => r.phone === phoneVal || r.email === emailVal);
              }
            }
          });

          if (this.selectColumns.some(c => c.includes('guest') || c.includes('guests'))) {
            data = data.map((r: any) => ({ ...r, guest: db.get('guests').find((g: any) => g.id === r.guest_id) }));
          }
          if (this.selectColumns.some(c => c.includes('room') || c.includes('rooms'))) {
            data = data.map((r: any) => ({ ...r, room: db.get('rooms').find((rm: any) => rm.id === r.room_id) }));
          }

          if (this.limitCount) data = data.slice(0, this.limitCount);
          result = this.isSingle ? data[0] : data;
          break;
      }

      await new Promise(r => setTimeout(r, 100));
      const res = { data: result, error };
      if (resolve) resolve(res);
      return res;
    } catch (e: any) {
      if (reject) reject({ data: null, error: e });
      else if (resolve) resolve({ data: null, error: e });
    }
  }
}

export const supabase = {
  from: (table: string) => new MockQueryBuilder(table),
  auth: {
    getSession: async () => ({ data: { session: { user: db.get('staff_members')[0] } }, error: null }),
    onAuthStateChange: (cb: any) => {
      cb('SIGNED_IN', { user: db.get('staff_members')[0] });
      return { data: { subscription: { unsubscribe: () => { } } } };
    },
    signInWithPassword: async () => ({ data: { user: db.get('staff_members')[0] }, error: null }),
    signOut: async () => ({ error: null }),
    signUp: async () => ({ data: { user: db.get('staff_members')[0] }, error: null }),
  },
  channel: () => ({ on: () => ({ subscribe: () => { } }) }),
  removeChannel: () => { },
  rpc: async (name: string) => {
    if (name === 'generate_invoice_number') return { data: `INV-${Date.now()}`, error: null };
    return { data: 'MOCK-VALUE', error: null };
  }
};