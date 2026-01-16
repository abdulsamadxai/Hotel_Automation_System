-- Create enum for hotel roles
CREATE TYPE public.hotel_role AS ENUM ('owner', 'manager', 'reception', 'housekeeping', 'accountant');

-- Create profiles table for user information
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles to avoid privilege escalation)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role hotel_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Enable RLS on both tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Create security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role hotel_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- Create function to get user's primary role
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS hotel_role
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role
  FROM public.user_roles
  WHERE user_id = _user_id
  LIMIT 1
$$;

-- RLS Policies for profiles
CREATE POLICY "Users can view own profile"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Owners and managers can view all profiles
CREATE POLICY "Owners and managers can view all profiles"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  public.has_role(auth.uid(), 'owner') OR 
  public.has_role(auth.uid(), 'manager')
);

-- RLS Policies for user_roles
CREATE POLICY "Users can view own roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Only owners can manage roles
CREATE POLICY "Owners can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can insert roles"
ON public.user_roles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can update roles"
ON public.user_roles
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'))
WITH CHECK (public.has_role(auth.uid(), 'owner'));

CREATE POLICY "Owners can delete roles"
ON public.user_roles
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'owner'));

-- Create trigger to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email, full_name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', '')
  );
  
  -- Assign default role (first user becomes owner, others become reception)
  IF (SELECT COUNT(*) FROM public.user_roles) = 0 THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'owner');
  ELSE
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'reception');
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Add updated_at trigger to profiles
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- Fix search_path for update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;
-- Add explicit deny policies for anonymous users on profiles table
CREATE POLICY "Deny anonymous access to profiles"
ON public.profiles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);

-- Add explicit deny policies for anonymous users on user_roles table  
CREATE POLICY "Deny anonymous access to user_roles"
ON public.user_roles
FOR ALL
TO anon
USING (false)
WITH CHECK (false);
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
-- Fix overly permissive INSERT policies

-- Drop and recreate notifications insert policy with proper checks
DROP POLICY IF EXISTS "System can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated can insert notifications"
ON public.notifications FOR INSERT TO authenticated
WITH CHECK (
  -- Allow inserting notifications for self or broadcast (null user_id)
  user_id IS NULL OR user_id = auth.uid() OR 
  has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager')
);

-- Drop and recreate activity_log insert policy
DROP POLICY IF EXISTS "System can insert activity" ON public.activity_log;

CREATE POLICY "Authenticated can insert activity"
ON public.activity_log FOR INSERT TO authenticated
WITH CHECK (
  -- Allow if user is inserting for themselves or is a staff member
  user_id IS NULL OR user_id = auth.uid() OR 
  has_role(auth.uid(), 'owner') OR has_role(auth.uid(), 'manager') OR 
  has_role(auth.uid(), 'reception') OR has_role(auth.uid(), 'housekeeping')
);
-- Fix overly permissive RLS policies on sensitive tables
-- Restrict SELECT access based on role requirements

-- 1. GUESTS table - Only reception, managers, owners, accountants need guest data
DROP POLICY IF EXISTS "Authenticated users can view guests" ON public.guests;
CREATE POLICY "Staff can view guests" ON public.guests
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::hotel_role) OR 
    has_role(auth.uid(), 'manager'::hotel_role) OR 
    has_role(auth.uid(), 'reception'::hotel_role) OR
    has_role(auth.uid(), 'accountant'::hotel_role)
  );

-- 2. BOOKINGS table - Reception, managers, owners, accountants need booking data
DROP POLICY IF EXISTS "Authenticated users can view bookings" ON public.bookings;
CREATE POLICY "Staff can view bookings" ON public.bookings
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::hotel_role) OR 
    has_role(auth.uid(), 'manager'::hotel_role) OR 
    has_role(auth.uid(), 'reception'::hotel_role) OR
    has_role(auth.uid(), 'accountant'::hotel_role)
  );

-- 3. INVOICES table - Only finance roles need invoice data (already has proper write policy)
DROP POLICY IF EXISTS "Staff can view invoices" ON public.invoices;
CREATE POLICY "Finance can view invoices" ON public.invoices
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::hotel_role) OR 
    has_role(auth.uid(), 'manager'::hotel_role) OR 
    has_role(auth.uid(), 'accountant'::hotel_role)
  );

-- 4. HOUSEKEEPING_TASKS table - Housekeeping, managers, owners need task data
DROP POLICY IF EXISTS "Authenticated users can view tasks" ON public.housekeeping_tasks;
CREATE POLICY "Housekeeping staff can view tasks" ON public.housekeeping_tasks
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::hotel_role) OR 
    has_role(auth.uid(), 'manager'::hotel_role) OR 
    has_role(auth.uid(), 'housekeeping'::hotel_role)
  );

-- 5. ROOMS table - All staff need room status info for operations
DROP POLICY IF EXISTS "Authenticated users can view rooms" ON public.rooms;
CREATE POLICY "Staff can view rooms" ON public.rooms
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::hotel_role) OR 
    has_role(auth.uid(), 'manager'::hotel_role) OR 
    has_role(auth.uid(), 'reception'::hotel_role) OR
    has_role(auth.uid(), 'housekeeping'::hotel_role)
  );

-- 6. STAFF_MEMBERS table - Managers and owners manage staff, others see limited info
DROP POLICY IF EXISTS "Authenticated users can view staff" ON public.staff_members;
CREATE POLICY "Managers can view staff" ON public.staff_members
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::hotel_role) OR 
    has_role(auth.uid(), 'manager'::hotel_role) OR 
    has_role(auth.uid(), 'housekeeping'::hotel_role)
  );

-- 7. ACTIVITY_LOG table - Only managers and owners should see full audit trail
DROP POLICY IF EXISTS "Authenticated users can view activity" ON public.activity_log;
CREATE POLICY "Managers can view activity log" ON public.activity_log
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::hotel_role) OR 
    has_role(auth.uid(), 'manager'::hotel_role)
  );

-- 8. AUTOMATION_RULES table - Already has proper management policy, fix view
DROP POLICY IF EXISTS "Staff can view automations" ON public.automation_rules;
CREATE POLICY "Managers can view automations" ON public.automation_rules
  FOR SELECT TO authenticated
  USING (
    has_role(auth.uid(), 'owner'::hotel_role) OR 
    has_role(auth.uid(), 'manager'::hotel_role)
  );
-- ============================================
-- HOTEL AUTOPILOT - AUTOMATION LOGIC
-- ============================================

-- ============================================
-- 1. UTILITY FUNCTIONS
-- ============================================

-- Function to find best available housekeeping staff (Load Balancing)
CREATE OR REPLACE FUNCTION get_best_housekeeping_staff()
RETURNS UUID AS $$
DECLARE
  v_staff_id UUID;
BEGIN
  SELECT id INTO v_staff_id
  FROM public.staff_members
  WHERE role = 'housekeeping' 
  AND status = 'on_duty'
  ORDER BY (
    SELECT COUNT(*) 
    FROM public.housekeeping_tasks 
    WHERE assignee_id = staff_members.id 
    AND status IN ('pending', 'in_progress')
  ) ASC
  LIMIT 1;

  -- If no one on duty, just pick any housekeeper with least load
  IF v_staff_id IS NULL THEN
    SELECT id INTO v_staff_id
    FROM public.staff_members
    WHERE role = 'housekeeping'
    ORDER BY (
      SELECT COUNT(*) 
      FROM public.housekeeping_tasks 
      WHERE assignee_id = staff_members.id 
      AND status IN ('pending', 'in_progress')
    ) ASC
    LIMIT 1;
  END IF;

  RETURN v_staff_id;
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 2. AUTOMATION: Double Booking Prevention
-- ============================================
CREATE OR REPLACE FUNCTION check_double_booking()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if room is already booked for the given dates
  -- Overlap logic: (StartA <= EndB) and (EndA >= StartB)
  IF EXISTS (
    SELECT 1 FROM public.bookings
    WHERE room_id = NEW.room_id
    AND status NOT IN ('cancelled', 'checked_out')
    AND id != NEW.id -- exclude self for updates
    AND check_in < NEW.check_out
    AND check_out > NEW.check_in
  ) THEN
    RAISE EXCEPTION 'Room is already booked for these dates.';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_booking_check_overlap
  BEFORE INSERT OR UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION check_double_booking();


-- ============================================
-- 3. AUTOMATION: Checkout -> Housekeeping + Billing
-- ============================================
-- Replace previous simple trigger with robust one
DROP TRIGGER IF EXISTS on_booking_checkout ON public.bookings;
DROP FUNCTION IF EXISTS handle_booking_checkout;

CREATE OR REPLACE FUNCTION handle_booking_checkout_automation()
RETURNS TRIGGER AS $$
DECLARE
  v_task_number TEXT;
  v_invoice_number TEXT;
  v_room_number TEXT;
  v_room_rate DECIMAL(10,2);
  v_staff_id UUID;
  v_total_amount DECIMAL(10,2);
  v_invoice_id UUID;
BEGIN
  -- TRIGGER: booking.checked_out
  IF NEW.status = 'checked_out' AND OLD.status != 'checked_out' THEN
    
    -- GET CONTEXT DATA
    SELECT number, rate INTO v_room_number, v_room_rate FROM public.rooms WHERE id = NEW.room_id;
    
    -- ----------------------------------------------------
    -- ACTION 1: HOUSEKEEPING AUTOMATION (Load Balanced)
    -- ----------------------------------------------------
    
    -- Assign staff (Logic: On Service + Lowest Load)
    v_staff_id := get_best_housekeeping_staff();
    v_task_number := generate_task_number();
    
    -- Create Task
    INSERT INTO public.housekeeping_tasks (
      task_number, room_id, booking_id, type, status, priority, 
      assignee_id, automation_triggered, due_at
    ) VALUES (
      v_task_number, NEW.room_id, NEW.id, 'checkout_clean', 'pending', 'high',
      v_staff_id, true, NOW() + INTERVAL '1 hour'
    );
    
    -- Update Room Status
    UPDATE public.rooms SET status = 'dirty', updated_at = NOW() WHERE id = NEW.room_id;
    
    -- Notify Staff
    IF v_staff_id IS NOT NULL THEN
      INSERT INTO public.notifications (user_id, type, title, message, link)
      VALUES (
        (SELECT user_id FROM public.staff_members WHERE id = v_staff_id),
        'task', 'New Cleaning Task', 
        'Room ' || v_room_number || ' requires cleaning. Priority: High',
        '/tasks'
      );
    END IF;

    -- ----------------------------------------------------
    -- ACTION 2: BILLING AUTOMATION
    -- ----------------------------------------------------
    
    -- Calculate Amount (Nights x Rate). Handle 0 nights (same day checkout) as 1 night charge
    v_total_amount := GREATEST((NEW.check_out - NEW.check_in), 1) * v_room_rate;
    v_invoice_number := generate_invoice_number();
    
    -- Create Invoice
    INSERT INTO public.invoices (
      invoice_number, booking_id, guest_id, amount, status, due_date
    ) VALUES (
      v_invoice_number, NEW.id, NEW.guest_id, v_total_amount, 'pending', NOW()
    ) RETURNING id INTO v_invoice_id;
    
    -- Notify Reception/Manager about Invoice
    INSERT INTO public.notifications (type, title, message, link)
    VALUES (
      'alert', 'Invoice Generated',
      'Invoice ' || v_invoice_number || ' generated for Room ' || v_room_number,
      '/invoices'
    ); -- Generic notification, user_id null implies 'system' or 'all admins' depending on frontend impl, 
       -- but for safety let's assume we want to log this primarily.
       
    -- ----------------------------------------------------
    -- ACTION 3: LOGGING
    -- ----------------------------------------------------
    INSERT INTO public.activity_log (event_type, event_name, title, description, source, metadata)
    VALUES 
    (
      'automation', 'automation.checkout_flow', 'Checkout Automation Executed',
      'Triggered Housekeeping (' || v_task_number || ') and Billing (' || v_invoice_number || ') for Room ' || v_room_number,
      'automation',
      jsonb_build_object(
        'booking_id', NEW.id, 
        'room_id', NEW.room_id, 
        'task_id', v_task_number,
        'invoice_id', v_invoice_id
      )
    );

  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_booking_checkout_automation
  AFTER UPDATE ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION handle_booking_checkout_automation();


-- ============================================
-- 4. AUTOMATION: Task Completion -> Room Ready
-- ============================================
DROP TRIGGER IF EXISTS on_task_status_change ON public.housekeeping_tasks;
DROP FUNCTION IF EXISTS handle_task_completion;

CREATE OR REPLACE FUNCTION handle_task_completion_automation()
RETURNS TRIGGER AS $$
DECLARE
  v_room_number TEXT;
BEGIN
  -- TRIGGER: task.completed
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at := NOW();
    
    SELECT number INTO v_room_number FROM public.rooms WHERE id = NEW.room_id;
    
    -- ACTION 1: Change Room Status -> AVAILABLE
    UPDATE public.rooms SET status = 'available', updated_at = NOW() WHERE id = NEW.room_id;
    
    -- ACTION 2: Notify Front Desk (Admins/Reception)
    -- Insert notification for all receptionists/managers (This is heavy, simplifying to generic system notif)
    INSERT INTO public.notifications (type, title, message, link)
    VALUES (
      'room', 'Room Ready',
      'Room ' || v_room_number || ' is clean and ready for check-in.',
      '/rooms'
    );
    
    -- ACTION 3: Log Event
    INSERT INTO public.activity_log (event_type, event_name, title, description, source, metadata)
    VALUES (
      'automation', 'automation.room_ready', 'Room Ready Automation',
      'Task completed. Room ' || v_room_number || ' status updated to Available.',
      'automation',
      jsonb_build_object('room_id', NEW.room_id, 'task_id', NEW.id)
    );
  END IF;
  
  -- Handle 'in_progress' state
  IF NEW.status = 'in_progress' AND OLD.status = 'pending' THEN
    NEW.started_at := NOW();
    UPDATE public.rooms SET status = 'cleaning', updated_at = NOW() WHERE id = NEW.room_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_task_completion_automation
  BEFORE UPDATE ON public.housekeeping_tasks
  FOR EACH ROW
  EXECUTE FUNCTION handle_task_completion_automation();


-- ============================================
-- 5. AUTOMATION: Payment -> Revenue Sync
-- ============================================
CREATE OR REPLACE FUNCTION handle_invoice_payment_automation()
RETURNS TRIGGER AS $$
BEGIN
  -- TRIGGER: invoice.paid
  IF NEW.status = 'paid' AND OLD.status != 'paid' THEN
    NEW.paid_at := NOW();
    
    -- ACTION 1: Log Revenue Event (Revenue Table can be derived from here)
    INSERT INTO public.activity_log (event_type, event_name, title, description, source, metadata)
    VALUES (
      'alert', 'finance.payment_received', 'Payment Received',
      'Invoice ' || NEW.invoice_number || ' paid. Amount: $' || NEW.amount,
      'automation',
      jsonb_build_object('invoice_id', NEW.id, 'amount', NEW.amount)
    );
    
    -- Note: Realtime dashboard will aggregate this log or query `invoices` directly.
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_invoice_payment_automation
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION handle_invoice_payment_automation();


-- ============================================
-- 6. SCHEDULED AUTOMATION: Daily Closing & Maintenance
--    (Intended to be called by Cron or Admin Button)
-- ============================================

-- Function: escalate_overdue_tasks()
-- Logic: Find tasks past due -> Mark Urgent -> Log
CREATE OR REPLACE FUNCTION escalate_overdue_tasks()
RETURNS INTEGER AS $$
DECLARE
  v_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.housekeeping_tasks
    SET priority = 'high',
        status = 'overdue',
        notes = COALESCE(notes, '') || ' [AUTOMATION: Escalated due to delay]'
    WHERE status IN ('pending', 'in_progress')
    AND due_at < NOW()
    AND priority != 'high'
    RETURNING id
  )
  SELECT COUNT(*) INTO v_count FROM updated;
  
  IF v_count > 0 THEN
    INSERT INTO public.activity_log (event_type, event_name, title, description, source, metadata)
    VALUES (
      'alert', 'automation.escalation', 'Tasks Escalated',
      v_count || ' overdue tasks were marked as HIGH priority.',
      'automation',
      jsonb_build_object('count', v_count)
    );
  END IF;
  
  RETURN v_count;
END;
$$ LANGUAGE plpgsql;


-- Function: close_daily_books()
-- Logic: Freezes a snapshot of daily revenue
CREATE TABLE IF NOT EXISTS public.daily_revenue_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  date DATE UNIQUE NOT NULL,
  total_revenue DECIMAL(10,2) NOT NULL DEFAULT 0,
  bookings_count INTEGER NOT NULL DEFAULT 0,
  closed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION close_daily_books()
RETURNS VOID AS $$
DECLARE
  v_today DATE := CURRENT_DATE;
  v_revenue DECIMAL(10,2);
  v_bookings INTEGER;
BEGIN
  -- Calculate today's revenue (Paid Invoices)
  SELECT COALESCE(SUM(amount), 0) INTO v_revenue
  FROM public.invoices
  WHERE status = 'paid'
  AND DATE(paid_at) = v_today;
  
  -- Calculate check-ins
  SELECT COUNT(*) INTO v_bookings
  FROM public.bookings
  WHERE check_in = v_today;
  
  -- Store Snapshot
  INSERT INTO public.daily_revenue_snapshots (date, total_revenue, bookings_count)
  VALUES (v_today, v_revenue, v_bookings)
  ON CONFLICT (date) DO UPDATE 
  SET total_revenue = EXCLUDED.total_revenue,
      bookings_count = EXCLUDED.bookings_count,
      closed_at = NOW();
      
  -- Log
  INSERT INTO public.activity_log (event_type, event_name, title, description, source)
  VALUES ('alert', 'finance.day_close', 'Daily Books Closed', 'Revenue: $' || v_revenue || ', Check-ins: ' || v_bookings, 'automation');
END;
$$ LANGUAGE plpgsql;


-- ============================================
-- 7. CLEANUP & PERMISSIONS
-- ============================================

-- Ensure staff member permissions for tasks
ALTER TABLE public.housekeeping_tasks ENABLE ROW LEVEL SECURITY;

-- If policy exists drop it first to avoid error
DROP POLICY IF EXISTS "System can update tasks" ON public.housekeeping_tasks;
-- Policies already defined in previous migrations for roles.

-- Grant execute on functions
GRANT EXECUTE ON FUNCTION close_daily_books() TO authenticated;
GRANT EXECUTE ON FUNCTION escalate_overdue_tasks() TO authenticated;

-- ============================================
-- PAYMENT & INVOICE UPGRADE
-- ============================================

-- 1. INVOICES: Add support for line items and partial payments
ALTER TABLE public.invoices 
ADD COLUMN IF NOT EXISTS line_items JSONB DEFAULT '[]'::JSONB,
ADD COLUMN IF NOT EXISTS notes TEXT,
ADD COLUMN IF NOT EXISTS payment_method TEXT,
ADD COLUMN IF NOT EXISTS amount_paid DECIMAL(10,2) DEFAULT 0.00;

-- 2. BOOKINGS: Add payment tracking
CREATE TYPE payment_status_type AS ENUM ('pending', 'partially_paid', 'paid', 'refunded');

-- Safely add column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'payment_status_type') THEN
        CREATE TYPE payment_status_type AS ENUM ('pending', 'partially_paid', 'paid', 'refunded');
    END IF;
END $$;

ALTER TABLE public.bookings 
ADD COLUMN IF NOT EXISTS payment_status payment_status_type DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0.00;

-- 3. REVENUE FUNCTION: accurate daily revenue
CREATE OR REPLACE FUNCTION get_daily_revenue(target_date DATE)
RETURNS DECIMAL(10,2) AS $$
DECLARE
  total DECIMAL(10,2);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO total
  FROM public.invoices
  WHERE status = 'paid'
  AND DATE(paid_at) = target_date;
  
  RETURN total;
END;
$$ LANGUAGE plpgsql;

-- 4. AUTOMATION: Update booking payment status when invoice is paid
CREATE OR REPLACE FUNCTION sync_booking_payment_status()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'paid' AND NEW.booking_id IS NOT NULL THEN
    UPDATE public.bookings 
    SET payment_status = 'paid', updated_at = NOW()
    WHERE id = NEW.booking_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER on_invoice_paid_update_booking
  AFTER UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION sync_booking_payment_status();
