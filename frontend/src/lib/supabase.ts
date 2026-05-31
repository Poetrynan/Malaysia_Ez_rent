import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Auto-detect: use real Supabase when credentials are configured
const isRealSupabase =
  !!SUPABASE_URL &&
  SUPABASE_URL !== '' &&
  !SUPABASE_URL.includes('your-supabase') &&
  !!SUPABASE_ANON_KEY &&
  SUPABASE_ANON_KEY !== '' &&
  !SUPABASE_ANON_KEY.includes('your-');

// Mock database initial structures
const DEFAULT_COMMUNITIES = [
  { id: 'c1-uuid', name: 'Sunway Geo Residences', address: 'Jalan Lagoon Selatan, Bandar Sunway, 47500 Subang Jaya, Selangor', lat: 3.063410, lng: 101.609770 },
  { id: 'c2-uuid', name: 'Nadayu 28 Residences', address: 'Jalan PJS 11/7, Bandar Sunway, 47500 Subang Jaya, Selangor', lat: 3.069800, lng: 101.604000 },
  { id: 'c3-uuid', name: 'D\'Latour Luxury Suites', address: 'Jalan Taylors, Bandar Sunway, 47500 Subang Jaya, Selangor', lat: 3.059300, lng: 101.616000 }
];

const DEFAULT_UNITS = [
  { id: 'u1-uuid', community_id: 'c1-uuid', agent_id: 'admin-999', room_type: 'Studio', rent: 2500.00, status: 'available', description: 'Cozy Studio apartment right opposite Sunway Medical Centre. Walkable to Monash University via the canopy walk.', bedrooms: 1, bathrooms: 1 },
  { id: 'u2-uuid', community_id: 'c2-uuid', agent_id: 'admin-999', room_type: 'Master Room', rent: 1600.00, status: 'available', description: 'Spacious Master Room with private bathroom. Sharing with 3 other students. 3 mins walk to Sunway University.', bedrooms: 4, bathrooms: 3 },
  { id: 'u3-uuid', community_id: 'c3-uuid', agent_id: 'admin-999', room_type: 'Medium Room', rent: 1200.00, status: 'available', description: 'Beautiful loft-style medium room. Female only unit. 5 mins walk to Taylor\'s University Lakeside Campus.', bedrooms: 3, bathrooms: 2 }
];

const DEFAULT_LEASES = [
  {
    id: 'l1-uuid',
    unit_id: 'u1-uuid',
    tenant_id: 'tenant-123',
    start_date: '2026-02-01',
    end_date: '2027-01-31',
    monthly_rent: 2500.00,
    deposit_amount: 5000.00,
    status: 'active',
    admin_notes: 'Initial test lease'
  }
];

const DEFAULT_PAYMENTS = [
  { id: 'p1-uuid', lease_id: 'l1-uuid', billing_month: '2026-02-01', paid: true, paid_date: '2026-02-01', admin_notes: 'Paid on time via DuitNow' },
  { id: 'p2-uuid', lease_id: 'l1-uuid', billing_month: '2026-03-01', paid: true, paid_date: '2026-03-02', admin_notes: 'Paid on time via DuitNow' },
  { id: 'p3-uuid', lease_id: 'l1-uuid', billing_month: '2026-04-01', paid: true, paid_date: '2026-03-29', admin_notes: 'Prepaid early' },
  { id: 'p4-uuid', lease_id: 'l1-uuid', billing_month: '2026-05-01', paid: true, paid_date: '2026-05-01', admin_notes: 'Paid on time via bank transfer' },
  { id: 'p5-uuid', lease_id: 'l1-uuid', billing_month: '2026-06-01', paid: false, paid_date: null, admin_notes: '' },
  { id: 'p6-uuid', lease_id: 'l1-uuid', billing_month: '2026-07-01', paid: false, paid_date: null, admin_notes: '' },
  { id: 'p7-uuid', lease_id: 'l1-uuid', billing_month: '2026-08-01', paid: false, paid_date: null, admin_notes: '' },
  { id: 'p8-uuid', lease_id: 'l1-uuid', billing_month: '2026-09-01', paid: false, paid_date: null, admin_notes: '' },
  { id: 'p9-uuid', lease_id: 'l1-uuid', billing_month: '2026-10-01', paid: false, paid_date: null, admin_notes: '' },
  { id: 'p10-uuid', lease_id: 'l1-uuid', billing_month: '2026-11-01', paid: false, paid_date: null, admin_notes: '' },
  { id: 'p11-uuid', lease_id: 'l1-uuid', billing_month: '2026-12-01', paid: false, paid_date: null, admin_notes: '' },
  { id: 'p12-uuid', lease_id: 'l1-uuid', billing_month: '2027-01-01', paid: false, paid_date: null, admin_notes: '' }
];

const DEFAULT_USERS = [
  { id: 'tenant-123', phone: '+8618812345678', full_name: 'Alex Lim', avatar_url: 'https://api.dicebear.com/7.x/bottts/svg?seed=Alex', created_at: new Date().toISOString() }
];

const DEFAULT_ADMINS = [
  {
    id: 'admin-999',
    email: 'admin@ezrent.my',
    role: 'super_admin',
    display_name: 'Nick Chan',
    phone: '+6012-345 6789',
    whatsapp: '60123456789',
    wechat_id: 'nick_chan_ren',
    avatar_url: 'https://api.dicebear.com/7.x/adventurer/svg?seed=Nick',
    job_title: 'Senior Rental Manager',
    agency_name: 'VIVAHOMES REALTY SDN. BHD',
    agency_license: 'E (1) 1670',
    agency_address: 'No. 25-3, Jalan PJU 5/20, The Strand, Kota Damansara, 47810 Petaling Jaya, Selangor',
    bio: 'Specialist in student accommodations near Sunway, Monash and Taylor universities. With over 5 years of experience in the rental market, I help students find their perfect home away from home with premium, hassle-free services.',
    experience_years: 5,
    experience_months: 6,
    area_expertise: ['Bandar Sunway', 'Subang Jaya', 'Petaling Jaya'],
    property_types: ['Condo', 'Serviced Residence', 'Apartment', 'Room']
  }
];

// Initialize mock databases in localStorage if not exists
const getLocalData = (key: string, defaults: any) => {
  if (typeof window === 'undefined') return defaults;
  const stored = localStorage.getItem(key);
  if (!stored) {
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }
  try {
    const parsed = JSON.parse(stored);
    // Auto-upgrade check: if it's ez_admins and is missing 'job_title', reset to include Nick Chan details
    if (key === 'ez_admins' && Array.isArray(parsed) && parsed.length > 0 && !parsed[0].job_title) {
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }
    // Auto-upgrade for ez_units to have agent_id
    if (key === 'ez_units' && Array.isArray(parsed) && parsed.length > 0 && !parsed[0].agent_id) {
      localStorage.setItem(key, JSON.stringify(defaults));
      return defaults;
    }
    return parsed;
  } catch (e) {
    localStorage.setItem(key, JSON.stringify(defaults));
    return defaults;
  }
};

const setLocalData = (key: string, data: any) => {
  if (typeof window !== 'undefined') {
    localStorage.setItem(key, JSON.stringify(data));
  }
};

const getStorageKey = (tableName: string) => {
  if (tableName === 'tenant_interests') return 'ez_interests';
  if (tableName === 'payment_records') return 'ez_payments';
  if (tableName === 'admin_users') return 'ez_admins';
  return 'ez_' + tableName;
};

// Builder Proxy Class to mock Supabase Query Builder
class MockQueryBuilder {
  tableName: string;
  filters: any[] = [];
  sortField: string = '';
  sortAsc: boolean = true;
  isDelete: boolean = false;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  select(fields: string = '*') {
    return this;
  }

  eq(field: string, value: any) {
    this.filters.push({ type: 'eq', field, value });
    return this;
  }

  order(field: string, { ascending = true } = {}) {
    this.sortField = field;
    this.sortAsc = ascending;
    return this;
  }

  delete() {
    this.isDelete = true;
    return this;
  }

  async execute() {
    if (this.isDelete) {
      const storageKey = getStorageKey(this.tableName);
      let rawList = [];
      if (this.tableName === 'communities') rawList = getLocalData(storageKey, DEFAULT_COMMUNITIES);
      else if (this.tableName === 'units') rawList = getLocalData(storageKey, DEFAULT_UNITS);
      else if (this.tableName === 'leases') rawList = getLocalData(storageKey, DEFAULT_LEASES);
      else if (this.tableName === 'payment_records') rawList = getLocalData(storageKey, DEFAULT_PAYMENTS);
      else if (this.tableName === 'users') rawList = getLocalData(storageKey, DEFAULT_USERS);
      else if (this.tableName === 'admin_users') rawList = getLocalData(storageKey, DEFAULT_ADMINS);
      else if (this.tableName === 'tenant_interests') rawList = getLocalData(storageKey, []);
      else rawList = getLocalData(storageKey, []);

      const remainingList = rawList.filter((item: any) => {
        let matchesAll = true;
        for (const f of this.filters) {
          if (f.type === 'eq' && item[f.field] !== f.value) {
            matchesAll = false;
            break;
          }
        }
        return !matchesAll;
      });

      setLocalData(storageKey, remainingList);
      return { data: [], error: null };
    }

    let data = [];
    const communities = getLocalData(getStorageKey('communities'), DEFAULT_COMMUNITIES);
    const units = getLocalData(getStorageKey('units'), DEFAULT_UNITS);
    const leases = getLocalData(getStorageKey('leases'), DEFAULT_LEASES);
    const payments = getLocalData(getStorageKey('payment_records'), DEFAULT_PAYMENTS);
    const users = getLocalData(getStorageKey('users'), DEFAULT_USERS);
    const admins = getLocalData(getStorageKey('admin_users'), DEFAULT_ADMINS);
    const interests = getLocalData(getStorageKey('tenant_interests'), []);

    if (this.tableName === 'communities') data = [...communities];
    else if (this.tableName === 'units') {
      // populate community object
      data = units.map((u: any) => ({
        ...u,
        communities: communities.find((c: any) => c.id === u.community_id) || null
      }));
    }
    else if (this.tableName === 'leases') {
      data = leases.map((l: any) => ({
        ...l,
        units: units.find((u: any) => u.id === l.unit_id) || null,
        users: users.find((us: any) => us.id === l.tenant_id) || null
      }));
    }
    else if (this.tableName === 'payment_records') data = [...payments];
    else if (this.tableName === 'users') data = [...users];
    else if (this.tableName === 'admin_users') data = [...admins];
    else if (this.tableName === 'tenant_interests') data = [...interests];
    else data = getLocalData(getStorageKey(this.tableName), []);

    // Apply filters
    for (const f of this.filters) {
      if (f.type === 'eq') {
        data = data.filter((item: any) => item[f.field] === f.value);
      }
    }

    // Apply sorting
    if (this.sortField) {
      data.sort((a: any, b: any) => {
        if (a[this.sortField] < b[this.sortField]) return this.sortAsc ? -1 : 1;
        if (a[this.sortField] > b[this.sortField]) return this.sortAsc ? 1 : -1;
        return 0;
      });
    }

    return { data, error: null };
  }

  // Promise-like then to support await directly on builder chain
  then(onfulfilled?: (value: any) => any, onrejected?: (reason: any) => any) {
    return this.execute().then(onfulfilled, onrejected);
  }

  async insert(payload: any) {
    const list = getLocalData(getStorageKey(this.tableName), 
      this.tableName === 'communities' ? DEFAULT_COMMUNITIES :
      this.tableName === 'units' ? DEFAULT_UNITS :
      this.tableName === 'leases' ? DEFAULT_LEASES :
      this.tableName === 'payment_records' ? DEFAULT_PAYMENTS :
      this.tableName === 'users' ? DEFAULT_USERS : []
    );

    const items = Array.isArray(payload) ? payload : [payload];
    const insertedItems = items.map(item => {
      const newItem = {
        id: item.id || `mock-${Math.random().toString(36).substring(2, 11)}`,
        created_at: new Date().toISOString(),
        ...item
      };
      list.push(newItem);
      return newItem;
    });

    setLocalData(getStorageKey(this.tableName), list);

    // Side effect for leases insert: auto-generate 12 months billing records
    if (this.tableName === 'leases') {
      const lease = insertedItems[0];
      const start = new Date(lease.start_date);
      const end = new Date(lease.end_date);
      
      const billingPayments = [];
      let currentMonth = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      
      while (currentMonth <= endMonth) {
        const yr = currentMonth.getFullYear();
        const mo = String(currentMonth.getMonth() + 1).padStart(2, '0');
        billingPayments.push({
          id: `p-mock-${Math.random().toString(36).substring(2, 11)}`,
          lease_id: lease.id,
          billing_month: `${yr}-${mo}-01`,
          paid: false,
          paid_date: null,
          admin_notes: ''
        });
        currentMonth.setMonth(currentMonth.getMonth() + 1);
      }
      
      const allPayments = getLocalData('ez_payments', DEFAULT_PAYMENTS);
      setLocalData('ez_payments', [...allPayments, ...billingPayments]);

      // Set corresponding unit to rented
      const allUnits = getLocalData('ez_units', DEFAULT_UNITS);
      const uIndex = allUnits.findIndex((u: any) => u.id === lease.unit_id);
      if (uIndex !== -1) {
        allUnits[uIndex].status = 'rented';
        setLocalData('ez_units', allUnits);
      }
    }

    return { data: insertedItems, error: null };
  }

  async update(payload: any) {
    const list = getLocalData(getStorageKey(this.tableName), []);

    const matchedItems: any[] = [];
    for (const item of list) {
      let matches = true;
      for (const filter of this.filters) {
        if (filter.type === 'eq' && item[filter.field] !== filter.value) {
          matches = false;
          break;
        }
      }
      if (matches) {
        const oldRecord = { ...item };
        Object.assign(item, payload);
        matchedItems.push({ new: { ...item }, old: oldRecord });
      }
    }

    setLocalData(getStorageKey(this.tableName), list);

    // Side effect: if updating payment to paid = true, record paid_date
    if (this.tableName === 'payment_records' && payload.paid === true) {
      for (const item of list) {
        let matches = true;
        for (const filter of this.filters) {
          if (filter.type === 'eq' && item[filter.field] !== filter.value) {
            matches = false;
            break;
          }
        }
        if (matches && !item.paid_date) {
          item.paid_date = new Date().toISOString().split('T')[0];
        }
      }
      setLocalData('ez_payments', list);
    }

    // Broadcast Realtime events for payment_records updates
    if (this.tableName === 'payment_records') {
      for (const { new: newRec, old: oldRec } of matchedItems) {
        broadcastRealtime('UPDATE', 'payment_records', newRec, oldRec);
      }
    }

    return { data: list, error: null };
  }
}

// Mock Client Interface matching @supabase/supabase-js
// Cross-tab communication channel for Mock Realtime
const _broadcast = typeof window !== 'undefined' && 'BroadcastChannel' in window
  ? new BroadcastChannel('ez_realtime')
  : null;

// Mock Realtime Channel — simulates supabase.channel().on('postgres_changes', ...).subscribe()
class MockChannel {
  private name: string;
  private listeners: Array<{
    event: string;
    filter: { table?: string; filter?: string; schema?: string };
    callback: (payload: any) => void;
  }> = [];

  constructor(name: string) {
    this.name = name;
  }

  on(
    event: string,
    filter: { table?: string; filter?: string; schema?: string; [key: string]: any },
    callback: (payload: any) => void
  ) {
    this.listeners.push({ event, filter, callback });
    return this;
  }

  subscribe() {
    const handler = (ev: MessageEvent) => {
      const data = ev.data;
      if (!data || data.channel !== this.name) return;
      for (const listener of this.listeners) {
        if (
          listener.filter.table &&
          listener.filter.table === data.table &&
          (!listener.filter.filter || matchFilter(listener.filter.filter, data.record))
        ) {
          listener.callback({
            eventType: data.eventType,
            new: data.record,
            old: data.oldRecord,
            table: data.table,
            schema: data.schema || 'public',
          });
        }
      }
    };
    if (_broadcast) {
      _broadcast.addEventListener('message', handler);
    }
    // Also listen to same-tab custom events
    if (typeof window !== 'undefined') {
      window.addEventListener('ez-realtime' as any, ((e: CustomEvent) => {
        handler({ data: e.detail } as MessageEvent);
      }) as EventListener);
    }
    return this;
  }

  unsubscribe() {
    // Cleanup is handled by supabase.removeChannel
  }
}

function matchFilter(filterStr: string, record: any): boolean {
  // Parse filter like "id=eq.p1-uuid"
  const match = filterStr.match(/^(\w+)=eq\.(.+)$/);
  if (!match) return true;
  return record?.[match[1]] === match[2];
}

// Broadcast a Realtime event (called from update/insert operations)
function broadcastRealtime(eventType: string, table: string, record: any, oldRecord?: any) {
  const payload = { channel: `realtime:${table}`, eventType, table, schema: 'public', record, oldRecord };
  if (_broadcast) _broadcast.postMessage(payload);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('ez-realtime', { detail: payload }));
  }
}

const mockSupabase = {
  table(tableName: string) {
    return new MockQueryBuilder(tableName);
  },
  from(tableName: string) {
    return new MockQueryBuilder(tableName);
  },
  channel(name: string) {
    return new MockChannel(name);
  },
  removeChannel(channel: MockChannel) {
    channel.unsubscribe();
  },
  auth: {
    getUser() {
      const mockRole = typeof window !== 'undefined' ? localStorage.getItem('ez_user_role') || 'student' : 'student';
      if (mockRole === 'admin') {
        return { data: { user: { id: 'admin-999', email: 'admin@ezrent.my' } }, error: null };
      }
      return { data: { user: { id: 'tenant-123', email: 'student@ezrent.my' } }, error: null };
    },
    async signInWithOtp({ email, options }: { email: string; options?: { emailRedirectTo?: string } }) {
      // Mock: simulate Magic Link send, auto-login after delay
      if (typeof window !== 'undefined') {
        const tenantId = email === 'admin@ezrent.my' ? 'admin-999' : 'tenant-123';
        const admins = JSON.parse(localStorage.getItem('ez_admins') || '[]');
        const isAdmin = email === 'admin@ezrent.my' || admins.some((a: any) => a.id === tenantId);
        localStorage.setItem('ez_user_email', email);
        localStorage.setItem('ez_user_role', isAdmin ? 'admin' : 'student');
        localStorage.setItem('ez_tenant_id', tenantId);
      }
      return { data: {}, error: null };
    },
    async signOut() {
      if (typeof window !== 'undefined') {
        localStorage.removeItem('ez_logged_in');
        localStorage.removeItem('ez_user_role');
        localStorage.removeItem('ez_tenant_id');
        localStorage.removeItem('ez_user_email');
        document.cookie = 'ez_logged_in=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT';
      }
      return { error: null };
    },
    onAuthStateChange(callback: (event: string, session: any) => void) {
      // Mock: listen to storage events for cross-tab sync
      if (typeof window !== 'undefined') {
        const handler = (e: StorageEvent) => {
          if (e.key === 'ez_logged_in') {
            const loggedIn = e.newValue;
            if (loggedIn) {
              const role = localStorage.getItem('ez_user_role') || 'student';
              const email = localStorage.getItem('ez_user_email') || 'student@ezrent.my';
              callback('SIGNED_IN', { user: { id: role === 'admin' ? 'admin-999' : 'tenant-123', email } });
            } else {
              callback('SIGNED_OUT', null);
            }
          }
        };
        window.addEventListener('storage', handler);
        return { data: { subscription: { unsubscribe: () => window.removeEventListener('storage', handler) } } };
      }
      return { data: { subscription: { unsubscribe: () => {} } } };
    },
    async getSession() {
      if (typeof window !== 'undefined') {
        const loggedIn = localStorage.getItem('ez_logged_in');
        if (loggedIn) {
          const role = localStorage.getItem('ez_user_role') || 'student';
          const email = localStorage.getItem('ez_user_email') || (role === 'admin' ? 'admin@ezrent.my' : 'student@ezrent.my');
          return { data: { session: { user: { id: role === 'admin' ? 'admin-999' : 'tenant-123', email } } }, error: null };
        }
      }
      return { data: { session: null }, error: null };
    },
    async exchangeCodeForSession(code: string) {
      // Mock: treat any code as valid, auto-login as student
      if (typeof window !== 'undefined') {
        const email = localStorage.getItem('ez_user_email') || 'student@ezrent.my';
        const role = email === 'admin@ezrent.my' ? 'admin' : 'student';
        localStorage.setItem('ez_user_role', role);
        localStorage.setItem('ez_logged_in', '1');
        localStorage.setItem('ez_tenant_id', role === 'admin' ? 'admin-999' : 'tenant-123');
        document.cookie = 'ez_logged_in=1; path=/; max-age=31536000';
      }
      return { data: { session: { user: { id: 'tenant-123' } } }, error: null };
    }
  }
};

export const supabase = isRealSupabase
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : (mockSupabase as any);

// Check if running in mock mode
export const isMockDatabase = !isRealSupabase;
