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

