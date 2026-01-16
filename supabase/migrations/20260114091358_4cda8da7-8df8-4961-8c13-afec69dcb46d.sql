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