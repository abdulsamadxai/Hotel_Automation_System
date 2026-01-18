
-- 1. CLEANUP (CAUTION: This wipes the DB to ensure a clean slate)
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- 2. ENUMS
CREATE TYPE user_role AS ENUM ('admin', 'manager', 'reception', 'housekeeping');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled');
CREATE TYPE room_status AS ENUM ('available', 'occupied', 'dirty', 'cleaning', 'maintenance');
CREATE TYPE room_type AS ENUM ('standard', 'single', 'double', 'suite', 'deluxe', 'penthouse');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'verified', 'overdue');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE task_type AS ENUM ('checkout_clean', 'stay_clean', 'deep_clean', 'inspection', 'maintenance');
CREATE TYPE invoice_status AS ENUM ('draft', 'pending', 'paid', 'overdue', 'cancelled');
CREATE TYPE payment_method AS ENUM ('cash', 'card', 'bank_transfer');
CREATE TYPE message_channel AS ENUM ('email', 'sms', 'whatsapp', 'internal');
CREATE TYPE message_direction AS ENUM ('inbound', 'outbound');
CREATE TYPE message_status AS ENUM ('sent', 'delivered', 'read', 'failed');

-- 3. TABLES

-- Staff Members (renamed from profiles to match frontend)
CREATE TABLE staff_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id), -- Nullable, for staff not yet linked to auth
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role user_role DEFAULT 'housekeeping',
  status TEXT DEFAULT 'off_duty', -- 'on_duty', 'off_duty', 'break'
  shift TEXT, -- 'morning', 'afternoon', 'night'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User Roles wrapper (Optional, but good for auth)
CREATE TABLE user_roles (
  user_id UUID REFERENCES auth.users(id) NOT NULL PRIMARY KEY,
  role user_role DEFAULT 'reception'
);

-- Guests (CRM)
CREATE TABLE guests (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  status TEXT DEFAULT 'active',
  tags TEXT[] DEFAULT '{}',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Rooms
CREATE TABLE rooms (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  number TEXT NOT NULL UNIQUE,
  type room_type NOT NULL DEFAULT 'standard', -- fallback
  floor INTEGER DEFAULT 1,
  status room_status DEFAULT 'available',
  capacity INTEGER DEFAULT 2,
  rate DECIMAL(10, 2) DEFAULT 100.00,
  amenities TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Bookings
CREATE TABLE bookings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  booking_number TEXT NOT NULL UNIQUE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status booking_status DEFAULT 'confirmed',
  total_amount DECIMAL(10, 2) DEFAULT 0,
  deposit_amount DECIMAL(10, 2) DEFAULT 0,
  payment_status TEXT DEFAULT 'pending', -- 'pending', 'partially_paid', 'paid'
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Invoices
CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT NOT NULL UNIQUE,
  booking_id UUID REFERENCES bookings(id) ON DELETE CASCADE,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) DEFAULT 0, -- Total Amount
  amount_paid DECIMAL(10, 2) DEFAULT 0, -- Amount already paid
  status invoice_status DEFAULT 'pending',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  payment_method TEXT,
  line_items JSONB DEFAULT '[]', -- Array of {description, amount, quantity, type}
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Payments (New Table for Strict Logic)
CREATE TABLE payments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_id UUID REFERENCES invoices(id) ON DELETE CASCADE,
  amount DECIMAL(10, 2) NOT NULL,
  method payment_method DEFAULT 'cash',
  reference TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Messages (New Table)
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  guest_id UUID REFERENCES guests(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  channel message_channel DEFAULT 'internal',
  direction message_direction NOT NULL,
  status message_status DEFAULT 'sent',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Automation Rules (For UI Visualization)
CREATE TABLE automation_rules (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  trigger_condition JSONB DEFAULT '{}',
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  execution_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Housekeeping Tasks
CREATE TABLE housekeeping_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  task_number TEXT,
  room_id UUID REFERENCES rooms(id) ON DELETE CASCADE,
  type task_type DEFAULT 'stay_clean',
  status task_status DEFAULT 'pending',
  priority task_priority DEFAULT 'medium',
  assignee_id UUID REFERENCES staff_members(id), -- or simply store name/id if user system is simple
  due_at TIMESTAMPTZ,
  notes TEXT,
  automation_triggered BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activity Log
CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  event_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  user_id UUID REFERENCES auth.users(id),
  source TEXT DEFAULT 'system',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notifications
CREATE TABLE notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info',
  is_read BOOLEAN DEFAULT FALSE,
  link TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);


-- 4. RLS POLICIES (AUTHENTICATED "GOD MODE" FOR DELETE BUTTONS)


ALTER TABLE staff_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE housekeeping_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow All Authenticated" ON guests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Authenticated" ON rooms FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Authenticated" ON bookings FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Authenticated" ON invoices FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Authenticated" ON messages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Authenticated" ON housekeeping_tasks FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Authenticated" ON activity_log FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Authenticated" ON notifications FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Authenticated" ON automation_rules FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Allow All Authenticated" ON staff_members FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Allow All Authenticated" ON user_roles FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- 5. RPC FUNCTIONS

-- Generate Invoice Number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  new_number TEXT;
BEGIN
  -- Simple format: INV-YYYYMMDD-XXXX
  SELECT 'INV-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD((COUNT(*) + 1)::TEXT, 4, '0')
  INTO new_number
  FROM invoices
  WHERE created_at >= DATE_TRUNC('day', NOW());
  
  RETURN new_number;
END;
$$ LANGUAGE plpgsql;

-- Create Notification Helper
CREATE OR REPLACE FUNCTION create_notification(
  p_user_id UUID,
  p_title TEXT,
  p_message TEXT,
  p_type TEXT DEFAULT 'info',
  p_link TEXT DEFAULT NULL
) RETURNS VOID AS $$
BEGIN
  INSERT INTO notifications (user_id, title, message, type, link)
  VALUES (p_user_id, p_title, p_message, p_type, p_link);
END;
$$ LANGUAGE plpgsql;


-- 6. TRIGGERS & AUTOMATION

-- A. CHECK-IN AUTOMATION
CREATE OR REPLACE FUNCTION on_booking_checkin_handler()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'checked_in' AND NEW.status = 'checked_in' THEN
    -- Update Room Status
    UPDATE rooms SET status = 'occupied' WHERE id = NEW.room_id;

    -- Ensure Invoice Exists
    IF NOT EXISTS(SELECT 1 FROM invoices WHERE booking_id = NEW.id) THEN
        INSERT INTO invoices (invoice_number, booking_id, guest_id, amount, status, notes)
        VALUES ('INV-' || TO_CHAR(NOW(), 'MMDD') || '-' || SUBSTRING(NEW.id::text, 1, 4), NEW.id, NEW.guest_id, NEW.total_amount, 'pending', 'Auto-generated on Check-in');
    END IF;
    
    -- Log Activity
    INSERT INTO activity_log (event_type, event_name, title, description, source)
    VALUES ('booking', 'check_in', 'Guest Checked In', 'Booking ' || NEW.booking_number || ' checked in.', 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_checkin
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION on_booking_checkin_handler();


-- B. CHECK-OUT AUTOMATION
CREATE OR REPLACE FUNCTION on_booking_checkout_handler()
RETURNS TRIGGER AS $$
DECLARE
  staff_rec RECORD;
BEGIN
  IF OLD.status != 'checked_out' AND NEW.status = 'checked_out' THEN
    -- Update Room Status
    UPDATE rooms SET status = 'dirty' WHERE id = NEW.room_id;

    -- Create Housekeeping Task
    INSERT INTO housekeeping_tasks (
      task_number, room_id, type, status, priority, notes, automation_triggered
    ) VALUES (
      'HK-' || TO_CHAR(NOW(), 'MMDD') || '-' || SUBSTRING(NEW.id::text, 1, 4), -- Gen unique ID
      NEW.room_id, 
      'checkout_clean', 
      'pending', 
      'high', 
      'Auto-generated on checkout', 
      TRUE
    );

    -- Log Activity
    INSERT INTO activity_log (event_type, event_name, title, description, source)
    VALUES ('booking', 'check_out', 'Guest Checked Out', 'Booking ' || NEW.booking_number || ' completed.', 'system');

    -- Notify Housekeeping Staff
    FOR staff_rec IN SELECT user_id FROM staff_members WHERE role = 'housekeeping' AND user_id IS NOT NULL LOOP
      PERFORM create_notification(
        staff_rec.user_id, 
        'New Cleaning Task', 
        'Room ' || (SELECT number FROM rooms WHERE id = NEW.room_id) || ' requires Checkout Clean.', 
        'warning', 
        '/housekeeping'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_checkout
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION on_booking_checkout_handler();


-- C. CANCELLATION AUTOMATION
CREATE OR REPLACE FUNCTION on_booking_cancelled_handler()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'cancelled' AND NEW.status = 'cancelled' THEN
    -- Free the Room
    UPDATE rooms SET status = 'available' WHERE id = OLD.room_id;

    -- Cancel Unpaid Invoices
    UPDATE invoices SET status = 'cancelled' 
    WHERE booking_id = NEW.id AND status != 'paid';

    -- Remove Pending Tasks
    DELETE FROM housekeeping_tasks 
    WHERE room_id = NEW.room_id AND status = 'pending' AND automation_triggered = TRUE;

    -- Log
    INSERT INTO activity_log (event_type, event_name, title, description, source)
    VALUES ('booking', 'cancel', 'Booking Cancelled', 'Booking ' || NEW.booking_number || ' was cancelled.', 'system');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_booking_cancelled
AFTER UPDATE ON bookings
FOR EACH ROW
EXECUTE FUNCTION on_booking_cancelled_handler();


-- D. HOUSEKEEPING COMPLETION
CREATE OR REPLACE FUNCTION on_task_completed_handler()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.status != 'completed' AND NEW.status = 'completed' THEN
    -- Update Room to Available if Checkout/Deep Clean
    IF NEW.type = 'checkout_clean' OR NEW.type = 'deep_clean' THEN
       UPDATE rooms SET status = 'available' WHERE id = NEW.room_id;
    ELSIF NEW.type = 'stay_clean' THEN
       UPDATE rooms SET status = 'occupied' WHERE id = NEW.room_id;
    END IF;

    -- Log
    INSERT INTO activity_log (event_type, event_name, title, description, source)
    VALUES ('task', 'complete', 'Room Ready', 'Housekeeping completed for Room ' || (SELECT number FROM rooms WHERE id = NEW.room_id), 'staff');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_task_completed
AFTER UPDATE ON housekeeping_tasks
FOR EACH ROW
EXECUTE FUNCTION on_task_completed_handler();


-- 7. SEED INITIAL DATA (Bootstrapping)

-- Seed Rooms
INSERT INTO rooms (number, type, floor, status, rate) VALUES
('101', 'single', 1, 'available', 100),
('102', 'double', 1, 'available', 150),
('103', 'suite', 1, 'maintenance', 250),
('201', 'deluxe', 2, 'available', 200),
('202', 'double', 2, 'occupied', 150);

-- Seed Guests
INSERT INTO guests (name, email, phone, tags) VALUES
('John Doe', 'john@example.com', '555-0101', '{vip}'),
('Jane Smith', 'jane@example.com', '555-0102', '{regular}');

-- Seed Messages
INSERT INTO messages (guest_id, content, direction, channel, status)
SELECT id, 'Welcome to the hotel! Let us know if you need anything.', 'outbound', 'sms', 'delivered'
FROM guests WHERE email = 'john@example.com';

-- Seed Automation Rules (UI Visualization)
INSERT INTO automation_rules (name, description, trigger_event, action_type, is_active)
VALUES 
  ('Auto Check-In Flow', 'Mark Room Occupied & Ensure Invoice', 'booking.checked_in', 'update_room_status', TRUE),
  ('Checkout Cleaning Task', 'Mark Room Dirty & Create Task', 'booking.checked_out', 'create_task', TRUE),
  ('Cancellation Cleanup', 'Free Room & Cancel Invoice', 'booking.cancelled', 'update_room_status', TRUE),
  ('Room Ready on Task Complete', 'Mark Room Available', 'task.completed', 'update_room_status', TRUE),
  ('New Booking Alert', 'Log Activity & Notify', 'booking.created', 'start_workflow', TRUE);



