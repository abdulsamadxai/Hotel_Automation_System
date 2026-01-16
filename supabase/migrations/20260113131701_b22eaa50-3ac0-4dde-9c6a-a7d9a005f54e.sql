-- ============================================
-- HOTEL AUTOPILOT - COMPLETE DATABASE SCHEMA
-- ============================================

-- Enum types
CREATE TYPE room_status AS ENUM ('available', 'occupied', 'dirty', 'cleaning', 'maintenance');
CREATE TYPE room_type AS ENUM ('standard', 'deluxe', 'suite', 'penthouse');
CREATE TYPE booking_status AS ENUM ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'overdue');
CREATE TYPE task_type AS ENUM ('checkout_clean', 'stay_clean', 'deep_clean', 'inspection', 'maintenance');
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');
CREATE TYPE staff_role AS ENUM ('housekeeping', 'reception', 'maintenance', 'manager');
CREATE TYPE staff_status AS ENUM ('on_duty', 'off_duty', 'break');
CREATE TYPE guest_tag AS ENUM ('vip', 'regular', 'blocked');
CREATE TYPE notification_type AS ENUM ('booking', 'task', 'alert', 'automation', 'room');

-- ============================================
-- ROOMS TABLE
-- ============================================
CREATE TABLE public.rooms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  number TEXT NOT NULL UNIQUE,
  type room_type NOT NULL DEFAULT 'standard',
  floor INTEGER NOT NULL DEFAULT 1,
  status room_status NOT NULL DEFAULT 'available',
  capacity INTEGER NOT NULL DEFAULT 2,
  rate DECIMAL(10,2) NOT NULL DEFAULT 100.00,
  amenities TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view rooms"
ON public.rooms FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage rooms"
ON public.rooms FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'reception'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'reception'));

-- ============================================
-- GUESTS TABLE
-- ============================================
CREATE TABLE public.guests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  tags guest_tag[] DEFAULT '{regular}',
  total_stays INTEGER DEFAULT 0,
  total_spent DECIMAL(10,2) DEFAULT 0.00,
  last_stay_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view guests"
ON public.guests FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage guests"
ON public.guests FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'reception'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'reception'));

-- ============================================
-- BOOKINGS TABLE
-- ============================================
CREATE TABLE public.bookings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_number TEXT UNIQUE NOT NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE SET NULL,
  check_in DATE NOT NULL,
  check_out DATE NOT NULL,
  status booking_status NOT NULL DEFAULT 'pending',
  nights INTEGER GENERATED ALWAYS AS (check_out - check_in) STORED,
  total_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view bookings"
ON public.bookings FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage bookings"
ON public.bookings FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'reception'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'reception'));

-- ============================================
-- STAFF MEMBERS TABLE
-- ============================================
CREATE TABLE public.staff_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role staff_role NOT NULL DEFAULT 'housekeeping',
  status staff_status NOT NULL DEFAULT 'off_duty',
  shift TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.staff_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view staff"
ON public.staff_members FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can manage staff"
ON public.staff_members FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- ============================================
-- HOUSEKEEPING TASKS TABLE
-- ============================================
CREATE TABLE public.housekeeping_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_number TEXT UNIQUE NOT NULL,
  room_id UUID REFERENCES public.rooms(id) ON DELETE CASCADE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  type task_type NOT NULL DEFAULT 'checkout_clean',
  status task_status NOT NULL DEFAULT 'pending',
  priority task_priority NOT NULL DEFAULT 'medium',
  assignee_id UUID REFERENCES public.staff_members(id) ON DELETE SET NULL,
  automation_triggered BOOLEAN DEFAULT false,
  notes TEXT,
  due_at TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tasks"
ON public.housekeeping_tasks FOR SELECT TO authenticated USING (true);

CREATE POLICY "Staff can manage tasks"
ON public.housekeeping_tasks FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'housekeeping'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'housekeeping'));

-- ============================================
-- NOTIFICATIONS TABLE
-- ============================================
CREATE TABLE public.notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  link TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notifications"
ON public.notifications FOR SELECT TO authenticated 
USING (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Users can update own notifications"
ON public.notifications FOR UPDATE TO authenticated 
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "System can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (true);

-- ============================================
-- ACTIVITY LOG TABLE
-- ============================================
CREATE TABLE public.activity_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type notification_type NOT NULL,
  event_name TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  metadata JSONB DEFAULT '{}',
  source TEXT DEFAULT 'system',
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view activity"
ON public.activity_log FOR SELECT TO authenticated USING (true);

CREATE POLICY "System can insert activity"
ON public.activity_log FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================
-- INVOICES TABLE
-- ============================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number TEXT UNIQUE NOT NULL,
  booking_id UUID REFERENCES public.bookings(id) ON DELETE SET NULL,
  guest_id UUID REFERENCES public.guests(id) ON DELETE SET NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  due_date DATE,
  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view invoices"
ON public.invoices FOR SELECT TO authenticated USING (true);

CREATE POLICY "Finance can manage invoices"
ON public.invoices FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR has_role(auth.uid(), 'accountant'));

-- ============================================
-- AUTOMATION RULES TABLE
-- ============================================
CREATE TABLE public.automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  trigger_event TEXT NOT NULL,
  trigger_condition JSONB DEFAULT '{}',
  action_type TEXT NOT NULL,
  action_config JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  execution_count INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Staff can view automations"
ON public.automation_rules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Managers can manage automations"
ON public.automation_rules FOR ALL TO authenticated
USING (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'))
WITH CHECK (has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager'));

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Generate booking number
CREATE OR REPLACE FUNCTION generate_booking_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'BK-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Generate task number
CREATE OR REPLACE FUNCTION generate_task_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'HK-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Generate invoice number
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
BEGIN
  RETURN 'INV-' || LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- ============================================
-- AUTOMATION: Auto-create housekeeping task on checkout
-- ============================================
CREATE OR REPLACE FUNCTION handle_booking_checkout()
RETURNS TRIGGER AS $$
DECLARE
  v_task_number TEXT;
  v_room_number TEXT;
BEGIN
  -- Only trigger when status changes to checked_out
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    -- Get room number
    SELECT number INTO v_room_number FROM public.rooms WHERE id = NEW.room_id;
    
    -- Generate task number
    v_task_number := generate_task_number();
    
    -- Create housekeeping task
    INSERT INTO public.housekeeping_tasks (
      task_number, room_id, booking_id, type, status, priority, 
      automation_triggered, due_at
    ) VALUES (
      v_task_number, NEW.room_id, NEW.id, 'checkout_clean', 'pending', 'high',
      true, NOW() + INTERVAL '2 hours'
    );
    
    -- Update room status to dirty
    UPDATE public.rooms SET status = 'dirty', updated_at = NOW() WHERE id = NEW.room_id;
    
    -- Log activity
    INSERT INTO public.activity_log (event_type, event_name, title, description, source, metadata)
    VALUES (
      'automation', 'task.auto_created', 'Housekeeping Task Created',
      'Room ' || v_room_number || ' checkout triggered cleaning task',
      'automation',
      jsonb_build_object('room_id', NEW.room_id, 'task_number', v_task_number)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_booking_checkout
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_booking_checkout();

-- ============================================
-- AUTOMATION: Update room status on check-in
-- ============================================
CREATE OR REPLACE FUNCTION handle_booking_checkin()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'checked_in' AND OLD.status != 'checked_in' THEN
    UPDATE public.rooms SET status = 'occupied', updated_at = NOW() WHERE id = NEW.room_id;
    
    INSERT INTO public.activity_log (event_type, event_name, title, description, source, metadata)
    VALUES (
      'booking', 'booking.checked_in', 'Guest Checked In',
      'Room updated to occupied',
      'system',
      jsonb_build_object('room_id', NEW.room_id, 'booking_id', NEW.id)
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_booking_checkin
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_booking_checkin();

-- ============================================
-- AUTOMATION: Update room status when task completed
-- ============================================
CREATE OR REPLACE FUNCTION handle_task_completion()
RETURNS TRIGGER AS $$
DECLARE
  v_room_number TEXT;
BEGIN
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at := NOW();
    
    -- Update room to available
    UPDATE public.rooms SET status = 'available', updated_at = NOW() WHERE id = NEW.room_id;
    
    SELECT number INTO v_room_number FROM public.rooms WHERE id = NEW.room_id;
    
    INSERT INTO public.activity_log (event_type, event_name, title, description, source, metadata)
    VALUES (
      'task', 'task.completed', 'Task Completed',
      'Room ' || v_room_number || ' marked as ready',
      'system',
      jsonb_build_object('room_id', NEW.room_id, 'task_id', NEW.id)
    );
  END IF;
  
  IF NEW.status = 'in_progress' AND OLD.status = 'pending' THEN
    NEW.started_at := NOW();
    UPDATE public.rooms SET status = 'cleaning', updated_at = NOW() WHERE id = NEW.room_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_task_status_change
  BEFORE UPDATE ON public.housekeeping_tasks
  FOR EACH ROW
  EXECUTE FUNCTION handle_task_completion();

-- ============================================
-- AUTOMATION: Log new bookings
-- ============================================
CREATE OR REPLACE FUNCTION handle_new_booking()
RETURNS TRIGGER AS $$
DECLARE
  v_guest_name TEXT;
  v_room_number TEXT;
BEGIN
  SELECT name INTO v_guest_name FROM public.guests WHERE id = NEW.guest_id;
  SELECT number INTO v_room_number FROM public.rooms WHERE id = NEW.room_id;
  
  INSERT INTO public.activity_log (event_type, event_name, title, description, source, metadata)
  VALUES (
    'booking', 'booking.created', 'New Booking Created',
    COALESCE(v_guest_name, 'Guest') || ' - Room ' || COALESCE(v_room_number, 'N/A'),
    'system',
    jsonb_build_object('booking_id', NEW.id, 'guest_id', NEW.guest_id, 'room_id', NEW.room_id)
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_new_booking
  AFTER INSERT ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_new_booking();

-- ============================================
-- Timestamp update triggers
-- ============================================
CREATE TRIGGER update_rooms_updated_at BEFORE UPDATE ON public.rooms
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_guests_updated_at BEFORE UPDATE ON public.guests
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_bookings_updated_at BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_staff_updated_at BEFORE UPDATE ON public.staff_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_tasks_updated_at BEFORE UPDATE ON public.housekeeping_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at BEFORE UPDATE ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automations_updated_at BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================
-- Enable realtime for key tables
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.rooms;
ALTER PUBLICATION supabase_realtime ADD TABLE public.bookings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.housekeeping_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.activity_log;

-- ============================================
-- SEED DATA: Default rooms
-- ============================================
INSERT INTO public.rooms (number, type, floor, status, capacity, rate) VALUES
  ('101', 'standard', 1, 'available', 2, 99.00),
  ('102', 'standard', 1, 'available', 2, 99.00),
  ('103', 'deluxe', 1, 'available', 2, 149.00),
  ('104', 'standard', 1, 'available', 2, 99.00),
  ('105', 'suite', 1, 'available', 4, 249.00),
  ('201', 'standard', 2, 'available', 2, 99.00),
  ('202', 'deluxe', 2, 'available', 2, 149.00),
  ('203', 'standard', 2, 'available', 2, 99.00),
  ('204', 'suite', 2, 'available', 4, 249.00),
  ('205', 'standard', 2, 'available', 2, 99.00),
  ('301', 'deluxe', 3, 'available', 2, 149.00),
  ('302', 'standard', 3, 'available', 2, 99.00),
  ('303', 'standard', 3, 'available', 2, 99.00),
  ('304', 'suite', 3, 'available', 4, 249.00),
  ('305', 'deluxe', 3, 'available', 2, 149.00);

-- SEED DATA: Default automation rules
INSERT INTO public.automation_rules (name, description, trigger_event, action_type, is_active) VALUES
  ('Auto Housekeeping', 'Create cleaning task when guest checks out', 'booking.checked_out', 'create_task', true),
  ('VIP Guest Alert', 'Notify manager when VIP guest books', 'booking.created', 'create_alert', true),
  ('Auto Invoice', 'Generate invoice on checkout', 'booking.checked_out', 'generate_invoice', true),
  ('Overdue Escalation', 'Escalate overdue tasks to manager', 'task.overdue', 'escalate', true),
  ('Room Maintenance', 'Create maintenance task when needed', 'room.maintenance_needed', 'create_task', false);